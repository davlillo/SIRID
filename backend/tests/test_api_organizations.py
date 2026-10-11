"""Multi-organización: catálogo público por slug y aislamiento de reservas."""

from datetime import datetime, time, timedelta
from uuid import UUID

from app.core.config import settings
from app.domain.enums import UserRole
from app.infrastructure.models import OrganizationModel

from tests.conftest import (
    TEST_ORGANIZATION_ID,
    _create_user,
    authenticate,
    make_facility,
    requires_database,
)

pytestmark = requires_database


async def create_second_organization(client, admin) -> OrganizationModel:
    authenticate(client, admin)
    response = await client.post(
        "/v1/admin/organizations",
        json={
            "name": "Organización B",
            "slug": "org-b",
            "email_domain": "org-b.example.com",
        },
    )
    assert response.status_code == 201
    return OrganizationModel(
        id=UUID(response.json()["id"]),
        name="Organización B",
        slug="org-b",
        email_domain="org-b.example.com",
    )


async def test_system_admin_creates_organization_and_public_directory_hides_domain(
    client, admin
):
    await create_second_organization(client, admin)

    response = await client.get("/v1/organizations")

    assert response.status_code == 200
    assert {item["slug"] for item in response.json()} == {
        "organizacion-inicial",
        "org-b",
    }
    assert all("email_domain" not in item for item in response.json())


async def test_encargado_cannot_create_organization(client, encargado):
    authenticate(client, encargado)

    response = await client.post(
        "/v1/admin/organizations",
        json={
            "name": "Organización B",
            "slug": "org-b",
            "email_domain": "org-b.example.com",
        },
    )

    assert response.status_code == 403


async def test_domain_maps_google_signup_to_the_matching_organization(
    client, admin, google_verifier
):
    organization_b = await create_second_organization(client, admin)
    google_verifier.identity = google_verifier.identity.__class__(
        subject="org-b-client-subject",
        email="new-client@org-b.example.com",
        name="Org B Client",
        picture=None,
    )

    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert response.status_code == 200
    assert response.json()["organization_id"] == str(organization_b.id)
    assert response.json()["role"] == "CLIENT"


async def test_admin_provisions_encargado_role_before_google_link(
    client, admin, google_verifier
):
    organization_b = await create_second_organization(client, admin)
    authenticate(client, admin)
    created = await client.post(
        "/v1/admin/users",
        json={
            "email": "manager@org-b.example.com",
            "name": "Org B Manager",
            "organization_id": str(organization_b.id),
            "role": "ENCARGADO",
        },
    )
    assert created.status_code == 201, created.text

    google_verifier.identity = google_verifier.identity.__class__(
        subject="org-b-manager-subject",
        email="manager@org-b.example.com",
        name="Org B Manager",
        picture=None,
    )
    login = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert login.status_code == 200
    assert login.json()["id"] == created.json()["id"]
    assert login.json()["role"] == "ENCARGADO"
    assert login.json()["organization_id"] == str(organization_b.id)


async def test_admin_can_deactivate_a_provisioned_user(client, admin, google_verifier):
    authenticate(client, admin)
    created = await client.post(
        "/v1/admin/users",
        json={
            "email": "manager@example.com",
            "name": "Initial Org Manager",
            "organization_id": str(TEST_ORGANIZATION_ID),
            "role": "ENCARGADO",
        },
    )
    assert created.status_code == 201, created.text

    google_verifier.identity = google_verifier.identity.__class__(
        subject="ues-manager-subject",
        email="manager@example.com",
        name="Initial Org Manager",
        picture=None,
    )
    login = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )
    assert login.status_code == 200

    client.cookies.clear()
    authenticate(client, admin)
    updated = await client.patch(
        f"/v1/admin/users/{created.json()['id']}", json={"is_active": False}
    )
    assert updated.status_code == 200

    failed_login = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )
    assert failed_login.status_code == 401


async def test_google_account_outside_registered_domains_is_not_auto_registered(
    client, google_verifier
):
    google_verifier.identity = google_verifier.identity.__class__(
        subject="external-client-subject",
        email="external@gmail.com",
        name="External Client",
        picture=None,
    )

    response = await client.post(
        "/v1/auth/google", json={"credential": "a-valid-google-token"}
    )

    assert response.status_code == 401


async def test_public_catalog_is_scoped_to_the_selected_organization(
    client, admin, encargado, facility
):
    organization_b = await create_second_organization(client, admin)
    authenticate(client, admin)
    created = await client.post(
        "/v1/admin/facilities",
        json={
            "organization_id": str(organization_b.id),
            "slug": "org-b-field",
            "name": "Cancha Org B",
            "description": "Instalación deportiva perteneciente a la organización B.",
            "sport_type": "FOOTBALL_7",
            "facility_kind": "FIELD",
            "zone": "FUTBOL",
            "capacity": 14,
            "location_label": "Org B",
        },
    )
    assert created.status_code == 201

    authenticate(client, admin)
    admin_facilities = await client.get("/v1/admin/facilities")
    assert admin_facilities.json()["total"] == 2

    authenticate(client, encargado)
    encargado_facilities = await client.get("/v1/admin/facilities")
    assert encargado_facilities.json()["total"] == 1

    initial_catalog = await client.get(
        "/v1/organizations/organizacion-inicial/facilities"
    )
    org_b_catalog = await client.get("/v1/organizations/org-b/facilities")

    assert [item["id"] for item in initial_catalog.json()["items"]] == [
        str(facility.id)
    ]
    assert [item["id"] for item in org_b_catalog.json()["items"]] == [
        created.json()["id"]
    ]


async def test_customer_and_encargado_cannot_cross_organization_reservations(
    client, db_session, customer, encargado, admin
):
    organization_b = await create_second_organization(client, admin)
    org_b_customer = await _create_user(
        db_session,
        "client@org-b.example.com",
        UserRole.CLIENT,
        organization_id=organization_b.id,
    )
    org_b_encargado = await _create_user(
        db_session,
        "manager@org-b.example.com",
        UserRole.ENCARGADO,
        organization_id=organization_b.id,
    )
    org_b_facility = await make_facility(
        db_session,
        "org-b-field",
        "Org B Field",
        organization_id=organization_b.id,
    )

    tomorrow = datetime.now(settings.timezone).date() + timedelta(days=1)
    starts_at = datetime.combine(tomorrow, time(18), tzinfo=settings.timezone)
    payload = {
        "facility_id": str(org_b_facility.id),
        "starts_at": starts_at.isoformat(),
        "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
    }

    authenticate(client, customer)
    cross_tenant = await client.post("/v1/reservations", json=payload)
    assert cross_tenant.status_code == 404

    authenticate(client, org_b_customer)
    own_reservation = await client.post("/v1/reservations", json=payload)
    assert own_reservation.status_code == 201

    authenticate(client, encargado)
    assert (await client.get("/v1/admin/reservations")).json()["total"] == 0
    assert (
        await client.get(f"/v1/reservations/{own_reservation.json()['id']}")
    ).status_code == 404

    authenticate(client, org_b_encargado)
    assert (await client.get("/v1/admin/reservations")).json()["total"] == 1
