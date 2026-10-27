"""Send explicitly requested demonstration emails without creating real records.

Run from the directory containing the configured .env:
    PYTHONPATH=backend python -m app.notifications.send_previews --recipient you@example.com
"""

import argparse
import asyncio
from datetime import datetime, timedelta

from pydantic import TypeAdapter
from pydantic.networks import EmailStr

from app.core.config import settings
from app.infrastructure.database import SessionLocal
from app.services.notification_service import (
    STATUS_LABELS,
    SUBJECTS,
    NotificationService,
    render_notification,
)
from app.services.smtp_service import SmtpService

PREVIEW_STATUSES = {
    "reservation_created": "PENDING",
    "reservation_confirmed": "CONFIRMED",
    "reservation_cancelled": "CANCELLED",
    "reservation_completed": "COMPLETED",
}


def preview_content(template: str, recipient: str) -> tuple[str, str]:
    """Demonstration data only: never issue a real invitation token."""
    context = {
        "is_preview": True,
        "customer_name": recipient.split("@", 1)[0].upper(),
        "customer_email": recipient,
        "organization_name": "Organización de demostración",
        "facility_name": "Cancha de demostración",
        "facility_location": "Zona deportiva · Ejemplo",
        "date_label": (datetime.now(settings.timezone) + timedelta(days=1)).strftime("%d/%m/%Y"),
        "time_label": "16:00 - 17:00",
        "amount": "40.00 USD",
        "reservation_id": "DEMO-001-NO-ES-UNA-RESERVA",
        "admin_note": "Ejemplo de cancelación por mantenimiento de la instalación.",
    }
    if template == "client_invitation":
        subject = "Bienvenida y establecimiento de contraseña"
    else:
        subject = SUBJECTS[template]
        context["status_label"] = STATUS_LABELS[PREVIEW_STATUSES[template]]
    html = render_notification(template, **context)
    return subject, html


async def send_previews(recipients: list[str], *, expected_sender: str | None = None) -> int:
    failures = 0
    async with SessionLocal() as session:
        if expected_sender:
            credentials = await SmtpService(session).resolve()
            expected = expected_sender.strip().casefold()
            if credentials is None or (
                credentials.from_email.strip().casefold() != expected
                or credentials.username.strip().casefold() != expected
            ):
                print("SMTP identity mismatch: no emails sent.", flush=True)
                return 1
            print(f"Verified SMTP account and sender: {credentials.from_email}", flush=True)
        service = NotificationService(session)
        for recipient in dict.fromkeys(recipients):
            result = await service.send_test(recipient=recipient)
            print(f"{recipient} | smtp_test | {result.status}" + (f" | {result.detail}" if result.detail else ""), flush=True)
            if result.status != "SENT":
                # Do not repeatedly attempt five messages when the SMTP check failed.
                failures += 1
                continue
            for template in ["client_invitation", *PREVIEW_STATUSES]:
                subject, html = preview_content(template, recipient)
                result = await service._send(
                    recipient=recipient,
                    subject=f"[PRUEBA] {subject}",
                    html=html,
                    text=(f"Hola, {recipient.split('@', 1)[0].upper()}:\n"
                          f"Vista previa de {subject}. Son datos ficticios de SIRID.\n"
                          "No se han creado reservas, confirmado pagos ni activado cuentas.\n"
                          "Los botones están deshabilitados en esta demostración."),
                )
                print(f"{recipient} | {template} | {result.status}" + (f" | {result.detail}" if result.detail else ""), flush=True)
                if result.status != "SENT":
                    failures += 1
    return failures


def main() -> None:
    parser = argparse.ArgumentParser(description="Send SMTP and existing template previews to explicit recipients.")
    parser.add_argument("--recipient", action="append", required=True, help="Recipient email; may be repeated.")
    parser.add_argument("--expected-sender", help="Abort unless both SMTP login and From match this email.")
    arguments = parser.parse_args()
    validator = TypeAdapter(EmailStr)
    try:
        recipients = [str(validator.validate_python(value)) for value in arguments.recipient]
        expected_sender = str(validator.validate_python(arguments.expected_sender)) if arguments.expected_sender else None
    except ValueError:
        parser.error("Every recipient must be a valid email address.")
    raise SystemExit(1 if asyncio.run(send_previews(recipients, expected_sender=expected_sender)) else 0)


if __name__ == "__main__":
    main()
