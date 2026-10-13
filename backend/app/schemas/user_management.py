from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domain.enums import UserRole


class SystemUserCreate(BaseModel):
    email: EmailStr
    organization_id: UUID
    role: UserRole
    name: str | None = Field(default=None, min_length=2, max_length=160)
    # Opcional: si se omite, la cuenta solo puede entrar con Google.
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("role", mode="before")
    @classmethod
    def restrict_assignable_roles(cls, value: object) -> UserRole:
        role = UserRole(value)
        if role == UserRole.ADMIN:
            raise ValueError("System administrator access is configured separately.")
        return role


class SystemUserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    # Permite asignar o restablecer la contrasena local desde el panel.
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("role")
    @classmethod
    def restrict_assignable_roles(cls, value: UserRole | None) -> UserRole | None:
        if value == UserRole.ADMIN:
            raise ValueError("System administrator access is configured separately.")
        return value


class SystemUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
