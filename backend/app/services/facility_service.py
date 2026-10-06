"""Catalogo de instalaciones, CRUD administrativo y metadatos del plano."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import Zone
from app.domain.errors import FacilityNotBookable, FacilityNotFound, FacilitySlugTaken
from app.infrastructure.models import FacilityImageModel, FacilityModel
from app.repositories.facility_repository import FacilityRepository

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


class FacilityService:
    """Coordina catalogo, CRUD, tipos y metadatos del plano."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = FacilityRepository(session)

    async def list_catalog(
        self,
        *,
        zone: Zone | None = None,
        sport_type: str | None = None,
        facility_kind: str | None = None,
        min_capacity: int | None = None,
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
            include_inactive=include_inactive,
            only_bookable=only_bookable,
            page=page,
            limit=limit,
        )

    async def get(self, facility_id: UUID, *, include_inactive: bool = False) -> FacilityModel:
        facility = await self.repository.get_by_id(facility_id)
        if facility is None or (not facility.is_active and not include_inactive):
            raise FacilityNotFound("The requested facility does not exist.")
        return facility

    async def get_by_slug(self, slug: str, *, include_inactive: bool = False) -> FacilityModel:
        facility = await self.repository.get_by_slug(slug)
        if facility is None or (not facility.is_active and not include_inactive):
            raise FacilityNotFound("The requested facility does not exist.")
        return facility

    async def require_bookable(self, facility_id: UUID) -> FacilityModel:
        """RN-10: una instalacion inactiva o informativa no admite reservas."""
        facility = await self.get(facility_id)
        if not facility.is_bookable:
            raise FacilityNotBookable("This space is informative and cannot be booked.")
        return facility

    async def create(self, payload: dict) -> FacilityModel:
        slug = payload["slug"].strip().lower()
        if await self.repository.slug_exists(slug):
            raise FacilitySlugTaken(f"The slug '{slug}' is already in use.")

        facility = self.repository.add(
            FacilityModel(
                slug=slug,
                facility_metadata=payload.get("metadata") or {},
                **{field: payload.get(field) for field in WRITABLE_FIELDS if field in payload},
            )
        )
        await self.session.commit()
        await self.session.refresh(facility)
        return facility

    async def update(self, facility_id: UUID, payload: dict) -> FacilityModel:
        facility = await self.get(facility_id, include_inactive=True)

        if "slug" in payload and payload["slug"]:
            slug = payload["slug"].strip().lower()
            if await self.repository.slug_exists(slug, excluding=facility.id):
                raise FacilitySlugTaken(f"The slug '{slug}' is already in use.")
            facility.slug = slug

        for field in WRITABLE_FIELDS:
            if field in payload and payload[field] is not None:
                setattr(facility, field, payload[field])
        if payload.get("metadata") is not None:
            facility.facility_metadata = payload["metadata"]

        await self.session.commit()
        await self.session.refresh(facility)
        return facility

    async def replace_images(self, facility_id: UUID, images: list[dict]) -> FacilityModel:
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
