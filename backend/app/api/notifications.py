"""Disparo de correos posterior al commit.

Se usa una sesion nueva porque la de la peticion ya se cerro cuando corre la
tarea de fondo. Un fallo aqui nunca afecta la respuesta HTTP.
"""

import logging
from uuid import UUID

from fastapi import BackgroundTasks

from app.infrastructure.database import SessionLocal
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


async def send_reservation_email(reservation_id: UUID, template: str) -> None:
    try:
        async with SessionLocal() as session:
            await NotificationService(session).notify_reservation(reservation_id, template)
    except Exception:  # noqa: BLE001 - la notificacion nunca rompe el flujo
        logger.exception("Could not dispatch '%s' for reservation %s", template, reservation_id)


def schedule_notification(
    background: BackgroundTasks, reservation_id: UUID, template: str
) -> None:
    background.add_task(send_reservation_email, reservation_id, template)
