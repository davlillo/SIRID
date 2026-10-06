from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", summary="Estado del servicio y de la base de datos")
async def health(session: SessionDep) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001 - el healthcheck reporta, no propaga
        database = "unavailable"

    return {
        "status": "ok" if database == "ok" else "degraded",
        "database": database,
        "version": settings.app_version,
        "environment": settings.environment,
        "timezone": settings.complex_timezone,
    }
