"""Validate and store facility cover photos without trusting client filenames."""

import base64
import binascii
import re
import warnings
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.domain.errors import InvalidFacilityPhoto

MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTO_PIXELS = 20_000_000
PHOTO_PREFIX = "/media/facilities/"
PHOTO_FILENAME = re.compile(r"^[a-f0-9]{32}\.jpg$")
PHOTO_HEADERS = {
    "data:image/jpeg;base64": "JPEG",
    "data:image/png;base64": "PNG",
    "data:image/webp;base64": "WEBP",
}


def prepare_photo(data_url: str) -> bytes:
    """Decode, bound and re-encode pixels, stripping metadata and extra content."""
    header, separator, encoded = data_url.partition(",")
    if not separator or header not in PHOTO_HEADERS:
        raise InvalidFacilityPhoto("Selecciona una imagen JPG, PNG o WebP.")
    if len(encoded) > 4 * ((MAX_PHOTO_BYTES + 2) // 3):
        raise InvalidFacilityPhoto("La foto no debe superar los 5 MB.")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise InvalidFacilityPhoto("No se pudo leer la imagen.") from error
    if len(raw) > MAX_PHOTO_BYTES:
        raise InvalidFacilityPhoto("La foto no debe superar los 5 MB.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw), formats=[PHOTO_HEADERS[header]]) as source:
                if source.width * source.height > MAX_PHOTO_PIXELS:
                    raise InvalidFacilityPhoto("La foto no debe superar los 20 megapíxeles.")
                source.load()
                oriented = ImageOps.exif_transpose(source)
                oriented.thumbnail((2000, 2000))
                rgba = oriented.convert("RGBA")
                # A fresh canvas excludes EXIF/GPS and handles transparent PNGs.
                clean = Image.new("RGB", rgba.size, "white")
                clean.paste(rgba, mask=rgba.getchannel("A"))
                output = BytesIO()
                clean.save(output, format="JPEG", quality=85)
                return output.getvalue()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as error:
        raise InvalidFacilityPhoto("El archivo no es una imagen válida o está dañado.") from error


def photo_path(filename: str) -> Path | None:
    """Only generated JPEG names may address files in the upload directory."""
    if not PHOTO_FILENAME.fullmatch(filename):
        return None
    root = settings.facility_upload_dir.resolve()
    path = (root / filename).resolve()
    return path if path.parent == root else None


def store_photo(content: bytes) -> str:
    filename = f"{uuid4().hex}.jpg"
    directory = settings.facility_upload_dir
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    try:
        path.write_bytes(content)
    except OSError:
        path.unlink(missing_ok=True)
        raise
    return f"{PHOTO_PREFIX}{filename}"


def delete_photo(url: str) -> None:
    """Never delete seed illustrations, external URLs or arbitrary local paths."""
    if url.startswith(PHOTO_PREFIX):
        path = photo_path(url.removeprefix(PHOTO_PREFIX))
        if path is not None:
            path.unlink(missing_ok=True)
