from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import OperationalError

from app.infrastructure.wait_database import wait_for_database


def test_startup_waits_for_database_recovery() -> None:
    engine = MagicMock()
    engine.connect.side_effect = [OperationalError("", {}, Exception()), MagicMock()]
    with patch("app.infrastructure.wait_database.time.sleep") as sleep:
        wait_for_database(engine)
    assert engine.connect.call_count == 2
    sleep.assert_called_once()


def test_startup_fails_with_bounded_timeout() -> None:
    engine = MagicMock()
    engine.connect.side_effect = OperationalError("", {}, Exception("private connection details"))
    with pytest.raises(RuntimeError, match="startup timeout") as error:
        wait_for_database(engine, timeout=0)
    assert "private" not in str(error.value)
    assert engine.connect.call_count == 1
