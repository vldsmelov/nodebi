"""Isolated browser acceptance server; never connects to the user's project database.

Run with the backend venv from backend/. The temporary database and artifacts are
automatically discarded on a normal shutdown. PostgreSQL migrations run separately.
"""

import argparse
import os
from pathlib import Path
from tempfile import TemporaryDirectory


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--frontend-port", type=int, default=3010)
    args = parser.parse_args()
    if not all(1 <= port <= 65535 for port in (args.port, args.frontend_port)):
        parser.error("Ports must be between 1 and 65535.")
    with TemporaryDirectory(prefix="nodebi-evolution-") as directory:
        root = Path(directory)
        os.environ["DATABASE_URL"] = f"sqlite:///{root / 'acceptance.db'}"
        os.environ["STORAGE_ROOT"] = str(root / "sources")
        os.environ["CORS_ORIGINS"] = (
            f'["http://localhost:{args.frontend_port}","http://127.0.0.1:{args.frontend_port}"]'
        )
        import uvicorn
        from sqlalchemy import event

        from app import models  # noqa: F401
        from app.infrastructure.database import Base, engine
        from app.main import app

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record):  # type: ignore[no-untyped-def]
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(engine)
        try:
            uvicorn.run(app, host="127.0.0.1", port=args.port)
        finally:
            engine.dispose()


if __name__ == "__main__":
    main()
