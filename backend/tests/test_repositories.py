import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import WorkflowConflictError
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


def test_two_postgresql_writers_cannot_both_save_the_same_revision(db_engine: Engine) -> None:
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Real concurrent transactions require the PostgreSQL test matrix")
    with Session(db_engine) as session:
        project = Project(name="Concurrency")
        session.add(project)
        session.flush()
        workflow = Workflow(project_id=project.id, name="Initial")
        session.add(workflow)
        session.commit()
        workflow_id = workflow.id
    barrier = Barrier(2)

    def write(name: str) -> str:
        with Session(db_engine) as session:
            workflow = session.get(Workflow, workflow_id)
            assert workflow is not None
            barrier.wait(timeout=10)
            workflow.name = name
            try:
                SqlAlchemyWorkflowRepository(session).save_graph(
                    workflow, [], [], expected_revision=1
                )
                session.commit()
                return name
            except WorkflowConflictError:
                session.rollback()
                return "conflict"

    with ThreadPoolExecutor(max_workers=2) as workers:
        outcomes = list(workers.map(write, ("A", "B")))
    assert outcomes.count("conflict") == 1
    with Session(db_engine) as session:
        stored = session.get(Workflow, workflow_id)
        assert stored is not None
        assert stored.revision == 2
        assert stored.name in outcomes


def test_rewire_edge_while_removing_previous_endpoint(session: Session) -> None:
    project = Project(id=uuid.uuid4(), name="Rewire")
    workflow = Workflow(id=uuid.uuid4(), project_id=project.id, name="Graph")
    session.add_all([project, workflow])
    session.commit()

    def node() -> WorkflowNode:
        return WorkflowNode(
            id=uuid.uuid4(),
            workflow_id=workflow.id,
            node_type="select_columns",
            node_version=1,
            position_x=0,
            position_y=0,
            config={},
            ui_state={},
        )

    old, target, replacement = node(), node(), node()
    edge_id = uuid.uuid4()
    repository = SqlAlchemyWorkflowRepository(session)
    repository.save_graph(
        workflow,
        [old, target],
        [
            WorkflowEdge(
                id=edge_id,
                workflow_id=workflow.id,
                source_node_id=old.id,
                target_node_id=target.id,
                source_port="dataset",
                target_port="input",
            )
        ],
    )
    session.commit()
    old_id = old.id
    repository.save_graph(
        workflow,
        [target, replacement],
        [
            WorkflowEdge(
                id=edge_id,
                workflow_id=workflow.id,
                source_node_id=replacement.id,
                target_node_id=target.id,
                source_port="dataset",
                target_port="input",
            )
        ],
    )
    session.commit()
    session.expire_all()
    stored = session.get(WorkflowEdge, edge_id)
    assert stored is not None
    assert stored.source_node_id == replacement.id
    assert stored.target_node_id == target.id
    assert session.get(WorkflowNode, old_id) is None
    assert workflow.revision == 3


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
