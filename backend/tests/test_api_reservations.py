"""Casos de aceptacion criticos del flujo de reserva (spect/10)."""

from datetime import datetime, time, timedelta

from sqlalchemy import func, select, update

from app.core.config import settings
from app.infrastructure.models import (
    FacilityScheduleModel,
    NotificationLogModel,
    ReservationEventModel,
    ReservationModel,
)
from tests.conftest import authenticate, requires_database

pytestmark = requires_database


def slot_at(hour: int, days_ahead: int = 1, minutes: int = 60) -> dict:
    day = datetime.now(settings.timezone).date() + timedelta(days=days_ahead)
    start = datetime.combine(day, time(hour, 0), tzinfo=settings.timezone)
    return {
        "starts_at": start.isoformat(),
        "ends_at": (start + timedelta(minutes=minutes)).isoformat(),
    }


async def create_reservation(client, facility, **overrides) -> tuple[int, dict]:
    payload = {"facility_id": str(facility.id), **slot_at(18), **overrides}
    response = await client.post("/v1/reservations", json=payload)
    return response.status_code, response.json()


class TestCreate:
    async def test_a_valid_request_creates_a_pending_reservation(
        self, client, customer, facility
    ):
        authenticate(client, customer)

        status, body = await create_reservation(client, facility)

        assert status == 201
        assert body["status"] == "PENDING"
        assert body["facility"]["id"] == str(facility.id)

    async def test_the_amount_is_calculated_by_the_server(self, client, customer, facility):
        """RN-04: el importe no lo decide el cliente."""
        authenticate(client, customer)

        _, body = await create_reservation(client, facility, quoted_amount="1.00")

        assert body["quoted_amount"] == "40.00"  # tarifa de 40.00 por hora
        assert body["currency"] == "USD"

    async def test_an_hour_and_a_half_is_charged_as_two_blocks(
        self, client, customer, facility, db_session
    ):
        """Rango de bloques de 30 min y tarifa por hora: 90 min cobran dos horas."""
        await db_session.execute(
            update(FacilityScheduleModel)
            .where(FacilityScheduleModel.facility_id == facility.id)
            .values(slot_minutes=30)
        )
        await db_session.commit()
        authenticate(client, customer)
        payload = {"facility_id": str(facility.id), **slot_at(18, minutes=90)}

        response = await client.post("/v1/reservations", json=payload)

        assert response.json()["quoted_amount"] == "80.00"

    async def test_a_period_that_is_not_whole_blocks_is_rejected(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        payload = {"facility_id": str(facility.id), **slot_at(18, minutes=90)}

        response = await client.post("/v1/reservations", json=payload)

        assert response.status_code == 422
        assert "bloques de 60 minutos" in response.json()["detail"]

    async def test_a_period_misaligned_with_the_range_is_rejected(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        day = datetime.now(settings.timezone).date() + timedelta(days=1)
        start = datetime.combine(day, time(18, 30), tzinfo=settings.timezone)
        payload = {
            "facility_id": str(facility.id),
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=1)).isoformat(),
        }

        response = await client.post("/v1/reservations", json=payload)

        assert response.status_code == 422

    async def test_creation_records_an_audit_event(
        self, client, customer, facility, db_session
    ):
        authenticate(client, customer)
        _, body = await create_reservation(client, facility)

        events = (
            await db_session.scalars(
                select(ReservationEventModel).where(
                    ReservationEventModel.reservation_id == body["id"]
                )
            )
        ).all()

        assert [event.event_type.value for event in events] == ["CREATED"]

    async def test_creation_logs_the_notification_attempt(
        self, client, customer, facility, db_session
    ):
        """Sin SMTP configurado la reserva persiste y el intento queda registrado."""
        authenticate(client, customer)
        _, body = await create_reservation(client, facility)

        log = await db_session.scalar(
            select(NotificationLogModel).where(
                NotificationLogModel.reservation_id == body["id"]
            )
        )

        assert log is not None
        assert log.template == "reservation_created"
        assert log.status in {"SENT", "SKIPPED", "FAILED"}

    async def test_anonymous_visitors_cannot_reserve(self, client, facility):
        """RN-05: reservar exige sesion."""
        status, _ = await create_reservation(client, facility)

        assert status == 401

    async def test_a_period_outside_operating_hours_is_rejected(
        self, client, customer, facility
    ):
        """RN-02: la cancha abre a las 06:00."""
        authenticate(client, customer)

        status, body = await create_reservation(client, facility, **slot_at(3))

        assert status == 422
        assert body["title"] == "Requested period is outside operating hours"

    async def test_a_period_in_the_past_is_rejected(self, client, customer, facility):
        authenticate(client, customer)

        status, _ = await create_reservation(client, facility, **slot_at(18, days_ahead=-2))

        assert status == 422

    async def test_an_unknown_facility_returns_404(self, client, customer, facility):
        authenticate(client, customer)
        payload = {"facility_id": "11111111-1111-1111-1111-111111111111", **slot_at(18)}

        response = await client.post("/v1/reservations", json=payload)

        assert response.status_code == 404


class TestOverlap:
    async def test_an_overlapping_period_is_rejected_with_409(
        self, client, customer, other_customer, facility, db_session
    ):
        """RN-01: la instalacion no admite dos reservas activas solapadas."""
        authenticate(client, customer)
        assert (await create_reservation(client, facility))[0] == 201

        authenticate(client, other_customer)
        status, body = await create_reservation(client, facility)

        assert status == 409
        assert body["title"] == "Reservation conflict"
        total = await db_session.scalar(select(func.count()).select_from(ReservationModel))
        assert total == 1

    async def test_a_partial_overlap_is_also_rejected(self, client, customer, facility):
        authenticate(client, customer)
        await create_reservation(client, facility)

        status, _ = await create_reservation(client, facility, **slot_at(17, minutes=120))

        assert status == 409

    async def test_touching_periods_are_allowed(self, client, customer, facility):
        """RN-03: `[inicio, fin)` permite encadenar 18-19 con 19-20."""
        authenticate(client, customer)
        await create_reservation(client, facility)

        status, _ = await create_reservation(client, facility, **slot_at(19))

        assert status == 201

    async def test_a_cancelled_period_becomes_available_again(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        _, first = await create_reservation(client, facility)
        await client.post(f"/v1/reservations/{first['id']}/cancel")

        status, _ = await create_reservation(client, facility)

        assert status == 201

    async def test_a_reservation_on_another_facility_does_not_conflict(
        self, client, customer, facility, twin_facility
    ):
        """Cancha Sur A y Sur B son instalaciones distintas (spect/15)."""
        authenticate(client, customer)
        await create_reservation(client, facility)

        status, _ = await create_reservation(client, twin_facility)

        assert status == 201


class TestOwnership:
    async def test_a_customer_cannot_read_another_customers_reservation(
        self, client, customer, other_customer, facility
    ):
        """RN-06: se responde 404 para no revelar que existe."""
        authenticate(client, customer)
        _, reservation = await create_reservation(client, facility)

        authenticate(client, other_customer)
        response = await client.get(f"/v1/reservations/{reservation['id']}")

        assert response.status_code == 404

    async def test_a_customer_cannot_cancel_another_customers_reservation(
        self, client, customer, other_customer, facility
    ):
        authenticate(client, customer)
        _, reservation = await create_reservation(client, facility)

        authenticate(client, other_customer)
        response = await client.post(f"/v1/reservations/{reservation['id']}/cancel")

        assert response.status_code == 404

    async def test_my_reservations_only_lists_my_own(
        self, client, customer, other_customer, facility
    ):
        authenticate(client, customer)
        await create_reservation(client, facility)

        authenticate(client, other_customer)
        response = await client.get("/v1/reservations/me")

        assert response.json()["total"] == 0

    async def test_an_admin_can_read_any_reservation(
        self, client, customer, admin, facility
    ):
        authenticate(client, customer)
        _, reservation = await create_reservation(client, facility)

        authenticate(client, admin)
        response = await client.get(f"/v1/reservations/{reservation['id']}")

        assert response.status_code == 200


class TestCancellation:
    async def test_the_owner_can_cancel_a_pending_reservation(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        _, reservation = await create_reservation(client, facility)

        response = await client.post(f"/v1/reservations/{reservation['id']}/cancel")

        assert response.status_code == 200
        assert response.json()["status"] == "CANCELLED"

    async def test_a_cancelled_reservation_cannot_be_cancelled_twice(
        self, client, customer, facility
    ):
        authenticate(client, customer)
        _, reservation = await create_reservation(client, facility)
        await client.post(f"/v1/reservations/{reservation['id']}/cancel")

        response = await client.post(f"/v1/reservations/{reservation['id']}/cancel")

        assert response.status_code == 409
