"""Operaciones administrativas. Todo el router exige rol ADMIN."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.api.deps import AdminUser, CatalogStaffUser, SessionDep, require_admin
from app.api.notifications import schedule_notification
from app.core.config import settings
from app.domain.enums import FacilityKind, ReservationStatus, SportType, Zone
from app.repositories.reservation_repository import ReservationRepository
from app.schemas.admin import (
    AdminStatsResponse,
    NotificationLogResponse,
    ReservationEventResponse,
)
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.common import Page
from app.schemas.facility import (
    FacilityCreate,
    FacilityDetailResponse,
    FacilityResponse,
    FacilityUpdate,
    RateCreate,
    RatePublishRequest,
    RateResponse,
    ScheduleReplaceRequest,
    ScheduleResponse,
)
from app.schemas.reservation import AdminReservationResponse, ReservationNoteRequest
from app.services.facility_service import FacilityService
from app.services.client_service import ClientService
from app.services.rate_service import RateService
from app.services.reservation_service import ReservationService
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/admin", tags=["admin"])


# --------------------------------------------------------------------------- #
# Clientes
# --------------------------------------------------------------------------- #


@router.get("/clients", response_model=list[ClientResponse])
async def list_clients(
    session: SessionDep, staff: CatalogStaffUser
) -> list[ClientResponse]:
    clients = await ClientService(session).list_registered()
    return [ClientResponse.model_validate(client) for client in clients]


@router.post("/clients", response_model=ClientResponse, status_code=201)
async def create_client(
    payload: ClientCreate, session: SessionDep, staff: CatalogStaffUser
) -> ClientResponse:
    client = await ClientService(session).create(payload.model_dump())
    return ClientResponse.model_validate(client)


@router.patch(
    "/clients/{client_id}",
    response_model=ClientResponse,
    summary="Actualiza, da de baja o reactiva a un cliente",
)
async def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> ClientResponse:
    client = await ClientService(session).update(
        client_id, payload.model_dump(exclude_unset=True)
    )
    return ClientResponse.model_validate(client)


# --------------------------------------------------------------------------- #
# Reservas
# --------------------------------------------------------------------------- #


@router.get(
    "/reservations",
    response_model=Page[AdminReservationResponse],
    dependencies=[Depends(require_admin)],
)
async def list_reservations(
    session: SessionDep,
    status: ReservationStatus | None = None,
    facility_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[AdminReservationResponse]:
    tz = settings.timezone
    items, total = await ReservationRepository(session).list_for_admin(
        status=status,
        facility_id=facility_id,
        date_from=datetime.combine(date_from, time.min, tzinfo=tz) if date_from else None,
        # `date_to` es inclusivo para el usuario: se traduce al dia siguiente.
        date_to=(
            datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=tz)
            if date_to
            else None
        ),
        page=page,
        limit=limit,
    )
    return Page[AdminReservationResponse](
        items=[AdminReservationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/reservations/{reservation_id}/confirm", response_model=AdminReservationResponse)
async def confirm_reservation(
    reservation_id: UUID, admin: AdminUser, session: SessionDep, background: BackgroundTasks
) -> AdminReservationResponse:
    reservation = await ReservationService(session).confirm(reservation_id, admin)
    schedule_notification(background, reservation.id, "reservation_confirmed")
    return AdminReservationResponse.model_validate(reservation)


@router.post("/reservations/{reservation_id}/cancel", response_model=AdminReservationResponse)
async def cancel_reservation(
    reservation_id: UUID,
    admin: AdminUser,
    session: SessionDep,
    background: BackgroundTasks,
    payload: ReservationNoteRequest | None = None,
) -> AdminReservationResponse:
    reservation = await ReservationService(session).admin_cancel(
        reservation_id, admin, payload.note if payload else None
    )
    schedule_notification(background, reservation.id, "reservation_cancelled")
    return AdminReservationResponse.model_validate(reservation)


@router.post("/reservations/{reservation_id}/complete", response_model=AdminReservationResponse)
async def complete_reservation(
    reservation_id: UUID, admin: AdminUser, session: SessionDep, background: BackgroundTasks
) -> AdminReservationResponse:
    reservation = await ReservationService(session).complete(reservation_id, admin)
    schedule_notification(background, reservation.id, "reservation_completed")
    return AdminReservationResponse.model_validate(reservation)


@router.get(
    "/reservations/{reservation_id}/events",
    response_model=list[ReservationEventResponse],
    dependencies=[Depends(require_admin)],
)
async def list_reservation_events(
    reservation_id: UUID, session: SessionDep
) -> list[ReservationEventResponse]:
    events = await ReservationRepository(session).list_events(reservation_id)
    return [ReservationEventResponse.model_validate(event) for event in events]


@router.get(
    "/reservations/{reservation_id}/notifications",
    response_model=list[NotificationLogResponse],
    summary="Historial de correos, incluyendo fallos SMTP pendientes de reintento",
    dependencies=[Depends(require_admin)],
)
async def list_reservation_notifications(
    reservation_id: UUID, session: SessionDep
) -> list[NotificationLogResponse]:
    logs = await ReservationRepository(session).list_notification_logs(reservation_id)
    return [NotificationLogResponse.model_validate(log) for log in logs]


@router.post(
    "/reservations/{reservation_id}/notifications/retry",
    status_code=202,
    summary="Reintenta el correo correspondiente al estado actual",
)
async def retry_notification(
    reservation_id: UUID, admin: AdminUser, session: SessionDep, background: BackgroundTasks
) -> dict[str, str]:
    reservation = await ReservationService(session).get_for_actor(reservation_id, admin)
    template = {
        ReservationStatus.PENDING: "reservation_created",
        ReservationStatus.CONFIRMED: "reservation_confirmed",
        ReservationStatus.CANCELLED: "reservation_cancelled",
        ReservationStatus.COMPLETED: "reservation_completed",
    }[reservation.status]
    schedule_notification(background, reservation.id, template)
    return {"status": "queued", "template": template}


# --------------------------------------------------------------------------- #
# Indicadores
# --------------------------------------------------------------------------- #


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    dependencies=[Depends(require_admin)],
)
async def read_stats(session: SessionDep) -> AdminStatsResponse:
    tz = settings.timezone
    repository = ReservationRepository(session)
    today = datetime.now(tz).date()
    day_start = datetime.combine(today, time.min, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    pending = await repository.count_by_status(ReservationStatus.PENDING)
    confirmed_today = await repository.count_by_status(ReservationStatus.CONFIRMED)
    reservations_today, quoted_today = await repository.summary_between(day_start, day_end)
    _, bookable = await FacilityService(session).list_catalog(only_bookable=True, limit=100)

    # Ocupacion aproximada: reservas activas de hoy sobre 12 bloques por espacio.
    capacity = max(bookable * 12, 1)
    return AdminStatsResponse(
        pending=pending,
        confirmed_today=confirmed_today,
        reservations_today=reservations_today,
        quoted_today=Decimal(str(quoted_today)),
        occupancy_rate_today=round(reservations_today / capacity, 4),
        bookable_facilities=bookable,
    )


# --------------------------------------------------------------------------- #
# Catalogo
# --------------------------------------------------------------------------- #


@router.get("/facilities", response_model=Page[FacilityResponse])
async def list_all_facilities(
    session: SessionDep,
    staff: CatalogStaffUser,
    zone: Zone | None = None,
    sport_type: SportType | None = None,
    facility_kind: FacilityKind | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
) -> Page[FacilityResponse]:
    items, total = await FacilityService(session).list_catalog(
        zone=zone,
        sport_type=sport_type.value if sport_type else None,
        facility_kind=facility_kind.value if facility_kind else None,
        include_inactive=True,
        page=page,
        limit=limit,
    )
    return Page[FacilityResponse](
        items=[FacilityResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/facilities/{facility_id}", response_model=FacilityDetailResponse)
async def read_admin_facility(
    facility_id: UUID, session: SessionDep, staff: CatalogStaffUser
) -> FacilityDetailResponse:
    facility = await FacilityService(session).get(facility_id, include_inactive=True)
    return FacilityDetailResponse.model_validate(facility)


@router.post("/facilities", response_model=FacilityDetailResponse, status_code=201)
async def create_facility(
    payload: FacilityCreate, session: SessionDep, staff: CatalogStaffUser
) -> FacilityDetailResponse:
    facility = await FacilityService(session).create(payload.model_dump())
    return FacilityDetailResponse.model_validate(facility)


@router.patch("/facilities/{facility_id}", response_model=FacilityDetailResponse)
async def update_facility(
    facility_id: UUID,
    payload: FacilityUpdate,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> FacilityDetailResponse:
    facility = await FacilityService(session).update(
        facility_id, payload.model_dump(exclude_unset=True)
    )
    return FacilityDetailResponse.model_validate(facility)


@router.post(
    "/facilities/{facility_id}/schedules",
    response_model=list[ScheduleResponse],
    summary="Reemplaza el horario semanal completo",
)
async def replace_schedules(
    facility_id: UUID,
    payload: ScheduleReplaceRequest,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> list[ScheduleResponse]:
    await FacilityService(session).get(facility_id, include_inactive=True)
    schedules = await ScheduleService(session).replace(
        facility_id, [entry.model_dump() for entry in payload.schedules]
    )
    return [ScheduleResponse.model_validate(schedule) for schedule in schedules]


@router.post("/facilities/{facility_id}/rates", response_model=RateResponse, status_code=201)
async def create_rate(
    facility_id: UUID,
    payload: RateCreate,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> RateResponse:
    await FacilityService(session).get(facility_id, include_inactive=True)
    rate = await RateService(session).create(facility_id, payload.model_dump())
    return RateResponse.model_validate(rate)


@router.post(
    "/facilities/{facility_id}/rates/publish",
    response_model=RateResponse,
    status_code=201,
    summary="Publica una nueva version de la tarifa vigente",
)
async def publish_rate(
    facility_id: UUID,
    payload: RatePublishRequest,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> RateResponse:
    await FacilityService(session).get(facility_id, include_inactive=True)
    rate = await RateService(session).publish_update(
        facility_id,
        amount=payload.amount,
        effective_from=payload.effective_from,
        minimum_minutes=payload.minimum_minutes,
    )
    return RateResponse.model_validate(rate)
