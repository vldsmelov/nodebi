import uuid
from io import BytesIO
from pathlib import Path

import pytest
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.domain.nodes import (
    DuplicateNodeDefinitionError,
    ExecutionContext,
    NodeRegistry,
    UnknownNodeTypeError,
)
from app.domain.workflows import NodeInstance, Position
from app.infrastructure.storage import LocalStorageProvider
from app.models import DataSource, Project, Workflow
from app.nodes.excel_source import excel_source_definition
from app.services.source_access import ProjectSourceAccess


def test_registry_is_versioned_and_protects_duplicates() -> None:
    registry = NodeRegistry()
    definition = excel_source_definition()
    registry.register(definition)

    assert registry.get("excel_source", 1) is definition
    assert registry.catalog() == (definition,)
    with pytest.raises(DuplicateNodeDefinitionError):
        registry.register(definition)
    with pytest.raises(UnknownNodeTypeError):
        registry.get("excel_source", 2)


def test_excel_source_validates_infers_and_executes(session: Session, tmp_path: Path) -> None:
    storage = LocalStorageProvider(tmp_path)
    workbook_file = Workbook()
    sheet = workbook_file.active
    sheet.title = "Sales"
    sheet.append(["country", "quantity"])
    sheet.append(["Korea", 2])
    content = BytesIO()
    workbook_file.save(content)
    workbook_file.close()
    content.seek(0)
    key = storage.save(content, suffix=".xlsx")
    project = Project(id=uuid.uuid4(), name="Sales")
    workflow = Workflow(id=uuid.uuid4(), project_id=project.id, name="Main")
    source = DataSource(
        id=uuid.uuid4(),
        project_id=project.id,
        type="excel",
        name="Sales",
        original_filename="sales.xlsx",
        storage_key=key,
        file_size=len(content.getvalue()),
        status="ready",
        source_metadata={"workbook": {"sheets": []}},
    )
    session.add(project)
    session.flush()
    session.add_all([workflow, source])
    session.commit()
    node = NodeInstance(
        uuid.uuid4(),
        "excel_source",
        1,
        Position(0, 0),
        {"source_id": str(source.id), "sheet_name": "Sales"},
    )
    context = ExecutionContext(
        project.id, workflow.id, uuid.uuid4(), ProjectSourceAccess(project.id, session, storage)
    )
    executor = excel_source_definition().executor

    assert executor.validate(node, {}, context).valid
    assert executor.infer_schema(node, {}, context).by_id("col_2").engine_name == "quantity"
    result = executor.execute(node, {}, context)
    assert result.row_count == 1
    assert result.frame["country"].to_list() == ["Korea"]
