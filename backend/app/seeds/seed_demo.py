"""Carga el catalogo de desarrollo.

Idempotente: se puede ejecutar tantas veces como haga falta. Un espacio que ya
existe se actualiza en lugar de duplicarse.

    docker compose exec backend python -m app.seeds.seed_demo

Se trabaja con sentencias explicitas en vez de colecciones ORM: en contexto
async, tocar una relacion no cargada dispara IO fuera del greenlet.
"""

import asyncio
import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.infrastructure.database import SessionLocal
from app.infrastructure.models import (
    FacilityImageModel,
    FacilityModel,
    FacilityRateModel,
    FacilityScheduleModel,
)
from app.seeds.complex_data import FACILITIES

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("seed")

RATE_VALID_FROM = date(2020, 1, 1)


async def seed() -> None:
    async with SessionLocal() as session:
        created, updated = 0, 0

        for entry in FACILITIES:
            facility = await session.scalar(
                select(FacilityModel).where(FacilityModel.slug == entry["slug"])
            )
            is_new = facility is None
            if is_new:
                facility = FacilityModel(slug=entry["slug"])
                session.add(facility)

            map_x, map_y, map_z, map_width, map_depth = entry["map"]
            facility.name = entry["name"]
            facility.description = entry["description"]
            facility.sport_type = entry["sport_type"]
            facility.facility_kind = entry["facility_kind"]
            facility.zone = entry["zone"]
            facility.surface = entry["surface"]
            facility.capacity = entry["capacity"]
            facility.location_label = entry["location_label"]
            facility.is_bookable = entry.get("is_bookable", True)
            facility.is_active = True
            facility.facility_metadata = entry["metadata"]
            facility.map_x = Decimal(str(map_x))
            facility.map_y = Decimal(str(map_y))
            facility.map_z = Decimal(str(map_z))
            facility.map_width = Decimal(str(map_width))
            facility.map_depth = Decimal(str(map_depth))

            await session.flush()

            slot_minutes = entry["rate"]["minutes"] if entry.get("rate") else 60
            await _replace_schedules(session, facility.id, entry["schedules"], slot_minutes)
            await _replace_images(session, facility.id, entry["images"])
            await _ensure_rate(session, facility.id, entry["rate"])

            created, updated = (created + 1, updated) if is_new else (created, updated + 1)
            logger.info("%s %s", "created" if is_new else "updated", entry["slug"])

        await session.commit()
        logger.info("Seed complete: %s created, %s updated.", created, updated)


async def _replace_schedules(
    session, facility_id, schedules: list[dict], slot_minutes: int
) -> None:
    await session.execute(
        delete(FacilityScheduleModel).where(FacilityScheduleModel.facility_id == facility_id)
    )
    session.add_all(
        FacilityScheduleModel(
            facility_id=facility_id,
            weekday=item["weekday"],
            opens_at=item["opens_at"],
            closes_at=item["closes_at"],
            slot_minutes=item.get("slot_minutes", slot_minutes),
            is_active=True,
        )
        for item in schedules
    )


async def _replace_images(session, facility_id, images: list[tuple[str, str]]) -> None:
    await session.execute(
        delete(FacilityImageModel).where(FacilityImageModel.facility_id == facility_id)
    )
    session.add_all(
        FacilityImageModel(
            facility_id=facility_id, url=url, alt_text=alt_text, sort_order=order
        )
        for order, (url, alt_text) in enumerate(images)
    )


async def _ensure_rate(session, facility_id, rate: dict | None) -> None:
    """Las tarifas historicas no se borran: solo se agrega la vigente si falta."""
    if rate is None:
        return

    already_active = await session.scalar(
        select(func.count())
        .select_from(FacilityRateModel)
        .where(
            FacilityRateModel.facility_id == facility_id,
            FacilityRateModel.is_active.is_(True),
        )
    )
    if already_active:
        return

    session.add(
        FacilityRateModel(
            facility_id=facility_id,
            name=rate["name"],
            amount=rate["amount"],
            currency=settings.default_currency,
            minimum_minutes=rate["minutes"],
            valid_from=RATE_VALID_FROM,
            valid_until=None,
            is_active=True,
        )
    )


if __name__ == "__main__":
    asyncio.run(seed())
