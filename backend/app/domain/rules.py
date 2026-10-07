"""Reglas puras del dominio.

Sin ORM, sin HTTP y sin IO. Todo lo que se pueda decidir con datos simples vive
aqui para poder probarlo sin base de datos (spect/10-estrategia-de-pruebas.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from math import ceil

from app.domain.enums import ReservationStatus
from app.domain.errors import (
    InvalidReservationPeriod,
    InvalidReservationTransition,
    OutsideOperatingHours,
    ReservationNotFinished,
)

# spect/02-modelo-de-dominio.md: PENDING -> CONFIRMED -> COMPLETED, y cancelacion
# desde PENDING o CONFIRMED. Nunca se vuelve a PENDING.
ALLOWED_TRANSITIONS: dict[ReservationStatus, frozenset[ReservationStatus]] = {
    ReservationStatus.PENDING: frozenset(
        {ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED}
    ),
    ReservationStatus.CONFIRMED: frozenset(
        {ReservationStatus.COMPLETED, ReservationStatus.CANCELLED}
    ),
    ReservationStatus.CANCELLED: frozenset(),
    ReservationStatus.COMPLETED: frozenset(),
}


@dataclass(frozen=True)
class Interval:
    """Intervalo semiabierto `[start, end)` (RN-03)."""

    start: datetime
    end: datetime

    def overlaps(self, other: Interval) -> bool:
        return self.start < other.end and other.start < self.end

    @property
    def minutes(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)


@dataclass(frozen=True)
class OperatingWindow:
    """Rango semanal de un dia: horas locales y duracion del prestamo."""

    weekday: int
    opens_at: time
    closes_at: time
    slot_minutes: int = 60


@dataclass(frozen=True)
class BookableWindow:
    """Rango operativo de una fecha concreta, ya resuelto a instantes."""

    interval: Interval
    slot_minutes: int

    @property
    def start(self) -> datetime:
        return self.interval.start

    @property
    def end(self) -> datetime:
        return self.interval.end


def assert_transition(current: ReservationStatus, target: ReservationStatus) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise InvalidReservationTransition(
            f"A reservation in {current} cannot move to {target}."
        )


def assert_completable(current: ReservationStatus, ends_at: datetime, now: datetime) -> None:
    """RN-09: completar exige que el periodo ya haya terminado."""
    assert_transition(current, ReservationStatus.COMPLETED)
    if ends_at > now:
        raise ReservationNotFinished(
            "The reservation can only be completed after its period ends."
        )


def assert_period(starts_at: datetime, ends_at: datetime, now: datetime) -> Interval:
    """Valida forma del periodo: con zona, ordenado, futuro y en minutos exactos."""
    if starts_at.tzinfo is None or ends_at.tzinfo is None:
        raise InvalidReservationPeriod("Both instants must include a timezone offset.")
    if ends_at <= starts_at:
        raise InvalidReservationPeriod("`ends_at` must be later than `starts_at`.")
    if starts_at <= now:
        raise InvalidReservationPeriod("The reservation must start in the future.")
    if starts_at.second or starts_at.microsecond or ends_at.second or ends_at.microsecond:
        raise InvalidReservationPeriod("The period must be aligned to whole minutes.")
    return Interval(starts_at, ends_at)


def assert_minimum_duration(interval: Interval, minimum_minutes: int) -> None:
    if interval.minutes < minimum_minutes:
        raise InvalidReservationPeriod(
            f"The minimum duration for this facility is {minimum_minutes} minutes."
        )


def local_span(interval: Interval, tz) -> tuple[date, time, time]:
    """Traduce el intervalo a la fecha y horas locales del complejo.

    Un cierre a medianoche se representa como `23:59:59.999999` del mismo dia
    para poder compararlo contra `closes_at`.
    """
    start_local = interval.start.astimezone(tz)
    end_local = interval.end.astimezone(tz)

    if end_local.time() == time.min and end_local.date() == start_local.date() + timedelta(days=1):
        return start_local.date(), start_local.time(), time.max

    if end_local.date() != start_local.date():
        raise OutsideOperatingHours("A reservation cannot span more than one operating day.")

    return start_local.date(), start_local.time(), end_local.time()


def assert_within_operating_hours(
    interval: Interval, windows: list[OperatingWindow], tz
) -> OperatingWindow:
    """RN-02: el periodo debe caber completo en una ventana operativa del dia."""
    local_date, start_time, end_time = local_span(interval, tz)
    weekday = local_date.weekday()  # Lunes = 0, domingo = 6.

    for window in windows:
        if window.weekday != weekday:
            continue
        closes = time.max if window.closes_at == time.min else window.closes_at
        if window.opens_at <= start_time and end_time <= closes:
            return window

    raise OutsideOperatingHours(
        "The facility does not operate during the requested period."
    )


def assert_fits_slots(interval: Interval, window: OperatingWindow, tz) -> None:
    """El periodo debe empezar en un bloque del rango y durar bloques completos."""
    slot = window.slot_minutes
    local_start = interval.start.astimezone(tz)
    opens = datetime.combine(local_start.date(), window.opens_at, tzinfo=tz)
    offset = int((local_start - opens).total_seconds() // 60)
    if offset % slot or interval.minutes % slot:
        raise InvalidReservationPeriod(
            f"En este horario se reserva en bloques de {slot} minutos contados desde las "
            f"{window.opens_at.strftime('%H:%M')}."
        )


def quote_amount(unit_amount: Decimal, minimum_minutes: int, interval: Interval) -> Decimal:
    """RN-04: se cobran bloques completos de `minimum_minutes`.

    Una hora y media sobre una tarifa por hora cobra dos bloques. La regla se
    mantiene explicita porque el importe se congela en la reserva.
    """
    if minimum_minutes <= 0:
        raise InvalidReservationPeriod("The rate has an invalid minimum duration.")
    blocks = ceil(interval.minutes / minimum_minutes)
    total = unit_amount * Decimal(blocks)
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def subtract_busy(window: Interval, busy: list[Interval]) -> list[Interval]:
    """Devuelve los tramos libres de una ventana tras descontar los ocupados."""
    free: list[Interval] = []
    cursor = window.start

    for block in sorted(busy, key=lambda item: item.start):
        if block.end <= cursor or block.start >= window.end:
            continue
        start = max(block.start, window.start)
        end = min(block.end, window.end)
        if start > cursor:
            free.append(Interval(cursor, start))
        cursor = max(cursor, end)

    if cursor < window.end:
        free.append(Interval(cursor, window.end))
    return free


def suggest_alternatives(
    windows: list[BookableWindow],
    busy: list[Interval],
    requested: Interval,
    now: datetime,
    limit: int = 5,
) -> list[Interval]:
    """Huecos libres del mismo dia con la duracion pedida, los mas cercanos primero.

    Los candidatos arrancan en bloques de cada ventana desde su apertura, para
    que coincidan con el calendario. Una ventana cuyos bloques no encajan con la
    duracion pedida no aporta candidatos.
    """
    duration = requested.end - requested.start
    if duration <= timedelta(0) or limit <= 0:
        return []

    candidates: list[Interval] = []
    for window in windows:
        if window.slot_minutes <= 0 or requested.minutes % window.slot_minutes:
            continue
        step = timedelta(minutes=window.slot_minutes)
        free = subtract_busy(window.interval, busy)
        cursor = window.start
        while cursor + duration <= window.end:
            candidate = Interval(cursor, cursor + duration)
            if (
                candidate.start > now
                and candidate != requested
                and any(gap.start <= candidate.start and candidate.end <= gap.end for gap in free)
            ):
                candidates.append(candidate)
            cursor += step

    candidates.sort(key=lambda item: (abs(item.start - requested.start), item.start))
    return sorted(candidates[:limit], key=lambda item: item.start)


def split_into_slots(window: Interval, slot_minutes: int) -> list[Interval]:
    """Corta una ventana en bloques ofrecibles, descartando el resto parcial."""
    if slot_minutes <= 0:
        return []
    slots: list[Interval] = []
    cursor = window.start
    step = timedelta(minutes=slot_minutes)
    while cursor + step <= window.end:
        slots.append(Interval(cursor, cursor + step))
        cursor += step
    return slots
