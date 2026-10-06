from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import UserRole


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=16, max_length=4096)


class UserResponse(BaseModel):
    """El email ya viene verificado por Google: la salida no lo revalida."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    avatar_url: str | None
    role: UserRole


class RoleChangeRequest(BaseModel):
    role: UserRole
