"""Sesion, roles y proteccion de recursos ajenos."""

from app.core.config import settings
from tests.conftest import authenticate, requires_database

pytestmark = requires_database


async def test_google_login_opens_a_session(client, google_verifier):
    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    assert response.status_code == 200
    assert response.json()["email"] == google_verifier.identity.email
    assert response.json()["role"] == "CLIENT"


async def test_session_cookie_is_http_only(client):
    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


async def test_invalid_google_token_is_rejected(client):
    response = await client.post("/v1/auth/google", json={"credential": "invalid-token-value"})

    assert response.status_code == 401
    assert response.json()["title"] == "Invalid Google credential"


async def test_configured_email_becomes_admin(client, google_verifier, monkeypatch):
    """La promocion a ADMIN viene de la configuracion, nunca del navegador."""
    monkeypatch.setitem(
        settings.__dict__, "admin_email_set", frozenset({"admin@davlillos.test"})
    )
    google_verifier.identity = google_verifier.identity.__class__(
        subject="google-subject-admin",
        email="admin@davlillos.test",
        name="Admin Demo",
        picture=None,
    )

    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    assert response.json()["role"] == "ADMIN"


async def test_configured_email_becomes_encargado(client, google_verifier, monkeypatch):
    monkeypatch.setitem(
        settings.__dict__,
        "encargado_email_set",
        frozenset({"encargado@davlillos.test"}),
    )
    google_verifier.identity = google_verifier.identity.__class__(
        subject="google-subject-encargado",
        email="encargado@davlillos.test",
        name="Encargado Demo",
        picture=None,
    )

    response = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "ENCARGADO"


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
