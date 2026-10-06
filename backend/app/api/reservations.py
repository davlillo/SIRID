from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.api.deps import CurrentUser, SessionDep, reservation_rate_limit
from app.api.notifications import schedule_notification
from app.schemas.common import Page
from app.schemas.reservation import (
    ReservationCreate,
    ReservationNoteRequest,
    ReservationResponse,
)
from app.services.reservation_service import CreateReservation, ReservationService

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post(
    "",
    response_model=ReservationResponse,
    status_code=201,
    dependencies=[Depends(reservation_rate_limit)],
    summary="Crea una solicitud de reserva en estado PENDING",
)
async def create_reservation(
    payload: ReservationCreate,
    user: CurrentUser,
    session: SessionDep,
    background: BackgroundTasks,
) -> ReservationResponse:
    reservation = await ReservationService(session).create(
        user,
        CreateReservation(
            facility_id=payload.facility_id,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            customer_note=payload.customer_note,
        ),
    )
    # El correo se dispara despues del commit y nunca revierte la reserva.
    schedule_notification(background, reservation.id, "reservation_created")
    return ReservationResponse.model_validate(reservation)


@router.get("/me", response_model=Page[ReservationResponse], summary="Mis reservas")
async def list_my_reservations(
    user: CurrentUser,
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[ReservationResponse]:
    items, total = await ReservationService(session).list_for_customer(
        user, page=page, limit=limit
    )
    return Page[ReservationResponse](
        items=[ReservationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{reservation_id}", response_model=ReservationResponse, summary="Detalle")
async def read_reservation(
    reservation_id: UUID, user: CurrentUser, session: SessionDep
) -> ReservationResponse:
    reservation = await ReservationService(session).get_for_actor(reservation_id, user)
    return ReservationResponse.model_validate(reservation)


@router.post(
    "/{reservation_id}/cancel",
    response_model=ReservationResponse,
    summary="Cancela una reserva propia",
)
async def cancel_reservation(
    reservation_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    background: BackgroundTasks,
    payload: ReservationNoteRequest | None = None,
) -> ReservationResponse:
    reservation = await ReservationService(session).cancel(
        reservation_id, user, payload.note if payload else None
    )
    schedule_notification(background, reservation.id, "reservation_cancelled")
    return ReservationResponse.model_validate(reservation)
