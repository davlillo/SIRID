"""Tarifas vigentes y cotizacion (RN-04)."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.errors import InvalidRate, RateNotAvailable
from app.domain.rules import Interval, assert_minimum_duration, quote_amount
from app.infrastructure.models import FacilityRateModel
from app.repositories.rate_repository import RateRepository

DEFAULT_SLOT_MINUTES = 60


@dataclass(frozen=True)
class Quote:
    amount: Decimal
    currency: str
    rate_id: UUID
    rate_name: str
    unit_amount: Decimal
    minimum_minutes: int


class RateService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rates = RateRepository(session)

    async def active_on(self, facility_id: UUID, on_date: date) -> FacilityRateModel | None:
        return await self.rates.active_on(facility_id, on_date)

    async def slot_minutes(self, facility_id: UUID, on_date: date) -> int:
        """La granularidad de los bloques ofrecidos la define la tarifa vigente."""
        rate = await self.rates.active_on(facility_id, on_date)
        return rate.minimum_minutes if rate else DEFAULT_SLOT_MINUTES

    async def quote(self, facility_id: UUID, interval: Interval) -> Quote:
        """Cotiza con la tarifa vigente al inicio del periodo.

        El importe se congela en la reserva: cambiar la tarifa manana no altera
        historicos.
        """
        local_date = interval.start.astimezone(settings.timezone).date()
        rate = await self.rates.active_on(facility_id, local_date)
        if rate is None:
            raise RateNotAvailable("The facility has no active rate for that date.")

        assert_minimum_duration(interval, rate.minimum_minutes)
        return Quote(
            amount=quote_amount(rate.amount, rate.minimum_minutes, interval),
            currency=rate.currency,
            rate_id=rate.id,
            rate_name=rate.name,
            unit_amount=rate.amount,
            minimum_minutes=rate.minimum_minutes,
        )

    async def list_for_facility(self, facility_id: UUID) -> list[FacilityRateModel]:
        return await self.rates.list_for_facility(facility_id)

    async def create(self, facility_id: UUID, payload: dict) -> FacilityRateModel:
        if payload["amount"] < 0:
            raise InvalidRate("`amount` cannot be negative.")
        if payload["minimum_minutes"] <= 0:
            raise InvalidRate("`minimum_minutes` must be positive.")
        valid_until = payload.get("valid_until")
        if valid_until is not None and valid_until < payload["valid_from"]:
            raise InvalidRate("`valid_until` cannot precede `valid_from`.")

        rate = self.rates.add(
            FacilityRateModel(
                facility_id=facility_id,
                name=payload["name"],
                amount=payload["amount"],
                currency=payload.get("currency") or settings.default_currency,
                minimum_minutes=payload["minimum_minutes"],
                valid_from=payload["valid_from"],
                valid_until=valid_until,
                is_active=payload.get("is_active", True),
            )
        )
        await self.session.commit()
        await self.session.refresh(rate)
        return rate

    async def publish_update(
        self, facility_id: UUID, *, amount: Decimal, effective_from: date
    ) -> FacilityRateModel:
        """Publica una nueva version y conserva la tarifa anterior como historial."""
        today = datetime.now(settings.timezone).date()
        if effective_from < today:
            raise InvalidRate("`effective_from` cannot be in the past.")
        if amount < 0:
            raise InvalidRate("`amount` cannot be negative.")

        current = await self.rates.active_on(facility_id, effective_from)
        if current is None:
            raise RateNotAvailable("The facility has no active rate to update on that date.")

        previous_valid_until = current.valid_until
        if current.valid_from == effective_from:
            # No existe un intervalo valido para conservar dentro del mismo dia.
            current.is_active = False
        else:
            current.valid_until = effective_from - timedelta(days=1)

        rate = self.rates.add(
            FacilityRateModel(
                facility_id=facility_id,
                name=current.name,
                amount=amount,
                currency=current.currency,
                minimum_minutes=current.minimum_minutes,
                valid_from=effective_from,
                valid_until=previous_valid_until,
                is_active=True,
            )
        )
        await self.session.commit()
        await self.session.refresh(rate)
        return rate
