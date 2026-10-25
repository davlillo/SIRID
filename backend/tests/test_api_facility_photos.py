"""Facility photo CRUD against PostgreSQL, including public catalog responses."""

import base64
from io import BytesIO

import pytest
from PIL import Image

from app.core.config import settings
from tests.conftest import TEST_ORGANIZATION_ID, authenticate, requires_database

pytestmark = requires_database


@pytest.fixture(autouse=True)
def isolated_photos(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "facility_upload_dir", tmp_path / "photos")


def photo() -> str:
    content = BytesIO()
    Image.new("RGB", (64, 48), "green").save(content, format="PNG")
    return "data:image/png;base64," + base64.b64encode(content.getvalue()).decode()


async def test_create_with_photo_exposes_it_in_public_catalog(client, encargado):
    authenticate(client, encargado)
    response = await client.post("/v1/admin/facilities", json={
        "organization_id": str(TEST_ORGANIZATION_ID),
        "slug": "cancha-con-foto", "name": "Cancha con foto",
        "description": "Instalación con una fotografía real de la cancha.",
        "sport_type": "FOOTBALL_7", "facility_kind": "FIELD", "zone": "FUTBOL",
        "capacity": 14, "location_label": "Zona norte", "photo": photo(),
    })
    assert response.status_code == 201
    images = response.json()["images"]
    assert len(images) == 1
    assert images[0]["url"].startswith("/media/facilities/")
    public = await client.get(
        "/v1/organizations/organizacion-inicial/facilities/cancha-con-foto"
    )
    assert public.status_code == 200
    assert public.json()["images"] == images
    assert (await client.get(f"/v1{images[0]['url']}")).status_code == 200


async def test_edit_preserve_replace_and_remove_photo(client, encargado, facility):
    authenticate(client, encargado)
    path = f"/v1/admin/facilities/{facility.id}"
    first = await client.patch(path, json={"photo": photo()})
    assert first.status_code == 200
    first_url = first.json()["images"][0]["url"]

    metadata_only = await client.patch(path, json={"name": "Cancha renombrada"})
    assert metadata_only.status_code == 200
    assert metadata_only.json()["images"][0]["url"] == first_url

    replaced = await client.patch(path, json={"photo": photo()})
    assert replaced.status_code == 200
    new_url = replaced.json()["images"][0]["url"]
    assert new_url != first_url
    assert (await client.get(f"/v1{first_url}")).status_code == 404
    assert (await client.get(f"/v1{new_url}")).status_code == 200

    removed = await client.patch(path, json={"photo": None})
    assert removed.status_code == 200
    assert removed.json()["images"] == []
    assert (await client.get(f"/v1{new_url}")).status_code == 404
    assert not list(settings.facility_upload_dir.glob("*.jpg"))


async def test_invalid_photo_does_not_save_other_changes(client, encargado, facility):
    authenticate(client, encargado)
    path = f"/v1/admin/facilities/{facility.id}"
    response = await client.patch(path, json={
        "name": "Must not be saved", "photo": "data:image/png;base64,SGVsbG8=",
    })
    assert response.status_code == 422
    unchanged = await client.get(path)
    assert unchanged.status_code == 200
    assert unchanged.json()["name"] == facility.name
    assert not settings.facility_upload_dir.exists()
