"""Wait for database recovery before attempting migrations (including compose restart)."""

import logging
import time

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import NullPool

from app.config import get_settings


def wait_for_database(engine: Engine, timeout: float = 60, interval: float = 1) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except OperationalError:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise RuntimeError(
                    "Database did not become available within the startup timeout."
                ) from None
            logging.getLogger(__name__).warning(
                "Waiting for database availability before migration"
            )
            time.sleep(min(interval, remaining))


def main() -> None:
    engine = create_engine(
        get_settings().database_url, poolclass=NullPool, connect_args={"connect_timeout": 5}
    )
    try:
        wait_for_database(engine)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
