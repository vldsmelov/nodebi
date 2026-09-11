import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from test_workflows_api import client_for

from app.main import app


def test_invalid_requests_and_unexpected_errors_are_diagnosable(
    db_engine: Engine, caplog: pytest.LogCaptureFixture
) -> None:
    client_for(db_engine)
    client = TestClient(app, raise_server_exceptions=False)
    try:
        invalid = client.get("/api/v1/projects/not-a-uuid")
        assert invalid.status_code == 422
        assert invalid.json()["detail"]["issues"][0]["field"] == "path.project_id"
        malformed = client.post(
            "/api/v1/projects", content="{", headers={"Content-Type": "application/json"}
        )
        assert malformed.status_code == 422
        assert malformed.json()["detail"]["code"] == "INVALID_REQUEST"
        missing = client.get(f"/api/v1/projects/{uuid.uuid4()}")
        assert missing.status_code == 404
        with patch(
            "app.services.projects.ProjectService.list",
            side_effect=RuntimeError("private internals"),
        ):
            failure = client.get("/api/v1/projects", headers={"Origin": "http://localhost:3000"})
        assert failure.status_code == 500
        assert failure.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert "private internals" not in failure.text
        correlation_id = failure.json()["detail"]["correlation_id"]
        uuid.UUID(correlation_id)
        assert any(
            getattr(record, "correlation_id", None) == correlation_id for record in caplog.records
        )
    finally:
        app.dependency_overrides.clear()
