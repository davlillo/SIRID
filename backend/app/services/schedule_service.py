"""Horarios operativos semanales."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import InvalidSchedule
from app.domain.rules import OperatingWindow
from app.infrastructure.models import FacilityScheduleModel
from app.repositories.schedule_repository import ScheduleRepository


class ScheduleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.schedules = ScheduleRepository(session)

    async def operating_windows(self, facility_id: UUID) -> list[OperatingWindow]:
        """Traduce filas ORM a valores puros para las reglas de dominio."""
        rows = await self.schedules.list_active(facility_id)
        return [
            OperatingWindow(weekday=row.weekday, opens_at=row.opens_at, closes_at=row.closes_at)
            for row in rows
        ]

    async def list_all(self, facility_id: UUID) -> list[FacilityScheduleModel]:
        return await self.schedules.list_all(facility_id)

    async def replace(self, facility_id: UUID, entries: list[dict]) -> list[FacilityScheduleModel]:
        self._validate(entries)
        schedules = [
            FacilityScheduleModel(
                facility_id=facility_id,
                weekday=entry["weekday"],
                opens_at=entry["opens_at"],
                closes_at=entry["closes_at"],
                is_active=entry.get("is_active", True),
            )
            for entry in entries
        ]
        await self.schedules.replace_all(facility_id, schedules)
        await self.session.commit()
        return await self.schedules.list_all(facility_id)

    @staticmethod
    def _validate(entries: list[dict]) -> None:
        """Rechaza rangos invalidos y solapes dentro del mismo dia."""
        by_weekday: dict[int, list[tuple]] = {}
        for entry in entries:
            weekday = entry["weekday"]
            opens_at, closes_at = entry["opens_at"], entry["closes_at"]
            if not 0 <= weekday <= 6:
                raise InvalidSchedule("`weekday` must be between 0 (Monday) and 6 (Sunday).")
            if closes_at <= opens_at:
                raise InvalidSchedule("`closes_at` must be later than `opens_at`.")
            for other_open, other_close in by_weekday.get(weekday, []):
                if opens_at < other_close and other_open < closes_at:
                    raise InvalidSchedule(
                        f"Two schedules overlap on weekday {weekday}."
                    )
            by_weekday.setdefault(weekday, []).append((opens_at, closes_at))
