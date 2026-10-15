from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Product


@pytest.fixture
def shopper(db):
    return User.objects.create_user(email="shopper@example.com", password="Pass12345!")


@pytest.fixture
def other_shopper(db):
    return User.objects.create_user(email="other@example.com", password="Pass12345!")


@pytest.fixture
def api(shopper):
    client = APIClient()
    client.force_authenticate(user=shopper)
    return client


@pytest.fixture
def product(db):
    return Product.objects.create(
        sku="TEST-HOODIE-001",
        name="Test Hoodie",
        price=Decimal("20.00"),
        quantity=10,
        taxable=True,
    )
