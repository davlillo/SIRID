from datetime import date
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import FacilityRateModel


class RateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def active_on(self, facility_id: UUID, on_date: date) -> FacilityRateModel | None:
        """Tarifa vigente en una fecha. Ante empate gana la de inicio mas reciente."""
        return await self.session.scalar(
            select(FacilityRateModel)
            .where(
                FacilityRateModel.facility_id == facility_id,
                FacilityRateModel.is_active.is_(True),
                FacilityRateModel.valid_from <= on_date,
                or_(
                    FacilityRateModel.valid_until.is_(None),
                    FacilityRateModel.valid_until >= on_date,
                ),
            )
            .order_by(FacilityRateModel.valid_from.desc(), FacilityRateModel.amount.asc())
            .limit(1)
        )

    async def list_for_facility(self, facility_id: UUID) -> list[FacilityRateModel]:
        rows = await self.session.scalars(
            select(FacilityRateModel)
            .where(FacilityRateModel.facility_id == facility_id)
            .order_by(FacilityRateModel.valid_from.desc())
        )
        return list(rows.all())

    def add(self, rate: FacilityRateModel) -> FacilityRateModel:
        self.session.add(rate)
        return rate
