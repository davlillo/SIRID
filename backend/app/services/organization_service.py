from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import OrganizationConflict, OrganizationNotFound
from app.infrastructure.models import OrganizationModel
from app.repositories.organization_repository import OrganizationRepository


class OrganizationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.organizations = OrganizationRepository(session)

    async def list_all(self) -> list[OrganizationModel]:
        return await self.organizations.list_all()

    async def list_active(self) -> list[OrganizationModel]:
        return await self.organizations.list_active()

    async def create(self, payload: dict) -> OrganizationModel:
        slug = payload["slug"].strip().lower()
        domain = payload["email_domain"].strip().lower().removeprefix("@").rstrip(".")
        if await self.organizations.slug_exists(
            slug
        ) or await self.organizations.domain_exists(domain):
            raise OrganizationConflict(
                "The organization slug or email domain is already in use."
            )

        organization = self.organizations.add(
            OrganizationModel(
                name=payload["name"].strip(),
                slug=slug,
                email_domain=domain,
            )
        )
        await self._commit()
        await self.session.refresh(organization)
        return organization

    async def update(self, organization_id: UUID, changes: dict) -> OrganizationModel:
        organization = await self.organizations.get_by_id(organization_id)
        if organization is None:
            raise OrganizationNotFound("The requested organization does not exist.")

        slug = changes.get("slug")
        if slug is not None:
            slug = slug.strip().lower()
            if await self.organizations.slug_exists(slug, excluding=organization.id):
                raise OrganizationConflict("The organization slug is already in use.")
            organization.slug = slug

        if "email_domain" in changes:
            domain = changes["email_domain"]
            if domain is not None:
                domain = domain.strip().lower().removeprefix("@").rstrip(".")
                if await self.organizations.domain_exists(
                    domain, excluding=organization.id
                ):
                    raise OrganizationConflict(
                        "The organization email domain is already in use."
                    )
            organization.email_domain = domain

        if changes.get("name") is not None:
            organization.name = changes["name"].strip()
        if changes.get("is_active") is not None:
            organization.is_active = changes["is_active"]

        await self._commit()
        await self.session.refresh(organization)
        return organization

    async def _commit(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as error:
            await self.session.rollback()
            raise OrganizationConflict(
                "The organization slug or email domain is already in use."
            ) from error
