import pytest


def test_healthz_is_alive(client):
    response = client.get("/healthz/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_readyz_reports_database_ok(client):
    response = client.get("/readyz/")
    assert response.status_code == 200
    assert response.json()["database"] == "ok"