from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ReservationStatus


class AdminStatsResponse(BaseModel):
    """KPIs del panel: pendientes, confirmadas hoy, ocupacion e ingresos."""

    pending: int
    confirmed_today: int
    reservations_today: int
    quoted_today: Decimal
    occupancy_rate_today: float
    bookable_facilities: int


class ReservationReportStatusSummary(BaseModel):
    status: ReservationStatus
    reservations: int


class ReservationReportFacilitySummary(BaseModel):
    facility_id: UUID
    facility_name: str
    reservations: int


class ReservationReportCurrencySummary(BaseModel):
    currency: str
    quoted_amount: Decimal


class ReservationReportResponse(BaseModel):
    total_reservations: int
    by_status: list[ReservationReportStatusSummary]
    by_facility: list[ReservationReportFacilitySummary]
    quoted_by_currency: list[ReservationReportCurrencySummary]


class NotificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reservation_id: UUID | None
    recipient: str
    template: str
    status: str
    error_detail: str | None
    created_at: datetime


class ReservationEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: UUID | None
    event_type: str
    from_status: str | None
    to_status: str | None
    created_at: datetime
