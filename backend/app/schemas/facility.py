from datetime import date, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import FacilityKind, SportType, Zone


class FacilityImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: str
    alt_text: str
    sort_order: int


class ScheduleEntry(BaseModel):
    weekday: int = Field(ge=0, le=6, description="Lunes = 0, domingo = 6")
    opens_at: time
    closes_at: time
    is_active: bool = True


class ScheduleResponse(ScheduleEntry):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class RateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    amount: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    minimum_minutes: int = Field(gt=0, le=1440)
    valid_from: date
    valid_until: date | None = None
    is_active: bool = True


class RateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    amount: Decimal
    currency: str
    minimum_minutes: int
    valid_from: date
    valid_until: date | None
    is_active: bool


class FacilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str
    sport_type: str
    facility_kind: str
    zone: Zone
    surface: str | None
    capacity: int = Field(gt=0)
    location_label: str
    is_bookable: bool
    is_active: bool
    map_x: Decimal | None
    map_y: Decimal | None
    map_z: Decimal | None
    map_width: Decimal | None
    map_depth: Decimal | None
    images: list[FacilityImageResponse] = []


class FacilityDetailResponse(FacilityResponse):
    """Ficha completa. `metadata` es descriptivo y nunca decide reservas."""

    metadata: dict = Field(default_factory=dict, validation_alias="facility_metadata")
    schedules: list[ScheduleResponse] = []
    rates: list[RateResponse] = []


class FacilityCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=10, max_length=4000)
    sport_type: SportType
    facility_kind: FacilityKind
    zone: Zone
    surface: str | None = Field(default=None, max_length=80)
    capacity: int = Field(gt=0, le=200000)
    location_label: str = Field(min_length=2, max_length=160)
    is_bookable: bool = True
    is_active: bool = True
    metadata: dict = Field(default_factory=dict)
    map_x: Decimal | None = None
    map_y: Decimal | None = None
    map_z: Decimal | None = None
    map_width: Decimal | None = None
    map_depth: Decimal | None = None

    @field_validator("sport_type", "facility_kind", "zone", mode="before")
    @classmethod
    def normalize_enum(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value


class FacilityUpdate(BaseModel):
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, min_length=10, max_length=4000)
    sport_type: SportType | None = None
    facility_kind: FacilityKind | None = None
    zone: Zone | None = None
    surface: str | None = Field(default=None, max_length=80)
    capacity: int | None = Field(default=None, gt=0, le=200000)
    location_label: str | None = Field(default=None, min_length=2, max_length=160)
    is_bookable: bool | None = None
    is_active: bool | None = None
    metadata: dict | None = None
    map_x: Decimal | None = None
    map_y: Decimal | None = None
    map_z: Decimal | None = None
    map_width: Decimal | None = None
    map_depth: Decimal | None = None


class ScheduleReplaceRequest(BaseModel):
    schedules: list[ScheduleEntry] = Field(max_length=28)
