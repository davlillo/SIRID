"""Operaciones administrativas. Todo el router exige rol ADMIN."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.api.deps import (
    AdminUser,
    CatalogStaffUser,
    ReservationStaffUser,
    SessionDep,
    require_reservation_staff,
)
from app.api.notifications import schedule_notification
from app.core.config import settings
from app.domain.enums import FacilityKind, ReservationStatus, SportType, UserRole, Zone
from app.infrastructure.models import UserModel
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
from app.services.client_service import ClientService
from app.services.facility_service import FacilityService
from app.services.rate_service import RateService
from app.services.reservation_service import ReservationService
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/admin", tags=["admin"])


async def _assert_facility_access(
    session: SessionDep, facility_id: UUID, staff: UserModel
) -> None:
    """ADMIN ve cualquier instalacion; ENCARGADO solo las de su organizacion."""
    await FacilityService(session).get(
        facility_id,
        organization_id=(
            staff.organization_id if staff.role == UserRole.ENCARGADO else None
        ),
        include_inactive=True,
    )


# --------------------------------------------------------------------------- #
# Clientes
# --------------------------------------------------------------------------- #


@router.get("/clients", response_model=list[ClientResponse])
async def list_clients(session: SessionDep, staff: AdminUser) -> list[ClientResponse]:
    clients = await ClientService(session).list_registered()
    return [ClientResponse.model_validate(client) for client in clients]


@router.post("/clients", response_model=ClientResponse, status_code=201)
async def create_client(
    payload: ClientCreate, session: SessionDep, staff: AdminUser
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
    staff: AdminUser,
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
)
async def list_reservations(
    session: SessionDep,
    encargado: ReservationStaffUser,
    status: ReservationStatus | None = None,
    facility_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[AdminReservationResponse]:
    tz = settings.timezone
    items, total = await ReservationRepository(session).list_for_admin(
        organization_id=encargado.organization_id,
        status=status,
        facility_id=facility_id,
        date_from=datetime.combine(date_from, time.min, tzinfo=tz)
        if date_from
        else None,
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


@router.post(
    "/reservations/{reservation_id}/confirm", response_model=AdminReservationResponse
)
async def confirm_reservation(
    reservation_id: UUID,
    admin: ReservationStaffUser,
    session: SessionDep,
    background: BackgroundTasks,
) -> AdminReservationResponse:
    reservation = await ReservationService(session).confirm(reservation_id, admin)
    schedule_notification(background, reservation.id, "reservation_confirmed")
    return AdminReservationResponse.model_validate(reservation)


@router.post(
    "/reservations/{reservation_id}/cancel", response_model=AdminReservationResponse
)
async def cancel_reservation(
    reservation_id: UUID,
    admin: ReservationStaffUser,
    session: SessionDep,
    background: BackgroundTasks,
    payload: ReservationNoteRequest | None = None,
) -> AdminReservationResponse:
    reservation = await ReservationService(session).admin_cancel(
        reservation_id, admin, payload.note if payload else None
    )
    schedule_notification(background, reservation.id, "reservation_cancelled")
    return AdminReservationResponse.model_validate(reservation)


@router.post(
    "/reservations/{reservation_id}/complete", response_model=AdminReservationResponse
)
async def complete_reservation(
    reservation_id: UUID,
    admin: ReservationStaffUser,
    session: SessionDep,
    background: BackgroundTasks,
) -> AdminReservationResponse:
    reservation = await ReservationService(session).complete(reservation_id, admin)
    schedule_notification(background, reservation.id, "reservation_completed")
    return AdminReservationResponse.model_validate(reservation)


@router.get(
    "/reservations/{reservation_id}/events",
    response_model=list[ReservationEventResponse],
    dependencies=[Depends(require_reservation_staff)],
)
async def list_reservation_events(
    reservation_id: UUID, session: SessionDep, encargado: ReservationStaffUser
) -> list[ReservationEventResponse]:
    events = await ReservationRepository(session).list_events(
        reservation_id, organization_id=encargado.organization_id
    )
    return [ReservationEventResponse.model_validate(event) for event in events]


@router.get(
    "/reservations/{reservation_id}/notifications",
    response_model=list[NotificationLogResponse],
    summary="Historial de correos, incluyendo fallos SMTP pendientes de reintento",
    dependencies=[Depends(require_reservation_staff)],
)
async def list_reservation_notifications(
    reservation_id: UUID, session: SessionDep, encargado: ReservationStaffUser
) -> list[NotificationLogResponse]:
    logs = await ReservationRepository(session).list_notification_logs(
        reservation_id, organization_id=encargado.organization_id
    )
    return [NotificationLogResponse.model_validate(log) for log in logs]


@router.post(
    "/reservations/{reservation_id}/notifications/retry",
    status_code=202,
    summary="Reintenta el correo correspondiente al estado actual",
)
async def retry_notification(
    reservation_id: UUID,
    admin: ReservationStaffUser,
    session: SessionDep,
    background: BackgroundTasks,
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
)
async def read_stats(
    session: SessionDep, encargado: ReservationStaffUser
) -> AdminStatsResponse:
    tz = settings.timezone
    repository = ReservationRepository(session)
    today = datetime.now(tz).date()
    day_start = datetime.combine(today, time.min, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    pending = await repository.count_by_status(
        ReservationStatus.PENDING, organization_id=encargado.organization_id
    )
    confirmed_today = await repository.count_by_status(
        ReservationStatus.CONFIRMED, organization_id=encargado.organization_id
    )
    reservations_today, quoted_today = await repository.summary_between(
        day_start, day_end, organization_id=encargado.organization_id
    )
    _, bookable = await FacilityService(session).list_catalog(
        only_bookable=True,
        organization_id=encargado.organization_id,
        limit=100,
    )

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
        organization_id=(
            staff.organization_id if staff.role == UserRole.ENCARGADO else None
        ),
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
    facility = await FacilityService(session).get(
        facility_id,
        organization_id=(
            staff.organization_id if staff.role == UserRole.ENCARGADO else None
        ),
        include_inactive=True,
    )
    return FacilityDetailResponse.model_validate(facility)


@router.post("/facilities", response_model=FacilityDetailResponse, status_code=201)
async def create_facility(
    payload: FacilityCreate, session: SessionDep, staff: CatalogStaffUser
) -> FacilityDetailResponse:
    data = payload.model_dump()
    if staff.role == UserRole.ENCARGADO:
        # HU-07: el encargado solo crea instalaciones de su propia organizacion.
        data["organization_id"] = staff.organization_id
    facility = await FacilityService(session).create(data)
    return FacilityDetailResponse.model_validate(facility)


@router.patch("/facilities/{facility_id}", response_model=FacilityDetailResponse)
async def update_facility(
    facility_id: UUID,
    payload: FacilityUpdate,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> FacilityDetailResponse:
    service = FacilityService(session)
    if staff.role == UserRole.ENCARGADO:
        # Verifica pertenencia antes de editar: otro tenant responde 404.
        await service.get(
            facility_id,
            organization_id=staff.organization_id,
            include_inactive=True,
        )
    facility = await service.update(
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
    await _assert_facility_access(session, facility_id, staff)
    schedules = await ScheduleService(session).replace(
        facility_id, [entry.model_dump() for entry in payload.schedules]
    )
    return [ScheduleResponse.model_validate(schedule) for schedule in schedules]


@router.post(
    "/facilities/{facility_id}/rates", response_model=RateResponse, status_code=201
)
async def create_rate(
    facility_id: UUID,
    payload: RateCreate,
    session: SessionDep,
    staff: CatalogStaffUser,
) -> RateResponse:
    await _assert_facility_access(session, facility_id, staff)
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
    await _assert_facility_access(session, facility_id, staff)
    rate = await RateService(session).publish_update(
        facility_id,
        amount=payload.amount,
        effective_from=payload.effective_from,
        minimum_minutes=payload.minimum_minutes,
    )
    return RateResponse.model_validate(rate)
