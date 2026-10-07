from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep, availability_rate_limit
from app.domain.enums import FacilityKind, SportType, Zone
from app.schemas.availability import (
    AvailabilityResponse,
    IntervalResponse,
    QuotedIntervalResponse,
    RangeCheckResponse,
    SlotResponse,
    WindowResponse,
)
from app.schemas.common import Page
from app.schemas.facility import FacilityDetailResponse, FacilityResponse
from app.services.availability_service import AvailabilityService
from app.services.facility_service import FacilityService

router = APIRouter(prefix="/facilities", tags=["facilities"])


@router.get("", response_model=Page[FacilityResponse], summary="Catalogo publico")
async def list_facilities(
    session: SessionDep,
    zone: Zone | None = None,
    sport_type: SportType | None = None,
    facility_kind: FacilityKind | None = None,
    min_capacity: int | None = Query(default=None, ge=1),
    only_bookable: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=24, ge=1, le=100),
) -> Page[FacilityResponse]:
    items, total = await FacilityService(session).list_catalog(
        zone=zone,
        sport_type=sport_type.value if sport_type else None,
        facility_kind=facility_kind.value if facility_kind else None,
        min_capacity=min_capacity,
        only_bookable=only_bookable,
        page=page,
        limit=limit,
    )
    return Page[FacilityResponse](
        items=[FacilityResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/slug/{slug}",
    response_model=FacilityDetailResponse,
    summary="Detalle por slug, para la ruta publica /instalaciones/[slug]",
)
async def read_facility_by_slug(slug: str, session: SessionDep) -> FacilityDetailResponse:
    facility = await FacilityService(session).get_by_slug(slug)
    return FacilityDetailResponse.model_validate(facility)


@router.get("/{facility_id}", response_model=FacilityDetailResponse, summary="Detalle por id")
async def read_facility(facility_id: UUID, session: SessionDep) -> FacilityDetailResponse:
    facility = await FacilityService(session).get(facility_id)
    return FacilityDetailResponse.model_validate(facility)


@router.get(
    "/{facility_id}/availability",
    response_model=AvailabilityResponse,
    dependencies=[Depends(availability_rate_limit)],
    summary="Bloques libres y ocupados de una fecha",
)
async def read_availability(
    facility_id: UUID,
    session: SessionDep,
    target_date: date = Query(alias="date", description="Fecha local del complejo, YYYY-MM-DD"),
) -> AvailabilityResponse:
    result = await AvailabilityService(session).for_date(
        facility_id, target_date, datetime.now(timezone.utc)
    )
    return AvailabilityResponse(
        facility_id=result.facility_id,
        date=result.date,
        timezone=result.timezone,
        is_open=result.is_open,
        slot_minutes=result.slot_minutes,
        currency=result.currency,
        operating_windows=[
            WindowResponse(
                starts_at=window.start, ends_at=window.end, slot_minutes=window.slot_minutes
            )
            for window in result.operating_windows
        ],
        busy=[
            IntervalResponse(starts_at=block.start, ends_at=block.end) for block in result.busy
        ],
        slots=[
            SlotResponse(
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
                status=slot.status,
                amount=slot.amount,
            )
            for slot in result.slots
        ],
    )


@router.get(
    "/{facility_id}/availability/check",
    response_model=RangeCheckResponse,
    dependencies=[Depends(availability_rate_limit)],
    summary="Libre u ocupado para un rango de horas, con alternativas del mismo dia",
)
async def check_availability_range(
    facility_id: UUID,
    session: SessionDep,
    target_date: date = Query(alias="date", description="Fecha local del complejo, YYYY-MM-DD"),
    start: time = Query(description="Hora local de inicio, HH:MM"),
    end: time = Query(description="Hora local de fin, HH:MM. 00:00 es medianoche"),
) -> RangeCheckResponse:
    result = await AvailabilityService(session).check_range(
        facility_id, target_date, start, end, datetime.now(timezone.utc)
    )
    return RangeCheckResponse(
        facility_id=result.facility_id,
        date=result.date,
        timezone=result.timezone,
        currency=result.currency,
        starts_at=result.starts_at,
        ends_at=result.ends_at,
        status=result.status,
        amount=result.amount,
        alternatives=[
            QuotedIntervalResponse(
                starts_at=item.starts_at, ends_at=item.ends_at, amount=item.amount
            )
            for item in result.alternatives
        ],
    )
