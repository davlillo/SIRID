"""Sesion local firmada y credenciales locales.

El token de Google nunca se guarda ni se reutiliza. Las contrasenas se derivan
con PBKDF2-HMAC-SHA256 (hashlib, sin dependencias externas) y nunca se guardan
en claro: solo el digest con su sal e iteraciones.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.core.config import settings
from app.domain.enums import UserRole
from app.domain.errors import AuthenticationFailed

ISSUER = "sirid-reserva"

# OWASP recomienda >= 600k iteraciones para PBKDF2-HMAC-SHA256.
PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 600_000
PBKDF2_SALT_BYTES = 16


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


def hash_password(password: str) -> str:
    """Deriva la contrasena con una sal aleatoria por usuario.

    Formato: `pbkdf2_sha256$<iteraciones>$<sal_hex>$<digest_hex>`, para poder
    rotar el algoritmo o el costo sin invalidar los hashes existentes.
    """
    salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    """Compara en tiempo constante. Un hash ausente o invalido nunca valida."""
    if not stored:
        return False
    try:
        algorithm, iterations, salt_hex, digest_hex = stored.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        iterations_value = int(iterations)
    except (ValueError, AttributeError):
        return False
    if algorithm != PBKDF2_ALGORITHM:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations_value
    )
    return hmac.compare_digest(digest, expected)
