from functools import cached_property
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SIRID Reserva API"
    app_version: str = "1.0.0"
    environment: str = "development"

    database_url: str
    frontend_url: str = "http://localhost:3000"
    facility_upload_dir: Path = Path(__file__).resolve().parents[2] / "uploads" / "facilities"

    google_client_id: str = ""
    dev_auth_enabled: bool = False
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    session_cookie_name: str = "dvl_session"
    session_ttl_minutes: int = 60 * 12

    # Zona horaria operativa del complejo. Los horarios se interpretan aqui.
    complex_timezone: str = "America/Guatemala"
    default_currency: str = "USD"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = Field(default="", validation_alias=AliasChoices("SMTP_USERNAME", "SMTP_USER"))
    smtp_app_password: str = Field(default="", validation_alias=AliasChoices("SMTP_APP_PASSWORD", "SMTP_PASS"))
    smtp_from: str = Field(default="", validation_alias=AliasChoices("SMTP_FROM", "FROM_EMAIL", "SMTP_USERNAME", "SMTP_USER"))
    smtp_from_name: str = Field(default="SIRID", validation_alias=AliasChoices("SMTP_FROM_NAME", "FROM_NAME"))
    smtp_encryption_key: str = ""
    smtp_allowed_hosts: str = "smtp.gmail.com,smtp.office365.com,smtp.mail.yahoo.com"

    # Cuenta(s) de bootstrap para el administrador del sistema.
    admin_emails: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore"
    )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @cached_property
    def timezone(self) -> ZoneInfo:
        return ZoneInfo(self.complex_timezone)

    @cached_property
    def admin_email_set(self) -> frozenset[str]:
        return frozenset(
            email.strip().lower()
            for email in self.admin_emails.split(",")
            if email.strip()
        )

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_username and self.smtp_app_password and self.smtp_from)


settings = Settings()
