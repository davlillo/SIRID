"""Correo transaccional por Gmail SMTP.

Se ejecuta despues del commit. Un fallo SMTP no revierte la reserva: se registra
en `notification_logs` para reintento administrativo (spect/03-reglas-de-negocio.md).
"""

import logging
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path
from uuid import UUID

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.models import NotificationLogModel
from app.repositories.reservation_repository import ReservationRepository

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "notifications" / "templates"

SUBJECTS = {
    "reservation_created": "Solicitud de reserva recibida",
    "reservation_confirmed": "Reserva confirmada",
    "reservation_cancelled": "Reserva cancelada",
    "reservation_completed": "Reserva completada",
}

# Cabecera de cada plantilla. Se pasa desde aqui porque Jinja exige que
# `extends` sea el primer tag del archivo hijo.
HEADERS = {
    "reservation_created": ("RESERVA / SOLICITUD RECIBIDA", "#191817"),
    "reservation_confirmed": ("RESERVA / CONFIRMADA", "#4C5644"),
    "reservation_cancelled": ("RESERVA / CANCELADA", "#49352C"),
    "reservation_completed": ("RESERVA / COMPLETADA", "#49352C"),
}

_environment = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


@dataclass(frozen=True)
class NotificationResult:
    status: str  # SENT | FAILED | SKIPPED
    detail: str | None = None


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.reservations = ReservationRepository(session)

    async def notify_reservation(self, reservation_id: UUID, template: str) -> NotificationResult:
        reservation = await self.reservations.get_by_id(reservation_id)
        if reservation is None:
            return NotificationResult("FAILED", "Reservation no longer exists.")

        local_start = reservation.starts_at.astimezone(settings.timezone)
        local_end = reservation.ends_at.astimezone(settings.timezone)
        header_label, header_color = HEADERS.get(template, ("RESERVA", "#191817"))
        body = _environment.get_template(f"{template}.html.j2").render(
            header_label=header_label,
            header_color=header_color,
            customer_name=reservation.customer.name,
            facility_name=reservation.facility.name,
            facility_location=reservation.facility.location_label,
            status=reservation.status.value,
            date_label=local_start.strftime("%d/%m/%Y"),
            time_label=f"{local_start.strftime('%H:%M')} - {local_end.strftime('%H:%M')}",
            amount=f"{reservation.quoted_amount:.2f} {reservation.currency}",
            reservation_id=str(reservation.id),
            admin_note=reservation.admin_note,
            frontend_url=settings.frontend_url,
        )

        result = await self._send(
            recipient=reservation.customer.email,
            subject=SUBJECTS.get(template, "Actualizacion de reserva"),
            html=body,
        )
        await self._log(reservation_id, reservation.customer.email, template, result)
        return result

    async def _send(self, *, recipient: str, subject: str, html: str) -> NotificationResult:
        if not settings.smtp_configured:
            # Sin credenciales el sistema sigue funcionando; queda registrado.
            logger.info("SMTP not configured, skipping notification to %s", recipient)
            return NotificationResult("SKIPPED", "SMTP credentials are not configured.")

        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = recipient
        message["Subject"] = f"SIRID · {subject}"
        message.set_content(
            "Tu cliente de correo no soporta HTML. Revisa tus reservas en "
            f"{settings.frontend_url}/mis-reservas"
        )
        message.add_alternative(html, subtype="html")

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_username,
                password=settings.smtp_app_password,
                start_tls=True,
                timeout=15,
            )
            return NotificationResult("SENT")
        except (aiosmtplib.SMTPException, OSError, TimeoutError) as error:
            # Nunca se registran credenciales ni el contenido del mensaje.
            logger.warning("Notification to %s failed: %s", recipient, type(error).__name__)
            return NotificationResult("FAILED", f"{type(error).__name__}: {error}"[:1000])

    async def _log(
        self, reservation_id: UUID, recipient: str, template: str, result: NotificationResult
    ) -> None:
        self.reservations.add_notification_log(
            NotificationLogModel(
                reservation_id=reservation_id,
                recipient=recipient,
                template=template,
                status=result.status,
                error_detail=result.detail,
            )
        )
        await self.session.commit()
