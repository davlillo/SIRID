from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import Zone
from app.infrastructure.models import FacilityModel


class FacilityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _catalog_query(
        self,
        *,
        zone: Zone | None,
        sport_type: str | None,
        facility_kind: str | None,
        min_capacity: int | None,
        include_inactive: bool,
        only_bookable: bool,
    ) -> Select[tuple[FacilityModel]]:
        query = select(FacilityModel)
        if not include_inactive:
            query = query.where(FacilityModel.is_active.is_(True))  # RN-10
        if only_bookable:
            query = query.where(FacilityModel.is_bookable.is_(True))
        if zone is not None:
            query = query.where(FacilityModel.zone == zone)
        if sport_type:
            query = query.where(FacilityModel.sport_type == sport_type)
        if facility_kind:
            query = query.where(FacilityModel.facility_kind == facility_kind)
        if min_capacity:
            query = query.where(FacilityModel.capacity >= min_capacity)
        return query

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
        filters = {
            "zone": zone,
            "sport_type": sport_type,
            "facility_kind": facility_kind,
            "min_capacity": min_capacity,
            "include_inactive": include_inactive,
            "only_bookable": only_bookable,
        }
        query = self._catalog_query(**filters)
        total = await self.session.scalar(
            select(func.count()).select_from(query.subquery())
        )
        rows = await self.session.scalars(
            query.order_by(FacilityModel.zone, FacilityModel.name)
            .offset((page - 1) * limit)
            .limit(limit)
        )
        return list(rows.unique().all()), int(total or 0)

    async def get_by_id(self, facility_id: UUID) -> FacilityModel | None:
        return await self.session.get(FacilityModel, facility_id)

    async def get_by_slug(self, slug: str) -> FacilityModel | None:
        return await self.session.scalar(select(FacilityModel).where(FacilityModel.slug == slug))

    async def slug_exists(self, slug: str, *, excluding: UUID | None = None) -> bool:
        query = select(func.count()).select_from(FacilityModel).where(FacilityModel.slug == slug)
        if excluding is not None:
            query = query.where(FacilityModel.id != excluding)
        return bool(await self.session.scalar(query))

    def add(self, facility: FacilityModel) -> FacilityModel:
        self.session.add(facility)
        return facility
