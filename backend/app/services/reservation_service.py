"""Ciclo de vida de la reserva.

La reserva y su evento de auditoria se insertan en la misma transaccion. El
correo se dispara despues del commit, desde la capa HTTP.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.enums import ReservationEventType, ReservationStatus, UserRole
from app.domain.errors import (
    AdminRequired,
    NotReservationOwner,
    ReservationConflict,
    ReservationNotFound,
)
from app.domain.rules import (
    assert_completable,
    assert_period,
    assert_transition,
    assert_within_operating_hours,
)
from app.infrastructure.models import ReservationModel, UserModel
from app.repositories.reservation_repository import ReservationRepository
from app.services.audit_service import AuditService
from app.services.facility_service import FacilityService
from app.services.rate_service import RateService
from app.services.schedule_service import ScheduleService

OVERLAP_CONSTRAINT = "reservations_no_overlap"

STATUS_TO_EVENT = {
    ReservationStatus.CONFIRMED: ReservationEventType.CONFIRMED,
    ReservationStatus.CANCELLED: ReservationEventType.CANCELLED,
    ReservationStatus.COMPLETED: ReservationEventType.COMPLETED,
}


@dataclass(frozen=True)
class CreateReservation:
    facility_id: UUID
    starts_at: datetime
    ends_at: datetime
    customer_note: str | None = None


class ReservationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = ReservationRepository(session)
        self.facilities = FacilityService(session)
        self.schedules = ScheduleService(session)
        self.rates = RateService(session)
        self.audit = AuditService(self.repository)

    async def create(self, customer: UserModel, command: CreateReservation) -> ReservationModel:
        now = datetime.now(timezone.utc)

        facility = await self.facilities.require_bookable(command.facility_id)  # RN-10
        interval = assert_period(command.starts_at, command.ends_at, now)  # RN-03
        assert_within_operating_hours(  # RN-02
            interval,
            await self.schedules.operating_windows(facility.id),
            settings.timezone,
        )
        quote = await self.rates.quote(facility.id, interval)  # RN-04

        # Comprobacion previa: da un mensaje util, no garantiza nada por si sola.
        if await self.repository.active_in_period(facility.id, interval.start, interval.end):
            raise ReservationConflict(
                "The facility is not available for the requested period."
            )

        reservation = self.repository.add(
            ReservationModel(
                customer_id=customer.id,
                facility_id=facility.id,
                starts_at=interval.start,
                ends_at=interval.end,
                status=ReservationStatus.PENDING,
                quoted_amount=quote.amount,
                currency=quote.currency,
                customer_note=command.customer_note,
            )
        )
        # El INSERT ocurre aqui: es este flush, y no el commit, el que dispara
        # la exclusion constraint cuando dos peticiones compiten.
        await self._flush_or_conflict()

        self.audit.record(
            reservation_id=reservation.id,
            actor_id=customer.id,
            event_type=ReservationEventType.CREATED,
            from_status=None,
            to_status=ReservationStatus.PENDING,
            metadata={"rate_id": str(quote.rate_id), "rate_name": quote.rate_name},
        )

        await self._commit_or_conflict()
        await self.session.refresh(reservation)
        return reservation

    async def get_for_actor(self, reservation_id: UUID, actor: UserModel) -> ReservationModel:
        """RN-06: el cliente solo ve las suyas. Una ajena responde 404."""
        reservation = await self.repository.get_by_id(reservation_id)
        if reservation is None:
            raise ReservationNotFound("The requested reservation does not exist.")
        if actor.role != UserRole.ADMIN and reservation.customer_id != actor.id:
            raise NotReservationOwner("The requested reservation does not exist.")
        return reservation

    async def list_for_customer(
        self, customer: UserModel, *, page: int = 1, limit: int = 20
    ) -> tuple[list[ReservationModel], int]:
        return await self.repository.list_for_customer(customer.id, page=page, limit=limit)

    async def cancel(
        self, reservation_id: UUID, actor: UserModel, note: str | None = None
    ) -> ReservationModel:
        reservation = await self.get_for_actor(reservation_id, actor)
        return await self._transition(
            reservation, ReservationStatus.CANCELLED, actor, admin_note=note
        )

    async def confirm(self, reservation_id: UUID, admin: UserModel) -> ReservationModel:
        """RN-07: solo el administrador confirma."""
        reservation = await self._admin_reservation(reservation_id, admin)
        return await self._transition(reservation, ReservationStatus.CONFIRMED, admin)

    async def admin_cancel(
        self, reservation_id: UUID, admin: UserModel, note: str | None = None
    ) -> ReservationModel:
        reservation = await self._admin_reservation(reservation_id, admin)
        return await self._transition(
            reservation, ReservationStatus.CANCELLED, admin, admin_note=note
        )

    async def complete(self, reservation_id: UUID, admin: UserModel) -> ReservationModel:
        """RN-09: completar exige que el periodo ya haya terminado."""
        reservation = await self._admin_reservation(reservation_id, admin)
        assert_completable(
            reservation.status, reservation.ends_at, datetime.now(timezone.utc)
        )
        return await self._transition(
            reservation, ReservationStatus.COMPLETED, admin, checked=True
        )

    async def _admin_reservation(self, reservation_id: UUID, admin: UserModel) -> ReservationModel:
        if admin.role != UserRole.ADMIN:
            raise AdminRequired("This operation requires an administrator.")
        reservation = await self.repository.get_by_id(reservation_id)
        if reservation is None:
            raise ReservationNotFound("The requested reservation does not exist.")
        return reservation

    async def _transition(
        self,
        reservation: ReservationModel,
        target: ReservationStatus,
        actor: UserModel,
        *,
        admin_note: str | None = None,
        checked: bool = False,
    ) -> ReservationModel:
        previous = reservation.status
        if not checked:
            assert_transition(previous, target)

        reservation.status = target
        if admin_note and actor.role == UserRole.ADMIN:
            reservation.admin_note = admin_note

        self.audit.record(
            reservation_id=reservation.id,
            actor_id=actor.id,
            event_type=STATUS_TO_EVENT[target],
            from_status=previous,
            to_status=target,
            metadata={"actor_role": actor.role.value},
        )

        await self._commit_or_conflict()
        await self.session.refresh(reservation)
        return reservation

    async def _flush_or_conflict(self) -> None:
        try:
            await self.session.flush()
        except IntegrityError as error:
            await self._reraise(error)

    async def _commit_or_conflict(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as error:
            await self._reraise(error)

    async def _reraise(self, error: IntegrityError) -> None:
        """Traduce la exclusion constraint de PostgreSQL a un error de dominio."""
        await self.session.rollback()
        if OVERLAP_CONSTRAINT in str(error.orig):
            raise ReservationConflict(
                "The facility is not available for the requested period."
            ) from error
        raise error
