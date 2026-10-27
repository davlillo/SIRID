"""HU-04/10 require a real payment; new tariffs match the UI's positive minimum."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.domain.errors import InsufficientPayment, InvalidRate
from app.domain.rules import Interval, assert_sufficient_payment
from app.schemas.facility import RateCreate, RatePublishRequest
from app.services.rate_service import RateService


@pytest.mark.parametrize("amount", ["0", "-1"])
def test_api_tariff_inputs_reject_nonpositive_prices(amount):
    with pytest.raises(ValidationError):
        RateCreate(name="General", amount=amount, minimum_minutes=60, valid_from=date.today())
    with pytest.raises(ValidationError):
        RatePublishRequest(amount=amount, effective_from=date.today())


def test_one_cent_remains_a_valid_price():
    assert RateCreate(
        name="General", amount="0.01", minimum_minutes=60, valid_from=date.today(),
    ).amount == Decimal("0.01")
    assert RatePublishRequest(amount="0.01", effective_from=date.today()).amount == Decimal("0.01")


@pytest.mark.parametrize("amount", [Decimal("0"), Decimal("-1")])
async def test_service_cannot_bypass_positive_price_validation(amount):
    session = AsyncMock()
    service = RateService(session)
    with pytest.raises(InvalidRate):
        await service.create(uuid4(), {"amount": amount})
    with pytest.raises(InvalidRate):
        await service.publish_update(
            uuid4(), amount=amount, effective_from=datetime.now(settings.timezone).date(),
        )
    session.commit.assert_not_awaited()


async def test_legacy_zero_tariff_cannot_create_new_zero_cost_reservations():
    session = AsyncMock()
    service = RateService(session)
    service.rates.active_on = AsyncMock(return_value=SimpleNamespace(amount=Decimal("0")))
    start = datetime.now(settings.timezone) + timedelta(days=1)
    with pytest.raises(InvalidRate, match="actualice"):
        await service.quote(uuid4(), Interval(start, start + timedelta(hours=1)))
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("required", [Decimal("0"), Decimal("40")])
def test_no_payment_never_allows_confirmation(required):
    with pytest.raises(InsufficientPayment, match="registrar un pago"):
        assert_sufficient_payment(Decimal("0"), required)


def test_paid_reservations_keep_the_existing_sufficient_payment_rule():
    assert_sufficient_payment(Decimal("40"), Decimal("40"))
    with pytest.raises(InsufficientPayment):
        assert_sufficient_payment(Decimal("10"), Decimal("40"))
