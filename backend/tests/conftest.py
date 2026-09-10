import os
import uuid
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateSchema, DropSchema

from app import models  # noqa: F401
from app.infrastructure.database import Base


@pytest.fixture(
    params=["sqlite"] + (["postgresql"] if os.getenv("NODEBI_TEST_POSTGRES_URL") else [])
)
def db_engine(request: pytest.FixtureRequest) -> Iterator[Engine]:
    if request.param == "postgresql":
        # All mutations are confined to a fresh UUID schema, never public/product tables.
        schema = "nodebi_test_" + uuid.uuid4().hex
        url = os.environ["NODEBI_TEST_POSTGRES_URL"]
        admin = create_engine(url)
        with admin.begin() as connection:
            connection.execute(CreateSchema(schema))
        engine = create_engine(url, connect_args={"options": f"-csearch_path={schema}"})
        try:
            config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
            config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
            with engine.begin() as connection:
                config.attributes["connection"] = connection
                command.upgrade(config, "head")
            yield engine
        finally:
            engine.dispose()
            with admin.begin() as connection:
                connection.execute(DropSchema(schema, cascade=True))
            admin.dispose()
        return
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def session(db_engine: Engine) -> Iterator[Session]:
    with Session(db_engine, expire_on_commit=False) as database_session:
        yield database_session
