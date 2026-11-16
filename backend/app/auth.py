import base64
import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from . import config

COOKIE = "sre_session"


def _sign(payload: str) -> str:
    return hmac.new(config.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def make_token() -> str:
    exp = str(int(time.time()) + config.SESSION_HOURS * 3600)
    return base64.urlsafe_b64encode(f"admin:{exp}".encode()).decode() + "." + _sign(f"admin:{exp}")


def valid_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    body, sig = token.rsplit(".", 1)
    try:
        payload = base64.urlsafe_b64decode(body.encode()).decode()
        role, exp = payload.split(":")
    except Exception:
        return False
    return role == "admin" and hmac.compare_digest(sig, _sign(payload)) and int(exp) > time.time()


def is_admin(request: Request) -> bool:
    return valid_token(request.cookies.get(COOKIE))


def require_admin(request: Request) -> None:
    if not is_admin(request):
        raise HTTPException(status_code=401, detail="Não autenticado")
