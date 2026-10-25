"""HU-07/08/09: startup seeds must not undo saved configuration."""

from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, Mock
from uuid import uuid4

import pytest

from app.infrastructure.models import FacilityModel
from app.seeds import seed_demo


@pytest.fixture
def seed_context(monkeypatch):
    session = AsyncMock()
    session.add = Mock()
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=session)
    context.__aexit__ = AsyncMock(return_value=False)
    monkeypatch.setattr(seed_demo, "SessionLocal", lambda: context)
    monkeypatch.setattr(seed_demo, "FACILITIES", deepcopy(seed_demo.FACILITIES[:1]))
    monkeypatch.setattr(seed_demo.OrganizationRepository, "get_bootstrap", AsyncMock(return_value=SimpleNamespace(id=uuid4())))
    schedules, images, rates = AsyncMock(), AsyncMock(), AsyncMock()
    monkeypatch.setattr(seed_demo, "_replace_schedules", schedules)
    monkeypatch.setattr(seed_demo, "_replace_images", images)
    monkeypatch.setattr(seed_demo, "_ensure_rate", rates)
    return session, schedules, images, rates


async def test_existing_facility_edits_and_deactivation_survive_repeated_seeding(seed_context):
    session, schedules, images, rates = seed_context
    facility = FacilityModel(
        id=uuid4(), name="Edited name", description="Edited description", capacity=7,
        is_active=False, is_bookable=False, location_label="Edited location",
        facility_metadata={"custom": True}, map_x=11, images=[], schedules=[], rates=[],
    )
    session.scalar.return_value = facility
    original = {key: value for key, value in facility.__dict__.items() if not key.startswith("_")}
    await seed_demo.seed()
    await seed_demo.seed()
    assert {key: value for key, value in facility.__dict__.items() if not key.startswith("_")} == original
    schedules.assert_not_awaited()
    images.assert_not_awaited()
    rates.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()


async def test_missing_facility_is_initialized_once_and_then_preserved(seed_context):
    session, schedules, images, rates = seed_context
    session.scalar.return_value = None
    await seed_demo.seed()
    session.add.assert_called_once()
    facility = session.add.call_args.args[0]
    assert facility.name == seed_demo.FACILITIES[0]["name"]
    assert facility.is_active is True
    schedules.assert_awaited_once()
    images.assert_awaited_once()
    rates.assert_awaited_once()
    session.scalar.return_value = facility
    facility.is_active = False
    await seed_demo.seed()
    assert facility.is_active is False
    session.add.assert_called_once()
    schedules.assert_awaited_once()
    images.assert_awaited_once()
    rates.assert_awaited_once()
