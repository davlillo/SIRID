"""Client tenancy, invitation lifecycle, and tenant SMTP isolation."""

import hashlib
import re
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from cryptography.fernet import Fernet

from app.core.config import settings
from app.infrastructure.google_identity import GoogleIdentity
from app.infrastructure.models import OrganizationModel, OrganizationSmtpModel, UserModel
from app.services.invitation_service import InvitationService
from app.services.notification_service import NotificationService
from app.services.smtp_service import SmtpService
from tests.conftest import TEST_ORGANIZATION_ID, authenticate, requires_database
from tests.test_api_clients import CLIENT

pytestmark = requires_database


@pytest.fixture
def smtp(monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.gmail.com")
    monkeypatch.setattr(settings, "smtp_username", "platform@example.com")
    monkeypatch.setattr(settings, "smtp_app_password", "platform-secret")
    monkeypatch.setattr(settings, "smtp_from", "platform@example.com")
    monkeypatch.setattr(settings, "smtp_encryption_key", Fernet.generate_key().decode())
    monkeypatch.setattr(settings, "smtp_allowed_hosts", "smtp.gmail.com,smtp.office365.com")
    send = AsyncMock(return_value=({}, "accepted"))
    monkeypatch.setattr("app.services.notification_service.aiosmtplib.send", send)
    return send


async def test_manager_creates_without_organization_and_password_login_keeps_tenant(client, encargado):
    authenticate(client, encargado)
    payload = {key: value for key, value in CLIENT.items() if key != "organization_id"}
    created = await client.post("/v1/admin/clients", json={**payload, "password": "safe-password-123"})
    assert created.status_code == 201, created.text
    assert created.json()["organization_id"] == str(encargado.organization_id)
    client.cookies.clear()
    response = await client.post("/v1/auth/login", json={"identifier": CLIENT["email"], "password": "safe-password-123"})
    assert response.status_code == 200, response.text
    assert response.json()["role"] == "CLIENT"
    assert response.json()["organization_id"] == str(encargado.organization_id)


async def test_manager_cannot_spoof_organization(client, encargado):
    authenticate(client, encargado)
    result = await client.post("/v1/admin/clients", json={**CLIENT, "organization_id": str(uuid.uuid4())})
    assert result.status_code == 201
    assert result.json()["organization_id"] == str(encargado.organization_id)


async def test_invitation_email_activation_and_replay(client, encargado, smtp, db_session):
    authenticate(client, encargado)
    result = await client.post("/v1/admin/clients", json=CLIENT)
    assert result.status_code == 201, result.text
    message = smtp.call_args.args[0]
    body = message.get_body(preferencelist=("plain",)).get_content()
    token = re.search(r"activar-cuenta#([\w-]+)", body).group(1)
    user = await db_session.get(UserModel, uuid.UUID(result.json()["id"]))
    assert user.invitation_token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert user.password_hash is None
    assert token not in str((await client.get(f"/v1/admin/clients/{user.id}/notifications")).json())
    client.cookies.clear()
    accepted = await client.post("/v1/auth/invitations/accept", json={"token": token, "password": "my-new-password"})
    assert accepted.status_code == 204, accepted.text
    replay = await client.post("/v1/auth/invitations/accept", json={"token": token, "password": "another-password"})
    assert replay.status_code == 401
    login = await client.post("/v1/auth/login", json={"identifier": CLIENT["email"], "password": "my-new-password"})
    assert login.status_code == 200
    assert login.json()["organization_id"] == str(TEST_ORGANIZATION_ID)


async def test_assigned_password_still_sends_password_setup_link(client, encargado, smtp):
    authenticate(client, encargado)
    created = await client.post("/v1/admin/clients", json={**CLIENT, "password": "assigned-password"})
    assert created.status_code == 201, created.text
    message = smtp.call_args.args[0]
    plain = message.get_body(preferencelist=("plain",)).get_content()
    html = message.get_body(preferencelist=("html",)).get_content()
    token = re.search(r"activar-cuenta#([\w-]+)", plain).group(1)
    assert "Establecer mi contraseña" in html
    assert f"/activar-cuenta#{token}" in html
    assert "/ingresar" not in html
    assert "assigned-password" not in plain + html
    client.cookies.clear()
    accepted = await client.post("/v1/auth/invitations/accept", json={"token": token, "password": "client-owned-password"})
    assert accepted.status_code == 204, accepted.text
    old_login = await client.post("/v1/auth/login", json={"identifier": CLIENT["email"], "password": "assigned-password"})
    assert old_login.status_code == 401
    login = await client.post("/v1/auth/login", json={"identifier": CLIENT["email"], "password": "client-owned-password"})
    assert login.status_code == 200
    assert login.json()["organization_id"] == str(encargado.organization_id)


async def test_expired_and_replaced_invitation_tokens_fail(client, encargado, db_session):
    authenticate(client, encargado)
    result = await client.post("/v1/admin/clients", json=CLIENT)
    client_id = uuid.UUID(result.json()["id"])
    invitations = InvitationService(db_session)
    _, previous = await invitations.issue(client_id)
    user, current = await invitations.issue(client_id)
    invalid = await client.post("/v1/auth/invitations/accept", json={"token": previous, "password": "safe-password"})
    assert invalid.status_code == 401
    user.invitation_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db_session.commit()
    expired = await client.post("/v1/auth/invitations/accept", json={"token": current, "password": "safe-password"})
    assert expired.status_code == 401


async def test_smtp_failure_does_not_rollback_client_and_is_observable(client, encargado, smtp):
    smtp.side_effect = OSError("secret must not appear in logs")
    authenticate(client, encargado)
    result = await client.post("/v1/admin/clients", json=CLIENT)
    assert result.status_code == 201
    logs = await client.get(f"/v1/admin/clients/{result.json()['id']}/notifications")
    assert logs.json()[0]["status"] == "FAILED"
    assert "secret" not in logs.text
    retry = await client.post(f"/v1/admin/clients/{result.json()['id']}/invitation")
    assert retry.status_code == 202


async def test_unconfigured_platform_records_skipped(client, encargado):
    authenticate(client, encargado)
    created = await client.post("/v1/admin/clients", json=CLIENT)
    logs = await client.get(f"/v1/admin/clients/{created.json()['id']}/notifications")
    assert logs.json()[0]["status"] == "SKIPPED"


async def test_smtp_secrets_encrypted_platform_access_mail_and_tenant_notifications(client, encargado, smtp, db_session):
    authenticate(client, encargado)
    path = f"/v1/admin/organizations/{encargado.organization_id}/smtp"
    payload = {"host": "smtp.office365.com", "port": 465, "username": "tenant@example.com",
               "password": "tenant-secret", "from_email": "tenant@example.com", "enabled": True}
    saved = await client.patch(path, json=payload)
    assert saved.status_code == 200, saved.text
    assert "password" not in saved.text and "tenant-secret" not in saved.text
    row = await db_session.get(OrganizationSmtpModel, encargado.organization_id)
    assert "tenant-secret" not in row.encrypted_password
    resolved = await SmtpService(db_session).resolve(encargado.organization_id)
    assert resolved.password == "tenant-secret"
    changed = await client.patch(path, json={key: value for key, value in payload.items() if key != "password"})
    assert changed.status_code == 200
    await client.post("/v1/admin/clients", json={**CLIENT, "password": "initial-password"})
    assert smtp.call_args.kwargs["username"] == "platform@example.com"
    assert "initial-password" not in str(smtp.call_args.args[0])
    result = await NotificationService(db_session)._send(recipient="client@example.com", subject="Reservation", html="<p>Test</p>", organization_id=encargado.organization_id)
    assert result.status == "SENT"
    assert smtp.call_args.kwargs["username"] == "tenant@example.com"
    assert smtp.call_args.kwargs["use_tls"] is True
    assert smtp.call_args.kwargs["start_tls"] is False


async def test_manager_cannot_read_or_change_other_tenant_smtp_or_invitations(client, encargado, admin, db_session, smtp):
    other = OrganizationModel(id=uuid.uuid4(), slug="other-tenant", name="Other tenant")
    db_session.add(other)
    await db_session.commit()
    authenticate(client, admin)
    created = await client.post("/v1/admin/clients", json={**CLIENT, "organization_id": str(other.id)})
    assert created.status_code == 201
    authenticate(client, encargado)
    path = f"/v1/admin/organizations/{other.id}/smtp"
    assert (await client.get(path)).status_code == 404
    assert (await client.patch(path, json={"host": "smtp.gmail.com", "username": "a", "password": "b", "from_email": "a@example.com"})).status_code == 404
    client_id = created.json()["id"]
    assert (await client.post(f"/v1/admin/clients/{client_id}/invitation")).status_code == 404
    assert (await client.get(f"/v1/admin/clients/{client_id}/notifications")).status_code == 404


async def test_smtp_rejects_internal_hosts_and_insecure_ports(client, encargado, smtp):
    authenticate(client, encargado)
    path = f"/v1/admin/organizations/{encargado.organization_id}/smtp"
    payload = {"host": "127.0.0.1", "username": "a", "password": "b", "from_email": "a@example.com"}
    assert (await client.patch(path, json=payload)).status_code == 422
    assert (await client.patch(path, json={**payload, "host": "smtp.gmail.com", "port": 25})).status_code == 422


async def test_google_login_keeps_manual_tenant_for_unrelated_domain(client, encargado, google_verifier):
    authenticate(client, encargado)
    created = await client.post("/v1/admin/clients", json=CLIENT)
    client.cookies.clear()
    google_verifier.identity = GoogleIdentity(subject="new-subject", email=CLIENT["email"], name="Ana", picture=None)
    login = await client.post("/v1/auth/google", json={"credential": "a-valid-google-token"})
    assert login.status_code == 200
    assert login.json()["id"] == created.json()["id"]
    assert login.json()["organization_id"] == str(encargado.organization_id)


async def test_smtp_test_endpoint_is_scoped_and_sends_with_platform_credentials(client, encargado, smtp):
    authenticate(client, encargado)
    result = await client.post(f"/v1/admin/organizations/{encargado.organization_id}/smtp/test",
                               json={"recipient": "test@example.com", "use_platform": True})
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "SENT"
    assert smtp.call_args.kwargs["username"] == "platform@example.com"
    other = await client.post(f"/v1/admin/organizations/{uuid.uuid4()}/smtp/test",
                              json={"recipient": "test@example.com"})
    assert other.status_code == 404


async def test_email_change_and_deactivation_invalidate_invitation(client, encargado, db_session):
    authenticate(client, encargado)
    result = await client.post("/v1/admin/clients", json=CLIENT)
    client_id = uuid.UUID(result.json()["id"])
    invitations = InvitationService(db_session)
    _, token = await invitations.issue(client_id)
    await client.patch(f"/v1/admin/clients/{client_id}", json={"email": "updated@example.com"})
    assert (await client.post("/v1/auth/invitations/accept", json={"token": token, "password": "safe-password"})).status_code == 401
    _, token = await invitations.issue(client_id)
    await client.patch(f"/v1/admin/clients/{client_id}", json={"is_active": False})
    await client.patch(f"/v1/admin/clients/{client_id}", json={"is_active": True})
    assert (await client.post("/v1/auth/invitations/accept", json={"token": token, "password": "safe-password"})).status_code == 401


async def test_gmail_app_password_spaces_are_removed(db_session, smtp, monkeypatch):
    monkeypatch.setattr(settings, "smtp_app_password", "abcd efgh ijkl mnop")
    await NotificationService(db_session).send_test(recipient="test@example.com")
    assert smtp.call_args.kwargs["password"] == "abcdefghijklmnop"


async def test_organization_names_are_escaped_in_mail(client, encargado, smtp, db_session):
    organization = await db_session.get(OrganizationModel, encargado.organization_id)
    organization.name = '<b>Organization</b>'
    await db_session.commit()
    authenticate(client, encargado)
    await client.post("/v1/admin/clients", json=CLIENT)
    html = smtp.call_args.args[0].get_body(preferencelist=("html",)).get_content()
    assert '&lt;b&gt;Organization&lt;/b&gt;' in html
    assert '<b>Organization</b>' not in html
