"""Named fields reference existing calculations; reuse never reaggregates prepared values."""

import hashlib
import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.publications import MeasureDefinition, ResultCatalog
from app.domain.visualizations import VisualizationConfig
from app.infrastructure.storage import StorageProvider
from app.models import Dashboard, DashboardWidget, ReportDocument, Visualization, Workflow
from app.nodes import get_node_registry
from app.schemas.dashboards import VisualizationResult
from app.schemas.measures import MeasureEntry, MeasureList, MeasureReportRequest, MeasureSave
from app.schemas.report_builder import ReportBuildResult
from app.schemas.workflows import WorkflowSave
from app.services.execution import InMemoryExecutionCache
from app.services.projects import ProjectService
from app.services.report_inputs import ReportInputService
from app.services.source_updates import state_token
from app.services.visualizations import render_visualization
from app.services.workflows import get_workflow, read_workflow, save_graph


def measure_config(definition: MeasureDefinition, name: str) -> VisualizationConfig:
    return VisualizationConfig(
        title=name,
        value_column_id=definition.column_id,
        category_column_id=definition.grain_column_ids[0] if definition.grain_column_ids else None,
        column_ids=[*definition.grain_column_ids, definition.column_id],
        grain_column_ids=definition.grain_column_ids,
    )


class MeasureService:
    def __init__(self, session: Session, storage: StorageProvider, settings: Settings) -> None:
        self.session, self.storage, self.settings = session, storage, settings
        self.inputs = ReportInputService(session, storage, settings)

    def list(self, project_id: uuid.UUID) -> MeasureList:
        ProjectService(self.session).lock(project_id)
        workflows = self.session.scalars(
            select(Workflow).where(Workflow.project_id == project_id).order_by(Workflow.created_at)
        )
        return MeasureList(
            expected_token=state_token(self.session, project_id),
            items=[
                MeasureEntry(
                    workflow_id=w.id,
                    publication_id=o.id,
                    workflow_name=w.name,
                    publication_name=o.name,
                    definition=m,
                )
                for w in workflows
                for o in ResultCatalog.model_validate(w.result_catalog or {}).outputs
                for m in o.measures
            ],
        )

    def remove(
        self,
        project_id: uuid.UUID,
        workflow_id: uuid.UUID,
        publication_id: uuid.UUID,
        measure_id: uuid.UUID,
        expected_token: str,
    ) -> None:
        ProjectService(self.session).lock(project_id)
        workflow = get_workflow(self.session, workflow_id)
        if workflow.project_id != project_id:
            raise ApplicationError(
                "MEASURE_NOT_FOUND", "Select an available reusable measure.", 404
            )
        saved = read_workflow(self.session, workflow)
        if expected_token != state_token(self.session, project_id):
            raise ApplicationError(
                "MEASURE_CONFLICT", "The measure catalog changed. Reload before saving.", 409
            )
        output = next(
            (
                o
                for o in (saved.result_catalog or ResultCatalog()).outputs
                if o.id == publication_id
            ),
            None,
        )
        if output is None or not any(m.id == measure_id for m in output.measures):
            raise ApplicationError(
                "MEASURE_NOT_FOUND", "Select an available reusable measure.", 404
            )
        output.measures = [m for m in output.measures if m.id != measure_id]
        save_graph(
            self.session,
            workflow,
            WorkflowSave(
                name=saved.name,
                expected_revision=saved.revision,
                format_version=3,
                nodes=saved.nodes,
                edges=saved.edges,
                parameters=saved.parameters,
                presentation=saved.presentation,
                result_catalog=saved.result_catalog,
            ),
            get_node_registry(),
        )

    def render(self, draft: Visualization) -> VisualizationResult:
        return render_visualization(
            self.session,
            draft.id,
            get_node_registry(),
            self.storage,
            self.settings,
            InMemoryExecutionCache(),
            limit=50,
            draft=draft,
        )

    def save(
        self,
        project_id: uuid.UUID,
        workflow_id: uuid.UUID,
        publication_id: uuid.UUID,
        request: MeasureSave,
    ) -> MeasureEntry:
        workflow, saved, output = self.inputs.load(
            project_id, workflow_id, publication_id, request.expected_token
        )
        existing = next((m for m in output.measures if m.id == request.definition.id), None)
        if existing and (
            existing.column_id != request.definition.column_id
            or existing.grain_column_ids != request.definition.grain_column_ids
        ):
            raise ApplicationError(
                "MEASURE_CONFLICT", "Create another definition to change its field or grain.", 409
            )
        definition = request.definition
        self.render(
            Visualization(
                id=definition.id,
                project_id=project_id,
                workflow_id=workflow_id,
                source_node_id=output.node_id,
                publication_id=publication_id,
                name=definition.name,
                type="table",
                revision=1,
                config=measure_config(definition, definition.name).model_dump(mode="json"),
            )
        )
        output.measures = [m for m in output.measures if m.id != definition.id] + [definition]
        # Revalidate nested catalog limits/identities before entering persistence.
        try:
            catalog = (
                ResultCatalog.model_validate(saved.result_catalog.model_dump())
                if saved.result_catalog
                else ResultCatalog()
            )
        except ValueError as exc:
            raise ApplicationError("INVALID_MEASURE", str(exc)) from exc
        payload = WorkflowSave(
            name=saved.name,
            expected_revision=saved.revision,
            format_version=3,
            nodes=saved.nodes,
            edges=saved.edges,
            parameters=saved.parameters,
            presentation=saved.presentation,
            result_catalog=catalog,
        )
        save_graph(self.session, workflow, payload, get_node_registry())
        return MeasureEntry(
            workflow_id=workflow_id,
            publication_id=publication_id,
            workflow_name=workflow.name,
            publication_name=output.name,
            definition=definition,
        )

    def _draft(self, project_id: uuid.UUID, request: MeasureReportRequest) -> Visualization:
        _, _, output = self.inputs.load(
            project_id, request.workflow_id, request.publication_id, request.expected_token
        )
        by_id = {m.id: m for m in output.measures}
        selected = [request.measure_id, *request.additional_measure_ids]
        if any(identity not in by_id for identity in selected):
            raise ApplicationError(
                "MEASURE_NOT_FOUND", "Select an available reusable measure.", 404
            )
        definitions = [by_id[identity] for identity in selected]
        definition = definitions[0]
        if any(set(m.grain_column_ids) != set(definition.grain_column_ids) for m in definitions):
            raise ApplicationError("INVALID_MEASURE", "Selected measures must have the same grain.")
        fields = [m.column_id for m in definitions]
        if len(set(fields)) != len(fields):
            raise ApplicationError(
                "INVALID_MEASURE", "Selected measures must reference distinct fields."
            )
        config = measure_config(definition, request.name)
        if request.additional_measure_ids:
            config.measure_column_ids = fields
            config.column_ids = [*definition.grain_column_ids, *fields]
        return Visualization(
            id=uuid.uuid5(request.request_id, "measure-visualization"),
            project_id=project_id,
            workflow_id=request.workflow_id,
            publication_id=request.publication_id,
            source_node_id=output.node_id,
            name=request.name,
            type=request.presentation,
            revision=1,
            config=config.model_dump(mode="json"),
        )

    def preview(self, project_id: uuid.UUID, request: MeasureReportRequest) -> VisualizationResult:
        return self.render(self._draft(project_id, request))

    def apply(self, project_id: uuid.UUID, request: MeasureReportRequest) -> ReportBuildResult:
        ProjectService(self.session).lock(project_id)
        payload = request.model_dump(mode="json")
        if not request.additional_measure_ids:
            payload.pop("additional_measure_ids")  # Preserve pre-extension receipt fingerprints.
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        receipt = self.session.get(ReportDocument, request.request_id)
        if receipt:
            if (
                receipt.project_id != project_id
                or receipt.kind != "measure_report_receipt"
                or receipt.payload.get("fingerprint") != fingerprint
            ):
                raise ApplicationError(
                    "MEASURE_CONFLICT",
                    "This request identity was used for different report settings.",
                    409,
                )
            return ReportBuildResult.model_validate(receipt.payload["result"])
        draft = self._draft(project_id, request)
        self.render(draft)
        result = ReportBuildResult(
            workflow_id=request.workflow_id,
            publication_id=request.publication_id,
            visualization_id=draft.id,
            dashboard_id=uuid.uuid5(request.request_id, "measure-dashboard"),
        )
        try:
            self.session.add(draft)
            self.session.add(
                Dashboard(id=result.dashboard_id, project_id=project_id, name=request.name)
            )
            self.session.flush()
            self.session.add(
                DashboardWidget(
                    id=uuid.uuid5(request.request_id, "measure-widget"),
                    dashboard_id=result.dashboard_id,
                    visualization_id=draft.id,
                    title=request.name,
                    config={},
                    position_x=0,
                    position_y=0,
                    width=12,
                    height=8,
                )
            )
            self.session.add(
                ReportDocument(
                    id=request.request_id,
                    project_id=project_id,
                    kind="measure_report_receipt",
                    status="applied",
                    payload={"fingerprint": fingerprint, "result": result.model_dump(mode="json")},
                )
            )
            self.session.commit()
            return result
        except Exception:
            self.session.rollback()
            raise
