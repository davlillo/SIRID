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
        first = error.errors()[0] if error.errors() else {}
        field = ".".join(str(part) for part in first.get("loc", [])[1:]) or "payload"
        return problem(
            status=422,
            title="Validation error",
            detail=f"{field}: {first.get('msg', 'invalid value')}",
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
