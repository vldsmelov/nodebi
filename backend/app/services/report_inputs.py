"""Prepared inputs are shared graph outputs, never copied datasets or hidden recipes."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import PublishedOutput, ResultCatalog
from app.infrastructure.storage import StorageProvider
from app.models import DataSource, Workflow
from app.nodes import get_node_registry
from app.schemas.report_builder import (
    ReportInputChoice,
    ReportInputList,
    ReportInputRead,
    ReportSourceRequest,
)
from app.schemas.workflows import ResolvedColumnRead, WorkflowRead
from app.services.execution import ExecutionPlanner, InMemoryExecutionCache
from app.services.projects import ProjectService
from app.services.report_projection import as_graph
from app.services.source_updates import state_token
from app.services.workflow_validation import InvalidWorkflowError, WorkflowSchemaResolver
from app.services.workflows import execution_context, get_workflow, read_workflow


def choice(workflow: Workflow, output: PublishedOutput) -> ReportInputChoice:
    reason = None
    if output.kind != "dataset":
        reason = "Choose a table result. Scalar results can be displayed directly as KPI."
    elif output.context_ids:
        reason = "This result has view-context filters. Configure its reuse in the graph."
    return ReportInputChoice(
        workflow_id=workflow.id,
        publication_id=output.id,
        workflow_name=workflow.name,
        name=output.name,
        available=reason is None,
        reason=reason,
    )


class ReportInputService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings

    def resolve(
        self, project_id: uuid.UUID, request: ReportSourceRequest, name: str
    ) -> tuple[Workflow, WorkflowRead | None, PublishedOutput | None]:
        """Resolve one revision-guarded source without persisting a workflow."""
        if request.published_input:
            return self.load(
                project_id,
                request.published_input.workflow_id,
                request.published_input.publication_id,
                request.published_input.expected_token,
            )
        ProjectService(self.session).get(project_id)
        assert request.source_id is not None and request.resource_id is not None
        source = self.session.get(DataSource, request.source_id)
        if source is None or source.project_id != project_id:
            raise ApplicationError("SOURCE_NOT_FOUND", "Choose a dataset from this project.", 404)
        if source.source_metadata.get("active_snapshots", {}).get(request.resource_id) != str(
            request.expected_snapshot_id
        ):
            raise ApplicationError(
                "IMPORT_CONFLICT",
                "Data changed. Select the current dataset and preview again.",
                409,
            )
        return (
            Workflow(
                id=uuid.uuid5(request.request_id, "workflow_id"),
                project_id=project_id,
                name=name,
                parameters=[],
                revision=1,
            ),
            None,
            None,
        )

    def list(self, project_id: uuid.UUID) -> ReportInputList:
        ProjectService(self.session).get(project_id)
        workflows = self.session.scalars(
            select(Workflow).where(Workflow.project_id == project_id).order_by(Workflow.created_at)
        )
        return ReportInputList(
            items=[
                choice(workflow, output)
                for workflow in workflows
                for output in ResultCatalog.model_validate(workflow.result_catalog or {}).outputs
            ]
        )

    def load(
        self,
        project_id: uuid.UUID,
        workflow_id: uuid.UUID,
        publication_id: uuid.UUID,
        expected_token: str | None = None,
    ) -> tuple[Workflow, WorkflowRead, PublishedOutput]:
        ProjectService(self.session).lock(project_id)
        workflow = get_workflow(self.session, workflow_id)
        if workflow.project_id != project_id:
            raise ApplicationError(
                "PUBLICATION_NOT_FOUND", "Choose a prepared result in this project.", 404
            )
        saved = read_workflow(self.session, workflow)
        if expected_token is not None and expected_token != state_token(self.session, project_id):
            raise ApplicationError(
                "REPORT_INPUT_CONFLICT",
                "Prepared data changed. Reload input fields and preview again.",
                409,
            )
        output = next(
            (
                o
                for o in (saved.result_catalog or ResultCatalog()).outputs
                if o.id == publication_id
            ),
            None,
        )
        if output is None:
            raise ApplicationError(
                "PUBLICATION_NOT_FOUND", "Choose a prepared result in this project.", 404
            )
        selected = choice(workflow, output)
        if not selected.available:
            raise ApplicationError(
                "REPORT_INPUT_UNSUPPORTED", selected.reason or "Choose a table result."
            )
        if saved.presentation and any(
            output.node_id in block.node_ids
            and not any(
                p.node_id == output.node_id and p.port == output.port and p.column_id is None
                for p in block.outputs
            )
            for block in saved.presentation.blocks
        ):
            raise ApplicationError(
                "REPORT_INPUT_UNSUPPORTED",
                "Expose this table as a block output before using it in a report.",
            )
        return workflow, saved, output

    def read(
        self, project_id: uuid.UUID, workflow_id: uuid.UUID, publication_id: uuid.UUID
    ) -> ReportInputRead:
        workflow, saved, output = self.load(project_id, workflow_id, publication_id)
        registry = get_node_registry()
        context = execution_context(
            workflow, self.session, self.storage, self.settings, InMemoryExecutionCache()
        )
        try:
            branch = (
                ExecutionPlanner(registry)
                .plan(as_graph(saved, workflow_id, project_id), output.node_id)
                .graph
            )
            resolved = WorkflowSchemaResolver(registry).resolve(branch, context)
            errors = [issue for issue in resolved.issues if issue.severity == "error"]
            if errors:
                raise ValueError(errors[0].message)
            node = next((n for n in resolved.nodes if n.node_id == output.node_id), None)
            value = node.outputs.get(output.port) if node and node.outputs else None
            if value is None or value.table is None:
                raise ValueError("Configure the prepared table and its upstream calculation.")
        except (ValueError, InvalidWorkflowError) as exc:
            raise ApplicationError("REPORT_INPUT_UNAVAILABLE", str(exc)) from exc
        return ReportInputRead(
            **choice(workflow, output).model_dump(),
            expected_token=state_token(self.session, project_id),
            columns=[ResolvedColumnRead(**c.to_dict()) for c in value.table.columns],
            uses_parameters=bool(saved.parameters),
        )
