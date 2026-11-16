import logging
import smtplib
import threading
from email.message import EmailMessage

from . import config

log = logging.getLogger("sre.mail")


def _send(to: str, subject: str, body: str) -> None:
    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = config.SMTP_FROM, to, subject
        msg.set_content(body)
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as s:
            if config.SMTP_TLS:
                s.starttls()
            if config.SMTP_USER:
                s.login(config.SMTP_USER, config.SMTP_PASSWORD)
            s.send_message(msg)
    except Exception:
        log.exception("falha ao enviar e-mail para %s", to)


def notify(to: str, subject: str, body: str) -> None:
    """Envia em segundo plano; sem SMTP configurado, apenas registra no log."""
    if not config.SMTP_HOST:
        log.info("[e-mail simulado] para=%s assunto=%s\n%s", to, subject, body)
        return
    threading.Thread(target=_send, args=(to, subject, body), daemon=True).start()
