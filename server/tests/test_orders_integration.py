from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.orders.models import Order

ORDERS_URL = "/api/orders/"
GOOD_CARD = {"number": "4242424242424242", "exp_month": 12, "exp_year": 2099, "cvc": "123"}
DECLINED_CARD = {**GOOD_CARD, "number": "4000000000000002"}


def checkout(client, product, quantity, card=GOOD_CARD, **extra):
    body = {"items": [{"product": product.pk, "quantity": quantity}], "payment": card, **extra}
    return client.post(ORDERS_URL, body, format="json")


@pytest.mark.django_db
def test_checkout_requires_login(product):
    response = checkout(APIClient(), product, 1)
    assert response.status_code == 401


@pytest.mark.django_db
def test_successful_order_decrements_stock_and_computes_totals(api, product):
    response = checkout(api, product, 2)

    assert response.status_code == 201
    product.refresh_from_db()
    assert product.quantity == 8
    order = Order.objects.get()
    assert order.subtotal == Decimal("40.00")
    assert order.total_tax == Decimal("2.00")
    assert order.total == Decimal("42.00")
    assert order.card_last4 == "4242"
    assert "4242424242424242" not in response.content.decode()


@pytest.mark.django_db
def test_declined_card_leaves_no_order_and_no_stock_change(api, product):
    response = checkout(api, product, 2, card=DECLINED_CARD)

    assert response.status_code == 402
    assert response.json()["decline_code"] == "card_declined"
    assert Order.objects.count() == 0
    product.refresh_from_db()
    assert product.quantity == 10


@pytest.mark.django_db
def test_cannot_buy_more_than_stock(api, product):
    response = checkout(api, product, 11)

    assert response.status_code == 400
    assert Order.objects.count() == 0
    product.refresh_from_db()
    assert product.quantity == 10


@pytest.mark.django_db
def test_price_sent_by_client_is_ignored(api, product):
    response = checkout(api, product, 1, total="0.01")

    assert response.status_code == 201
    assert Order.objects.get().total == Decimal("21.00")


@pytest.mark.django_db
def test_shopper_cannot_see_another_shoppers_order(api, product, other_shopper):
    order_id = checkout(api, product, 1).json()["id"]

    intruder = APIClient()
    intruder.force_authenticate(user=other_shopper)
    assert intruder.get(f"{ORDERS_URL}{order_id}/").status_code == 404
