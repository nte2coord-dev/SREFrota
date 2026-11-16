import os
from pathlib import Path

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).resolve().parent.parent / "data" / "frota.db"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
SECRET_KEY = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
SESSION_HOURS = int(os.environ.get("SESSION_HOURS", "12"))
STATIC_DIR = os.environ.get("STATIC_DIR", str(Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"))

# E-mail (opcional). Sem SMTP_HOST as mensagens apenas vão para o log.
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "frota@sre.local")
SMTP_TLS = os.environ.get("SMTP_TLS", "true").lower() == "true"

SEED_DIRETORIAS = [
    "DAFI - Diretoria Administrativa e Financeira",
    "DIPE - Diretoria Pedagógica",
    "DIPE - Inspeção Escolar",
    "DIRE - Diretoria de Pessoal",
    "Gabinete",
]
