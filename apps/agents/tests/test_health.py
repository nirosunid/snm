"""Smoke test for the FastAPI service."""

from fastapi.testclient import TestClient

from smn_agents.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "smn-agents"
