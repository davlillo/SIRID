"""Scoped organization SMTP settings and client invitation operations."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from app.api.deps import CatalogStaffUser, SessionDep, login_rate_limit, smtp_test_rate_limit
from app.api.notifications import send_client_email
from app.domain.enums import UserRole
from app.domain.errors import ClientNotFound, OrganizationNotFound
from app.infrastructure.models import NotificationLogModel, UserModel
from app.repositories.user_repository import UserRepository
from app.schemas.admin import NotificationLogResponse
from app.schemas.smtp import SmtpResponse, SmtpTestRequest, SmtpTestResponse, SmtpUpdate
from app.services.notification_service import NotificationService
from app.services.smtp_service import SmtpService

router = APIRouter(prefix="/admin", tags=["client-access"])


def _assert_organization_access(staff: UserModel, organization_id: UUID) -> None:
    if staff.role == UserRole.ENCARGADO and staff.organization_id != organization_id:
        raise OrganizationNotFound("The requested organization does not exist.")


async def _client(session: SessionDep, staff: UserModel, client_id: UUID) -> UserModel:
    user = await UserRepository(session).get_registered_client(client_id)
    if user is None or (staff.role == UserRole.ENCARGADO and staff.organization_id != user.organization_id):
        raise ClientNotFound("El cliente solicitado no existe.")
    return user


@router.get("/organizations/{organization_id}/smtp", response_model=SmtpResponse)
async def read_smtp(organization_id: UUID, session: SessionDep, staff: CatalogStaffUser) -> SmtpResponse:
    _assert_organization_access(staff, organization_id)
    return await SmtpService(session).read(organization_id)


@router.patch("/organizations/{organization_id}/smtp", response_model=SmtpResponse)
async def save_smtp(organization_id: UUID, payload: SmtpUpdate, session: SessionDep, staff: CatalogStaffUser) -> SmtpResponse:
    _assert_organization_access(staff, organization_id)
    return await SmtpService(session).save(organization_id, payload)


@router.post("/clients/{client_id}/invitation", status_code=202, dependencies=[Depends(login_rate_limit)])
async def resend_invitation(client_id: UUID, session: SessionDep, staff: CatalogStaffUser, background: BackgroundTasks) -> dict[str, str]:
    user = await _client(session, staff, client_id)
    if not user.is_active:
        raise ClientNotFound("El cliente está desactivado.")
    background.add_task(send_client_email, client_id, True)
    return {"status": "queued"}


@router.post("/organizations/{organization_id}/smtp/test", response_model=SmtpTestResponse,
             dependencies=[Depends(smtp_test_rate_limit)])
async def test_smtp(organization_id: UUID, payload: SmtpTestRequest, session: SessionDep,
                    staff: CatalogStaffUser) -> SmtpTestResponse:
    _assert_organization_access(staff, organization_id)
    await SmtpService(session).read(organization_id)
    result = await NotificationService(session).send_test(
        recipient=str(payload.recipient),
        organization_id=None if payload.use_platform else organization_id,
    )
    return SmtpTestResponse(status=result.status, detail=result.detail)


@router.get("/clients/{client_id}/notifications", response_model=list[NotificationLogResponse])
async def client_notifications(client_id: UUID, session: SessionDep, staff: CatalogStaffUser) -> list[NotificationLogResponse]:
    await _client(session, staff, client_id)
    logs = await session.scalars(select(NotificationLogModel).where(
        NotificationLogModel.client_id == client_id,
    ).order_by(NotificationLogModel.created_at.desc()).limit(20))
    return [NotificationLogResponse.model_validate(row) for row in logs]
