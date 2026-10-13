from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ReservationStatus, UserRole
from app.domain.errors import PaymentNotAllowed, ReservationNotFound, ReservationStaffRequired
from app.domain.rules import assert_positive_payment_amount
from app.infrastructure.models import ReservationPaymentModel, UserModel
from app.repositories.payment_repository import PaymentRepository
from app.repositories.reservation_repository import ReservationRepository


@dataclass(frozen=True)
class RegisterPayment:
    amount: Decimal
    note: str | None = None


class PaymentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.payments = PaymentRepository(session)
        self.reservations = ReservationRepository(session)

    async def register(
        self, reservation_id: UUID, encargado: UserModel, command: RegisterPayment
    ) -> ReservationPaymentModel:
        reservation = await self._reservation_for_encargado(reservation_id, encargado)
        if reservation.status != ReservationStatus.PENDING:
            raise PaymentNotAllowed(
                "Solo se pueden registrar pagos en reservas pendientes."
            )

        assert_positive_payment_amount(command.amount)

        payment = self.payments.add(
            ReservationPaymentModel(
                reservation_id=reservation.id,
                organization_id=reservation.organization_id,
                recorded_by_id=encargado.id,
                amount=command.amount,
                currency=reservation.currency,
                note=command.note,
            )
        )
        await self.session.commit()
        await self.session.refresh(payment)
        return payment

    async def summary_for_reservation(
        self, reservation_id: UUID, encargado: UserModel
    ) -> tuple[Decimal, Decimal, str, list[ReservationPaymentModel]]:
        reservation = await self._reservation_for_encargado(reservation_id, encargado)
        payments = await self.payments.list_for_reservation(
            reservation.id, organization_id=reservation.organization_id
        )
        total_paid = await self.payments.total_for_reservation(
            reservation.id, organization_id=reservation.organization_id
        )
        balance = max(reservation.quoted_amount - total_paid, Decimal("0"))
        return reservation.quoted_amount, total_paid, reservation.currency, payments

    async def total_paid_for_reservation(
        self, reservation_id: UUID, *, organization_id: UUID
    ) -> Decimal:
        return await self.payments.total_for_reservation(
            reservation_id, organization_id=organization_id
        )

    async def _reservation_for_encargado(
        self, reservation_id: UUID, encargado: UserModel
    ):
        if encargado.role != UserRole.ENCARGADO:
            raise ReservationStaffRequired(
                "Only reservation staff can manage reservations."
            )
        reservation = await self.reservations.get_by_id(
            reservation_id, organization_id=encargado.organization_id
        )
        if reservation is None:
            raise ReservationNotFound("The requested reservation does not exist.")
        return reservation
