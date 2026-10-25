"""Tenant SMTP configuration. Secrets never leave the service layer."""

from dataclasses import dataclass, field
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.errors import DomainError, OrganizationNotFound
from app.infrastructure.models import OrganizationSmtpModel
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.smtp import SmtpResponse, SmtpUpdate


class SmtpConfigurationError(DomainError):
    status = 422
    title = "Configuración SMTP inválida"
    slug = "invalid-smtp-configuration"


@dataclass(frozen=True)
class SmtpCredentials:
    host: str
    port: int
    username: str
    password: str = field(repr=False)
    from_email: str
    from_name: str = "SIRID"


def _normalize_password(host: str, password: str) -> str:
    # Google displays its 16-character app passwords in groups of four.
    return "".join(password.split()) if host.lower() == "smtp.gmail.com" else password


def allowed_hosts() -> list[str]:
    return sorted({host.strip().lower() for host in settings.smtp_allowed_hosts.split(",") if host.strip()})


def _cipher() -> Fernet:
    try:
        return Fernet(settings.smtp_encryption_key.encode("ascii"))
    except (ValueError, UnicodeError) as error:
        raise SmtpConfigurationError("La plataforma debe configurar SMTP_ENCRYPTION_KEY antes de guardar credenciales propias.") from error


class SmtpService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def read(self, organization_id: UUID) -> SmtpResponse:
        if await OrganizationRepository(self.session).get_by_id(organization_id) is None:
            raise OrganizationNotFound("The requested organization does not exist.")
        row = await self.session.get(OrganizationSmtpModel, organization_id)
        try:
            _cipher()
            encryption_configured = True
        except SmtpConfigurationError:
            encryption_configured = False
        return SmtpResponse(
            configured=row is not None,
            platform_configured=settings.smtp_configured,
            encryption_configured=encryption_configured,
            allowed_hosts=allowed_hosts(),
            **({"host": row.host, "port": row.port, "username": row.username,
                "from_email": row.from_email, "enabled": row.enabled} if row else {}),
        )

    async def save(self, organization_id: UUID, payload: SmtpUpdate) -> SmtpResponse:
        organization = await OrganizationRepository(self.session).get_by_id(organization_id)
        if organization is None:
            raise OrganizationNotFound("The requested organization does not exist.")
        host = payload.host.lower()
        # Restrict tenant-controlled outbound connections to operator-approved hosts.
        if host not in allowed_hosts():
            raise SmtpConfigurationError("El servidor SMTP no está autorizado por la plataforma.")
        row = await self.session.get(OrganizationSmtpModel, organization_id)
        password = _normalize_password(host, payload.password.get_secret_value()) if payload.password else ""
        if len(password) > 2048:
            raise SmtpConfigurationError("La contraseña SMTP es demasiado larga.")
        if not password and row is None:
            raise SmtpConfigurationError("La contraseña SMTP es obligatoria.")
        encrypted = _cipher().encrypt(password.encode()).decode() if password else row.encrypted_password
        if row is None:
            row = OrganizationSmtpModel(organization_id=organization_id)
            self.session.add(row)
        row.host = host
        row.port = payload.port
        row.username = payload.username
        row.encrypted_password = encrypted
        row.from_email = str(payload.from_email)
        row.enabled = payload.enabled
        await self.session.commit()
        return await self.read(organization_id)

    async def resolve(self, organization_id: UUID | None = None) -> SmtpCredentials | None:
        row = await self.session.get(OrganizationSmtpModel, organization_id) if organization_id else None
        if row is not None and row.enabled:
            if row.host not in allowed_hosts():
                raise SmtpConfigurationError("El servidor SMTP ya no está autorizado.")
            try:
                password = _cipher().decrypt(row.encrypted_password.encode()).decode()
            except (InvalidToken, UnicodeError) as error:
                raise SmtpConfigurationError("No se pudieron descifrar las credenciales SMTP.") from error
            return SmtpCredentials(row.host, row.port, row.username, _normalize_password(row.host, password), row.from_email)
        if not settings.smtp_configured:
            return None
        return SmtpCredentials(settings.smtp_host, settings.smtp_port, settings.smtp_username,
                               _normalize_password(settings.smtp_host, settings.smtp_app_password),
                               settings.smtp_from or settings.smtp_username, settings.smtp_from_name)
