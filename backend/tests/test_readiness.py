from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api import health as health_module
from app.main import app

client = TestClient(app)


def test_readiness_returns_ready_when_database_responds(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(health_module, "check_database", lambda: None)

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readiness_returns_structured_failure(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    def fail() -> None:
        raise OperationalError("SELECT 1", {}, Exception("offline"))

    monkeypatch.setattr(health_module, "check_database", fail)

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {"code": "DATABASE_UNAVAILABLE", "message": "Database is not ready."}
    }
