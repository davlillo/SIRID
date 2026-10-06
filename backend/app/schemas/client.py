import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

_NAME = re.compile(r"[^\W\d_]+(?:[ '\-][^\W\d_]+)*", re.UNICODE)


def _validate_person_name(value: str) -> str:
    if not _NAME.fullmatch(value):
        raise ValueError("El nombre solo puede contener letras, espacios, apostrofes o guiones.")
    return value


class ClientCreate(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    dui: str = Field(pattern=r"^\d{8}-\d$")
    phone: str = Field(pattern=r"^\d{4}-\d{4}$")
    email: EmailStr

    @field_validator("first_name", "last_name", "dui", "phone", mode="before")
    @classmethod
    def strip_value(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_person_name(cls, value: str) -> str:
        return _validate_person_name(value)


class ClientUpdate(BaseModel):
    """Actualizacion parcial. `is_active=False` da de baja al cliente (RF-02)."""

    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    dui: str | None = Field(default=None, pattern=r"^\d{8}-\d$")
    phone: str | None = Field(default=None, pattern=r"^\d{4}-\d{4}$")
    email: EmailStr | None = None
    is_active: bool | None = None

    @field_validator("first_name", "last_name", "dui", "phone", mode="before")
    @classmethod
    def strip_value(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_person_name(cls, value: str | None) -> str | None:
        return _validate_person_name(value) if value is not None else value


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    dui: str
    phone: str
    email: str
    is_active: bool
