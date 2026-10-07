"""Horarios operativos semanales."""

from datetime import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import InvalidSchedule
from app.domain.rules import OperatingWindow
from app.infrastructure.models import FacilityScheduleModel
from app.repositories.schedule_repository import ScheduleRepository

WEEKDAY_NAMES = ("Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo")
MINUTES_PER_DAY = 24 * 60


def _minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _close_minutes(value: time) -> int:
    """Un cierre a las 00:00 significa medianoche al final del dia."""
    return MINUTES_PER_DAY if value == time.min else _minutes(value)


def _label(opens_at: time, closes_at: time) -> str:
    return f"{opens_at.strftime('%H:%M')}-{closes_at.strftime('%H:%M')}"


class ScheduleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.schedules = ScheduleRepository(session)

    async def operating_windows(self, facility_id: UUID) -> list[OperatingWindow]:
        """Traduce filas ORM a valores puros para las reglas de dominio."""
        rows = await self.schedules.list_active(facility_id)
        return [
            OperatingWindow(
                weekday=row.weekday,
                opens_at=row.opens_at,
                closes_at=row.closes_at,
                slot_minutes=row.slot_minutes,
            )
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
                slot_minutes=entry.get("slot_minutes", 60),
                is_active=entry.get("is_active", True),
            )
            for entry in entries
        ]
        await self.schedules.replace_all(facility_id, schedules)
        await self.session.commit()
        return await self.schedules.list_all(facility_id)

    @staticmethod
    def _validate(entries: list[dict]) -> None:
        """Rechaza rangos invalidos y solapes dentro del mismo dia.

        Nada se guarda si una sola entrada es invalida: el reemplazo es atomico.
        """
        by_weekday: dict[int, list[tuple[time, time]]] = {}
        for entry in entries:
            weekday = entry["weekday"]
            opens_at, closes_at = entry["opens_at"], entry["closes_at"]
            slot = entry.get("slot_minutes", 60)
            if not 0 <= weekday <= 6:
                raise InvalidSchedule("El dia debe estar entre 0 (lunes) y 6 (domingo).")

            day = WEEKDAY_NAMES[weekday]
            label = _label(opens_at, closes_at)
            start, end = _minutes(opens_at), _close_minutes(closes_at)
            if end <= start:
                raise InvalidSchedule(
                    f"El horario del {day} {label} debe cerrar despues de abrir."
                )
            if slot < 15 or slot > MINUTES_PER_DAY or slot % 15:
                raise InvalidSchedule(
                    "La duracion del prestamo debe ser un multiplo de 15 minutos."
                )
            if end - start < slot:
                raise InvalidSchedule(
                    f"El horario del {day} {label} es mas corto que un bloque de {slot} minutos."
                )

            if entry.get("is_active", True):
                for other_open, other_close in by_weekday.get(weekday, []):
                    if start < _close_minutes(other_close) and _minutes(other_open) < end:
                        raise InvalidSchedule(
                            f"Los horarios del {day} {_label(other_open, other_close)} "
                            f"y {label} se superponen."
                        )
                by_weekday.setdefault(weekday, []).append((opens_at, closes_at))
