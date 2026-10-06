from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserRole
from app.infrastructure.models import UserModel


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: UUID) -> UserModel | None:
        return await self.session.get(UserModel, user_id)

    async def get_by_google_subject(self, subject: str) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(UserModel.google_subject == subject)
        )

    async def get_by_email(self, email: str) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(UserModel.email == email.strip().lower())
        )

    async def get_by_dui(self, dui: str) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(UserModel.dui == dui)
        )

    async def get_registered_client(self, client_id: UUID) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(
                UserModel.id == client_id,
                UserModel.role == UserRole.CLIENT,
                UserModel.dui.is_not(None),
            )
        )

    async def list_registered_clients(self) -> list[UserModel]:
        rows = await self.session.scalars(
            select(UserModel)
            .where(UserModel.role == UserRole.CLIENT, UserModel.dui.is_not(None))
            .order_by(UserModel.created_at.desc())
        )
        return list(rows.all())

    def add(self, user: UserModel) -> UserModel:
        self.session.add(user)
        return user
