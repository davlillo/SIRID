from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class IntervalResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime


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
    operating_windows: list[IntervalResponse]
    busy: list[IntervalResponse]
    slots: list[SlotResponse]
