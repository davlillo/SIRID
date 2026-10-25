from datetime import UTC, date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import AdminUser, OptionalUser, SessionDep, availability_rate_limit
from app.domain.enums import FacilityKind, SportType, UserRole, Zone
from app.domain.errors import OrganizationNotFound
from app.infrastructure.models import UserModel
from app.repositories.organization_repository import OrganizationRepository
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
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    PublicOrganizationResponse,
)
from app.schemas.user_management import (
    SystemUserCreate,
    SystemUserResponse,
    SystemUserUpdate,
)
from app.services.availability_service import AvailabilityService
from app.services.facility_service import FacilityService
from app.services.organization_service import OrganizationService
from app.services.user_service import UserService

public_router = APIRouter(prefix="/organizations", tags=["organizations"])
admin_router = APIRouter(prefix="/admin", tags=["system-admin"])


@public_router.get("", response_model=list[PublicOrganizationResponse])
async def list_public_organizations(
    session: SessionDep, user: OptionalUser,
) -> list[PublicOrganizationResponse]:
    if user is not None and user.role == UserRole.CLIENT:
        organization = await OrganizationRepository(session).get_by_id(user.organization_id)
        return [PublicOrganizationResponse.model_validate(organization)] if organization and organization.is_active else []
    organizations = await OrganizationService(session).list_active()
    return [PublicOrganizationResponse.model_validate(item) for item in organizations]


async def _active_organization_id(
    session: SessionDep, slug: str, user: UserModel | None = None,
) -> UUID:
    organization = await OrganizationRepository(session).get_active_by_identifier(slug)
    if organization is None or (
        user is not None and user.role == UserRole.CLIENT
        and organization.id != user.organization_id
    ):
        raise OrganizationNotFound("The requested organization does not exist.")
    return organization.id


@public_router.get(
    "/{organization_slug}/facilities", response_model=Page[FacilityResponse]
)
async def list_organization_facilities(
    organization_slug: str,
    session: SessionDep,
    user: OptionalUser,
    zone: Zone | None = None,
    sport_type: SportType | None = None,
    facility_kind: FacilityKind | None = None,
    min_capacity: int | None = Query(default=None, ge=1),
    only_bookable: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=24, ge=1, le=100),
) -> Page[FacilityResponse]:
    organization_id = await _active_organization_id(session, organization_slug, user)
    items, total = await FacilityService(session).list_catalog(
        zone=zone,
        sport_type=sport_type.value if sport_type else None,
        facility_kind=facility_kind.value if facility_kind else None,
        min_capacity=min_capacity,
        organization_id=organization_id,
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


@public_router.get(
    "/{organization_slug}/facilities/{facility_slug}",
    response_model=FacilityDetailResponse,
)
async def read_organization_facility(
    organization_slug: str, facility_slug: str, session: SessionDep, user: OptionalUser,
) -> FacilityDetailResponse:
    organization_id = await _active_organization_id(session, organization_slug, user)
    facility = await FacilityService(session).get_by_slug(
        facility_slug, organization_id=organization_id
    )
    return FacilityDetailResponse.model_validate(facility)


@public_router.get(
    "/{organization_slug}/facilities/id/{facility_id}",
    response_model=FacilityDetailResponse,
)
async def read_organization_facility_by_id(
    organization_slug: str, facility_id: UUID, session: SessionDep, user: OptionalUser,
) -> FacilityDetailResponse:
    organization_id = await _active_organization_id(session, organization_slug, user)
    facility = await FacilityService(session).get(
        facility_id, organization_id=organization_id
    )
    return FacilityDetailResponse.model_validate(facility)


@public_router.get(
    "/{organization_slug}/facilities/{facility_id}/availability",
    response_model=AvailabilityResponse,
    dependencies=[Depends(availability_rate_limit)],
)
async def read_organization_availability(
    organization_slug: str,
    facility_id: UUID,
    session: SessionDep,
    user: OptionalUser,
    target_date: date = Query(alias="date"),
) -> AvailabilityResponse:
    organization_id = await _active_organization_id(session, organization_slug, user)
    result = await AvailabilityService(session).for_date(
        facility_id,
        target_date,
        datetime.now(UTC),
        organization_id=organization_id,
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
                starts_at=window.start,
                ends_at=window.end,
                slot_minutes=window.slot_minutes,
            )
            for window in result.operating_windows
        ],
        busy=[
            IntervalResponse(starts_at=block.start, ends_at=block.end)
            for block in result.busy
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


@public_router.get(
    "/{organization_slug}/facilities/{facility_id}/availability/check",
    response_model=RangeCheckResponse,
    dependencies=[Depends(availability_rate_limit)],
)
async def check_organization_availability(
    organization_slug: str,
    facility_id: UUID,
    session: SessionDep,
    user: OptionalUser,
    target_date: date = Query(alias="date"),
    start: time = Query(),
    end: time = Query(),
) -> RangeCheckResponse:
    organization_id = await _active_organization_id(session, organization_slug, user)
    result = await AvailabilityService(session).check_range(
        facility_id,
        target_date,
        start,
        end,
        datetime.now(UTC),
        organization_id=organization_id,
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
                starts_at=item.starts_at,
                ends_at=item.ends_at,
                amount=item.amount,
            )
            for item in result.alternatives
        ],
    )


@admin_router.get("/organizations", response_model=list[OrganizationResponse])
async def list_organizations(
    session: SessionDep, admin: AdminUser
) -> list[OrganizationResponse]:
    organizations = await OrganizationService(session).list_all()
    return [OrganizationResponse.model_validate(item) for item in organizations]


@admin_router.post(
    "/organizations", response_model=OrganizationResponse, status_code=201
)
async def create_organization(
    payload: OrganizationCreate, session: SessionDep, admin: AdminUser
) -> OrganizationResponse:
    organization = await OrganizationService(session).create(payload.model_dump())
    return OrganizationResponse.model_validate(organization)


@admin_router.patch(
    "/organizations/{organization_id}", response_model=OrganizationResponse
)
async def update_organization(
    organization_id: UUID,
    payload: OrganizationUpdate,
    session: SessionDep,
    admin: AdminUser,
) -> OrganizationResponse:
    organization = await OrganizationService(session).update(
        organization_id, payload.model_dump(exclude_unset=True)
    )
    return OrganizationResponse.model_validate(organization)


@admin_router.get("/users", response_model=list[SystemUserResponse])
async def list_users(session: SessionDep, admin: AdminUser) -> list[SystemUserResponse]:
    users = await UserService(session).list_users(admin)
    return [SystemUserResponse.model_validate(user) for user in users]


@admin_router.post("/users", response_model=SystemUserResponse, status_code=201)
async def create_user(
    payload: SystemUserCreate, session: SessionDep, admin: AdminUser
) -> SystemUserResponse:
    user = await UserService(session).create_user(admin, payload.model_dump())
    return SystemUserResponse.model_validate(user)


@admin_router.patch("/users/{user_id}", response_model=SystemUserResponse)
async def update_user(
    user_id: UUID,
    payload: SystemUserUpdate,
    session: SessionDep,
    admin: AdminUser,
) -> SystemUserResponse:
    user = await UserService(session).update_user(
        admin, user_id, payload.model_dump(exclude_unset=True)
    )
    return SystemUserResponse.model_validate(user)
