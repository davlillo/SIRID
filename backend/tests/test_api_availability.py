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


async def reserve_tomorrow(client, customer, facility, hour: int, hours: int = 1) -> None:
    authenticate(client, customer)
    day = datetime.now(settings.timezone).date() + timedelta(days=1)
    start = datetime.combine(day, time(hour, 0), tzinfo=settings.timezone)
    response = await client.post(
        "/v1/reservations",
        json={
            "facility_id": str(facility.id),
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=hours)).isoformat(),
        },
    )
    assert response.status_code == 201


class TestRangeCheck:
    def url(self, facility, start: str, end: str, day: str | None = None) -> str:
        return (
            f"/v1/facilities/{facility.id}/availability/check"
            f"?date={day or tomorrow()}&start={start}&end={end}"
        )

    async def test_a_free_range_is_available_with_its_amount(self, client, facility):
        response = await client.get(self.url(facility, "18:00", "20:00"))

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "AVAILABLE"
        assert body["amount"] == "80.00"
        assert body["alternatives"] == []

    async def test_an_overlapping_range_is_busy_and_offers_same_day_alternatives(
        self, client, customer, facility
    ):
        await reserve_tomorrow(client, customer, facility, hour=18)

        body = (await client.get(self.url(facility, "17:00", "19:00"))).json()

        assert body["status"] == "BUSY"
        assert body["amount"] is None
        assert body["alternatives"]
        reserved = (time(18, 0), time(19, 0))
        for item in body["alternatives"]:
            starts = datetime.fromisoformat(item["starts_at"]).astimezone(settings.timezone)
            ends = datetime.fromisoformat(item["ends_at"]).astimezone(settings.timezone)
            assert starts.date().isoformat() == tomorrow()
            assert ends - starts == timedelta(hours=2)
            assert not (starts.time() < reserved[1] and reserved[0] < ends.time())
            assert item["amount"] == "80.00"

    async def test_a_range_outside_operating_hours_is_reported(self, client, facility):
        body = (await client.get(self.url(facility, "21:00", "23:00"))).json()

        assert body["status"] == "OUTSIDE_HOURS"
        assert body["alternatives"]

    async def test_an_inverted_range_is_rejected(self, client, facility):
        response = await client.get(self.url(facility, "20:00", "18:00"))

        assert response.status_code == 422

    async def test_a_range_shorter_than_the_minimum_is_rejected(self, client, facility):
        response = await client.get(self.url(facility, "18:00", "18:30"))

        assert response.status_code == 422

    async def test_the_check_does_not_expose_who_reserved(self, client, customer, facility):
        await reserve_tomorrow(client, customer, facility, hour=18)

        raw = (await client.get(self.url(facility, "18:00", "19:00"))).text

        assert customer.email not in raw
        assert customer.name not in raw
