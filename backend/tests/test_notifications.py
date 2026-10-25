"""Branded notification rendering and safe SMTP previews without network calls."""

from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from app.core.config import settings
from app.domain.enums import ReservationStatus
from app.notifications.send_previews import PREVIEW_STATUSES, preview_content, send_previews
from app.services.notification_service import (
    NotificationResult,
    NotificationService,
    render_notification,
)
from app.services.smtp_service import SmtpService


@pytest.mark.parametrize("template", ["client_invitation", *PREVIEW_STATUSES])
def test_previews_are_personalized_escaped_and_have_no_live_actions(template):
    subject, html = preview_content(template, "demo@example.com")
    assert subject
    assert "DEMO" in html
    assert "Organización de demostración" in html
    assert "DATOS DE DEMOSTRACIÓN" in html
    assert "href=" not in html
    assert "activar-cuenta#" not in html
    assert "{{" not in html
    assert "{%" not in html


def test_invitation_escapes_names_and_keeps_real_password_setup_link():
    html = render_notification(
        "client_invitation", customer_name="<script>alert(1)</script>",
        customer_email="client@example.com", organization_name="<b>Organization</b>",
        activation_url="https://example.com/activar-cuenta#test-token",
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&lt;b&gt;Organization&lt;/b&gt;" in html
    assert "Establecer mi contraseña" in html
    assert 'href="https://example.com/activar-cuenta#test-token"' in html
    assert "24 horas" in html
    assert "DATOS DE DEMOSTRACIÓN" not in html


def test_unknown_templates_cannot_access_arbitrary_files():
    with pytest.raises(ValueError, match="Unknown notification template"):
        render_notification("../../private")


async def test_smtp_check_uses_branded_template_without_database_writes():
    session = Mock()
    service = NotificationService(session)
    service._send = AsyncMock(return_value=NotificationResult("SENT"))
    result = await service.send_test(recipient="demo@example.com")
    assert result.status == "SENT"
    message = service._send.call_args.kwargs
    assert "demo@example.com" in message["html"]
    assert "SIRID" in message["html"]
    assert "DATOS DE DEMOSTRACIÓN" in message["html"]
    session.add.assert_not_called()
    session.commit.assert_not_called()


async def test_reservation_email_uses_real_organization_and_readable_plain_text():
    start = datetime.now(settings.timezone)
    reservation = SimpleNamespace(
        id=uuid4(), organization_id=uuid4(), starts_at=start,
        ends_at=start + timedelta(hours=1), status=ReservationStatus.CANCELLED,
        customer=SimpleNamespace(name="Ana", email="ana@example.com"),
        facility=SimpleNamespace(name="Piscina olímpica", location_label="Zona acuática"),
        quoted_amount=Decimal("40.00"), currency="USD", admin_note="<b>Mantenimiento</b>",
    )
    session = Mock()
    session.get = AsyncMock(return_value=SimpleNamespace(name="Organización de Ana"))
    session.commit = AsyncMock()
    service = NotificationService(session)
    service.reservations = SimpleNamespace(
        get_by_id=AsyncMock(return_value=reservation), add_notification_log=Mock(),
    )
    service._send = AsyncMock(return_value=NotificationResult("SENT"))
    await service.notify_reservation(reservation.id, "reservation_cancelled")
    message = service._send.call_args.kwargs
    assert message["organization_id"] == reservation.organization_id
    assert "Organización de Ana" in message["html"]
    assert "Piscina olímpica" in message["html"]
    assert "Cancelada" in message["html"]
    assert "CANCELLED" not in message["html"]
    assert "&lt;b&gt;Mantenimiento&lt;/b&gt;" in message["html"]
    assert "Organización de Ana" in message["text"]
    assert "Estado: Cancelada" in message["text"]
    assert "40.00 USD" in message["text"]
    session.commit.assert_awaited_once()


async def test_preview_sender_deduplicates_and_only_uses_explicit_recipients(monkeypatch):
    send = AsyncMock(return_value=NotificationResult("SENT"))
    check = AsyncMock(return_value=NotificationResult("SENT"))
    monkeypatch.setattr(NotificationService, "_send", send)
    monkeypatch.setattr(NotificationService, "send_test", check)
    failures = await send_previews(["one@example.com", "two@example.com", "one@example.com"])
    assert failures == 0
    assert check.await_count == 2
    assert send.await_count == 10
    assert {call.kwargs["recipient"] for call in send.call_args_list} == {"one@example.com", "two@example.com"}
    assert all(call.kwargs["subject"].startswith("[PRUEBA]") for call in send.call_args_list)


async def test_failed_smtp_check_does_not_send_template_previews(monkeypatch):
    send = AsyncMock()
    monkeypatch.setattr(NotificationService, "_send", send)
    monkeypatch.setattr(NotificationService, "send_test", AsyncMock(return_value=NotificationResult("FAILED")))
    assert await send_previews(["demo@example.com"]) == 1
    send.assert_not_awaited()


@pytest.mark.parametrize("username,from_email", [
    ("wrong@example.com", "sirid@example.com"),
    ("sirid@example.com", "wrong@example.com"),
])
async def test_expected_sender_blocks_wrong_smtp_account_or_from(monkeypatch, username, from_email):
    monkeypatch.setattr(SmtpService, "resolve", AsyncMock(return_value=SimpleNamespace(
        username=username, from_email=from_email,
    )))
    check = AsyncMock()
    send = AsyncMock()
    monkeypatch.setattr(NotificationService, "send_test", check)
    monkeypatch.setattr(NotificationService, "_send", send)
    assert await send_previews(["demo@example.com"], expected_sender="sirid@example.com") == 1
    check.assert_not_awaited()
    send.assert_not_awaited()


async def test_verified_sender_sends_only_to_the_requested_address(monkeypatch):
    monkeypatch.setattr(SmtpService, "resolve", AsyncMock(return_value=SimpleNamespace(
        username="sirid@example.com", from_email="sirid@example.com",
    )))
    check = AsyncMock(return_value=NotificationResult("SENT"))
    send = AsyncMock(return_value=NotificationResult("SENT"))
    monkeypatch.setattr(NotificationService, "send_test", check)
    monkeypatch.setattr(NotificationService, "_send", send)
    assert await send_previews(["demo@example.com"], expected_sender="sirid@example.com") == 0
    check.assert_awaited_once_with(recipient="demo@example.com")
    assert send.await_count == 5
    assert all(call.kwargs["recipient"] == "demo@example.com" for call in send.call_args_list)
