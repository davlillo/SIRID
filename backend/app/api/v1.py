from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.client_access import router as client_access_router
from app.api.facilities import router as facilities_router
from app.api.health import router as health_router
from app.api.media import router as media_router
from app.api.organizations import admin_router as system_admin_router
from app.api.organizations import public_router as organizations_router
from app.api.reservations import router as reservations_router

router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(media_router)
router.include_router(organizations_router)
router.include_router(auth_router)
router.include_router(facilities_router)
router.include_router(reservations_router)
router.include_router(admin_router)
router.include_router(client_access_router)
router.include_router(system_admin_router)
