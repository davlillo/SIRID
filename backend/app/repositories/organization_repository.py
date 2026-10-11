from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import OrganizationModel

BOOTSTRAP_ORGANIZATION_ID = UUID("00000000-0000-0000-0000-000000000001")


class OrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, organization_id: UUID) -> OrganizationModel | None:
        return await self.session.get(OrganizationModel, organization_id)

    async def get_by_slug(self, slug: str) -> OrganizationModel | None:
        return await self.session.scalar(
            select(OrganizationModel).where(
                OrganizationModel.slug == slug,
                OrganizationModel.is_active.is_(True),
            )
        )

    async def get_active_by_identifier(
        self, identifier: str
    ) -> OrganizationModel | None:
        try:
            organization_id = UUID(identifier)
        except ValueError:
            return await self.get_by_slug(identifier)
        organization = await self.get_by_id(organization_id)
        if organization and organization.is_active:
            return organization
        return await self.get_by_slug(identifier)

    async def get_by_email_domain(self, domain: str) -> OrganizationModel | None:
        return await self.session.scalar(
            select(OrganizationModel).where(
                OrganizationModel.email_domain == domain,
                OrganizationModel.is_active.is_(True),
            )
        )

    async def slug_exists(self, slug: str, *, excluding: UUID | None = None) -> bool:
        query = select(OrganizationModel.id).where(OrganizationModel.slug == slug)
        if excluding is not None:
            query = query.where(OrganizationModel.id != excluding)
        return await self.session.scalar(query) is not None

    async def domain_exists(
        self, domain: str, *, excluding: UUID | None = None
    ) -> bool:
        query = select(OrganizationModel.id).where(
            OrganizationModel.email_domain == domain
        )
        if excluding is not None:
            query = query.where(OrganizationModel.id != excluding)
        return await self.session.scalar(query) is not None

    async def get_bootstrap(self) -> OrganizationModel | None:
        return await self.get_by_id(BOOTSTRAP_ORGANIZATION_ID)

    async def list_active(self) -> list[OrganizationModel]:
        rows = await self.session.scalars(
            select(OrganizationModel)
            .where(OrganizationModel.is_active.is_(True))
            .order_by(OrganizationModel.name)
        )
        return list(rows.all())

    async def list_all(self) -> list[OrganizationModel]:
        rows = await self.session.scalars(
            select(OrganizationModel).order_by(OrganizationModel.name)
        )
        return list(rows.all())

    def add(self, organization: OrganizationModel) -> OrganizationModel:
        self.session.add(organization)
        return organization
