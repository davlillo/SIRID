"""An authenticated client's public browsing stays inside its organization."""

import uuid
from datetime import datetime, timedelta

import pytest

from app.core.config import settings
from app.domain.enums import UserRole
from app.infrastructure.models import OrganizationModel
from tests.conftest import _create_user, authenticate, make_facility, requires_database

pytestmark = requires_database


@pytest.fixture
async def other_catalog(db_session):
    organization = OrganizationModel(id=uuid.uuid4(), slug="other-org", name="Other organization")
    db_session.add(organization)
    await db_session.commit()
    facility = await make_facility(db_session, "other-field", "Other Field", organization_id=organization.id)
    customer = await _create_user(db_session, "other-tenant@example.com", UserRole.CLIENT, organization_id=organization.id)
    return organization, facility, customer


async def test_client_directory_returns_only_own_organization(client, customer, other_catalog):
    authenticate(client, customer)
    response = await client.get("/v1/organizations")
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [str(customer.organization_id)]


@pytest.mark.parametrize("identifier", ["slug", "id"])
async def test_client_cannot_select_another_organizations_catalog(client, customer, other_catalog, identifier):
    organization, _, _ = other_catalog
    authenticate(client, customer)
    value = organization.slug if identifier == "slug" else organization.id
    response = await client.get(f"/v1/organizations/{value}/facilities")
    assert response.status_code == 404


@pytest.mark.parametrize("suffix", ["slug", "id", "availability", "check"])
async def test_client_cannot_read_other_tenant_detail_or_availability(client, customer, other_catalog, suffix):
    organization, facility, _ = other_catalog
    authenticate(client, customer)
    date = (datetime.now(settings.timezone).date() + timedelta(days=1)).isoformat()
    paths = {
        "slug": f"{facility.slug}",
        "id": f"id/{facility.id}",
        "availability": f"{facility.id}/availability?date={date}",
        "check": f"{facility.id}/availability/check?date={date}&start=18:00&end=19:00",
    }
    response = await client.get(f"/v1/organizations/{organization.slug}/facilities/{paths[suffix]}")
    assert response.status_code == 404


async def test_legacy_catalog_uses_clients_organization_instead_of_bootstrap(client, facility, other_catalog):
    _, other_facility, other_customer = other_catalog
    authenticate(client, other_customer)
    listed = await client.get("/v1/facilities")
    assert listed.status_code == 200
    assert [row["id"] for row in listed.json()["items"]] == [str(other_facility.id)]
    own = await client.get(f"/v1/facilities/slug/{other_facility.slug}")
    assert own.status_code == 200
    assert (await client.get(f"/v1/facilities/{facility.id}")).status_code == 404
    assert (await client.get(f"/v1/facilities/slug/{facility.slug}")).status_code == 404
    date = (datetime.now(settings.timezone).date() + timedelta(days=1)).isoformat()
    assert (await client.get(f"/v1/facilities/{facility.id}/availability?date={date}")).status_code == 404
    assert (await client.get(f"/v1/facilities/{facility.id}/availability/check?date={date}&start=18:00&end=19:00")).status_code == 404


async def test_client_can_read_own_catalog_by_id_and_slug(client, customer, facility):
    authenticate(client, customer)
    for identifier in ("organizacion-inicial", str(customer.organization_id)):
        response = await client.get(f"/v1/organizations/{identifier}/facilities")
        assert response.status_code == 200
        assert [row["id"] for row in response.json()["items"]] == [str(facility.id)]


async def test_anonymous_visitors_keep_public_organization_selection(client, facility, other_catalog):
    organization, other_facility, _ = other_catalog
    client.cookies.clear()
    directory = await client.get("/v1/organizations")
    assert directory.status_code == 200
    assert len(directory.json()) == 2
    catalog = await client.get(f"/v1/organizations/{organization.slug}/facilities")
    assert catalog.status_code == 200
    assert [row["id"] for row in catalog.json()["items"]] == [str(other_facility.id)]
