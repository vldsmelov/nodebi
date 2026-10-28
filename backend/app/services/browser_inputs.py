"""Read existing Excel layouts without migrating legacy projects or their field IDs."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ApplicationError
from app.domain.ingestion import ImportField, ImportProfile, ReadOptions
from app.domain.workbooks import WorksheetLayout
from app.infrastructure.excel import OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider
from app.models import DataSource, Workflow, WorkflowNode
from app.nodes.excel_source import ExcelSourceConfig


def legacy_profiles(
    session: Session, storage: StorageProvider, source: DataSource
) -> list[ImportProfile]:
    if source.source_metadata.get("periods"):
        raise ApplicationError(
            "BROWSER_EDITOR_UNAVAILABLE",
            "This source combines several periods. Edit its original files separately.",
            409,
        )
    layouts: dict[str, WorksheetLayout] = {}
    for node in session.scalars(
        select(WorkflowNode).join(Workflow).where(Workflow.project_id == source.project_id)
    ):
        if node.node_type not in {"excel_source", "excel_periods"} or str(
            node.config.get("source_id")
        ) != str(source.id):
            continue
        config = ExcelSourceConfig.model_validate(node.config)
        layout = config.layout()
        if config.sheet_name in layouts and layouts[config.sheet_name] != layout:
            raise ApplicationError(
                "BROWSER_EDITOR_UNAVAILABLE",
                "This worksheet has several reading layouts. Edit the original file instead.",
                409,
            )
        layouts[config.sheet_name] = layout
    reader = OpenPyxlWorkbookReader(storage)
    if not layouts:
        layouts = {
            sheet.name: WorksheetLayout() for sheet in reader.inspect(source.storage_key).sheets
        }
    profiles = []
    for name, layout in layouts.items():
        if (
            layout.header_rows != 1
            or layout.skip_data_rows
            or layout.drop_tail_rows
            or layout.cell_range
        ):
            raise ApplicationError(
                "BROWSER_EDITOR_UNAVAILABLE",
                "This source uses a complex range or header. "
                "Download and edit the current file instead.",
                409,
            )
        data = reader.load_sheet(source.storage_key, name, layout)
        fields = [
            ImportField(
                field_id=uuid.uuid5(source.id, f"{name}:{column.column_id}").hex,
                source_field=f"col_{int(column.metadata['source_position']) + 1}",
                name=column.engine_name,
                logical_type=column.logical_type,
                nullable=True,
            )
            for column in data.schema.columns
            if "source_position" in column.metadata
        ]
        if fields:
            profiles.append(
                ImportProfile(
                    resource_id=name,
                    name=name[:200],
                    options=ReadOptions(header_row=layout.header_row),
                    fields=fields,
                )
            )
    if not profiles:
        raise ApplicationError(
            "BROWSER_EDITOR_UNAVAILABLE", "This workbook has no editable tables.", 409
        )
    return profiles
