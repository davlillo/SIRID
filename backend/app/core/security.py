"""Sesion local firmada. El token de Google nunca se guarda ni se reutiliza."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.core.config import settings
from app.domain.enums import UserRole
from app.domain.errors import AuthenticationFailed

ISSUER = "sirid-reserva"


def issue_session_token(user_id: UUID, role: UserRole) -> tuple[str, int]:
    """Devuelve el token y su vigencia en segundos."""
    ttl = timedelta(minutes=settings.session_ttl_minutes)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "iss": ISSUER,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(ttl.total_seconds())


def read_session_token(token: str) -> tuple[UUID, UserRole]:
    """El rol del token se usa solo como pista; el servicio relee el usuario."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], issuer=ISSUER
        )
        return UUID(payload["sub"]), UserRole(payload["role"])
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        raise AuthenticationFailed("The session is invalid or has expired.") from error
