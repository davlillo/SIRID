"""PostgreSQL acceptance coverage for the reviewed HU workflow corrections."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.infrastructure.models import FacilityModel, ReservationModel
from app.seeds import seed_demo
from tests.conftest import TEST_ORGANIZATION_ID, authenticate, requires_database
from tests.test_api_admin import slot_at

pytestmark = requires_database


async def test_suspended_organization_blocks_existing_sessions_but_not_global_admin(
    client, admin, encargado, customer,
):
    authenticate(client, encargado)
    assert (await client.get("/v1/auth/me")).status_code == 200
    authenticate(client, admin)
    path = f"/v1/admin/organizations/{TEST_ORGANIZATION_ID}"
    assert (await client.patch(path, json={"is_active": False})).status_code == 200

    authenticate(client, encargado)
    assert (await client.get("/v1/auth/me")).status_code == 401
    assert (await client.get("/v1/admin/reservations")).status_code == 401
    authenticate(client, customer)
    assert (await client.get("/v1/reservations/me")).status_code == 401

    authenticate(client, admin)
    assert (await client.get("/v1/admin/organizations")).status_code == 200
    assert (await client.patch(path, json={"is_active": True})).status_code == 200
    authenticate(client, encargado)
    assert (await client.get("/v1/auth/me")).status_code == 200


async def test_zero_prices_are_rejected_when_creating_and_publishing_rates(client, encargado, facility):
    authenticate(client, encargado)
    path = f"/v1/admin/facilities/{facility.id}/rates"
    today = datetime.now(settings.timezone).date().isoformat()
    created = await client.post(path, json={
        "name": "Zero price", "amount": "0", "minimum_minutes": 60, "valid_from": today,
    })
    assert created.status_code == 422
    published = await client.post(f"{path}/publish", json={"amount": "0", "effective_from": today})
    assert published.status_code == 422


async def test_a_legacy_zero_quote_still_requires_a_recorded_payment(
    client, db_session, customer, encargado, facility,
):
    authenticate(client, customer)
    response = await client.post("/v1/reservations", json={"facility_id": str(facility.id), **slot_at(18)})
    assert response.status_code == 201
    reservation = await db_session.scalar(select(ReservationModel))
    reservation.quoted_amount = Decimal("0")
    await db_session.commit()

    authenticate(client, encargado)
    confirmed = await client.post(f"/v1/admin/reservations/{reservation.id}/confirm")
    assert confirmed.status_code == 409
    await db_session.refresh(reservation)
    assert reservation.status.value == "PENDING"


async def test_seed_preserves_real_saved_edits_schedules_and_deactivation(db_session, monkeypatch):
    monkeypatch.setattr(seed_demo, "FACILITIES", seed_demo.FACILITIES[:1])
    await seed_demo.seed()
    facility = await db_session.scalar(select(FacilityModel))
    facility.name = "Saved administrative name"
    facility.is_active = False
    facility.capacity = 9
    facility.schedules.clear()
    facility.images.clear()
    for rate in facility.rates:
        rate.is_active = False
    await db_session.commit()

    await seed_demo.seed()
    await db_session.refresh(facility)
    assert facility.name == "Saved administrative name"
    assert facility.is_active is False
    assert facility.capacity == 9
    assert facility.schedules == []
    assert facility.images == []
    assert all(not rate.is_active for rate in facility.rates)
