from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.infrastructure.database import Base


def test_postgresql_migrations_preserve_old_counters_and_match_models(db_engine: Engine) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Migration DDL is validated on PostgreSQL")
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
    with db_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "20260904_0001")
        connection.execute(
            text(
                "INSERT INTO projects(id, name) VALUES "
                "('00000000-0000-0000-0000-000000000001', 'Old project')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO workflows(id, project_id, name, version) VALUES "
                "('00000000-0000-0000-0000-000000000002', "
                "'00000000-0000-0000-0000-000000000001', 'Old graph', 7)"
            )
        )
        command.upgrade(config, "head")
        assert connection.execute(text("SELECT parameters FROM workflows")).scalar_one() == []
        assert tuple(connection.execute(text("SELECT version, revision FROM workflows")).one()) == (
            1,
            7,
        )
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
