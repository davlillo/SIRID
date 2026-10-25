"""Verificacion de Google y emision de la sesion propia."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import issue_session_token, verify_password
from app.domain.enums import UserRole
from app.domain.errors import AuthenticationFailed
from app.infrastructure.google_identity import GoogleIdentityVerifier, GoogleVerifier
from app.infrastructure.models import UserModel
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService


@dataclass(frozen=True)
class Session:
    user: UserModel
    token: str
    max_age_seconds: int


class AuthService:
    """Coordina la verificacion de Google y la sesion local."""

    def __init__(
        self, session: AsyncSession, verifier: GoogleVerifier | None = None
    ) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)
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

        # ADMIN_EMAILS es solo el bootstrap del administrador del sistema; los
        # demás cambios de rol persisten desde el panel administrativo.
        if identity.email in settings.admin_email_set:
            user.role = UserRole.ADMIN

        try:
            await UserService(self.session).assert_can_access(user)
        except AuthenticationFailed:
            await self.session.rollback()
            raise

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(user)

        token, max_age = issue_session_token(user.id, user.role)
        return Session(user=user, token=token, max_age_seconds=max_age)

    async def authenticate_password(self, identifier: str, password: str) -> Session:
        """Inicio de sesion local con correo o DUI.

        Se verifica siempre, incluso sin usuario, para no filtrar por tiempo de
        respuesta si el identificador existe. El error es generico.
        """
        user = await self.users.get_by_identifier(identifier)
        if not verify_password(password, user.password_hash if user else None):
            raise AuthenticationFailed("Usuario o contrasena incorrectos.")

        await UserService(self.session).assert_can_access(user)

        token, max_age = issue_session_token(user.id, user.role)
        return Session(user=user, token=token, max_age_seconds=max_age)

    async def authenticate_development(self, role: UserRole) -> Session:
        """Sesion local explicita; nunca disponible fuera de development."""
        if (
            not settings.dev_auth_enabled
            or settings.environment.lower() != "development"
        ):
            raise AuthenticationFailed("Development login is disabled.")

        email = f"dev-{role.value.lower()}@sirid.local"
        user = await self.users.get_by_email(email)
        organization = await self.organizations.get_bootstrap()
        if organization is None:
            raise AuthenticationFailed("The default organization is not configured.")
        if user is None:
            user = self.users.add(
                UserModel(
                    organization_id=organization.id,
                    google_subject=f"development:{role.value.lower()}",
                    email=email,
                    name=f"Demo {role.value.title()}",
                    avatar_url=None,
                    role=role,
                )
            )
        else:
            user.role = role

        await UserService(self.session).assert_can_access(user)
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

        is_system_admin = identity.email in settings.admin_email_set
        if is_system_admin:
            organization = await self.organizations.get_bootstrap()
        else:
            domain = identity.email.rsplit("@", 1)[-1]
            organization = await self.organizations.get_by_email_domain(domain)
        if organization is None:
            raise AuthenticationFailed("This account cannot access SIRID.")

        role = UserRole.ADMIN if is_system_admin else UserRole.CLIENT
        return self.users.add(
            UserModel(
                organization_id=organization.id,
                google_subject=identity.subject,
                email=identity.email,
                name=identity.name,
                avatar_url=identity.picture,
                role=role,
            )
        )
