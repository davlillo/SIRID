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
from app.domain.errors import InvalidReservationPeriod
from app.domain.rules import (
    BookableWindow,
    Interval,
    OperatingWindow,
    assert_fits_slots,
    quote_amount,
    split_into_slots,
    suggest_alternatives,
)
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
    operating_windows: list[BookableWindow]
    busy: list[Interval]
    slots: list[Slot]

    @property
    def is_open(self) -> bool:
        return bool(self.operating_windows)


@dataclass(frozen=True)
class QuotedInterval:
    starts_at: datetime
    ends_at: datetime
    amount: Decimal | None


@dataclass(frozen=True)
class RangeCheck:
    facility_id: UUID
    date: date
    timezone: str
    currency: str
    starts_at: datetime
    ends_at: datetime
    # AVAILABLE | BUSY | PAST | CLOSED | OUTSIDE_HOURS | UNAVAILABLE
    status: str
    amount: Decimal | None
    alternatives: list[QuotedInterval]


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
            BookableWindow(
                self._window_for(target_date, window.opens_at, window.closes_at, tz),
                window.slot_minutes,
            )
            for window in await self.schedules.operating_windows(facility_id)
            if window.weekday == target_date.weekday()
        ]

        rate = await self.rates.active_on(facility_id, target_date)
        # Campo heredado: la duracion real va por ventana.
        slot_minutes = windows[0].slot_minutes if windows else DEFAULT_SLOT_MINUTES
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
            for slot in split_into_slots(window.interval, window.slot_minutes):
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

    async def check_range(
        self,
        facility_id: UUID,
        target_date: date,
        start_time: time,
        end_time: time,
        now: datetime,
    ) -> RangeCheck:
        """Veredicto para un rango concreto y, si no se puede reservar, huecos del mismo dia.

        `end_time == 00:00` se interpreta como medianoche del final del dia.
        """
        tz = settings.timezone
        starts_at = datetime.combine(target_date, start_time, tzinfo=tz)
        end_date = target_date + timedelta(days=1) if end_time == time.min else target_date
        ends_at = datetime.combine(end_date, end_time, tzinfo=tz)
        if ends_at <= starts_at:
            raise InvalidReservationPeriod("La hora de fin debe ser posterior a la de inicio.")
        requested = Interval(starts_at, ends_at)

        facility = await self.facilities.get(facility_id)
        day = await self.for_date(facility_id, target_date, now)
        rate = await self.rates.active_on(facility_id, target_date)

        container = next(
            (
                window
                for window in day.operating_windows
                if window.start <= requested.start and requested.end <= window.end
            ),
            None,
        )
        if container:
            assert_fits_slots(
                requested,
                OperatingWindow(
                    weekday=target_date.weekday(),
                    opens_at=container.start.astimezone(tz).time(),
                    closes_at=container.end.astimezone(tz).time(),
                    slot_minutes=container.slot_minutes,
                ),
                tz,
            )

        if not day.is_open:
            status = "CLOSED"
        elif not facility.is_bookable:
            status = "UNAVAILABLE"
        elif requested.start <= now:
            status = "PAST"
        elif container is None:
            status = "OUTSIDE_HOURS"
        elif any(requested.overlaps(block) for block in day.busy):
            status = "BUSY"
        else:
            status = "AVAILABLE"

        def quote(interval: Interval) -> Decimal | None:
            return quote_amount(rate.amount, rate.minimum_minutes, interval) if rate else None

        alternatives: list[QuotedInterval] = []
        if status in {"BUSY", "PAST", "OUTSIDE_HOURS"}:
            alternatives = [
                QuotedInterval(starts_at=item.start, ends_at=item.end, amount=quote(item))
                for item in suggest_alternatives(day.operating_windows, day.busy, requested, now)
            ]

        return RangeCheck(
            facility_id=facility_id,
            date=target_date,
            timezone=day.timezone,
            currency=day.currency,
            starts_at=requested.start,
            ends_at=requested.end,
            status=status,
            amount=quote(requested) if status == "AVAILABLE" else None,
            alternatives=alternatives,
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
