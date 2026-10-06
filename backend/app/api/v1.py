from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.facilities import router as facilities_router
from app.api.health import router as health_router
from app.api.reservations import router as reservations_router

router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(facilities_router)
router.include_router(reservations_router)
router.include_router(admin_router)
