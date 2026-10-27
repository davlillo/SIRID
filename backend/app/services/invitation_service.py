"""Single-use, expiring links for clients to establish their own password."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domain.enums import UserRole
from app.domain.errors import AuthenticationFailed, ClientNotFound
from app.infrastructure.models import OrganizationModel, UserModel


class InvitationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def issue(self, client_id: UUID) -> tuple[UserModel, str]:
        user = await self.session.scalar(select(UserModel).where(UserModel.id == client_id)
                                         .with_for_update().execution_options(populate_existing=True))
        if user is None or user.role != UserRole.CLIENT or not user.is_active:
            raise ClientNotFound("El cliente solicitado no existe o está desactivado.")
        token = secrets.token_urlsafe(32)
        user.invitation_token_hash = hashlib.sha256(token.encode()).hexdigest()
        user.invitation_expires_at = datetime.now(UTC) + timedelta(hours=24)
        await self.session.commit()
        return user, token

    async def accept(self, token: str, password: str) -> None:
        digest = hashlib.sha256(token.encode()).hexdigest()
        user = await self.session.scalar(select(UserModel).where(
            UserModel.invitation_token_hash == digest,
        ).with_for_update())
        if (user is None or not user.is_active or user.role != UserRole.CLIENT
                or user.invitation_expires_at is None or user.invitation_expires_at <= datetime.now(UTC)):
            raise AuthenticationFailed("El enlace no es válido o ha vencido. Solicite una nueva invitación.")
        organization = await self.session.get(OrganizationModel, user.organization_id)
        if organization is None or not organization.is_active:
            raise AuthenticationFailed("This account cannot access SIRID.")
        user.password_hash = hash_password(password)
        user.invitation_token_hash = None
        user.invitation_expires_at = None
        await self.session.commit()
