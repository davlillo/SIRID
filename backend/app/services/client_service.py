"""Registro, actualizacion y baja de clientes (HU-01, RF-01, RF-02)."""

import uuid
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import UserRole
from app.domain.errors import ClientDuiTaken, ClientEmailTaken, ClientNotFound
from app.infrastructure.models import UserModel
from app.repositories.user_repository import UserRepository

DUI_TAKEN = "Ya existe un cliente registrado con este DUI."
EMAIL_TAKEN = "Ya existe un usuario registrado con este correo."


class ClientService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def create(self, payload: dict) -> UserModel:
        dui = payload["dui"].strip()
        email = payload["email"].strip().lower()
        await self._assert_unique(dui=dui, email=email)

        first_name = payload["first_name"].strip()
        last_name = payload["last_name"].strip()
        client_id = uuid.uuid4()
        user = self.users.add(
            UserModel(
                id=client_id,
                # Se reemplaza por el subject real cuando el cliente entre con Google
                # usando este mismo correo.
                google_subject=f"manual:{client_id}",
                email=email,
                name=f"{first_name} {last_name}",
                first_name=first_name,
                last_name=last_name,
                dui=dui,
                phone=payload["phone"].strip(),
                avatar_url=None,
                role=UserRole.CLIENT,
                is_active=True,
            )
        )
        await self._commit()
        await self.session.refresh(user)
        return user

    async def update(self, client_id: UUID, changes: dict) -> UserModel:
        user = await self.users.get_registered_client(client_id)
        if user is None:
            raise ClientNotFound("El cliente solicitado no existe.")

        dui = changes.get("dui")
        email = changes["email"].strip().lower() if changes.get("email") else None
        await self._assert_unique(
            dui=dui if dui and dui != user.dui else None,
            email=email if email and email != user.email else None,
        )

        for field in ("first_name", "last_name", "dui", "phone"):
            if changes.get(field) is not None:
                setattr(user, field, changes[field].strip())
        if email:
            user.email = email
        if changes.get("is_active") is not None:
            user.is_active = changes["is_active"]
        user.name = f"{user.first_name} {user.last_name}"

        await self._commit()
        await self.session.refresh(user)
        return user

    async def list_registered(self) -> list[UserModel]:
        return await self.users.list_registered_clients()

    async def _assert_unique(self, *, dui: str | None, email: str | None) -> None:
        if dui and await self.users.get_by_dui(dui):
            raise ClientDuiTaken(DUI_TAKEN)
        if email and await self.users.get_by_email(email):
            raise ClientEmailTaken(EMAIL_TAKEN)

    async def _commit(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as error:
            await self.session.rollback()
            message = str(error.orig)
            if "dui" in message:
                raise ClientDuiTaken(DUI_TAKEN) from error
            raise ClientEmailTaken(EMAIL_TAKEN) from error
