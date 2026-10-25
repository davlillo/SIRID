from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import UserRole


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=16, max_length=4096)


class PasswordLoginRequest(BaseModel):
    """`identifier` acepta el correo o el DUI (usuario) de una cuenta local."""

    identifier: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class DevelopmentLoginRequest(BaseModel):
    role: UserRole


class AcceptInvitationRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    """El email ya viene verificado por Google: la salida no lo revalida."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    email: str
    name: str
    avatar_url: str | None
    role: UserRole


class RoleChangeRequest(BaseModel):
    role: UserRole
