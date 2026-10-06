"""Consulta del usuario autenticado y cambio controlado de rol."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserRole
from app.domain.errors import AdminRequired, UserNotFound
from app.infrastructure.models import UserModel
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def require_user(self, user_id: UUID) -> UserModel:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise UserNotFound("The session points to a user that no longer exists.")
        return user

    async def change_role(self, actor: UserModel, target_id: UUID, role: UserRole) -> UserModel:
        """Solo un admin cambia roles, y nunca el suyo propio."""
        if actor.role != UserRole.ADMIN:
            raise AdminRequired("Only an administrator can change roles.")
        if actor.id == target_id:
            raise AdminRequired("An administrator cannot change their own role.")

        target = await self.require_user(target_id)
        target.role = role
        await self.session.commit()
        await self.session.refresh(target)
        return target
