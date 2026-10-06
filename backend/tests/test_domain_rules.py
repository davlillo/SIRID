"""Pruebas de las reglas puras. Sin base de datos ni HTTP."""

from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from app.domain.enums import ReservationStatus
from app.domain.errors import (
    InvalidReservationPeriod,
    InvalidReservationTransition,
    OutsideOperatingHours,
    ReservationNotFinished,
)
from app.domain.rules import (
    Interval,
    OperatingWindow,
    assert_completable,
    assert_minimum_duration,
    assert_period,
    assert_transition,
    assert_within_operating_hours,
    quote_amount,
    split_into_slots,
    subtract_busy,
)

TZ = ZoneInfo("America/Guatemala")
NOW = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)


def local(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=TZ)


class TestTransitions:
    @pytest.mark.parametrize(
        ("current", "target"),
        [
            (ReservationStatus.PENDING, ReservationStatus.CONFIRMED),
            (ReservationStatus.PENDING, ReservationStatus.CANCELLED),
            (ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED),
            (ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED),
        ],
    )
    def test_allows_documented_transitions(self, current, target):
        assert_transition(current, target)

    @pytest.mark.parametrize(
        ("current", "target"),
        [
            (ReservationStatus.CONFIRMED, ReservationStatus.PENDING),  # RN-08
            (ReservationStatus.CANCELLED, ReservationStatus.CONFIRMED),
            (ReservationStatus.COMPLETED, ReservationStatus.CANCELLED),
            (ReservationStatus.PENDING, ReservationStatus.COMPLETED),
        ],
    )
    def test_rejects_undocumented_transitions(self, current, target):
        with pytest.raises(InvalidReservationTransition):
            assert_transition(current, target)

    def test_completing_a_future_reservation_is_rejected(self):
        """RN-09: solo se completa despues de que termine el periodo."""
        with pytest.raises(ReservationNotFinished):
            assert_completable(ReservationStatus.CONFIRMED, NOW + timedelta(hours=1), NOW)

    def test_completing_a_finished_reservation_is_allowed(self):
        assert_completable(ReservationStatus.CONFIRMED, NOW - timedelta(minutes=1), NOW)


class TestPeriod:
    def test_accepts_a_future_aligned_period(self):
        interval = assert_period(local(2026, 10, 5, 18), local(2026, 10, 5, 19), NOW)
        assert interval.minutes == 60

    def test_rejects_inverted_period(self):
        with pytest.raises(InvalidReservationPeriod):
            assert_period(local(2026, 10, 5, 19), local(2026, 10, 5, 18), NOW)

    def test_rejects_naive_datetimes(self):
        with pytest.raises(InvalidReservationPeriod):
            assert_period(datetime(2026, 10, 5, 18), datetime(2026, 10, 5, 19), NOW)

    def test_rejects_past_period(self):
        with pytest.raises(InvalidReservationPeriod):
            assert_period(NOW - timedelta(hours=2), NOW - timedelta(hours=1), NOW)

    def test_rejects_second_precision(self):
        with pytest.raises(InvalidReservationPeriod):
            assert_period(
                local(2026, 10, 5, 18).replace(second=30), local(2026, 10, 5, 19), NOW
            )

    def test_enforces_minimum_duration(self):
        interval = Interval(local(2026, 10, 5, 18), local(2026, 10, 5, 18, 30))
        with pytest.raises(InvalidReservationPeriod):
            assert_minimum_duration(interval, 60)


class TestOperatingHours:
    #  2026-10-05 es lunes, weekday 0.
    windows = [OperatingWindow(weekday=0, opens_at=time(7, 0), closes_at=time(22, 0))]

    def test_accepts_period_inside_the_window(self):
        interval = Interval(local(2026, 10, 5, 18), local(2026, 10, 5, 19))
        assert assert_within_operating_hours(interval, self.windows, TZ).weekday == 0

    def test_rejects_period_before_opening(self):
        interval = Interval(local(2026, 10, 5, 6), local(2026, 10, 5, 8))
        with pytest.raises(OutsideOperatingHours):
            assert_within_operating_hours(interval, self.windows, TZ)

    def test_rejects_period_after_closing(self):
        interval = Interval(local(2026, 10, 5, 21), local(2026, 10, 5, 23))
        with pytest.raises(OutsideOperatingHours):
            assert_within_operating_hours(interval, self.windows, TZ)

    def test_rejects_a_day_without_schedule(self):
        interval = Interval(local(2026, 10, 6, 18), local(2026, 10, 6, 19))  # martes
        with pytest.raises(OutsideOperatingHours):
            assert_within_operating_hours(interval, self.windows, TZ)

    def test_accepts_a_period_that_ends_at_midnight(self):
        windows = [OperatingWindow(weekday=0, opens_at=time(7, 0), closes_at=time(0, 0))]
        interval = Interval(local(2026, 10, 5, 22), local(2026, 10, 6, 0))
        assert assert_within_operating_hours(interval, windows, TZ) is windows[0]

    def test_rejects_a_period_that_spans_two_days(self):
        interval = Interval(local(2026, 10, 5, 22), local(2026, 10, 6, 2))
        with pytest.raises(OutsideOperatingHours):
            assert_within_operating_hours(interval, self.windows, TZ)


class TestQuote:
    def test_charges_one_block_for_the_exact_duration(self):
        interval = Interval(local(2026, 10, 5, 18), local(2026, 10, 5, 19))
        assert quote_amount(Decimal("25.00"), 60, interval) == Decimal("25.00")

    def test_charges_whole_blocks_for_partial_use(self):
        """Hora y media sobre tarifa por hora cobra dos bloques."""
        interval = Interval(local(2026, 10, 5, 18), local(2026, 10, 5, 19, 30))
        assert quote_amount(Decimal("25.00"), 60, interval) == Decimal("50.00")

    def test_scales_with_longer_periods(self):
        interval = Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 12))
        assert quote_amount(Decimal("120.50"), 60, interval) == Decimal("482.00")


class TestAvailabilitySlicing:
    window = Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 12))

    def test_returns_the_whole_window_when_nothing_is_busy(self):
        assert subtract_busy(self.window, []) == [self.window]

    def test_removes_a_block_in_the_middle(self):
        busy = [Interval(local(2026, 10, 5, 9), local(2026, 10, 5, 10))]
        assert subtract_busy(self.window, busy) == [
            Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 9)),
            Interval(local(2026, 10, 5, 10), local(2026, 10, 5, 12)),
        ]

    def test_merges_adjacent_and_overlapping_blocks(self):
        busy = [
            Interval(local(2026, 10, 5, 9), local(2026, 10, 5, 10, 30)),
            Interval(local(2026, 10, 5, 10), local(2026, 10, 5, 11)),
        ]
        assert subtract_busy(self.window, busy) == [
            Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 9)),
            Interval(local(2026, 10, 5, 11), local(2026, 10, 5, 12)),
        ]

    def test_ignores_blocks_outside_the_window(self):
        busy = [Interval(local(2026, 10, 5, 6), local(2026, 10, 5, 7))]
        assert subtract_busy(self.window, busy) == [self.window]

    def test_returns_nothing_when_fully_booked(self):
        assert subtract_busy(self.window, [self.window]) == []

    def test_touching_intervals_do_not_overlap(self):
        """RN-03: `[inicio, fin)` permite encadenar 18-19 y 19-20."""
        first = Interval(local(2026, 10, 5, 18), local(2026, 10, 5, 19))
        second = Interval(local(2026, 10, 5, 19), local(2026, 10, 5, 20))
        assert not first.overlaps(second)

    def test_splits_a_window_into_slots_and_drops_the_remainder(self):
        window = Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 9, 30))
        slots = split_into_slots(window, 60)
        assert slots == [Interval(local(2026, 10, 5, 8), local(2026, 10, 5, 9))]
