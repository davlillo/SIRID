"""Correo transaccional por Gmail SMTP.

Se ejecuta despues del commit. Un fallo SMTP no revierte la reserva: se registra
en `notification_logs` para reintento administrativo (spect/03-reglas-de-negocio.md).
"""

import logging
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from uuid import UUID

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.errors import DomainError
from app.infrastructure.models import NotificationLogModel, OrganizationModel, UserModel
from app.repositories.reservation_repository import ReservationRepository
from app.services.invitation_service import InvitationService
from app.services.smtp_service import SmtpService

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
    "client_invitation": ("RESERVAS / SU ACCESO PERSONAL", "#191817"),
    "smtp_test": ("CORREO / VERIFICACIÓN SMTP", "#191817"),
}

STATUS_LABELS = {
    "PENDING": "Pendiente de confirmación",
    "CONFIRMED": "Confirmada",
    "CANCELLED": "Cancelada",
    "COMPLETED": "Completada",
}

_environment = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "j2"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_notification(template: str, **context) -> str:
    """Use the same branded, escaped templates for live mail and previews."""
    if template not in HEADERS:
        raise ValueError("Unknown notification template")
    label, color = HEADERS[template]
    return _environment.get_template(f"{template}.html.j2").render(
        header_label=label,
        header_color=color,
        **context,
    )


@dataclass(frozen=True)
class NotificationResult:
    status: str  # SENT | FAILED | SKIPPED
    detail: str | None = None


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.reservations = ReservationRepository(session)

    async def send_test(self, *, recipient: str, organization_id: UUID | None = None) -> NotificationResult:
        return await self._send(
            recipient=recipient,
            subject="Prueba de configuración de correo",
            html=render_notification(
                "smtp_test", customer_name="responsable de la prueba", recipient=recipient,
                organization_name="SIRID", is_preview=True,
            ),
            text="Este correo verifica el envío SMTP desde SIRID. No requiere ninguna acción.",
            organization_id=organization_id,
        )

    async def notify_reservation(self, reservation_id: UUID, template: str) -> NotificationResult:
        reservation = await self.reservations.get_by_id(reservation_id)
        if reservation is None:
            return NotificationResult("FAILED", "Reservation no longer exists.")

        local_start = reservation.starts_at.astimezone(settings.timezone)
        local_end = reservation.ends_at.astimezone(settings.timezone)
        organization = await self.session.get(OrganizationModel, reservation.organization_id)
        organization_name = organization.name if organization else "su organización"
        status_label = STATUS_LABELS.get(reservation.status.value, reservation.status.value)
        date_label = local_start.strftime("%d/%m/%Y")
        time_label = f"{local_start.strftime('%H:%M')} - {local_end.strftime('%H:%M')}"
        body = render_notification(
            template,
            organization_name=organization_name,
            customer_name=reservation.customer.name,
            facility_name=reservation.facility.name,
            facility_location=reservation.facility.location_label,
            status=reservation.status.value,
            status_label=status_label,
            date_label=date_label,
            time_label=time_label,
            amount=f"{reservation.quoted_amount:.2f} {reservation.currency}",
            reservation_id=str(reservation.id),
            admin_note=reservation.admin_note,
            frontend_url=settings.frontend_url,
        )

        result = await self._send(
            recipient=reservation.customer.email,
            subject=SUBJECTS.get(template, "Actualizacion de reserva"),
            html=body,
            text=(
                f"Hola, {reservation.customer.name}:\n\n"
                f"{SUBJECTS.get(template, 'Actualización de reserva')}\n"
                f"Organización: {organization_name}\nInstalación: {reservation.facility.name}\n"
                f"Ubicación: {reservation.facility.location_label}\nFecha: {date_label}\n"
                f"Horario: {time_label}\nEstado: {status_label}\n"
                f"Importe de la reserva: {reservation.quoted_amount:.2f} {reservation.currency}\n"
                + (f"Nota del encargado: {reservation.admin_note}\n" if reservation.admin_note else "")
                + f"\nConsulte sus reservas en {settings.frontend_url.rstrip('/')}/mis-reservas"
            ),
            organization_id=reservation.organization_id,
        )
        await self._log(reservation_id, reservation.customer.email, template, result)
        return result

    async def notify_client(self, client_id: UUID, *, resend: bool = False) -> NotificationResult:
        user = await self.session.get(UserModel, client_id)
        if user is None or not user.is_active:
            return NotificationResult("FAILED", "Client no longer exists or is disabled.")
        organization = await self.session.get(OrganizationModel, user.organization_id)
        if organization is None or not organization.is_active:
            return NotificationResult("FAILED", "Organization is disabled.")
        # An assigned initial password must not bypass client-owned password setup.
        user, token = await InvitationService(self.session).issue(client_id)
        # Fragment tokens do not appear in HTTP access logs or referrer URLs.
        activation_url = f"{settings.frontend_url.rstrip('/')}/activar-cuenta#{token}"
        body = render_notification(
            "client_invitation",
            customer_name=user.name,
            customer_email=user.email,
            organization_name=organization.name,
            activation_url=activation_url,
            frontend_url=settings.frontend_url,
        )
        result = await self._send(
            recipient=user.email,
            subject=f"Establezca su contraseña en {organization.name}",
            html=body,
            text=(f"Su cuenta pertenece a {organization.name}. "
                  f"Establezca su contraseña (enlace válido por 24 horas): {activation_url}"),
        )
        self.session.add(NotificationLogModel(
            client_id=user.id, recipient=user.email, template="client_invitation",
            status=result.status, error_detail=result.detail,
        ))
        await self.session.commit()
        return result

    async def _send(
        self, *, recipient: str, subject: str, html: str,
        organization_id: UUID | None = None, text: str | None = None,
    ) -> NotificationResult:
        try:
            credentials = await SmtpService(self.session).resolve(organization_id)
        except DomainError:
            return NotificationResult("FAILED", "Organization SMTP configuration is invalid.")
        if credentials is None:
            # Sin credenciales el sistema sigue funcionando; queda registrado.
            logger.info("SMTP not configured, skipping notification to %s", recipient)
            return NotificationResult("SKIPPED", "SMTP credentials are not configured.")

        message = EmailMessage()
        message["From"] = formataddr((credentials.from_name, credentials.from_email))
        message["To"] = recipient
        message["Subject"] = f"SIRID · {subject}"
        message.set_content(
            text or "Tu cliente de correo no soporta HTML. Revisa tus reservas en "
            f"{settings.frontend_url}/mis-reservas"
        )
        message.add_alternative(html, subtype="html")

        try:
            await aiosmtplib.send(
                message,
                hostname=credentials.host,
                port=credentials.port,
                username=credentials.username,
                password=credentials.password,
                use_tls=credentials.port == 465,
                start_tls=credentials.port != 465,
                timeout=15,
            )
            return NotificationResult("SENT")
        except (aiosmtplib.SMTPException, OSError, TimeoutError) as error:
            # Nunca se registran credenciales ni el contenido del mensaje.
            logger.warning("Notification to %s failed: %s", recipient, type(error).__name__)
            return NotificationResult("FAILED", f"{type(error).__name__}: SMTP delivery failed.")

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
