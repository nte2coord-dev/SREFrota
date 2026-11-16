import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

from . import config

_lock = threading.RLock()
_conn: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS diretorias (id TEXT PRIMARY KEY, nome TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY, modelo TEXT NOT NULL, placa TEXT NOT NULL, vagas INTEGER NOT NULL, ativo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL DEFAULT '', cnh TEXT NOT NULL DEFAULT '', ativo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY, seq INTEGER NOT NULL, protocolo TEXT NOT NULL UNIQUE,
  solicitante_nome TEXT NOT NULL, solicitante_email TEXT NOT NULL, diretoria TEXT NOT NULL,
  tipo TEXT NOT NULL, data_servico TEXT NOT NULL, data_saida TEXT NOT NULL,
  hora_saida TEXT NOT NULL, hora_retorno TEXT NOT NULL, roteiro TEXT NOT NULL,
  motorista_aguarda INTEGER NOT NULL, passageiros INTEGER NOT NULL,
  destinos TEXT NOT NULL, objetivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  vehicle_id TEXT, driver_id TEXT, admin_obs TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, decided_at TEXT);
CREATE TABLE IF NOT EXISTS caronas (
  id TEXT PRIMARY KEY, seq INTEGER NOT NULL, protocolo TEXT NOT NULL UNIQUE,
  trip_id TEXT NOT NULL, nome TEXT NOT NULL, email TEXT NOT NULL, diretoria TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pendente',
  admin_obs TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, decided_at TEXT);
"""


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        if config.DB_PATH != ":memory:":
            Path(config.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.executescript(SCHEMA)
        _seed(_conn)
    return _conn


def reset_for_tests() -> None:
    global _conn
    if _conn is not None:
        _conn.close()
    _conn = None


@contextmanager
def tx():
    with _lock:
        c = get_conn()
        try:
            yield c
            c.commit()
        except Exception:
            c.rollback()
            raise


def _seed(c: sqlite3.Connection) -> None:
    import uuid

    if c.execute("SELECT COUNT(*) FROM diretorias").fetchone()[0] == 0:
        for nome in config.SEED_DIRETORIAS:
            c.execute("INSERT INTO diretorias (id, nome) VALUES (?, ?)", (str(uuid.uuid4()), nome))
        c.commit()


def loads(s: str):
    return json.loads(s)


def dumps(o) -> str:
    return json.dumps(o, ensure_ascii=False)
