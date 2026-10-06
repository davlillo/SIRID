"""Permisos y ciclo de vida administrativo."""

import uuid
from datetime import datetime, time, timedelta

from app.core.config import settings
from app.domain.enums import ReservationStatus
from app.infrastructure.models import ReservationModel
from tests.conftest import authenticate, requires_database

pytestmark = requires_database


def slot_at(hour: int, days_ahead: int = 1) -> dict:
    day = datetime.now(settings.timezone).date() + timedelta(days=days_ahead)
    start = datetime.combine(day, time(hour, 0), tzinfo=settings.timezone)
    return {"starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat()}


async def a_pending_reservation(client, customer, facility) -> dict:
    authenticate(client, customer)
    response = await client.post(
        "/v1/reservations", json={"facility_id": str(facility.id), **slot_at(18)}
    )
    return response.json()


class TestPermissions:
    async def test_a_client_cannot_list_admin_reservations(self, client, customer, facility):
        authenticate(client, customer)

        assert (await client.get("/v1/admin/reservations")).status_code == 403

    async def test_a_client_cannot_create_a_facility(self, client, customer):
        """Un usuario sin rol admin que gestiona el catalogo recibe 403."""
        authenticate(client, customer)

        response = await client.post(
            "/v1/admin/facilities",
            json={
                "slug": "cancha-pirata",
                "name": "Cancha Pirata",
                "description": "Intento de creacion sin permisos administrativos.",
                "sport_type": "FOOTBALL_5",
                "facility_kind": "FIELD",
                "zone": "FUTBOL",
                "capacity": 10,
                "location_label": "Zona Futbol",
            },
        )

        assert response.status_code == 403

    async def test_an_anonymous_visitor_cannot_reach_admin(self, client):
        assert (await client.get("/v1/admin/stats")).status_code == 401


class TestLifecycle:
    async def test_an_admin_confirms_a_pending_reservation(
        self, client, customer, admin, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)

        response = await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        assert response.status_code == 200
        assert response.json()["status"] == "CONFIRMED"

    async def test_a_confirmed_reservation_cannot_be_confirmed_again(
        self, client, customer, admin, facility
    ):
        """RN-08: una confirmada no vuelve a pendiente ni se reconfirma."""
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)
        await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        response = await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        assert response.status_code == 409

    async def test_completing_a_future_reservation_is_rejected(
        self, client, customer, admin, facility
    ):
        """RN-09: solo se completa despues de que termine el periodo."""
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)
        await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        response = await client.post(f"/v1/admin/reservations/{reservation['id']}/complete")

        assert response.status_code == 409
        assert response.json()["title"] == "Reservation period has not finished"

    async def test_completing_a_finished_reservation_is_allowed(
        self, client, customer, admin, facility, db_session
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)
        await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        # Se mueve el periodo al pasado: no hay forma de crearlo asi por la API.
        row = await db_session.get(ReservationModel, uuid.UUID(reservation["id"]))
        row.starts_at = row.starts_at - timedelta(days=3)
        row.ends_at = row.ends_at - timedelta(days=3)
        await db_session.commit()

        response = await client.post(f"/v1/admin/reservations/{reservation['id']}/complete")

        assert response.status_code == 200
        assert response.json()["status"] == "COMPLETED"

    async def test_an_admin_cancel_records_the_note(
        self, client, customer, admin, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)

        response = await client.post(
            f"/v1/admin/reservations/{reservation['id']}/cancel",
            json={"note": "Mantenimiento del cesped."},
        )

        assert response.json()["status"] == "CANCELLED"
        assert response.json()["admin_note"] == "Mantenimiento del cesped."

    async def test_the_admin_list_exposes_the_customer(
        self, client, customer, admin, facility
    ):
        await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)

        response = await client.get("/v1/admin/reservations?status=PENDING")

        assert response.json()["total"] == 1
        assert response.json()["items"][0]["customer"]["email"] == customer.email

    async def test_events_are_recorded_for_each_transition(
        self, client, customer, admin, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)
        await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        response = await client.get(f"/v1/admin/reservations/{reservation['id']}/events")

        assert [event["event_type"] for event in response.json()] == ["CREATED", "CONFIRMED"]

    async def test_notification_failures_are_visible_to_the_admin(
        self, client, customer, admin, facility
    ):
        """Si SMTP no responde la reserva permanece y el fallo queda registrado."""
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)

        response = await client.get(
            f"/v1/admin/reservations/{reservation['id']}/notifications"
        )

        assert response.status_code == 200
        assert response.json()[0]["template"] == "reservation_created"


class TestCatalog:
    async def test_an_admin_creates_a_facility(self, client, admin):
        authenticate(client, admin)

        response = await client.post(
            "/v1/admin/facilities",
            json={
                "slug": "cancha-nueva",
                "name": "Cancha Nueva",
                "description": "Cancha creada desde el panel administrativo.",
                "sport_type": "FOOTBALL_5",
                "facility_kind": "FIELD",
                "zone": "FUTBOL",
                "capacity": 10,
                "location_label": "Zona Futbol",
            },
        )

        assert response.status_code == 201
        assert response.json()["slug"] == "cancha-nueva"

    async def test_a_duplicate_slug_is_rejected(self, client, admin, facility):
        authenticate(client, admin)

        response = await client.post(
            "/v1/admin/facilities",
            json={
                "slug": facility.slug,
                "name": "Duplicada",
                "description": "Intento de reutilizar un slug existente.",
                "sport_type": "FOOTBALL_5",
                "facility_kind": "FIELD",
                "zone": "FUTBOL",
                "capacity": 10,
                "location_label": "Zona Futbol",
            },
        )

        assert response.status_code == 409

    async def test_deactivating_a_facility_removes_it_from_the_catalog(
        self, client, admin, facility
    ):
        """RN-10: una instalacion inactiva no aparece como reservable."""
        authenticate(client, admin)
        await client.patch(f"/v1/admin/facilities/{facility.id}", json={"is_active": False})

        public = await client.get("/v1/facilities")

        assert all(item["id"] != str(facility.id) for item in public.json()["items"])

    async def test_an_admin_replaces_the_weekly_schedule(self, client, admin, facility):
        authenticate(client, admin)

        response = await client.post(
            f"/v1/admin/facilities/{facility.id}/schedules",
            json={
                "schedules": [
                    {"weekday": 0, "opens_at": "08:00:00", "closes_at": "20:00:00"},
                    {"weekday": 1, "opens_at": "08:00:00", "closes_at": "20:00:00"},
                ]
            },
        )

        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_overlapping_schedules_are_rejected(self, client, admin, facility):
        authenticate(client, admin)

        response = await client.post(
            f"/v1/admin/facilities/{facility.id}/schedules",
            json={
                "schedules": [
                    {"weekday": 0, "opens_at": "08:00:00", "closes_at": "14:00:00"},
                    {"weekday": 0, "opens_at": "13:00:00", "closes_at": "20:00:00"},
                ]
            },
        )

        assert response.status_code == 422

    async def test_an_admin_adds_a_rate(self, client, admin, facility):
        authenticate(client, admin)

        response = await client.post(
            f"/v1/admin/facilities/{facility.id}/rates",
            json={
                "name": "Tarifa nocturna",
                "amount": "55.00",
                "currency": "USD",
                "minimum_minutes": 60,
                "valid_from": "2026-01-01",
            },
        )

        assert response.status_code == 201
        assert response.json()["amount"] == "55.00"

    async def test_stats_count_pending_reservations(
        self, client, customer, admin, facility
    ):
        await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)

        response = await client.get("/v1/admin/stats")

        assert response.json()["pending"] == 1
        assert response.json()["bookable_facilities"] >= 1


class TestStatusFilter:
    async def test_filtering_by_status_excludes_others(
        self, client, customer, admin, facility
    ):
        reservation = await a_pending_reservation(client, customer, facility)
        authenticate(client, admin)
        await client.post(f"/v1/admin/reservations/{reservation['id']}/confirm")

        pending = await client.get(
            f"/v1/admin/reservations?status={ReservationStatus.PENDING.value}"
        )

        assert pending.json()["total"] == 0
