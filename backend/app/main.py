import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.v1 import router as v1_router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API de reservas del complejo deportivo SIRID.",
    openapi_tags=[
        {"name": "health", "description": "Estado del servicio."},
        {"name": "auth", "description": "Google Identity y sesion propia."},
        {"name": "facilities", "description": "Catalogo publico y disponibilidad."},
        {"name": "reservations", "description": "Reservas del cliente autenticado."},
        {"name": "admin", "description": "Operaciones administrativas."},
    ],
)

# Lista explicita de origenes: nunca "*" junto a credenciales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

register_error_handlers(app)
app.include_router(v1_router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Cabeceras minimas. HSTS solo tiene sentido bajo HTTPS."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response
