"""Verificacion oficial del ID token de Google.

El backend nunca confia en el email o el rol que envie el navegador
(spect/06-autenticacion-y-seguridad.md).
"""

from dataclasses import dataclass
from typing import Protocol

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings
from app.domain.errors import InvalidGoogleCredential

ACCEPTED_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    name: str
    picture: str | None


class GoogleVerifier(Protocol):
    """Puerto: las pruebas sustituyen la verificacion sin tocar el servicio."""

    def verify(self, credential: str) -> GoogleIdentity: ...


class GoogleIdentityVerifier:
    def __init__(self, client_id: str | None = None) -> None:
        self.client_id = client_id if client_id is not None else settings.google_client_id

    def verify(self, credential: str) -> GoogleIdentity:
        if not self.client_id:
            raise InvalidGoogleCredential("Google sign-in is not configured on this server.")

        try:
            claims = id_token.verify_oauth2_token(
                credential, google_requests.Request(), self.client_id
            )
        except ValueError as error:
            # Cubre firma invalida, audiencia incorrecta y token expirado.
            raise InvalidGoogleCredential("The Google credential could not be verified.") from error

        if claims.get("iss") not in ACCEPTED_ISSUERS:
            raise InvalidGoogleCredential("Unexpected token issuer.")
        if not claims.get("email_verified"):
            raise InvalidGoogleCredential("The Google account has no verified email.")

        email = claims.get("email")
        subject = claims.get("sub")
        if not email or not subject:
            raise InvalidGoogleCredential("The Google credential is incomplete.")

        return GoogleIdentity(
            subject=subject,
            email=email.strip().lower(),
            name=claims.get("name") or email.split("@")[0],
            picture=claims.get("picture"),
        )
