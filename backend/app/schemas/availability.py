from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class IntervalResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime


class WindowResponse(IntervalResponse):
    slot_minutes: int


class SlotResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime
    status: str  # AVAILABLE | BUSY | PAST
    amount: Decimal | None


class AvailabilityResponse(BaseModel):
    """No expone datos personales de reservas ajenas: solo el rango ocupado."""

    facility_id: UUID
    date: date
    timezone: str
    is_open: bool
    slot_minutes: int
    currency: str
    operating_windows: list[WindowResponse]
    busy: list[IntervalResponse]
    slots: list[SlotResponse]


class QuotedIntervalResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime
    amount: Decimal | None


class RangeCheckResponse(BaseModel):
    """Veredicto de un rango concreto. Tampoco expone quien ocupa el horario."""

    facility_id: UUID
    date: date
    timezone: str
    currency: str
    starts_at: datetime
    ends_at: datetime
    status: str  # AVAILABLE | BUSY | PAST | CLOSED | OUTSIDE_HOURS | UNAVAILABLE
    amount: Decimal | None
    alternatives: list[QuotedIntervalResponse]
