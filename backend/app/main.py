import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import auth, config, db, mailer, schemas as s

try:
    from zoneinfo import ZoneInfo

    TZ = ZoneInfo("America/Sao_Paulo")
except Exception:  # tzdata ausente
    TZ = timezone(timedelta(hours=-3))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_br() -> str:
    return datetime.now(TZ).date().isoformat()


def fmt_date(iso: str) -> str:
    y, m, d = iso[:10].split("-")
    return f"{d}/{m}/{y}"


# --------------------------------------------------------------------------- serializers
def vehicle_out(r) -> dict | None:
    if r is None:
        return None
    return {"id": r["id"], "modelo": r["modelo"], "placa": r["placa"], "vagas": r["vagas"], "ativo": bool(r["ativo"])}


def driver_out(r) -> dict | None:
    if r is None:
        return None
    return {"id": r["id"], "nome": r["nome"], "telefone": r["telefone"], "cnh": r["cnh"], "ativo": bool(r["ativo"])}


def trip_base(r) -> dict:
    return {
        "id": r["id"], "protocolo": r["protocolo"], "status": r["status"], "created_at": r["created_at"],
        "solicitante_nome": r["solicitante_nome"], "solicitante_email": r["solicitante_email"],
        "diretoria": r["diretoria"], "tipo": r["tipo"], "data_servico": r["data_servico"],
        "data_saida": r["data_saida"], "hora_saida": r["hora_saida"], "hora_retorno": r["hora_retorno"],
        "roteiro": r["roteiro"], "motorista_aguarda": bool(r["motorista_aguarda"]),
        "passageiros": r["passageiros"], "destinos": db.loads(r["destinos"]), "objetivo": r["objetivo"],
    }


def _one(c, table: str, id_: str | None):
    if not id_:
        return None
    return c.execute(f"SELECT * FROM {table} WHERE id=?", (id_,)).fetchone()


def seats(c, trip) -> tuple[int, int] | None:
    """(vagas_totais, vagas_disponiveis). Totais = lugares do veículo menos o motorista."""
    v = _one(c, "vehicles", trip["vehicle_id"])
    if v is None:
        return None
    total = max(0, v["vagas"] - 1)
    ok = c.execute("SELECT COUNT(*) FROM caronas WHERE trip_id=? AND status='deferida'", (trip["id"],)).fetchone()[0]
    return total, max(0, total - trip["passageiros"] - ok)


def trip_admin(c, r) -> dict:
    out = trip_base(r)
    v, d = _one(c, "vehicles", r["vehicle_id"]), _one(c, "drivers", r["driver_id"])
    sv = seats(c, r)
    out.update({
        "vehicle_id": r["vehicle_id"], "driver_id": r["driver_id"],
        "vehicle": vehicle_out(v), "driver": driver_out(d), "admin_obs": r["admin_obs"],
        "vagas_disponiveis": sv[1] if sv else None,
        "caronas_pendentes": c.execute("SELECT COUNT(*) FROM caronas WHERE trip_id=? AND status='pendente'", (r["id"],)).fetchone()[0],
        "decided_at": r["decided_at"],
    })
    return out


def carona_out(r) -> dict:
    return {
        "id": r["id"], "protocolo": r["protocolo"], "trip_id": r["trip_id"], "nome": r["nome"],
        "email": r["email"], "diretoria": r["diretoria"], "motivo": r["motivo"],
        "status": r["status"], "created_at": r["created_at"],
    }


def next_protocol(c, table: str, prefix: str) -> tuple[int, str]:
    year = datetime.now(TZ).year
    like = f"{prefix}-{year}-%"
    seq = (c.execute(f"SELECT COALESCE(MAX(seq),0) FROM {table} WHERE protocolo LIKE ?", (like,)).fetchone()[0]) + 1
    return seq, f"{prefix}-{year}-{seq:04d}"


# --------------------------------------------------------------------------- public routes
public = APIRouter(prefix="/api")


@public.get("/diretorias")
def list_diretorias():
    with db.tx() as c:
        return [dict(r) for r in c.execute("SELECT id, nome FROM diretorias ORDER BY nome")]


@public.post("/trips")
def create_trip(body: s.TripIn):
    with db.tx() as c:
        seq, proto = next_protocol(c, "trips", "SRE")
        tid = str(uuid.uuid4())
        c.execute(
            """INSERT INTO trips (id, seq, protocolo, solicitante_nome, solicitante_email, diretoria, tipo,
               data_servico, data_saida, hora_saida, hora_retorno, roteiro, motorista_aguarda, passageiros,
               destinos, objetivo, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pendente', ?)""",
            (tid, seq, proto, body.solicitante_nome.strip(), str(body.solicitante_email), body.diretoria, body.tipo,
             body.data_servico, body.data_saida, body.hora_saida, body.hora_retorno, body.roteiro,
             int(body.motorista_aguarda), body.passageiros,
             db.dumps([d.model_dump() for d in body.destinos]), body.objetivo.strip(), now_iso()),
        )
        row = c.execute("SELECT * FROM trips WHERE id=?", (tid,)).fetchone()
    mailer.notify(
        str(body.solicitante_email), f"SRE Frota — solicitação {proto} recebida",
        f"Olá, {body.solicitante_nome}.\n\nSua solicitação de saída em {fmt_date(body.data_saida)} às {body.hora_saida} "
        f"foi registrada com o protocolo {proto} e aguarda análise.\n",
    )
    return trip_base(row)


@public.get("/caronas/disponiveis")
def ride_offers():
    with db.tx() as c:
        rows = c.execute(
            "SELECT * FROM trips WHERE status='deferida' AND vehicle_id IS NOT NULL AND data_saida >= ? "
            "ORDER BY data_saida, hora_saida", (today_br(),)).fetchall()
        out = []
        for r in rows:
            sv = seats(c, r)
            v = _one(c, "vehicles", r["vehicle_id"])
            if sv is None or v is None:
                continue
            out.append({
                "trip_id": r["id"], "protocolo": r["protocolo"], "diretoria": r["diretoria"],
                "data_saida": r["data_saida"], "hora_saida": r["hora_saida"], "hora_retorno": r["hora_retorno"],
                "roteiro": r["roteiro"], "destinos": db.loads(r["destinos"]),
                "veiculo": f"{v['modelo']} — {v['placa']}", "vagas_totais": sv[0], "vagas_disponiveis": sv[1],
                "vagas_ocupadas": sv[0] - sv[1], "objetivo": r["objetivo"], "solicitante_nome": r["solicitante_nome"],
            })
        return out


@public.post("/caronas")
def create_carona(body: s.CaronaIn):
    with db.tx() as c:
        trip = _one(c, "trips", body.trip_id)
        if trip is None or trip["status"] != "deferida":
            raise HTTPException(404, "Viagem não encontrada ou indisponível para carona")
        sv = seats(c, trip)
        if sv is None or sv[1] <= 0:
            raise HTTPException(409, "Esta viagem não possui vagas disponíveis")
        seq, proto = next_protocol(c, "caronas", "CAR")
        cid = str(uuid.uuid4())
        c.execute(
            "INSERT INTO caronas (id, seq, protocolo, trip_id, nome, email, diretoria, motivo, status, created_at) "
            "VALUES (?,?,?,?,?,?,?,?, 'pendente', ?)",
            (cid, seq, proto, trip["id"], body.nome.strip(), str(body.email), body.diretoria, body.motivo.strip(), now_iso()))
        row = c.execute("SELECT * FROM caronas WHERE id=?", (cid,)).fetchone()
    mailer.notify(
        str(body.email), f"SRE Frota — pedido de carona {proto} recebido",
        f"Olá, {body.nome}.\n\nSeu pedido de carona na viagem {trip['protocolo']} foi registrado com o protocolo {proto}.\n",
    )
    return carona_out(row)


@public.get("/acompanhar")
def track(q: str = ""):
    q = q.strip()
    if len(q) < 3:
        return {"trips": [], "caronas": []}
    with db.tx() as c:
        trips = c.execute(
            "SELECT * FROM trips WHERE protocolo = ? COLLATE NOCASE OR solicitante_email = ? COLLATE NOCASE "
            "ORDER BY created_at DESC", (q, q)).fetchall()
        caronas = c.execute(
            "SELECT * FROM caronas WHERE protocolo = ? COLLATE NOCASE OR email = ? COLLATE NOCASE "
            "ORDER BY created_at DESC", (q, q)).fetchall()
        t_out = []
        for r in trips:
            v, d = _one(c, "vehicles", r["vehicle_id"]), _one(c, "drivers", r["driver_id"])
            show = r["status"] in ("deferida", "concluida")
            t_out.append({
                "protocolo": r["protocolo"], "tipo": r["tipo"], "status": r["status"],
                "data_saida": r["data_saida"], "hora_saida": r["hora_saida"], "hora_retorno": r["hora_retorno"],
                "created_at": r["created_at"], "destinos": db.loads(r["destinos"]),
                "veiculo": f"{v['modelo']} — {v['placa']}" if v and show else None,
                "motorista": d["nome"] if d and show else None, "admin_obs": r["admin_obs"],
            })
        c_out = []
        for r in caronas:
            trip = _one(c, "trips", r["trip_id"])
            dest = " → ".join(x["municipio"] for x in db.loads(trip["destinos"])) if trip else ""
            c_out.append({
                "protocolo": r["protocolo"], "trip_protocolo": trip["protocolo"] if trip else "",
                "status": r["status"], "destino": dest, "data_saida": trip["data_saida"] if trip else "",
                "hora_saida": trip["hora_saida"] if trip else "", "nome": r["nome"], "admin_obs": r["admin_obs"],
            })
        return {"trips": t_out, "caronas": c_out}


# --------------------------------------------------------------------------- auth
@public.post("/auth/login")
def login(body: s.LoginIn, response: Response):
    import hmac

    if not hmac.compare_digest(body.password.encode(), config.ADMIN_PASSWORD.encode()):
        raise HTTPException(401, "Senha inválida")
    response.set_cookie(
        auth.COOKIE, auth.make_token(), httponly=True, samesite="lax", secure=config.COOKIE_SECURE,
        max_age=config.SESSION_HOURS * 3600, path="/")
    return {"admin": True}


@public.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(auth.COOKIE, path="/")
    return {"admin": False}


@public.get("/auth/me")
def me(request: Request):
    return {"admin": auth.is_admin(request)}


# --------------------------------------------------------------------------- admin
admin = APIRouter(prefix="/api/admin", dependencies=[Depends(auth.require_admin)])


@admin.get("/trips")
def admin_trips():
    with db.tx() as c:
        rows = c.execute("SELECT * FROM trips ORDER BY created_at DESC").fetchall()
        return [trip_admin(c, r) for r in rows]


@admin.patch("/trips/{trip_id}/decisao")
def decide_trip(trip_id: str, body: s.TripDecision):
    with db.tx() as c:
        trip = _one(c, "trips", trip_id)
        if trip is None:
            raise HTTPException(404, "Solicitação não encontrada")
        if body.acao == "deferir":
            if not body.vehicle_id or not body.driver_id:
                raise HTTPException(400, "Selecione o veículo e o motorista")
            v, d = _one(c, "vehicles", body.vehicle_id), _one(c, "drivers", body.driver_id)
            if v is None or d is None or not v["ativo"] or not d["ativo"]:
                raise HTTPException(400, "Veículo ou motorista inválido/inativo")
            if trip["passageiros"] > v["vagas"] - 1:
                raise HTTPException(400, "O veículo não comporta o número de passageiros solicitado")
            c.execute(
                "UPDATE trips SET status='deferida', vehicle_id=?, driver_id=?, admin_obs=?, decided_at=? WHERE id=?",
                (v["id"], d["id"], body.obs.strip(), now_iso(), trip_id))
        else:
            c.execute(
                "UPDATE trips SET status='indeferida', admin_obs=?, decided_at=? WHERE id=?",
                (body.obs.strip(), now_iso(), trip_id))
        row = c.execute("SELECT * FROM trips WHERE id=?", (trip_id,)).fetchone()
        out = trip_admin(c, row)
    if body.acao == "deferir":
        extra = f"\nVeículo: {out['vehicle']['modelo']} — {out['vehicle']['placa']}\nMotorista: {out['driver']['nome']}\n"
        subject, head = f"SRE Frota — solicitação {out['protocolo']} deferida", "foi DEFERIDA."
    else:
        extra, subject, head = "", f"SRE Frota — solicitação {out['protocolo']} indeferida", "foi INDEFERIDA."
    obs = f"\nObservação da administração: {out['admin_obs']}\n" if out["admin_obs"] else ""
    mailer.notify(out["solicitante_email"], subject,
                  f"Olá, {out['solicitante_nome']}.\n\nSua solicitação {out['protocolo']} {head}{extra}{obs}")
    return out


@admin.patch("/trips/{trip_id}/status")
def set_trip_status(trip_id: str, body: s.StatusIn):
    with db.tx() as c:
        if _one(c, "trips", trip_id) is None:
            raise HTTPException(404, "Solicitação não encontrada")
        c.execute("UPDATE trips SET status=? WHERE id=?", (body.status, trip_id))
        return trip_admin(c, c.execute("SELECT * FROM trips WHERE id=?", (trip_id,)).fetchone())


@admin.delete("/trips/{trip_id}", status_code=204)
def delete_trip(trip_id: str):
    with db.tx() as c:
        if _one(c, "trips", trip_id) is None:
            raise HTTPException(404, "Solicitação não encontrada")
        c.execute("DELETE FROM caronas WHERE trip_id=?", (trip_id,))
        c.execute("DELETE FROM trips WHERE id=?", (trip_id,))
    return Response(status_code=204)


@admin.get("/trips/{trip_id}/guia")
def driver_guide(trip_id: str):
    with db.tx() as c:
        trip = _one(c, "trips", trip_id)
        if trip is None:
            raise HTTPException(404, "Solicitação não encontrada")
        caronas = c.execute("SELECT * FROM caronas WHERE trip_id=? AND status='deferida' ORDER BY created_at", (trip_id,)).fetchall()
        return {
            "trip": trip_admin(c, trip),
            "vehicle": vehicle_out(_one(c, "vehicles", trip["vehicle_id"])),
            "driver": driver_out(_one(c, "drivers", trip["driver_id"])),
            "caronas": [carona_out(r) for r in caronas],
            "emitido_em": now_iso(),
        }


@admin.get("/caronas")
def admin_caronas():
    with db.tx() as c:
        rows = c.execute("SELECT * FROM caronas ORDER BY created_at DESC").fetchall()
        out = []
        for r in rows:
            trip = _one(c, "trips", r["trip_id"])
            sv = seats(c, trip) if trip else None
            d = carona_out(r)
            d.update({
                "trip_protocolo": trip["protocolo"] if trip else "",
                "trip_data_saida": trip["data_saida"] if trip else "",
                "trip_destino": " → ".join(x["municipio"] for x in db.loads(trip["destinos"])) if trip else "",
                "vagas_disponiveis": sv[1] if sv else 0, "admin_obs": r["admin_obs"], "decided_at": r["decided_at"],
            })
            out.append(d)
        return out


@admin.patch("/caronas/{carona_id}/decisao")
def decide_carona(carona_id: str, body: s.CaronaDecision):
    with db.tx() as c:
        r = _one(c, "caronas", carona_id)
        if r is None:
            raise HTTPException(404, "Pedido de carona não encontrado")
        trip = _one(c, "trips", r["trip_id"])
        if body.acao == "deferir":
            sv = seats(c, trip) if trip else None
            if r["status"] != "deferida" and (sv is None or sv[1] <= 0):
                raise HTTPException(409, "Não há vagas disponíveis nesta viagem")
        status = "deferida" if body.acao == "deferir" else "indeferida"
        c.execute("UPDATE caronas SET status=?, admin_obs=?, decided_at=? WHERE id=?",
                  (status, body.obs.strip(), now_iso(), carona_id))
        r = c.execute("SELECT * FROM caronas WHERE id=?", (carona_id,)).fetchone()
        sv = seats(c, trip) if trip else None
        out = carona_out(r)
        out.update({
            "trip_protocolo": trip["protocolo"] if trip else "",
            "trip_data_saida": trip["data_saida"] if trip else "",
            "trip_destino": " → ".join(x["municipio"] for x in db.loads(trip["destinos"])) if trip else "",
            "vagas_disponiveis": sv[1] if sv else 0, "admin_obs": r["admin_obs"], "decided_at": r["decided_at"],
        })
    obs = f"\nObservação da administração: {out['admin_obs']}\n" if out["admin_obs"] else ""
    mailer.notify(out["email"], f"SRE Frota — carona {out['protocolo']} {status}",
                  f"Olá, {out['nome']}.\n\nSeu pedido de carona {out['protocolo']} (viagem {out['trip_protocolo']}) foi {status.upper()}.{obs}")
    return out


# ---- cadastros (veículos, motoristas, diretorias)
def _registry(path: str, table: str, model, cols: list[str], bools: list[str], order: str, in_use_col: str | None):
    def ser(r):
        d = {k: r[k] for k in ["id", *cols]}
        for b in bools:
            d[b] = bool(d[b])
        return d

    def values(body):
        data = body.model_dump()
        return [int(data[k]) if k in bools else (data[k].strip() if isinstance(data[k], str) else data[k]) for k in cols]

    @admin.get(f"/{path}", name=f"list_{path}")
    def _list():
        with db.tx() as c:
            return [ser(r) for r in c.execute(f"SELECT * FROM {table} ORDER BY {order}")]

    @admin.post(f"/{path}", name=f"create_{path}")
    def _create(body: model):  # type: ignore[valid-type]
        with db.tx() as c:
            id_ = str(uuid.uuid4())
            try:
                c.execute(f"INSERT INTO {table} (id, {', '.join(cols)}) VALUES (?, {', '.join('?' * len(cols))})", (id_, *values(body)))
            except Exception:
                raise HTTPException(409, "Registro duplicado")
            return ser(c.execute(f"SELECT * FROM {table} WHERE id=?", (id_,)).fetchone())

    @admin.put(f"/{path}/{{item_id}}", name=f"update_{path}")
    def _update(item_id: str, body: model):  # type: ignore[valid-type]
        with db.tx() as c:
            if _one(c, table, item_id) is None:
                raise HTTPException(404, "Registro não encontrado")
            try:
                c.execute(f"UPDATE {table} SET {', '.join(f'{k}=?' for k in cols)} WHERE id=?", (*values(body), item_id))
            except Exception:
                raise HTTPException(409, "Registro duplicado")
            return ser(c.execute(f"SELECT * FROM {table} WHERE id=?", (item_id,)).fetchone())

    @admin.delete(f"/{path}/{{item_id}}", status_code=204, name=f"delete_{path}")
    def _delete(item_id: str):
        with db.tx() as c:
            if _one(c, table, item_id) is None:
                raise HTTPException(404, "Registro não encontrado")
            if in_use_col and c.execute(f"SELECT 1 FROM trips WHERE {in_use_col}=? LIMIT 1", (item_id,)).fetchone():
                raise HTTPException(409, "Registro em uso por solicitações. Desative-o em vez de excluir.")
            c.execute(f"DELETE FROM {table} WHERE id=?", (item_id,))
        return Response(status_code=204)


_registry("vehicles", "vehicles", s.VehicleIn, ["modelo", "placa", "vagas", "ativo"], ["ativo"], "modelo", "vehicle_id")
_registry("drivers", "drivers", s.DriverIn, ["nome", "telefone", "cnh", "ativo"], ["ativo"], "nome", "driver_id")
_registry("diretorias", "diretorias", s.DiretoriaIn, ["nome"], [], "nome", None)


# --------------------------------------------------------------------------- app
def create_app() -> FastAPI:
    app = FastAPI(title="SRE Frota API")
    app.include_router(public)
    app.include_router(admin)

    static = Path(config.STATIC_DIR)
    if static.is_dir():
        if (static / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa(full_path: str):
            if full_path.startswith("api/"):
                raise HTTPException(404)
            f = (static / full_path).resolve()
            if full_path and f.is_file() and static.resolve() in f.parents:
                return FileResponse(f)
            return FileResponse(static / "index.html")

    return app


app = create_app()
