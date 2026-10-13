import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserRole
from app.infrastructure.models import UserModel


def normalize_dui(value: str) -> str | None:
    """Acepta `12345678-9` o `123456789`; devuelve el formato canonico."""
    digits = re.sub(r"\D", "", value)
    if len(digits) != 9:
        return None
    return f"{digits[:8]}-{digits[8:]}"


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: UUID) -> UserModel | None:
        return await self.session.get(UserModel, user_id)

    async def list_all(self) -> list[UserModel]:
        rows = await self.session.scalars(
            select(UserModel).order_by(UserModel.created_at.desc())
        )
        return list(rows.all())

    async def get_by_google_subject(self, subject: str) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(UserModel.google_subject == subject)
        )

    async def get_by_email(self, email: str) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(UserModel.email == email.strip().lower())
        )

    async def get_by_dui(self, dui: str) -> UserModel | None:
        return await self.session.scalar(select(UserModel).where(UserModel.dui == dui))

    async def get_by_identifier(self, identifier: str) -> UserModel | None:
        """Resuelve un inicio de sesion local: primero correo, luego DUI."""
        value = identifier.strip()
        by_email = await self.get_by_email(value)
        if by_email is not None:
            return by_email
        dui = normalize_dui(value)
        if dui is not None:
            return await self.get_by_dui(dui)
        return None

    async def get_registered_client(self, client_id: UUID) -> UserModel | None:
        return await self.session.scalar(
            select(UserModel).where(
                UserModel.id == client_id,
                UserModel.role == UserRole.CLIENT,
                UserModel.dui.is_not(None),
            )
        )

    async def list_registered_clients(
        self, *, organization_id: UUID | None = None
    ) -> list[UserModel]:
        query = select(UserModel).where(
            UserModel.role == UserRole.CLIENT,
            UserModel.dui.is_not(None),
        )
        if organization_id is not None:
            query = query.where(UserModel.organization_id == organization_id)
        rows = await self.session.scalars(query.order_by(UserModel.created_at.desc()))
        return list(rows.all())

    def add(self, user: UserModel) -> UserModel:
        self.session.add(user)
        return user
