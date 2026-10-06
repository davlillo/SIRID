from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Envoltura de listados. `page` y `limit` viajan en query string."""

    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)

    @property
    def pages(self) -> int:
        return (self.total + self.limit - 1) // self.limit if self.limit else 0


class Problem(BaseModel):
    """Formato de error del contrato (spect/04-contrato-api.md)."""

    type: str
    title: str
    status: int
    detail: str
    instance: str
