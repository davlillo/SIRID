"""Public, read-only access to sanitized facility photos."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.infrastructure.facility_photos import photo_path

router = APIRouter(prefix="/media", tags=["facilities"])


@router.get("/facilities/{filename}", response_class=FileResponse)
async def read_facility_photo(filename: str) -> FileResponse:
    path = photo_path(filename)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Foto no encontrada.")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
