from datetime import datetime
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ACTIVE_RESERVATION_STATUSES, ReservationStatus
from app.infrastructure.models import (
    NotificationLogModel,
    ReservationEventModel,
    ReservationModel,
)


class ReservationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def add(self, reservation: ReservationModel) -> ReservationModel:
        self.session.add(reservation)
        return reservation

    def add_event(self, event: ReservationEventModel) -> ReservationEventModel:
        self.session.add(event)
        return event

    def add_notification_log(self, log: NotificationLogModel) -> NotificationLogModel:
        self.session.add(log)
        return log

    async def get_by_id(self, reservation_id: UUID) -> ReservationModel | None:
        return await self.session.get(ReservationModel, reservation_id)

    async def active_in_period(
        self, facility_id: UUID, starts_at: datetime, ends_at: datetime
    ) -> list[ReservationModel]:
        """Reservas activas que se cruzan con `[starts_at, ends_at)` (RN-01/RN-03).

        Es una comprobacion previa para dar un mensaje util. La garantia real la
        da `reservations_no_overlap` en PostgreSQL.
        """
        rows = await self.session.scalars(
            select(ReservationModel).where(
                ReservationModel.facility_id == facility_id,
                ReservationModel.status.in_(tuple(ACTIVE_RESERVATION_STATUSES)),
                ReservationModel.starts_at < ends_at,
                ReservationModel.ends_at > starts_at,
            )
        )
        return list(rows.unique().all())

    async def list_for_customer(
        self, customer_id: UUID, *, page: int = 1, limit: int = 20
    ) -> tuple[list[ReservationModel], int]:
        query = select(ReservationModel).where(ReservationModel.customer_id == customer_id)
        return await self._paginate(query.order_by(ReservationModel.starts_at.desc()), page, limit)

    async def list_for_admin(
        self,
        *,
        status: ReservationStatus | None = None,
        facility_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[ReservationModel], int]:
        query = select(ReservationModel)
        if status is not None:
            query = query.where(ReservationModel.status == status)
        if facility_id is not None:
            query = query.where(ReservationModel.facility_id == facility_id)
        if date_from is not None:
            query = query.where(ReservationModel.starts_at >= date_from)
        if date_to is not None:
            query = query.where(ReservationModel.starts_at < date_to)
        return await self._paginate(query.order_by(ReservationModel.starts_at.asc()), page, limit)

    async def count_by_status(self, status: ReservationStatus) -> int:
        return int(
            await self.session.scalar(
                select(func.count())
                .select_from(ReservationModel)
                .where(ReservationModel.status == status)
            )
            or 0
        )

    async def summary_between(
        self, starts_at: datetime, ends_at: datetime
    ) -> tuple[int, float]:
        """Reservas activas del periodo y su importe cotizado."""
        row = (
            await self.session.execute(
                select(
                    func.count(ReservationModel.id),
                    func.coalesce(func.sum(ReservationModel.quoted_amount), 0),
                ).where(
                    ReservationModel.status.in_(tuple(ACTIVE_RESERVATION_STATUSES)),
                    ReservationModel.starts_at >= starts_at,
                    ReservationModel.starts_at < ends_at,
                )
            )
        ).one()
        return int(row[0]), float(row[1])

    async def list_notification_logs(
        self, reservation_id: UUID
    ) -> list[NotificationLogModel]:
        rows = await self.session.scalars(
            select(NotificationLogModel)
            .where(NotificationLogModel.reservation_id == reservation_id)
            .order_by(NotificationLogModel.created_at.desc())
        )
        return list(rows.all())

    async def list_events(self, reservation_id: UUID) -> list[ReservationEventModel]:
        rows = await self.session.scalars(
            select(ReservationEventModel)
            .where(ReservationEventModel.reservation_id == reservation_id)
            .order_by(ReservationEventModel.created_at.asc())
        )
        return list(rows.all())

    async def _paginate(
        self, query: Select[tuple[ReservationModel]], page: int, limit: int
    ) -> tuple[list[ReservationModel], int]:
        total = await self.session.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        )
        rows = await self.session.scalars(query.offset((page - 1) * limit).limit(limit))
        return list(rows.unique().all()), int(total or 0)
