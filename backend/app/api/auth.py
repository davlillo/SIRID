from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.deps import CurrentUser, SessionDep, login_rate_limit
from app.core.config import settings
from app.infrastructure.google_identity import GoogleIdentityVerifier, GoogleVerifier
from app.schemas.auth import DevelopmentLoginRequest, GoogleLoginRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_google_verifier() -> GoogleVerifier:
    """Puerto inyectable: las pruebas lo sustituyen sin tocar el servicio."""
    return GoogleIdentityVerifier()


VerifierDep = Annotated[GoogleVerifier, Depends(get_google_verifier)]


def _set_session_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        path="/",
    )


@router.post(
    "/google",
    response_model=UserResponse,
    dependencies=[Depends(login_rate_limit)],
    summary="Verifica un ID token de Google y abre la sesion",
)
async def login_with_google(
    payload: GoogleLoginRequest,
    response: Response,
    session: SessionDep,
    verifier: VerifierDep,
) -> UserResponse:
    result = await AuthService(session, verifier).authenticate_google(payload.credential)
    _set_session_cookie(response, result.token, result.max_age_seconds)
    return UserResponse.model_validate(result.user)


@router.post(
    "/development",
    response_model=UserResponse,
    dependencies=[Depends(login_rate_limit)],
    summary="Abre una sesion local solo en el entorno de desarrollo",
)
async def login_for_development(
    payload: DevelopmentLoginRequest,
    response: Response,
    session: SessionDep,
) -> UserResponse:
    result = await AuthService(session).authenticate_development(payload.role)
    _set_session_cookie(response, result.token, result.max_age_seconds)
    return UserResponse.model_validate(result.user)


@router.get("/me", response_model=UserResponse, summary="Usuario de la sesion actual")
async def read_me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post("/logout", status_code=204, summary="Cierra la sesion")
async def logout(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
