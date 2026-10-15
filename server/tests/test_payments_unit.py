from datetime import date
from decimal import Decimal

import pytest

from apps.orders import payments
from apps.orders.services import money, tax_for


@pytest.mark.parametrize(
    "number, expected",
    [
        ("4242424242424242", True),
        ("4242 4242 4242 4242", True),
        ("4242-4242-4242-4242", True),
        ("4242424242424241", False),
        ("1234", False),
        ("", False),
    ],
)
def test_luhn_valid(number, expected):
    assert payments.luhn_valid(number) is expected


@pytest.mark.parametrize("number, brand", list(payments.APPROVE_CARDS.items()))
def test_documented_approve_cards_are_valid_and_branded(number, brand):
    assert payments.luhn_valid(number)
    assert payments.card_brand(number) == brand


@pytest.mark.parametrize(
    "number, expected",
    [("378282246310005", 4), ("4242424242424242", 3), ("5555555555554444", 3)],
)
def test_cvc_length_depends_on_brand(number, expected):
    assert payments.cvc_length_for(number) == expected


def test_card_is_valid_until_end_of_expiry_month():
    today = date(2026, 10, 15)
    assert payments.has_expired(10, 2026, today=today) is False
    assert payments.has_expired(9, 2026, today=today) is True
    assert payments.has_expired(1, 2027, today=today) is False


def test_authorise_approves_and_never_returns_full_number():
    charge = payments.authorise("4242 4242 4242 4242", 12, 2099, "123", "10.00")
    assert charge.brand == "visa"
    assert charge.last4 == "4242"
    assert "4242424242424242" not in str(charge)


@pytest.mark.parametrize(
    "number, code", [(n, c) for n, (c, _) in payments.DECLINE_CARDS.items()]
)
def test_authorise_declines_test_cards_with_402(number, code):
    with pytest.raises(payments.PaymentDeclined) as excinfo:
        payments.authorise(number, 12, 2099, "123", "10.00")
    assert excinfo.value.decline_code == code
    assert excinfo.value.status_code == 402


def test_authorise_rejects_wrong_cvc_length_for_amex():
    with pytest.raises(payments.PaymentDeclined) as excinfo:
        payments.authorise("378282246310005", 12, 2099, "123", "10.00")
    assert excinfo.value.decline_code == "incorrect_cvc"


def test_money_rounds_half_up_to_cents():
    assert money("2.345") == Decimal("2.35")
    assert money("2.344") == Decimal("2.34")


def test_tax_applies_only_to_taxable_items(settings):
    settings.SALES_TAX_RATE = 0.05
    assert tax_for(Decimal("100.00"), taxable=True) == Decimal("5.00")
    assert tax_for(Decimal("100.00"), taxable=False) == Decimal("0.00")
