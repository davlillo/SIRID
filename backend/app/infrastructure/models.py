"""Modelos SQLAlchemy. Reflejan exactamente el esquema versionado en Alembic."""

import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import ReservationEventType, ReservationStatus, UserRole, Zone
from app.infrastructure.database import Base

# `native_enum` con `create_type=False`: los tipos ya los crea la migracion.
user_role_enum = Enum(
    UserRole, name="user_role", values_callable=lambda enum: [item.value for item in enum]
)
reservation_status_enum = Enum(
    ReservationStatus,
    name="reservation_status",
    values_callable=lambda enum: [item.value for item in enum],
)
reservation_event_type_enum = Enum(
    ReservationEventType,
    name="reservation_event_type",
    values_callable=lambda enum: [item.value for item in enum],
)
facility_zone_enum = Enum(
    Zone, name="facility_zone", values_callable=lambda enum: [item.value for item in enum]
)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_subject: Mapped[str] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    first_name: Mapped[str | None] = mapped_column(String(80))
    last_name: Mapped[str | None] = mapped_column(String(80))
    dui: Mapped[str | None] = mapped_column(String(10), unique=True)
    phone: Mapped[str | None] = mapped_column(String(24))
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    role: Mapped[UserRole] = mapped_column(user_role_enum, server_default=UserRole.CLIENT.value)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class FacilityModel(Base):
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    sport_type: Mapped[str] = mapped_column(String(80))
    facility_kind: Mapped[str] = mapped_column(String(40))
    zone: Mapped[Zone] = mapped_column(facility_zone_enum, server_default=Zone.CANCHAS.value)
    surface: Mapped[str | None] = mapped_column(String(80))
    capacity: Mapped[int] = mapped_column(Integer)
    location_label: Mapped[str] = mapped_column(String(160))
    is_bookable: Mapped[bool] = mapped_column(Boolean, server_default="true")
    facility_metadata: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}")
    map_x: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    map_y: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    map_z: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    map_width: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    map_depth: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    images: Mapped[list["FacilityImageModel"]] = relationship(
        back_populates="facility",
        cascade="all, delete-orphan",
        order_by="FacilityImageModel.sort_order",
        lazy="selectin",
    )
    schedules: Mapped[list["FacilityScheduleModel"]] = relationship(
        back_populates="facility",
        cascade="all, delete-orphan",
        order_by="FacilityScheduleModel.weekday",
        lazy="selectin",
    )
    rates: Mapped[list["FacilityRateModel"]] = relationship(
        back_populates="facility", cascade="all, delete-orphan", lazy="selectin"
    )


class FacilityImageModel(Base):
    __tablename__ = "facility_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(2048))
    alt_text: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")

    facility: Mapped[FacilityModel] = relationship(back_populates="images")


class FacilityScheduleModel(Base):
    __tablename__ = "facility_schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    weekday: Mapped[int] = mapped_column(SmallInteger)  # Lunes = 0, domingo = 6.
    opens_at: Mapped[time] = mapped_column(Time)
    closes_at: Mapped[time] = mapped_column(Time)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    facility: Mapped[FacilityModel] = relationship(back_populates="schedules")


class FacilityRateModel(Base):
    __tablename__ = "facility_rates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), server_default="USD")
    minimum_minutes: Mapped[int] = mapped_column(Integer)
    valid_from: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    facility: Mapped[FacilityModel] = relationship(back_populates="rates")


class ReservationModel(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[ReservationStatus] = mapped_column(
        reservation_status_enum, server_default=ReservationStatus.PENDING.value
    )
    quoted_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), server_default="USD")
    customer_note: Mapped[str | None] = mapped_column(String(1000))
    admin_note: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[UserModel] = relationship(lazy="joined")
    facility: Mapped[FacilityModel] = relationship(lazy="joined")
    events: Mapped[list["ReservationEventModel"]] = relationship(
        back_populates="reservation",
        cascade="all, delete-orphan",
        order_by="ReservationEventModel.created_at",
    )


class ReservationEventModel(Base):
    __tablename__ = "reservation_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    event_type: Mapped[ReservationEventType] = mapped_column(reservation_event_type_enum)
    from_status: Mapped[ReservationStatus | None] = mapped_column(reservation_status_enum)
    to_status: Mapped[ReservationStatus | None] = mapped_column(reservation_status_enum)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reservation: Mapped[ReservationModel] = relationship(back_populates="events")


class NotificationLogModel(Base):
    """Registro observable de correos. RN de notificaciones: un fallo SMTP no
    revierte la reserva, pero queda visible para reintento administrativo."""

    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("reservations.id", ondelete="CASCADE")
    )
    recipient: Mapped[str] = mapped_column(String(320))
    template: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))  # SENT | FAILED | SKIPPED
    error_detail: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
