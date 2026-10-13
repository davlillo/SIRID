"""Sesion, roles y proteccion de recursos ajenos."""

from app.core.config import settings
from app.core.security import hash_password
from app.domain.enums import UserRole
from app.infrastructure.models import UserModel

from tests.conftest import (
    TEST_ORGANIZATION_ID,
    authenticate,
    requires_database,
)

pytestmark = requires_database


async def test_google_login_opens_a_session(client, google_verifier):
    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert response.status_code == 200
    assert response.json()["email"] == google_verifier.identity.email
    assert response.json()["role"] == "CLIENT"


async def test_session_cookie_is_http_only(client):
    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


async def test_invalid_google_token_is_rejected(client):
    response = await client.post(
        "/v1/auth/google", json={"credential": "invalid-token-value"}
    )

    assert response.status_code == 401
    assert response.json()["title"] == "Invalid Google credential"


async def test_configured_email_becomes_admin(client, google_verifier, monkeypatch):
    """La promocion a ADMIN viene de la configuracion, nunca del navegador."""
    monkeypatch.setitem(
        settings.__dict__, "admin_email_set", frozenset({"admin@bootstrap.test"})
    )
    google_verifier.identity = google_verifier.identity.__class__(
        subject="google-subject-admin",
        email="admin@bootstrap.test",
        name="Admin Demo",
        picture=None,
    )

    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert response.json()["role"] == "ADMIN"


async def test_google_login_uses_the_role_assigned_in_sirid(
    client, google_verifier, db_session
):
    db_session.add(
        UserModel(
            organization_id=TEST_ORGANIZATION_ID,
            google_subject="pending:encargado-user",
            email="manager@example.com",
            name="Encargado Demo",
            role=UserRole.ENCARGADO,
        )
    )
    await db_session.commit()
    google_verifier.identity = google_verifier.identity.__class__(
        subject="google-subject-encargado",
        email="manager@example.com",
        name="Encargado Demo",
        picture=None,
    )

    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert response.status_code == 200
    assert response.json()["role"] == "ENCARGADO"


async def test_password_login_opens_a_session(client, db_session):
    db_session.add(
        UserModel(
            organization_id=TEST_ORGANIZATION_ID,
            google_subject="pending:password-user",
            email="local@example.com",
            name="Usuario Local",
            role=UserRole.CLIENT,
            password_hash=hash_password("clave-segura-123"),
        )
    )
    await db_session.commit()

    response = await client.post(
        "/v1/auth/login",
        json={"identifier": "local@example.com", "password": "clave-segura-123"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "local@example.com"
    assert "HttpOnly" in response.headers["set-cookie"]


async def test_password_login_accepts_the_dui_as_identifier(client, db_session):
    db_session.add(
        UserModel(
            organization_id=TEST_ORGANIZATION_ID,
            google_subject="manual:password-client",
            email="dui@example.com",
            name="Cliente Dui",
            role=UserRole.CLIENT,
            dui="12345678-9",
            password_hash=hash_password("clave-segura-123"),
        )
    )
    await db_session.commit()

    response = await client.post(
        "/v1/auth/login",
        json={"identifier": "12345678-9", "password": "clave-segura-123"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "dui@example.com"


async def test_password_login_rejects_a_wrong_password(client, db_session):
    db_session.add(
        UserModel(
            organization_id=TEST_ORGANIZATION_ID,
            google_subject="pending:wrong-password",
            email="wrong@example.com",
            name="Usuario",
            role=UserRole.CLIENT,
            password_hash=hash_password("clave-segura-123"),
        )
    )
    await db_session.commit()

    response = await client.post(
        "/v1/auth/login",
        json={"identifier": "wrong@example.com", "password": "otra-clave-distinta"},
    )

    assert response.status_code == 401


async def test_password_login_rejects_accounts_without_a_password(client, customer):
    response = await client.post(
        "/v1/auth/login",
        json={"identifier": customer.email, "password": "cualquier-clave"},
    )

    assert response.status_code == 401


async def test_admin_can_provision_a_client_with_a_password(client, admin):
    authenticate(client, admin)
    created = await client.post(
        "/v1/admin/clients",
        json={
            "organization_id": str(admin.organization_id),
            "first_name": "Nuevo",
            "last_name": "Cliente",
            "dui": "98765432-1",
            "phone": "7777-8888",
            "email": "provisioned@example.com",
            "password": "clave-provisionada",
        },
    )
    assert created.status_code == 201

    client.cookies.clear()
    login = await client.post(
        "/v1/auth/login",
        json={"identifier": "98765432-1", "password": "clave-provisionada"},
    )

    assert login.status_code == 200
    assert login.json()["email"] == "provisioned@example.com"


async def test_development_login_creates_an_encargado_session(client, monkeypatch):
    monkeypatch.setattr(settings, "dev_auth_enabled", True)
    monkeypatch.setattr(settings, "environment", "development")

    response = await client.post("/v1/auth/development", json={"role": "ENCARGADO"})

    assert response.status_code == 200
    assert response.json()["role"] == "ENCARGADO"
    assert "HttpOnly" in response.headers["set-cookie"]


async def test_development_login_is_rejected_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "dev_auth_enabled", True)
    monkeypatch.setattr(settings, "environment", "production")

    response = await client.post("/v1/auth/development", json={"role": "ADMIN"})

    assert response.status_code == 401


async def test_me_requires_a_session(client):
    assert (await client.get("/v1/auth/me")).status_code == 401


async def test_me_returns_the_session_user(client, customer):
    authenticate(client, customer)

    response = await client.get("/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["id"] == str(customer.id)


async def test_a_forged_cookie_is_not_accepted(client):
    client.cookies.set("dvl_session", "not.a.real.jwt")

    assert (await client.get("/v1/auth/me")).status_code == 401


async def test_logout_clears_the_cookie(client, customer):
    authenticate(client, customer)

    response = await client.post("/v1/auth/logout")

    assert response.status_code == 204
    assert 'dvl_session=""' in response.headers["set-cookie"]
