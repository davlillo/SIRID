"""Registro de eventos de reserva. Nunca guarda tokens ni datos sensibles."""

from uuid import UUID

from app.domain.enums import ReservationEventType, ReservationStatus
from app.infrastructure.models import ReservationEventModel
from app.repositories.reservation_repository import ReservationRepository


class AuditService:
    def __init__(self, repository: ReservationRepository) -> None:
        self.repository = repository

    def record(
        self,
        *,
        reservation_id: UUID,
        actor_id: UUID | None,
        event_type: ReservationEventType,
        from_status: ReservationStatus | None,
        to_status: ReservationStatus | None,
        metadata: dict | None = None,
    ) -> ReservationEventModel:
        """Se agrega a la sesion actual: el evento vive en la misma transaccion
        que el cambio de estado que describe."""
        return self.repository.add_event(
            ReservationEventModel(
                reservation_id=reservation_id,
                actor_id=actor_id,
                event_type=event_type,
                from_status=from_status,
                to_status=to_status,
                event_metadata=metadata or {},
            )
        )
