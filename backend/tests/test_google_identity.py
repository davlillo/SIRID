"""Verificacion del ID token de Google."""

from unittest.mock import patch

import pytest

from app.infrastructure.google_identity import (
    TOKEN_CLOCK_SKEW_SECONDS,
    GoogleIdentityVerifier,
)


@pytest.mark.parametrize("client_id", ["test-client-id.apps.googleusercontent.com"])
def test_verify_passes_clock_skew_to_google(client_id: str) -> None:
    verifier = GoogleIdentityVerifier(client_id=client_id)
    claims = {
        "iss": "accounts.google.com",
        "email_verified": True,
        "email": "user@example.com",
        "sub": "google-subject-1",
        "name": "User",
    }

    with patch(
        "app.infrastructure.google_identity.id_token.verify_oauth2_token",
        return_value=claims,
    ) as verify:
        identity = verifier.verify("fake-credential")

    verify.assert_called_once()
    _, kwargs = verify.call_args
    assert kwargs["clock_skew_in_seconds"] == TOKEN_CLOCK_SKEW_SECONDS
    assert identity.email == "user@example.com"
    assert identity.subject == "google-subject-1"
