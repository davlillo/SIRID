from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    note: str | None = Field(default=None, max_length=500)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reservation_id: UUID
    amount: Decimal
    currency: str
    note: str | None
    recorded_by_id: UUID | None
    created_at: datetime


class ReservationPaymentsResponse(BaseModel):
    quoted_amount: Decimal
    total_paid: Decimal
    balance_due: Decimal
    currency: str
    payments: list[PaymentResponse]
