from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class SmtpUpdate(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=587)
    username: str = Field(min_length=1, max_length=320)
    password: SecretStr | None = Field(default=None)
    from_email: EmailStr
    enabled: bool = True

    @field_validator("port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if value not in (465, 587):
            raise ValueError("Use el puerto 465 (TLS) o 587 (STARTTLS).")
        return value

    @field_validator("host", "username")
    @classmethod
    def strip_value(cls, value: str) -> str:
        value = value.strip()
        if not value or "\r" in value or "\n" in value:
            raise ValueError("El valor SMTP no es válido.")
        return value


class SmtpResponse(BaseModel):
    configured: bool
    platform_configured: bool
    encryption_configured: bool
    allowed_hosts: list[str]
    host: str = ""
    port: int = 587
    username: str = ""
    from_email: str = ""
    enabled: bool = False


class SmtpTestRequest(BaseModel):
    recipient: EmailStr
    use_platform: bool = False


class SmtpTestResponse(BaseModel):
    status: str
    detail: str | None = None
