"""Infraestructura de pruebas de integracion.

Corren contra PostgreSQL real porque la regla critica del sistema (la exclusion
constraint anti-solapamiento) no existe fuera de PostgreSQL.
"""

import os
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.api.auth import get_google_verifier
from app.api.deps import RATE_LIMITERS
from app.core.config import settings
from app.core.security import issue_session_token
from app.domain.enums import UserRole, Zone
from app.infrastructure.database import SessionLocal, engine
from app.infrastructure.google_identity import GoogleIdentity
from app.infrastructure.models import (
    FacilityModel,
    FacilityRateModel,
    FacilityScheduleModel,
    UserModel,
)
from app.main import app

TABLES = (
    "notification_logs",
    "reservation_events",
    "reservations",
    "facility_rates",
    "facility_schedules",
    "facility_images",
    "facilities",
    "users",
)

requires_database = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="Requiere PostgreSQL; se define DATABASE_URL en docker compose.",
)


class FakeGoogleVerifier:
    """Sustituye la verificacion real sin cambiar el servicio."""

    def __init__(self) -> None:
        self.identity = GoogleIdentity(
            subject="google-subject-001",
            email="cliente@davlillos.test",
            name="Cliente Demo",
            picture=None,
        )
        self.should_fail = False

    def verify(self, credential: str) -> GoogleIdentity:
        from app.domain.errors import InvalidGoogleCredential

        if self.should_fail or credential == "invalid-token-value":
            raise InvalidGoogleCredential("The Google credential could not be verified.")
        return self.identity


@pytest_asyncio.fixture(autouse=True)
async def reset_engine_pool():
    """Devuelve el pool vacio al terminar cada prueba.

    El engine se crea al importar el modulo y pytest-asyncio abre un event loop
    por prueba. Una conexion asyncpg queda ligada al loop que la creo, asi que
    reutilizarla en el siguiente loop revienta con 'attached to a different
    loop'. Vaciar el pool obliga a abrir conexiones nuevas en cada loop.
    """
    for limiter in RATE_LIMITERS:
        # El rate limit guarda estado en memoria del proceso: sin limpiarlo, una
        # prueba agota la cuota de las siguientes.
        limiter.reset()
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    async with SessionLocal() as session:
        # Si otra transaccion dejo la tabla bloqueada preferimos fallar rapido
        # antes que colgar la suite entera esperando el ACCESS EXCLUSIVE.
        await session.execute(text("SET lock_timeout = '10s'"))
        await session.execute(
            text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE")
        )
        await session.commit()
        yield session


@pytest.fixture
def google_verifier() -> FakeGoogleVerifier:
    return FakeGoogleVerifier()


@pytest_asyncio.fixture
async def client(db_session, google_verifier):
    app.dependency_overrides[get_google_verifier] = lambda: google_verifier
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http:
        yield http
    app.dependency_overrides.clear()


def authenticate(http: AsyncClient, user: UserModel) -> None:
    """Instala la cookie de sesion firmada por el backend."""
    token, _ = issue_session_token(user.id, user.role)
    http.cookies.set(settings.session_cookie_name, token)


@pytest_asyncio.fixture
async def customer(db_session) -> UserModel:
    return await _create_user(db_session, "cliente@davlillos.test", UserRole.CLIENT)


@pytest_asyncio.fixture
async def other_customer(db_session) -> UserModel:
    return await _create_user(db_session, "otro@davlillos.test", UserRole.CLIENT)


@pytest_asyncio.fixture
async def admin(db_session) -> UserModel:
    return await _create_user(db_session, "admin@davlillos.test", UserRole.ADMIN)


async def _create_user(session, email: str, role: UserRole) -> UserModel:
    user = UserModel(
        id=uuid.uuid4(),
        google_subject=f"subject-{email}",
        email=email,
        name=email.split("@")[0].title(),
        role=role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def facility(db_session) -> FacilityModel:
    """Cancha abierta los siete dias, 06:00-22:00, con tarifa por hora."""
    return await make_facility(db_session, "cancha-de-prueba", "Cancha de Prueba")


@pytest_asyncio.fixture
async def twin_facility(db_session) -> FacilityModel:
    """Gemela de `facility`: misma agenda, instalacion distinta."""
    return await make_facility(db_session, "cancha-de-prueba-b", "Cancha de Prueba B")


async def make_facility(session, slug: str, name: str, **overrides) -> FacilityModel:
    model = FacilityModel(
        id=uuid.uuid4(),
        slug=slug,
        name=name,
        description="Instalacion usada por la suite de pruebas de integracion.",
        sport_type="FOOTBALL_7",
        facility_kind="FIELD",
        zone=Zone.FUTBOL,
        surface="SYNTHETIC_GRASS",
        capacity=14,
        location_label="Zona de Pruebas",
        is_bookable=True,
        is_active=True,
        facility_metadata={},
        **overrides,
    )
    session.add(model)
    await session.flush()

    session.add_all(
        FacilityScheduleModel(
            facility_id=model.id,
            weekday=weekday,
            opens_at=time(6, 0),
            closes_at=time(22, 0),
            is_active=True,
        )
        for weekday in range(7)
    )
    session.add(
        FacilityRateModel(
            facility_id=model.id,
            name="Hora estandar",
            amount=Decimal("40.00"),
            currency="USD",
            minimum_minutes=60,
            valid_from=date(2020, 1, 1),
            is_active=True,
        )
    )
    await session.commit()
    await session.refresh(model)
    return model


@pytest.fixture
def next_slot() -> tuple[str, str]:
    """Un bloque de una hora, manana a las 18:00 hora del complejo."""
    tomorrow = datetime.now(settings.timezone).date() + timedelta(days=1)
    start = datetime.combine(tomorrow, time(18, 0), tzinfo=settings.timezone)
    return start.isoformat(), (start + timedelta(hours=1)).isoformat()


@pytest.fixture
def utc_now() -> datetime:
    return datetime.now(timezone.utc)
