"""La regla critica del sistema: no puede haber dos reservas activas solapadas.

La aplicacion valida antes para dar un mensaje util, pero la garantia real es la
exclusion constraint `reservations_no_overlap` de PostgreSQL. Estas pruebas la
atacan directamente.
"""

import asyncio
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import issue_session_token
from app.domain.enums import ReservationStatus
from app.infrastructure.database import SessionLocal
from app.infrastructure.models import ReservationModel
from app.main import app
from tests.conftest import requires_database

pytestmark = requires_database


def period(hour: int = 18) -> tuple[datetime, datetime]:
    day = datetime.now(settings.timezone).date() + timedelta(days=1)
    start = datetime.combine(day, time(hour, 0), tzinfo=settings.timezone)
    return start, start + timedelta(hours=1)


def reservation_row(customer_id, facility_id, starts_at, ends_at, status) -> ReservationModel:
    return ReservationModel(
        id=uuid.uuid4(),
        customer_id=customer_id,
        facility_id=facility_id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=status,
        quoted_amount=Decimal("40.00"),
        currency="USD",
    )


class TestExclusionConstraint:
    async def test_postgres_rejects_an_overlapping_active_reservation(
        self, db_session, customer, facility
    ):
        starts_at, ends_at = period()
        db_session.add(
            reservation_row(
                customer.id, facility.id, starts_at, ends_at, ReservationStatus.PENDING
            )
        )
        await db_session.commit()

        db_session.add(
            reservation_row(
                customer.id,
                facility.id,
                starts_at + timedelta(minutes=30),
                ends_at + timedelta(minutes=30),
                ReservationStatus.CONFIRMED,
            )
        )

        with pytest.raises(IntegrityError) as failure:
            await db_session.commit()
        assert "reservations_no_overlap" in str(failure.value.orig)
        await db_session.rollback()

    async def test_cancelled_reservations_do_not_block_the_slot(
        self, db_session, customer, facility
    ):
        """Solo PENDING y CONFIRMED ocupan una franja."""
        starts_at, ends_at = period()
        db_session.add(
            reservation_row(
                customer.id, facility.id, starts_at, ends_at, ReservationStatus.CANCELLED
            )
        )
        db_session.add(
            reservation_row(
                customer.id, facility.id, starts_at, ends_at, ReservationStatus.COMPLETED
            )
        )
        await db_session.commit()

        db_session.add(
            reservation_row(
                customer.id, facility.id, starts_at, ends_at, ReservationStatus.PENDING
            )
        )
        await db_session.commit()  # no debe fallar

        total = await db_session.scalar(select(func.count()).select_from(ReservationModel))
        assert total == 3


class TestRaceCondition:
    async def test_two_simultaneous_requests_leave_exactly_one_reservation(
        self, db_session, customer, other_customer, facility
    ):
        """Dos peticiones compiten: una persiste, la otra recibe 409."""
        starts_at, ends_at = period()
        payload = {
            "facility_id": str(facility.id),
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
        }

        async def attempt(user) -> int:
            token, _ = issue_session_token(user.id, user.role)
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://testserver",
                cookies={settings.session_cookie_name: token},
            ) as http:
                response = await http.post("/v1/reservations", json=payload)
                return response.status_code

        results = await asyncio.gather(attempt(customer), attempt(other_customer))

        assert sorted(results) == [201, 409]
        async with SessionLocal() as session:
            total = await session.scalar(select(func.count()).select_from(ReservationModel))
        assert total == 1
