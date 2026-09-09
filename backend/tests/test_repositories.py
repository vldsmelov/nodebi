import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Dashboard,
    DataSource,
    Project,
    Visualization,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
)
from app.repositories.sqlalchemy import (
    SqlAlchemyDashboardRepository,
    SqlAlchemyProjectRepository,
    SqlAlchemySourceRepository,
    SqlAlchemyVisualizationRepository,
    SqlAlchemyWorkflowRepository,
)


def test_project_repository_crud(session: Session) -> None:
    repository = SqlAlchemyProjectRepository(session)
    project = repository.add(Project(name="Sales Analysis"))
    session.commit()

    assert repository.get(project.id) is project
    assert [item.name for item in repository.list()] == ["Sales Analysis"]

    repository.delete(project)
    session.commit()
    assert repository.get(project.id) is None


def test_workflow_graph_save_is_atomic_on_invalid_edge(session: Session) -> None:
    project = Project(id=uuid.uuid4(), name="Sales Analysis")
    workflow = Workflow(id=uuid.uuid4(), project_id=project.id, name="Main")
    session.add_all([project, workflow])
    session.commit()

    source = WorkflowNode(
        id=uuid.uuid4(),
        workflow_id=workflow.id,
        node_type="excel_source",
        node_version=1,
        position_x=0,
        position_y=0,
        config={},
        ui_state={},
    )
    missing_target_id = uuid.uuid4()
    invalid_edge = WorkflowEdge(
        workflow_id=workflow.id,
        source_node_id=source.id,
        source_port="output",
        target_node_id=missing_target_id,
        target_port="input",
    )
    repository = SqlAlchemyWorkflowRepository(session)

    with pytest.raises(IntegrityError), session.begin():
        repository.save_graph(workflow, [source], [invalid_edge])

    assert (
        session.scalar(
            select(func.count())
            .select_from(WorkflowNode)
            .where(WorkflowNode.workflow_id == workflow.id)
        )
        == 0
    )
    assert (
        session.scalar(
            select(func.count())
            .select_from(WorkflowEdge)
            .where(WorkflowEdge.workflow_id == workflow.id)
        )
        == 0
    )


def test_cross_workflow_edge_is_rejected(session: Session) -> None:
    project = Project(id=uuid.uuid4(), name="Project")
    left = Workflow(id=uuid.uuid4(), project_id=project.id, name="Left")
    right = Workflow(id=uuid.uuid4(), project_id=project.id, name="Right")
    source = WorkflowNode(
        workflow_id=left.id,
        node_type="source",
        node_version=1,
        position_x=0,
        position_y=0,
        config={},
        ui_state={},
    )
    target = WorkflowNode(
        workflow_id=right.id,
        node_type="target",
        node_version=1,
        position_x=1,
        position_y=1,
        config={},
        ui_state={},
    )
    session.add_all([project, left, right, source, target])
    session.commit()
    session.add(
        WorkflowEdge(
            workflow_id=left.id,
            source_node_id=source.id,
            source_port="output",
            target_node_id=target.id,
            target_port="input",
        )
    )

    with pytest.raises(IntegrityError):
        session.commit()


def test_resource_repositories_scope_lists_to_project(session: Session) -> None:
    first = Project(id=uuid.uuid4(), name="First")
    second = Project(id=uuid.uuid4(), name="Second")
    workflow = Workflow(id=uuid.uuid4(), project_id=first.id, name="Main")
    source = DataSource(
        project_id=first.id,
        type="excel",
        name="Sales",
        original_filename="sales.xlsx",
        storage_key="ab/source.xlsx",
        file_size=100,
        status="ready",
        source_metadata={},
    )
    visualization = Visualization(
        project_id=first.id,
        workflow_id=workflow.id,
        type="bar",
        name="Revenue",
        config={},
    )
    dashboard = Dashboard(project_id=first.id, name="Executive")
    session.add_all([first, second, workflow])
    session.flush()

    source_repository = SqlAlchemySourceRepository(session)
    visualization_repository = SqlAlchemyVisualizationRepository(session)
    dashboard_repository = SqlAlchemyDashboardRepository(session)
    source_repository.add(source)
    visualization_repository.add(visualization)
    dashboard_repository.add(dashboard)
    session.commit()

    assert source_repository.get(source.id) is source
    assert source_repository.list_for_project(first.id) == [source]
    assert source_repository.list_for_project(second.id) == []
    assert visualization_repository.get(visualization.id) is visualization
    assert visualization_repository.list_for_project(first.id) == [visualization]
    assert dashboard_repository.get(dashboard.id) is dashboard
    assert dashboard_repository.list_for_project(first.id) == [dashboard]

    source_repository.delete(source)
    visualization_repository.delete(visualization)
    dashboard_repository.delete(dashboard)
    session.commit()

    assert source_repository.get(source.id) is None
    assert visualization_repository.get(visualization.id) is None
    assert dashboard_repository.get(dashboard.id) is None
