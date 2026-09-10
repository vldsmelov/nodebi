import uuid
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import polars as pl
import pytest
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.nodes import ExecutionContext
from app.domain.workflows import NodeInstance, Position, WorkflowGraph
from app.infrastructure.excel import OpenPyxlWorkbookReader
from app.infrastructure.storage import LocalStorageProvider
from app.models import DataSource, Project, Workflow
from app.nodes import get_node_registry
from app.services.execution import (
    ExecutionFailure,
    InMemoryExecutionCache,
    WorkflowExecutionService,
)
from app.services.source_access import ProjectSourceAccess


def test_cache_evicts_by_bytes_and_does_not_retain_oversized_frames() -> None:
    schema = DatasetSchema((ColumnSchema("x", "x", "X", LogicalType.INTEGER, False),))
    small = Dataset(pl.DataFrame({"x": [1, 2]}), schema)
    large = Dataset(pl.DataFrame({"x": list(range(100))}), schema)
    cache = InMemoryExecutionCache(capacity=10, max_bytes=20)
    cache.put("a", small)
    cache.put("b", small)
    assert cache.get("a") is None
    assert cache.get("b") is small
    cache.put("large", large)
    assert cache.get("large") is None
    assert cache.used_bytes <= 20
    cache.clear()
    assert cache.used_bytes == 0


def test_source_schema_reuses_materialization_but_hits_still_validate_ownership_and_files(
    session: Session,
    tmp_path: Path,
) -> None:
    storage = LocalStorageProvider(tmp_path)
    workbook = Workbook()
    workbook.active.append(["value"])
    workbook.active.append([42])
    content = BytesIO()
    workbook.save(content)
    content.seek(0)
    key = storage.save(content, suffix=".xlsx")
    project = Project(name="Cache safety")
    session.add(project)
    session.flush()
    workflow = Workflow(project_id=project.id, name="Main")
    source = DataSource(
        project_id=project.id,
        type="excel",
        name="Source",
        original_filename="book.xlsx",
        storage_key=key,
        file_size=len(content.getvalue()),
        status="ready",
        source_metadata={"workbook": {"sheets": [{"name": "Sheet"}]}},
    )
    session.add_all([workflow, source])
    session.commit()
    node = NodeInstance(
        uuid.uuid4(),
        "excel_source",
        1,
        Position(0, 0),
        {"source_id": str(source.id), "sheet_name": "Sheet"},
    )
    graph = WorkflowGraph(workflow.id, project.id, "Main", 1, (node,), ())
    cache = InMemoryExecutionCache()
    service = WorkflowExecutionService(get_node_registry())

    def context(project_id: uuid.UUID) -> ExecutionContext:
        return ExecutionContext(
            project_id,
            workflow.id,
            uuid.uuid4(),
            ProjectSourceAccess(project_id, session, storage, cache),
            cache,
        )

    with patch.object(
        OpenPyxlWorkbookReader,
        "load_sheet",
        autospec=True,
        side_effect=OpenPyxlWorkbookReader.load_sheet,
    ) as load:
        access = context(project.id)
        assert access.sources is not None
        access.sources.schema(source.id, "Sheet")
        assert service.execute(graph, node.id, access).output.row_count == 1
        assert service.execute(graph, node.id, context(project.id)).metadata["cache_hits"] == 1
        assert load.call_count == 1
    with pytest.raises(ExecutionFailure):
        service.execute(graph, node.id, context(uuid.uuid4()))
    storage.delete(key)
    with pytest.raises(ExecutionFailure):
        service.execute(graph, node.id, context(project.id))
