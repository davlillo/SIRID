from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import FacilityScheduleModel


class ScheduleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_active(self, facility_id: UUID) -> list[FacilityScheduleModel]:
        rows = await self.session.scalars(
            select(FacilityScheduleModel)
            .where(
                FacilityScheduleModel.facility_id == facility_id,
                FacilityScheduleModel.is_active.is_(True),
            )
            .order_by(FacilityScheduleModel.weekday, FacilityScheduleModel.opens_at)
        )
        return list(rows.all())

    async def list_all(self, facility_id: UUID) -> list[FacilityScheduleModel]:
        rows = await self.session.scalars(
            select(FacilityScheduleModel)
            .where(FacilityScheduleModel.facility_id == facility_id)
            .order_by(FacilityScheduleModel.weekday, FacilityScheduleModel.opens_at)
        )
        return list(rows.all())

    async def replace_all(
        self, facility_id: UUID, schedules: list[FacilityScheduleModel]
    ) -> list[FacilityScheduleModel]:
        await self.session.execute(
            delete(FacilityScheduleModel).where(FacilityScheduleModel.facility_id == facility_id)
        )
        self.session.add_all(schedules)
        return schedules
