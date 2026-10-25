"""Photo validation, storage, transactional saves and public delivery without a DB."""

import base64
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.api.deps import current_user
from app.core.config import settings
from app.domain.enums import UserRole
from app.domain.errors import FacilityNotFound, InvalidFacilityPhoto
from app.infrastructure import facility_photos
from app.infrastructure.database import get_session
from app.infrastructure.facility_photos import (
    delete_photo,
    photo_path,
    prepare_photo,
    store_photo,
)
from app.infrastructure.models import FacilityImageModel, FacilityModel
from app.main import app
from app.schemas.facility import FacilityUpdate
from app.services.facility_service import FacilityService


def image_data(format="PNG", size=(48, 32), **save_options) -> str:
    output = BytesIO()
    Image.new("RGB", size, "green").save(output, format=format, **save_options)
    mime = {"PNG": "png", "JPEG": "jpeg", "WEBP": "webp"}[format]
    return f"data:image/{mime};base64,{base64.b64encode(output.getvalue()).decode()}"


@pytest.fixture
def photo_directory(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "facility_upload_dir", tmp_path / "photos")
    return settings.facility_upload_dir


@pytest.mark.parametrize("format", ["JPEG", "PNG", "WEBP"])
def test_supported_photos_are_reencoded_as_jpeg(format):
    content = prepare_photo(image_data(format))
    with Image.open(BytesIO(content)) as image:
        assert image.format == "JPEG"
        assert image.size == (48, 32)


def test_photo_is_resized_and_metadata_is_removed():
    exif = Image.Exif()
    exif[270] = "Private metadata"
    content = prepare_photo(image_data("JPEG", size=(2400, 1200), exif=exif))
    with Image.open(BytesIO(content)) as image:
        assert image.size == (2000, 1000)
        assert not image.getexif()


def test_transparent_photo_gets_a_white_background():
    output = BytesIO()
    Image.new("RGBA", (16, 16), (0, 0, 0, 0)).save(output, format="PNG")
    data = "data:image/png;base64," + base64.b64encode(output.getvalue()).decode()
    with Image.open(BytesIO(prepare_photo(data))) as image:
        assert image.getpixel((0, 0)) == (255, 255, 255)


@pytest.mark.parametrize("data", [
    "https://example.com/photo.jpg",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,not base64!",
    "data:image/png;base64,PHN2Zy8+",
    "data:image/jpeg;base64,",
    "data:image/jpeg;base64,SGVsbG8=",
])
def test_invalid_or_disguised_files_are_rejected(data):
    with pytest.raises(InvalidFacilityPhoto):
        prepare_photo(data)


def test_declared_and_real_image_formats_must_match():
    with pytest.raises(InvalidFacilityPhoto):
        prepare_photo(image_data().replace("image/png", "image/jpeg"))


def test_byte_limit_is_enforced(monkeypatch):
    monkeypatch.setattr(facility_photos, "MAX_PHOTO_BYTES", 10)
    with pytest.raises(InvalidFacilityPhoto, match="5 MB"):
        prepare_photo(image_data())


def test_pixel_limit_is_enforced(monkeypatch):
    monkeypatch.setattr(facility_photos, "MAX_PHOTO_PIXELS", 100)
    with pytest.raises(InvalidFacilityPhoto, match="megapíxeles"):
        prepare_photo(image_data())


def test_storage_generates_names_and_only_deletes_managed_files(photo_directory):
    url = store_photo(prepare_photo(image_data()))
    filename = url.rsplit("/", 1)[1]
    assert photo_path(filename).is_file()
    assert facility_photos.PHOTO_FILENAME.fullmatch(filename)
    delete_photo("/facilities/field.svg")
    delete_photo("https://example.com/photo.jpg")
    delete_photo("/media/facilities/../private.txt")
    assert photo_path(filename).is_file()
    delete_photo(url)
    delete_photo(url)
    assert not photo_path(filename).exists()


@pytest.mark.parametrize("filename", ["../secret.jpg", "anything.svg", "photo.jpg", "a" * 32 + ".jpg/extra"])
def test_paths_outside_generated_photos_are_rejected(filename, photo_directory):
    assert photo_path(filename) is None


def test_omitting_photo_and_removing_photo_are_distinct():
    assert "photo" not in FacilityUpdate(name="New name").model_dump(exclude_unset=True)
    assert FacilityUpdate(photo=None).model_dump(exclude_unset=True) == {"photo": None}


@pytest.fixture
def photo_service(photo_directory):
    session = AsyncMock()
    service = FacilityService(session)
    service.repository = SimpleNamespace(
        get_by_id=AsyncMock(), slug_exists=AsyncMock(return_value=False),
        add=Mock(side_effect=lambda facility: facility),
    )
    service.organizations = SimpleNamespace(
        get_by_id=AsyncMock(return_value=SimpleNamespace(is_active=True)),
    )
    return service


async def test_create_saves_photo_in_the_same_commit(photo_service, photo_directory):
    facility = await photo_service.create({
        "organization_id": uuid4(), "slug": "photo-facility", "name": "Cancha",
        "photo": image_data(),
    })
    assert len(facility.images) == 1
    assert facility.images[0].alt_text == "Foto de Cancha"
    assert list(photo_directory.glob("*.jpg"))
    photo_service.session.commit.assert_awaited_once()


async def test_edit_without_photo_preserves_existing_image(photo_service):
    original = FacilityImageModel(url="/facilities/field.svg", alt_text="Field", sort_order=0)
    facility = FacilityModel(id=uuid4(), name="Cancha", images=[original], is_active=True)
    photo_service.repository.get_by_id.return_value = facility
    await photo_service.update(facility.id, {"name": "Cancha nueva"})
    assert facility.images == [original]


async def test_replace_and_remove_photos_cleanup_old_files(photo_service, photo_directory):
    old_url = store_photo(prepare_photo(image_data()))
    facility = FacilityModel(id=uuid4(), name="Cancha", is_active=True, images=[
        FacilityImageModel(url=old_url, alt_text="Old", sort_order=0),
    ])
    photo_service.repository.get_by_id.return_value = facility
    await photo_service.update(facility.id, {"photo": image_data("JPEG")})
    assert facility.images[0].url != old_url
    assert not photo_path(old_url.rsplit("/", 1)[1]).exists()
    assert len(list(photo_directory.glob("*.jpg"))) == 1
    await photo_service.update(facility.id, {"photo": None})
    assert facility.images == []
    assert not list(photo_directory.glob("*.jpg"))


async def test_commit_failure_removes_new_file_but_preserves_old_file(photo_service, photo_directory):
    old_url = store_photo(prepare_photo(image_data()))
    facility = FacilityModel(id=uuid4(), name="Cancha", is_active=True, images=[
        FacilityImageModel(url=old_url, alt_text="Old", sort_order=0),
    ])
    photo_service.repository.get_by_id.return_value = facility
    photo_service.session.commit.side_effect = RuntimeError("Database unavailable")
    with pytest.raises(RuntimeError, match="Database unavailable"):
        await photo_service.update(facility.id, {"photo": image_data()})
    assert len(list(photo_directory.glob("*.jpg"))) == 1
    assert photo_path(old_url.rsplit("/", 1)[1]).exists()
    photo_service.session.rollback.assert_awaited_once()


async def test_invalid_photo_is_not_committed(photo_service, photo_directory):
    with pytest.raises(InvalidFacilityPhoto):
        await photo_service.create({
            "organization_id": uuid4(), "slug": "invalid-photo", "name": "Cancha",
            "photo": "data:image/png;base64,SGVsbG8=",
        })
    photo_service.session.commit.assert_not_awaited()
    assert not photo_directory.exists()


@pytest.fixture
async def photo_http(photo_directory):
    app.dependency_overrides[get_session] = lambda: AsyncMock()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as http:
        yield http
    app.dependency_overrides.clear()


async def test_public_photo_delivery_and_missing_photo(photo_http):
    url = store_photo(prepare_photo(image_data()))
    response = await photo_http.get(f"/v1{url}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "immutable" in response.headers["cache-control"]
    assert (await photo_http.get("/v1/media/facilities/private.txt")).status_code == 404
    delete_photo(url)
    assert (await photo_http.get(f"/v1{url}")).status_code == 404


async def test_anonymous_cannot_change_a_photo(photo_http):
    response = await photo_http.patch(f"/v1/admin/facilities/{uuid4()}", json={"photo": image_data()})
    assert response.status_code == 401


async def test_client_cannot_change_a_photo(photo_http):
    app.dependency_overrides[current_user] = lambda: SimpleNamespace(role=UserRole.CLIENT)
    response = await photo_http.patch(f"/v1/admin/facilities/{uuid4()}", json={"photo": image_data()})
    assert response.status_code == 403


async def test_manager_cannot_change_another_organizations_photo(photo_http, monkeypatch):
    organization_id = uuid4()
    app.dependency_overrides[current_user] = lambda: SimpleNamespace(
        role=UserRole.ENCARGADO, organization_id=organization_id,
    )
    get = AsyncMock(side_effect=FacilityNotFound("Not in this organization"))
    update = AsyncMock()
    monkeypatch.setattr(FacilityService, "get", get)
    monkeypatch.setattr(FacilityService, "update", update)
    response = await photo_http.patch(f"/v1/admin/facilities/{uuid4()}", json={"photo": None})
    assert response.status_code == 404
    assert get.call_args.kwargs["organization_id"] == organization_id
    update.assert_not_awaited()
