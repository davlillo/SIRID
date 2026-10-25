"""HU-13/14 and tenant suspension apply to logins and existing sessions alike."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.security import issue_session_token
from app.domain.enums import UserRole
from app.domain.errors import AccountDisabled, AuthenticationFailed
from app.infrastructure.database import get_session
from app.infrastructure.models import UserModel
from app.main import app
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.user_service import UserService


def make_user(role=UserRole.ENCARGADO, active=True):
    return UserModel(
        id=uuid4(), organization_id=uuid4(), role=role, is_active=active,
        email="user@example.com", name="Test User", google_subject="test-subject",
        avatar_url=None,
    )


@pytest.mark.parametrize("role", [UserRole.CLIENT, UserRole.ENCARGADO])
@pytest.mark.parametrize("organization", [None, SimpleNamespace(is_active=False)])
async def test_tenant_users_cannot_access_an_inactive_or_missing_organization(monkeypatch, role, organization):
    monkeypatch.setattr(OrganizationRepository, "get_by_id", AsyncMock(return_value=organization))
    with pytest.raises(AuthenticationFailed):
        await UserService(AsyncMock()).assert_can_access(make_user(role))


@pytest.mark.parametrize("role", list(UserRole))
async def test_disabled_users_are_blocked_even_when_they_are_global_admins(monkeypatch, role):
    organization = AsyncMock(return_value=SimpleNamespace(is_active=True))
    monkeypatch.setattr(OrganizationRepository, "get_by_id", organization)
    with pytest.raises(AccountDisabled):
        await UserService(AsyncMock()).assert_can_access(make_user(role, active=False))
    organization.assert_not_awaited()


async def test_global_admin_can_reactivate_organizations_without_tenant_access(monkeypatch):
    organization = AsyncMock(return_value=SimpleNamespace(is_active=False))
    monkeypatch.setattr(OrganizationRepository, "get_by_id", organization)
    await UserService(AsyncMock()).assert_can_access(make_user(UserRole.ADMIN))
    organization.assert_not_awaited()


@pytest.mark.parametrize("role", [UserRole.CLIENT, UserRole.ENCARGADO])
async def test_active_tenant_users_keep_access(monkeypatch, role):
    monkeypatch.setattr(OrganizationRepository, "get_by_id", AsyncMock(return_value=SimpleNamespace(is_active=True)))
    await UserService(AsyncMock()).assert_can_access(make_user(role))


@pytest.fixture
async def session_http(monkeypatch):
    user = make_user()
    organization = SimpleNamespace(id=user.organization_id, is_active=True)
    monkeypatch.setattr(UserRepository, "get_by_id", AsyncMock(return_value=user))
    monkeypatch.setattr(OrganizationRepository, "get_by_id", AsyncMock(return_value=organization))
    app.dependency_overrides[get_session] = lambda: AsyncMock()
    token, _ = issue_session_token(user.id, user.role)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            client.cookies.set(settings.session_cookie_name, token)
            yield client, user, organization
    finally:
        app.dependency_overrides.clear()


async def test_suspension_blocks_an_existing_cookie_on_the_next_request(session_http):
    client, user, organization = session_http
    assert (await client.get("/v1/auth/me")).status_code == 200
    organization.is_active = False
    assert (await client.get("/v1/auth/me")).status_code == 401
    assert (await client.get("/v1/admin/facilities")).status_code == 401
    assert (await client.get("/v1/admin/reservations")).status_code == 401
    organization.is_active = True
    assert (await client.get("/v1/auth/me")).status_code == 200


async def test_global_admin_keeps_management_access_after_bootstrap_suspension(session_http, monkeypatch):
    client, user, organization = session_http
    user.role = UserRole.ADMIN
    organization.is_active = False
    monkeypatch.setattr(OrganizationRepository, "list_all", AsyncMock(return_value=[]))
    assert (await client.get("/v1/auth/me")).status_code == 200
    assert (await client.get("/v1/admin/organizations")).status_code == 200


async def test_optional_auth_does_not_treat_a_suspended_client_as_authenticated(session_http, monkeypatch):
    client, user, organization = session_http
    user.role = UserRole.CLIENT
    organization.is_active = False
    list_active = AsyncMock(return_value=[])
    monkeypatch.setattr(OrganizationRepository, "list_active", list_active)
    response = await client.get("/v1/organizations")
    assert response.status_code == 200
    assert response.json() == []
    list_active.assert_awaited_once()


@pytest.mark.parametrize("method", ["password", "google", "development"])
@pytest.mark.parametrize("role", [UserRole.CLIENT, UserRole.ENCARGADO, UserRole.ADMIN])
async def test_all_login_methods_share_tenant_policy(monkeypatch, method, role):
    user = make_user(role)
    organization = SimpleNamespace(id=user.organization_id, is_active=False)
    monkeypatch.setattr(OrganizationRepository, "get_by_id", AsyncMock(return_value=organization))
    monkeypatch.setattr(OrganizationRepository, "get_bootstrap", AsyncMock(return_value=organization))
    monkeypatch.setattr(UserRepository, "get_by_identifier", AsyncMock(return_value=user))
    monkeypatch.setattr(UserRepository, "get_by_google_subject", AsyncMock(return_value=user))
    monkeypatch.setattr(UserRepository, "get_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda *_: True)
    monkeypatch.setitem(settings.__dict__, "admin_email_set", frozenset())
    monkeypatch.setattr(settings, "dev_auth_enabled", True)
    monkeypatch.setattr(settings, "environment", "development")
    verifier = SimpleNamespace(verify=Mock(return_value=SimpleNamespace(
        email=user.email, name=user.name, picture=None, subject=user.google_subject,
    )))
    session = AsyncMock()
    service = AuthService(session, verifier)

    async def login():
        if method == "password":
            return await service.authenticate_password(user.email, "test-password")
        if method == "google":
            return await service.authenticate_google("test-credential")
        return await service.authenticate_development(role)

    if role == UserRole.ADMIN:
        result = await login()
        assert result.user is user
        assert result.token
    else:
        with pytest.raises(AuthenticationFailed):
            await login()
        session.commit.assert_not_awaited()


async def test_first_configured_google_admin_can_activate_the_inactive_bootstrap(monkeypatch):
    user = make_user(UserRole.CLIENT)
    monkeypatch.setitem(settings.__dict__, "admin_email_set", frozenset({user.email}))
    monkeypatch.setattr(UserRepository, "get_by_google_subject", AsyncMock(return_value=user))
    monkeypatch.setattr(OrganizationRepository, "get_by_id", AsyncMock(return_value=SimpleNamespace(is_active=False)))
    verifier = SimpleNamespace(verify=lambda _: SimpleNamespace(
        email=user.email, name=user.name, picture=None, subject=user.google_subject,
    ))
    result = await AuthService(AsyncMock(), verifier).authenticate_google("test-credential")
    assert result.user.role == UserRole.ADMIN
