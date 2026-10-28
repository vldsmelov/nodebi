"""Owned temporary HTTP server shared by acceptance tests and benchmarks."""

import os
import socket
import subprocess
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import httpx

SERVER = """
import sys
from app import models
from app.infrastructure.database import Base, engine
if engine.dialect.name == "postgresql":
    from alembic import command
    from alembic.config import Config
    command.upgrade(Config("alembic.ini"), "head")
else:
    Base.metadata.create_all(engine)
import uvicorn
uvicorn.run("app.main:app", host="127.0.0.1", port=int(sys.argv[1]),
            log_level="warning", access_log=False)
"""


@contextmanager
def process_client(
    workspace: Path, *, timeout: float = 30, database_url: str | None = None
) -> Iterator[httpx.Client]:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    env = {
        **os.environ,
        "DATABASE_URL": database_url or f"sqlite:///{workspace / 'restart.db'}",
        "STORAGE_ROOT": str(workspace / "artifacts"),
        "PYTHONIOENCODING": "utf-8",
    }
    # Only this owned subprocess is stopped; no discovery/termination of existing services.
    process = subprocess.Popen(
        [sys.executable, "-c", SERVER, str(port)],
        cwd=Path(__file__).parents[1],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        with httpx.Client(
            base_url=f"http://127.0.0.1:{port}", timeout=timeout, trust_env=False
        ) as client:
            deadline = time.monotonic() + 20
            while True:
                if process.poll() is not None:
                    raise AssertionError(process.communicate()[1].decode(errors="replace"))
                try:
                    if client.get("/health", timeout=0.5).status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                assert time.monotonic() < deadline, "Acceptance API did not become ready"
                time.sleep(0.05)
            yield client
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate(timeout=5)
