"""Consulta del usuario autenticado y cambio controlado de rol."""

import uuid
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.enums import UserRole
from app.domain.errors import (
    AdminRequired,
    OrganizationEmailMismatch,
    OrganizationNotFound,
    UserEmailTaken,
    UserNotFound,
)
from app.infrastructure.models import UserModel
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)

    async def require_user(self, user_id: UUID) -> UserModel:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise UserNotFound("The session points to a user that no longer exists.")
        return user

    async def list_users(self, actor: UserModel) -> list[UserModel]:
        self._require_admin(actor)
        return await self.users.list_all()

    async def create_user(self, actor: UserModel, payload: dict) -> UserModel:
        self._require_admin(actor)
        email = payload["email"].strip().lower()
        if email in settings.admin_email_set:
            raise AdminRequired(
                "The configured system administrator email is reserved."
            )
        if await self.users.get_by_email(email):
            raise UserEmailTaken("A user with this email is already registered.")
        organization = await self.organizations.get_by_id(payload["organization_id"])
        if organization is None or not organization.is_active:
            raise OrganizationNotFound("The requested organization does not exist.")
        if (
            payload["role"] == UserRole.ENCARGADO
            and email.rsplit("@", 1)[-1] != organization.email_domain
        ):
            raise OrganizationEmailMismatch(
                "An organization's reservation manager must use its registered email domain."
            )

        user_id = uuid.uuid4()
        user = self.users.add(
            UserModel(
                organization_id=organization.id,
                google_subject=f"pending:{user_id}",
                email=email,
                name=payload.get("name") or email.split("@", 1)[0],
                role=payload["role"],
                is_active=True,
            )
        )
        try:
            await self.session.commit()
        except IntegrityError as error:
            await self.session.rollback()
            raise UserEmailTaken(
                "A user with this email is already registered."
            ) from error
        await self.session.refresh(user)
        return user

    async def update_user(
        self, actor: UserModel, target_id: UUID, changes: dict
    ) -> UserModel:
        self._require_admin(actor)
        if actor.id == target_id:
            raise AdminRequired("An administrator cannot change their own account.")

        target = await self.require_user(target_id)
        if target.role == UserRole.ADMIN:
            raise AdminRequired(
                "The system administrator account cannot be modified here."
            )

        role = changes.get("role")
        if role is not None:
            if role == UserRole.ADMIN:
                raise AdminRequired(
                    "System administrator access cannot be assigned here."
                )
            if role == UserRole.ENCARGADO:
                organization = await self.organizations.get_by_id(
                    target.organization_id
                )
                if (
                    organization is None
                    or target.email.rsplit("@", 1)[-1] != organization.email_domain
                ):
                    raise OrganizationEmailMismatch(
                        "An organization's reservation manager must use its registered email domain."
                    )
            target.role = role
        if changes.get("is_active") is not None:
            target.is_active = changes["is_active"]

        await self.session.commit()
        await self.session.refresh(target)
        return target

    @staticmethod
    def _require_admin(actor: UserModel) -> None:
        if actor.role != UserRole.ADMIN:
            raise AdminRequired("Only an administrator can change roles.")
