"""Verificacion de Google y emision de la sesion propia."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import issue_session_token
from app.domain.enums import UserRole
from app.infrastructure.google_identity import GoogleIdentityVerifier, GoogleVerifier
from app.infrastructure.models import UserModel
from app.repositories.user_repository import UserRepository


@dataclass(frozen=True)
class Session:
    user: UserModel
    token: str
    max_age_seconds: int


class AuthService:
    """Coordina la verificacion de Google y la sesion local."""

    def __init__(self, session: AsyncSession, verifier: GoogleVerifier | None = None) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.verifier = verifier or GoogleIdentityVerifier()

    async def authenticate_google(self, credential: str) -> Session:
        identity = self.verifier.verify(credential)

        user = await self.users.get_by_google_subject(identity.subject)
        if user is None:
            user = await self._link_or_create(identity)
        else:
            user.email = identity.email
            user.name = identity.name
            user.avatar_url = identity.picture

        # Los roles internos provienen de la configuracion del servidor, nunca
        # de datos enviados por el navegador. ADMIN tiene prioridad si un
        # correo aparece en ambas listas.
        if identity.email in settings.admin_email_set:
            user.role = UserRole.ADMIN
        elif (
            user.role != UserRole.ADMIN
            and identity.email in settings.encargado_email_set
        ):
            user.role = UserRole.ENCARGADO

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)

        token, max_age = issue_session_token(user.id, user.role)
        return Session(user=user, token=token, max_age_seconds=max_age)

    async def _link_or_create(self, identity) -> UserModel:
        """Un email preexistente se vincula al `google_subject` recibido."""
        existing = await self.users.get_by_email(identity.email)
        if existing is not None:
            existing.google_subject = identity.subject
            existing.name = identity.name
            existing.avatar_url = identity.picture
            return existing

        if identity.email in settings.admin_email_set:
            role = UserRole.ADMIN
        elif identity.email in settings.encargado_email_set:
            role = UserRole.ENCARGADO
        else:
            role = UserRole.CLIENT
        return self.users.add(
            UserModel(
                google_subject=identity.subject,
                email=identity.email,
                name=identity.name,
                avatar_url=identity.picture,
                role=role,
            )
        )
