"""Disponibilidad por fecha.

Combina horario operativo, reservas activas y la fecha pedida. No crea reservas
y no decide permisos. Lo que devuelve es informativo: la autoridad final sobre
concurrencia es la constraint de PostgreSQL (RN-01).
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.rules import Interval, quote_amount, split_into_slots
from app.repositories.rate_repository import RateRepository
from app.repositories.reservation_repository import ReservationRepository
from app.services.facility_service import FacilityService
from app.services.rate_service import DEFAULT_SLOT_MINUTES
from app.services.schedule_service import ScheduleService


@dataclass(frozen=True)
class Slot:
    starts_at: datetime
    ends_at: datetime
    status: str  # AVAILABLE | BUSY | PAST
    amount: Decimal | None


@dataclass(frozen=True)
class Availability:
    facility_id: UUID
    date: date
    timezone: str
    slot_minutes: int
    currency: str
    operating_windows: list[Interval]
    busy: list[Interval]
    slots: list[Slot]

    @property
    def is_open(self) -> bool:
        return bool(self.operating_windows)


class AvailabilityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.facilities = FacilityService(session)
        self.schedules = ScheduleService(session)
        self.reservations = ReservationRepository(session)
        self.rates = RateRepository(session)

    async def for_date(self, facility_id: UUID, target_date: date, now: datetime) -> Availability:
        facility = await self.facilities.get(facility_id)
        tz = settings.timezone

        windows = [
            self._window_for(target_date, window.opens_at, window.closes_at, tz)
            for window in await self.schedules.operating_windows(facility_id)
            if window.weekday == target_date.weekday()
        ]

        rate = await self.rates.active_on(facility_id, target_date)
        slot_minutes = rate.minimum_minutes if rate else DEFAULT_SLOT_MINUTES
        currency = rate.currency if rate else settings.default_currency

        day_start = datetime.combine(target_date, time.min, tzinfo=tz)
        busy = [
            Interval(row.starts_at, row.ends_at)
            for row in await self.reservations.active_in_period(
                facility_id, day_start, day_start + timedelta(days=1)
            )
        ]

        slots: list[Slot] = []
        for window in windows:
            for slot in split_into_slots(window, slot_minutes):
                slots.append(self._classify(slot, busy, rate, facility.is_bookable, now))

        return Availability(
            facility_id=facility_id,
            date=target_date,
            timezone=settings.complex_timezone,
            slot_minutes=slot_minutes,
            currency=currency,
            operating_windows=windows,
            busy=busy,
            slots=slots,
        )

    @staticmethod
    def _window_for(target_date: date, opens_at: time, closes_at: time, tz) -> Interval:
        start = datetime.combine(target_date, opens_at, tzinfo=tz)
        if closes_at == time.min:  # cierre a medianoche
            end = datetime.combine(target_date + timedelta(days=1), time.min, tzinfo=tz)
        else:
            end = datetime.combine(target_date, closes_at, tzinfo=tz)
        return Interval(start, end)

    @staticmethod
    def _classify(
        slot: Interval, busy: list[Interval], rate, is_bookable: bool, now: datetime
    ) -> Slot:
        if slot.start <= now:
            status = "PAST"
        elif any(slot.overlaps(block) for block in busy):
            status = "BUSY"
        elif not is_bookable:
            status = "BUSY"
        else:
            status = "AVAILABLE"

        amount = (
            quote_amount(rate.amount, rate.minimum_minutes, slot)
            if rate and status == "AVAILABLE"
            else None
        )
        return Slot(starts_at=slot.start, ends_at=slot.end, status=status, amount=amount)
