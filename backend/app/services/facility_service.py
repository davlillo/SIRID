"""Catalogo de instalaciones, CRUD administrativo y metadatos del plano."""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.domain.enums import Zone
from app.domain.errors import (
    FacilityNotBookable,
    FacilityNotFound,
    FacilitySlugTaken,
    OrganizationNotFound,
)
from app.infrastructure.facility_photos import delete_photo, prepare_photo, store_photo
from app.infrastructure.models import FacilityImageModel, FacilityModel
from app.repositories.facility_repository import FacilityRepository
from app.repositories.organization_repository import OrganizationRepository

WRITABLE_FIELDS = (
    "name",
    "description",
    "sport_type",
    "facility_kind",
    "zone",
    "surface",
    "capacity",
    "location_label",
    "is_bookable",
    "is_active",
    "map_x",
    "map_y",
    "map_z",
    "map_width",
    "map_depth",
)

logger = logging.getLogger(__name__)


class FacilityService:
    """Coordina catalogo, CRUD, tipos y metadatos del plano."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = FacilityRepository(session)
        self.organizations = OrganizationRepository(session)

    async def list_catalog(
        self,
        *,
        zone: Zone | None = None,
        sport_type: str | None = None,
        facility_kind: str | None = None,
        min_capacity: int | None = None,
        organization_id: UUID | None = None,
        include_inactive: bool = False,
        only_bookable: bool = False,
        page: int = 1,
        limit: int = 24,
    ) -> tuple[list[FacilityModel], int]:
        return await self.repository.list_catalog(
            zone=zone,
            sport_type=sport_type,
            facility_kind=facility_kind,
            min_capacity=min_capacity,
            organization_id=organization_id,
            include_inactive=include_inactive,
            only_bookable=only_bookable,
            page=page,
            limit=limit,
        )

    async def get(
        self,
        facility_id: UUID,
        *,
        organization_id: UUID | None = None,
        include_inactive: bool = False,
    ) -> FacilityModel:
        facility = await self.repository.get_by_id(
            facility_id, organization_id=organization_id
        )
        if facility is None or (not facility.is_active and not include_inactive):
            raise FacilityNotFound("The requested facility does not exist.")
        return facility

    async def get_by_slug(
        self,
        slug: str,
        *,
        organization_id: UUID | None = None,
        include_inactive: bool = False,
    ) -> FacilityModel:
        facility = await self.repository.get_by_slug(
            slug, organization_id=organization_id
        )
        if facility is None or (not facility.is_active and not include_inactive):
            raise FacilityNotFound("The requested facility does not exist.")
        return facility

    async def require_bookable(
        self, facility_id: UUID, *, organization_id: UUID | None = None
    ) -> FacilityModel:
        """RN-10: una instalacion inactiva o informativa no admite reservas."""
        facility = await self.get(facility_id, organization_id=organization_id)
        organization = await self.organizations.get_by_id(facility.organization_id)
        if organization is None or not organization.is_active:
            raise FacilityNotFound("The requested facility does not exist.")
        if not facility.is_bookable:
            raise FacilityNotBookable("This space is informative and cannot be booked.")
        return facility

    async def create(self, payload: dict) -> FacilityModel:
        organization_id = payload["organization_id"]
        organization = await self.organizations.get_by_id(organization_id)
        if organization is None or not organization.is_active:
            raise OrganizationNotFound("The requested organization does not exist.")
        slug = payload["slug"].strip().lower()
        if await self.repository.slug_exists(slug, organization_id=organization_id):
            raise FacilitySlugTaken(f"The slug '{slug}' is already in use.")

        facility = self.repository.add(
            FacilityModel(
                organization_id=payload["organization_id"],
                slug=slug,
                images=[],
                facility_metadata=payload.get("metadata") or {},
                **{
                    field: payload.get(field)
                    for field in WRITABLE_FIELDS
                    if field in payload
                },
            )
        )
        await self._save_with_photo(facility, payload)
        return facility

    async def update(self, facility_id: UUID, payload: dict) -> FacilityModel:
        facility = await self.get(facility_id, include_inactive=True)

        if payload.get("slug"):
            slug = payload["slug"].strip().lower()
            if await self.repository.slug_exists(
                slug,
                organization_id=facility.organization_id,
                excluding=facility.id,
            ):
                raise FacilitySlugTaken(f"The slug '{slug}' is already in use.")
            facility.slug = slug

        for field in WRITABLE_FIELDS:
            if field in payload and payload[field] is not None:
                setattr(facility, field, payload[field])
        if payload.get("metadata") is not None:
            facility.facility_metadata = payload["metadata"]

        await self._save_with_photo(facility, payload)
        return facility

    async def _save_with_photo(self, facility: FacilityModel, payload: dict) -> None:
        """Commit data and photo together; compensate file writes on DB failure."""
        new_url = None
        old_urls = []
        if "photo" in payload:
            if payload["photo"] is not None:
                content = await run_in_threadpool(prepare_photo, payload["photo"])
                new_url = await run_in_threadpool(store_photo, content)
            old_urls = [image.url for image in facility.images]
            facility.images = (
                [FacilityImageModel(url=new_url, alt_text=f"Foto de {facility.name}", sort_order=0)]
                if new_url else []
            )
        try:
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            if new_url:
                await run_in_threadpool(delete_photo, new_url)
            raise
        for url in old_urls:
            try:
                await run_in_threadpool(delete_photo, url)
            except OSError:
                # A cleanup failure must not turn an already committed save into an error.
                logger.warning("Could not remove an old facility photo", exc_info=True)
        await self.session.refresh(facility)

    async def replace_images(
        self, facility_id: UUID, images: list[dict]
    ) -> FacilityModel:
        facility = await self.get(facility_id, include_inactive=True)
        facility.images.clear()
        for order, image in enumerate(images):
            facility.images.append(
                FacilityImageModel(
                    url=image["url"],
                    alt_text=image["alt_text"],
                    sort_order=image.get("sort_order", order),
                )
            )
        await self.session.commit()
        await self.session.refresh(facility)
        return facility
