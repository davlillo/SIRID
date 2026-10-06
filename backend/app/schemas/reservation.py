from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import ReservationStatus


class ReservationCreate(BaseModel):
    facility_id: UUID
    starts_at: datetime
    ends_at: datetime
    customer_note: str | None = Field(default=None, max_length=1000)


class ReservationFacility(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    facility_kind: str
    location_label: str


class ReservationCustomer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    facility: ReservationFacility
    starts_at: datetime
    ends_at: datetime
    status: ReservationStatus
    quoted_amount: Decimal
    currency: str
    customer_note: str | None
    admin_note: str | None
    created_at: datetime


class AdminReservationResponse(ReservationResponse):
    """La vista admin agrega al solicitante; la del cliente nunca lo hace."""

    customer: ReservationCustomer


class ReservationNoteRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)
