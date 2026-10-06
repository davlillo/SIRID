"""Traduccion de errores a `application/problem+json`.

Los errores inesperados se registran y devuelven un mensaje seguro: nunca se
filtra un stack trace ni el detalle de una excepcion de base de datos.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import DomainError

logger = logging.getLogger(__name__)

BASE_TYPE = "https://sirid.local/errors"
MEDIA_TYPE = "application/problem+json"


def problem(
    *, status: int, title: str, detail: str, instance: str, slug: str
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type=MEDIA_TYPE,
        content={
            "type": f"{BASE_TYPE}/{slug}",
            "title": title,
            "status": status,
            "detail": detail,
            "instance": instance,
        },
    )


FIELD_LABELS = {
    "first_name": "Los nombres",
    "last_name": "Los apellidos",
    "dui": "El DUI",
    "phone": "El teléfono",
    "email": "El correo electrónico",
    "name": "El nombre",
    "amount": "El precio",
    "effective_from": "La fecha de inicio",
    "valid_from": "La fecha de inicio",
    "minimum_minutes": "La duración del bloque",
    "capacity": "La capacidad",
    "description": "La descripción",
    "slug": "El identificador",
}

TYPE_MESSAGES = {
    "missing": "es obligatorio.",
    "string_too_short": "es demasiado corto.",
    "string_too_long": "es demasiado largo.",
    "string_pattern_mismatch": "no tiene el formato correcto.",
    "greater_than": "está fuera del rango permitido.",
    "greater_than_equal": "está fuera del rango permitido.",
    "less_than": "está fuera del rango permitido.",
    "less_than_equal": "está fuera del rango permitido.",
}


def describe_validation_error(error: dict) -> str:
    """Mensaje en español para el primer error de validacion de Pydantic."""
    location = [str(part) for part in error.get("loc", ()) if part not in ("body", "query")]
    field = location[-1] if location else ""
    label = FIELD_LABELS.get(field, f"El campo «{field}»" if field else "Los datos enviados")

    if field == "email" and error.get("type") != "missing":
        return f"{label} no es válido."
    if error.get("type") == "value_error":
        message = str(error.get("msg", "")).removeprefix("Value error, ")
        return message or f"{label} no es válido."
    return f"{label} {TYPE_MESSAGES.get(error.get('type', ''), 'no es válido.')}"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def handle_domain_error(request: Request, error: DomainError) -> JSONResponse:
        return problem(
            status=error.status,
            title=error.title,
            detail=error.detail,
            instance=request.url.path,
            slug=error.slug,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        errors = error.errors()
        return problem(
            status=422,
            title="Datos inválidos",
            detail=describe_validation_error(errors[0]) if errors else "Datos inválidos.",
            instance=request.url.path,
            slug="validation-error",
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, error: StarletteHTTPException) -> JSONResponse:
        return problem(
            status=error.status_code,
            title=str(error.detail),
            detail=str(error.detail),
            instance=request.url.path,
            slug="http-error",
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, error: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s", request.url.path)
        return problem(
            status=500,
            title="Internal server error",
            detail="The request could not be completed.",
            instance=request.url.path,
            slug="internal-error",
        )
