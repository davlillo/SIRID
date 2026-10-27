"""Registro, actualizacion y baja de clientes (HU-01, RF-01, RF-02)."""

import uuid
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.domain.enums import UserRole
from app.domain.errors import (
    ClientDuiTaken,
    ClientEmailTaken,
    ClientNotFound,
    OrganizationNotFound,
)
from app.infrastructure.models import UserModel
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository

DUI_TAKEN = "Ya existe un cliente registrado con este DUI."
EMAIL_TAKEN = "Ya existe un usuario registrado con este correo."


class ClientService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)

    async def create(self, payload: dict) -> UserModel:
        dui = payload["dui"].strip()
        email = payload["email"].strip().lower()
        if email in settings.admin_email_set:
            raise ClientEmailTaken(
                "This email is reserved for the system administrator."
            )
        organization = await self.organizations.get_by_id(payload["organization_id"])
        if organization is None or not organization.is_active:
            raise OrganizationNotFound("The requested organization does not exist.")
        existing = await self.users.get_by_email(email)
        if existing is not None:
            if (
                existing.organization_id != organization.id
                or existing.role != UserRole.CLIENT
                or existing.dui is not None
            ):
                raise ClientEmailTaken(EMAIL_TAKEN)
            await self._assert_unique(dui=dui, email=None)
            existing.first_name = payload["first_name"].strip()
            existing.last_name = payload["last_name"].strip()
            existing.name = f"{existing.first_name} {existing.last_name}"
            existing.dui = dui
            existing.phone = payload["phone"].strip()
            if payload.get("password"):
                existing.password_hash = hash_password(payload["password"])
                existing.invitation_token_hash = None
                existing.invitation_expires_at = None
            await self._commit()
            await self.session.refresh(existing)
            return existing

        await self._assert_unique(dui=dui, email=None)

        first_name = payload["first_name"].strip()
        last_name = payload["last_name"].strip()
        client_id = uuid.uuid4()
        user = self.users.add(
            UserModel(
                id=client_id,
                organization_id=payload["organization_id"],
                # Se reemplaza por el subject real cuando el cliente entre con Google
                # usando este mismo correo.
                google_subject=f"manual:{client_id}",
                email=email,
                name=f"{first_name} {last_name}",
                first_name=first_name,
                last_name=last_name,
                dui=dui,
                phone=payload["phone"].strip(),
                password_hash=(
                    hash_password(payload["password"])
                    if payload.get("password")
                    else None
                ),
                avatar_url=None,
                role=UserRole.CLIENT,
                is_active=True,
            )
        )
        await self._commit()
        await self.session.refresh(user)
        return user

    async def update(
        self,
        client_id: UUID,
        changes: dict,
        *,
        organization_id: UUID | None = None,
    ) -> UserModel:
        user = await self.users.get_registered_client(client_id)
        if user is None or (
            organization_id is not None and user.organization_id != organization_id
        ):
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
            if email != user.email:
                user.invitation_token_hash = None
                user.invitation_expires_at = None
            user.email = email
        if changes.get("is_active") is not None:
            user.is_active = changes["is_active"]
            if not user.is_active:
                user.invitation_token_hash = None
                user.invitation_expires_at = None
        if changes.get("password"):
            user.password_hash = hash_password(changes["password"])
            user.invitation_token_hash = None
            user.invitation_expires_at = None
        user.name = f"{user.first_name} {user.last_name}"

        await self._commit()
        await self.session.refresh(user)
        return user

    async def list_registered(
        self, *, organization_id: UUID | None = None
    ) -> list[UserModel]:
        return await self.users.list_registered_clients(organization_id=organization_id)

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
