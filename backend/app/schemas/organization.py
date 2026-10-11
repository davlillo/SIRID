import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_DOMAIN = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=80, pattern=_SLUG.pattern)
    email_domain: str = Field(min_length=3, max_length=255, pattern=_DOMAIN.pattern)

    @field_validator("email_domain", mode="before")
    @classmethod
    def normalize_domain(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower().removeprefix("@").rstrip(".")
        return value


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    slug: str | None = Field(
        default=None, min_length=2, max_length=80, pattern=_SLUG.pattern
    )
    email_domain: str | None = Field(
        default=None, min_length=3, max_length=255, pattern=_DOMAIN.pattern
    )
    is_active: bool | None = None

    @field_validator("email_domain", mode="before")
    @classmethod
    def normalize_domain(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower().removeprefix("@").rstrip(".")
        return value


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    email_domain: str | None
    is_active: bool


class PublicOrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
