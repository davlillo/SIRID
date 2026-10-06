"""Catalogo publico y calculo de disponibilidad."""

from datetime import datetime, time, timedelta

from app.core.config import settings
from tests.conftest import authenticate, requires_database

pytestmark = requires_database


def tomorrow() -> str:
    return (datetime.now(settings.timezone).date() + timedelta(days=1)).isoformat()


class TestCatalog:
    async def test_the_catalog_is_public(self, client, facility):
        response = await client.get("/v1/facilities")

        assert response.status_code == 200
        assert response.json()["total"] == 1

    async def test_the_catalog_can_be_filtered_by_zone(self, client, facility):
        assert (await client.get("/v1/facilities?zone=FUTBOL")).json()["total"] == 1
        assert (await client.get("/v1/facilities?zone=ACUATICA")).json()["total"] == 0

    async def test_the_catalog_can_be_filtered_by_capacity(self, client, facility):
        assert (await client.get("/v1/facilities?min_capacity=10")).json()["total"] == 1
        assert (await client.get("/v1/facilities?min_capacity=500")).json()["total"] == 0

    async def test_detail_by_slug_includes_schedules_and_rates(self, client, facility):
        response = await client.get(f"/v1/facilities/slug/{facility.slug}")

        body = response.json()
        assert len(body["schedules"]) == 7
        assert len(body["rates"]) == 1

    async def test_an_unknown_slug_returns_404(self, client):
        assert (await client.get("/v1/facilities/slug/no-existe")).status_code == 404


class TestAvailability:
    async def test_availability_is_public(self, client, facility):
        response = await client.get(
            f"/v1/facilities/{facility.id}/availability?date={tomorrow()}"
        )

        assert response.status_code == 200
        assert response.json()["is_open"] is True

    async def test_an_open_day_offers_hourly_slots(self, client, facility):
        response = await client.get(
            f"/v1/facilities/{facility.id}/availability?date={tomorrow()}"
        )

        body = response.json()
        assert body["slot_minutes"] == 60
        assert len(body["slots"]) == 16  # 06:00-22:00

    async def test_a_reserved_slot_is_reported_as_busy(self, client, customer, facility):
        authenticate(client, customer)
        day = datetime.now(settings.timezone).date() + timedelta(days=1)
        start = datetime.combine(day, time(18, 0), tzinfo=settings.timezone)
        await client.post(
            "/v1/reservations",
            json={
                "facility_id": str(facility.id),
                "starts_at": start.isoformat(),
                "ends_at": (start + timedelta(hours=1)).isoformat(),
            },
        )

        response = await client.get(
            f"/v1/facilities/{facility.id}/availability?date={tomorrow()}"
        )

        body = response.json()
        busy = [slot for slot in body["slots"] if slot["status"] == "BUSY"]
        assert len(busy) == 1
        assert busy[0]["starts_at"].startswith(start.isoformat()[:13])
        assert len(body["busy"]) == 1

    async def test_availability_does_not_expose_who_reserved(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        day = datetime.now(settings.timezone).date() + timedelta(days=1)
        start = datetime.combine(day, time(18, 0), tzinfo=settings.timezone)
        await client.post(
            "/v1/reservations",
            json={
                "facility_id": str(facility.id),
                "starts_at": start.isoformat(),
                "ends_at": (start + timedelta(hours=1)).isoformat(),
            },
        )

        raw = (
            await client.get(f"/v1/facilities/{facility.id}/availability?date={tomorrow()}")
        ).text

        assert customer.email not in raw
        assert customer.name not in raw

    async def test_available_slots_carry_the_server_side_amount(self, client, facility):
        response = await client.get(
            f"/v1/facilities/{facility.id}/availability?date={tomorrow()}"
        )

        available = [s for s in response.json()["slots"] if s["status"] == "AVAILABLE"]
        assert available
        assert all(slot["amount"] == "40.00" for slot in available)

    async def test_a_malformed_date_is_rejected(self, client, facility):
        response = await client.get(f"/v1/facilities/{facility.id}/availability?date=ayer")

        assert response.status_code == 422
