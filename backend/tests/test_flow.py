import os

os.environ["DB_PATH"] = ":memory:"
os.environ["ADMIN_PASSWORD"] = "segredo"
os.environ["STATIC_DIR"] = "/nonexistent"

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import create_app

TRIP = {
    "solicitante_nome": "Maria", "solicitante_email": "maria@sre.mg.gov.br", "diretoria": "Gabinete",
    "tipo": "Rotina", "data_servico": "2099-01-10", "data_saida": "2099-01-10", "hora_saida": "09:00",
    "hora_retorno": "17:00", "roteiro": "Ida e volta", "motorista_aguarda": False, "passageiros": 2,
    "destinos": [{"municipio": "Belo Horizonte", "local": "EE Afonso Pena", "endereco": "Rua A, 1"}],
    "objetivo": "Reunião",
}


@pytest.fixture()
def client():
    db.reset_for_tests()
    with TestClient(create_app()) as c:
        yield c


def login(c):
    assert c.post("/api/auth/login", json={"password": "segredo"}).status_code == 200


def test_diretorias_seed(client):
    assert len(client.get("/api/diretorias").json()) == 5


def test_admin_requires_auth(client):
    assert client.get("/api/admin/trips").status_code == 401
    assert client.get("/api/auth/me").json() == {"admin": False}
    assert client.post("/api/auth/login", json={"password": "x"}).status_code == 401


def test_full_flow(client):
    t = client.post("/api/trips", json=TRIP).json()
    assert t["protocolo"].startswith("SRE-") and t["protocolo"].endswith("0001") and t["status"] == "pendente"
    assert client.get("/api/trips").status_code in (404, 405)

    login(client)
    assert client.get("/api/auth/me").json() == {"admin": True}
    v = client.post("/api/admin/vehicles", json={"modelo": "Cronos", "placa": "ABC-1D23", "vagas": 5, "ativo": True}).json()
    d = client.post("/api/admin/drivers", json={"nome": "João", "telefone": "1", "cnh": "2", "ativo": True}).json()

    # sem veículo/motorista não defere
    r = client.patch(f"/api/admin/trips/{t['id']}/decisao", json={"acao": "deferir", "obs": ""})
    assert r.status_code == 400
    r = client.patch(f"/api/admin/trips/{t['id']}/decisao",
                     json={"acao": "deferir", "vehicle_id": v["id"], "driver_id": d["id"], "obs": "ok"})
    assert r.status_code == 200 and r.json()["status"] == "deferida"
    assert r.json()["vagas_disponiveis"] == 2  # 5 lugares - motorista - 2 passageiros

    offers = client.get("/api/caronas/disponiveis").json()
    assert offers[0]["vagas_totais"] == 4 and offers[0]["vagas_disponiveis"] == 2
    assert offers[0]["vagas_ocupadas"] == 2 and offers[0]["objetivo"] == "Reunião" and offers[0]["solicitante_nome"] == "Maria"

    body = {"trip_id": t["id"], "nome": "Ana", "email": "ana@x.com", "diretoria": "Gabinete", "motivo": ""}
    c1 = client.post("/api/caronas", json=body).json()
    c2 = client.post("/api/caronas", json={**body, "nome": "Bia"}).json()
    # pedidos pendentes ainda não consomem vagas
    assert client.get("/api/caronas/disponiveis").json()[0]["vagas_disponiveis"] == 2
    for cid in (c1["id"], c2["id"]):
        assert client.patch(f"/api/admin/caronas/{cid}/decisao", json={"acao": "deferir", "obs": ""}).status_code == 200
    assert client.get("/api/caronas/disponiveis").json()[0]["vagas_disponiveis"] == 0
    assert client.post("/api/caronas", json=body).status_code == 409

    guide = client.get(f"/api/admin/trips/{t['id']}/guia").json()
    assert guide["driver"]["nome"] == "João" and len(guide["caronas"]) == 2

    # acompanhamento público (sem cookie)
    client.cookies.clear()
    tr = client.get("/api/acompanhar", params={"q": t["protocolo"]}).json()
    assert tr["trips"][0]["veiculo"] == "Cronos — ABC-1D23" and tr["trips"][0]["motorista"] == "João"
    assert len(client.get("/api/acompanhar", params={"q": "ana@x.com"}).json()["caronas"]) == 2
    assert client.get("/api/acompanhar", params={"q": "nada-aqui"}).json() == {"trips": [], "caronas": []}


def test_registry_in_use_and_indeferir(client):
    login(client)
    t = client.post("/api/trips", json=TRIP).json()
    r = client.patch(f"/api/admin/trips/{t['id']}/decisao", json={"acao": "indeferir", "obs": "sem frota"}).json()
    assert r["status"] == "indeferida" and r["admin_obs"] == "sem frota"
    assert client.patch(f"/api/admin/trips/{t['id']}/status", json={"status": "cancelada"}).json()["status"] == "cancelada"
    assert client.delete(f"/api/admin/trips/{t['id']}").status_code == 204
    assert client.get("/api/admin/trips").json() == []


def test_validation(client):
    bad = {**TRIP, "destinos": []}
    assert client.post("/api/trips", json=bad).status_code == 422
