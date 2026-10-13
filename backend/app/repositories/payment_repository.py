from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import ReservationPaymentModel


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def add(self, payment: ReservationPaymentModel) -> ReservationPaymentModel:
        self.session.add(payment)
        return payment

    async def list_for_reservation(
        self, reservation_id: UUID, *, organization_id: UUID
    ) -> list[ReservationPaymentModel]:
        result = await self.session.scalars(
            select(ReservationPaymentModel)
            .where(
                ReservationPaymentModel.reservation_id == reservation_id,
                ReservationPaymentModel.organization_id == organization_id,
            )
            .order_by(ReservationPaymentModel.created_at)
        )
        return list(result)

    async def total_for_reservation(
        self, reservation_id: UUID, *, organization_id: UUID
    ) -> Decimal:
        result = await self.session.scalar(
            select(func.coalesce(func.sum(ReservationPaymentModel.amount), 0)).where(
                ReservationPaymentModel.reservation_id == reservation_id,
                ReservationPaymentModel.organization_id == organization_id,
            )
        )
        return Decimal(str(result or 0))
