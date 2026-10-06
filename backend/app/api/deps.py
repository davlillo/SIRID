"""Dependencias HTTP: sesion de base de datos, usuario autenticado y rate limit."""

import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import read_session_token
from app.domain.enums import UserRole
from app.domain.errors import AdminRequired, AuthenticationFailed, RateLimited
from app.infrastructure.database import get_session
from app.infrastructure.models import UserModel
from app.services.user_service import UserService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def optional_user(request: Request, session: SessionDep) -> UserModel | None:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    try:
        user_id, _ = read_session_token(token)
        return await UserService(session).require_user(user_id)
    except Exception:
        # Una cookie corrupta o caducada equivale a no tener sesion.
        return None


async def current_user(request: Request, session: SessionDep) -> UserModel:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise AuthenticationFailed("A session is required for this operation.")
    # El rol del token es solo una pista: el usuario se relee de la base.
    user_id, _ = read_session_token(token)
    return await UserService(session).require_user(user_id)


async def require_admin(user: Annotated[UserModel, Depends(current_user)]) -> UserModel:
    if user.role != UserRole.ADMIN:
        raise AdminRequired("This operation requires an administrator.")
    return user


CurrentUser = Annotated[UserModel, Depends(current_user)]
OptionalUser = Annotated[UserModel | None, Depends(optional_user)]
AdminUser = Annotated[UserModel, Depends(require_admin)]


class RateLimiter:
    """Ventana deslizante en memoria.

    Suficiente para un despliegue de un proceso. En produccion multi-instancia
    debe sustituirse por un contador compartido (Redis).
    """

    def __init__(self, limit: int, window_seconds: int, scope: str) -> None:
        self.limit = limit
        self.window = window_seconds
        self.scope = scope
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, request: Request) -> None:
        key = f"{self.scope}:{request.client.host if request.client else 'unknown'}"
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()

        if len(hits) >= self.limit:
            raise RateLimited("Too many requests. Try again in a moment.")

        hits.append(now)

    def reset(self) -> None:
        """Vacia el contador. Lo usa la suite de pruebas entre casos."""
        self._hits.clear()


login_rate_limit = RateLimiter(limit=10, window_seconds=60, scope="login")
availability_rate_limit = RateLimiter(limit=120, window_seconds=60, scope="availability")
reservation_rate_limit = RateLimiter(limit=20, window_seconds=60, scope="reservation")

RATE_LIMITERS = (login_rate_limit, availability_rate_limit, reservation_rate_limit)
