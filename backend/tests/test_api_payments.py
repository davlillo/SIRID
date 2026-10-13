"""HU-10: pagos y anticipos ligados a reservaciones."""

from decimal import Decimal

import pytest

from tests.conftest import authenticate, requires_database
from tests.test_api_admin import a_pending_reservation, slot_at

pytestmark = requires_database


async def register_payment(client, encargado, reservation_id: str, amount: str):
    authenticate(client, encargado)
    return await client.post(
        f"/v1/admin/reservations/{reservation_id}/payments",
        json={"amount": amount},
    )


async def pay_in_full(client, encargado, reservation: dict):
    response = await register_payment(
        client, encargado, reservation["id"], reservation["quoted_amount"]
    )
    assert response.status_code == 201
    return response.json()


class TestRegisterPayment:
    async def test_payment_is_linked_to_reservation(
        self, client, customer, encargado, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        response = await register_payment(
            client, encargado, reservation["id"], "20.00"
        )

        assert response.status_code == 201
        body = response.json()
        assert body["reservation_id"] == reservation["id"]
        assert body["amount"] == "20.00"

        authenticate(client, encargado)
        summary = await client.get(
            f"/v1/admin/reservations/{reservation['id']}/payments"
        )
        assert summary.status_code == 200
        payload = summary.json()
        assert payload["total_paid"] == "20.00"
        assert payload["quoted_amount"] == reservation["quoted_amount"]
        assert len(payload["payments"]) == 1

    async def test_partial_payments_accumulate(self, client, customer, encargado, facility):
        reservation = await a_pending_reservation(client, customer, facility)
        await register_payment(client, encargado, reservation["id"], "10.00")
        await register_payment(client, encargado, reservation["id"], "15.00")

        authenticate(client, encargado)
        summary = await client.get(
            f"/v1/admin/reservations/{reservation['id']}/payments"
        )
        assert summary.json()["total_paid"] == "25.00"

    async def test_zero_or_negative_amount_is_rejected(
        self, client, customer, encargado, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        for amount in ("0", "-5.00"):
            response = await register_payment(
                client, encargado, reservation["id"], amount
            )
            assert response.status_code == 422


class TestConfirmWithPayment:
    async def test_confirm_without_payment_is_rejected(
        self, client, customer, encargado, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, encargado)

        response = await client.post(
            f"/v1/admin/reservations/{reservation['id']}/confirm"
        )

        assert response.status_code == 409
        assert response.json()["title"] == "Insufficient payment"

    async def test_partial_payment_blocks_confirmation(
        self, client, customer, encargado, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        quoted = Decimal(reservation["quoted_amount"])
        partial = (quoted / 2).quantize(Decimal("0.01"))
        await register_payment(client, encargado, reservation["id"], str(partial))

        authenticate(client, encargado)
        response = await client.post(
            f"/v1/admin/reservations/{reservation['id']}/confirm"
        )

        assert response.status_code == 409
        assert response.json()["title"] == "Insufficient payment"

    async def test_full_payment_allows_confirmation(
        self, client, customer, encargado, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        await pay_in_full(client, encargado, reservation)

        authenticate(client, encargado)
        response = await client.post(
            f"/v1/admin/reservations/{reservation['id']}/confirm"
        )

        assert response.status_code == 200
        assert response.json()["status"] == "CONFIRMED"
