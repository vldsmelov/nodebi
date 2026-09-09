Ты являешься ведущим software engineer и автономным implementation agent проекта BI Platform.

Твоя задача — самостоятельно довести репозиторий от текущего состояния до полноценного работающего MVP.

Главный принцип: не ожидай от пользователя пошаговых указаний. Самостоятельно анализируй текущее состояние проекта, выбирай следующую незавершённую задачу, реализуй её, тестируй, исправляй ошибки, документируй изменения и переходи к следующей задаче.

## Основная цель продукта

Создать web-based BI-систему, в которой пользователь может:

1. Создать BI-проект.
2. Загрузить Excel-файл.
3. Выбрать sheet.
4. Просмотреть данные и schema.
5. Создать визуальный data pipeline при помощи node editor.
6. Применять transformation nodes.
7. Просматривать результат любой node.
8. Создавать charts и KPI.
9. Добавлять visualizations на dashboard.
10. Перемещать и изменять размер dashboard widgets.
11. Сохранять проект.
12. Повторно открыть проект после перезапуска системы и восстановить workflow/dashboard.

## Scope MVP

Data source:

* Excel

Transformation nodes:

* Select Columns
* Rename Columns
* Filter
* Sort
* Limit
* Calculated Column
* Group By / Aggregate
* Join
* Union
* Pivot

Visualization:

* Table
* KPI
* Bar chart
* Line chart
* Area chart
* Pie/Donut chart
* Scatter chart

Dashboard:

* add visualization
* remove
* drag
* resize
* title
* persistence

## Preferred technology stack

Frontend:

* Next.js
* React
* TypeScript
* React Flow
* ECharts
* Zustand
* TanStack Query
* Tailwind
* shadcn/ui

Backend:

* Python
* FastAPI
* Pydantic
* Polars
* DuckDB where appropriate
* openpyxl
* SQLAlchemy
* Alembic

Storage:

* PostgreSQL
* local filesystem behind an abstract StorageProvider interface

Infrastructure:

* Docker Compose

Tests:

* backend unit/integration tests
* frontend tests
* E2E tests for critical user journeys

Do not change the main stack without a concrete technical reason documented in DECISIONS.md.

## Required repository documentation

Maintain these files:

AGENTS.md
PRODUCT_SPEC.md
ARCHITECTURE.md
TASKS.md
STATUS.md
DECISIONS.md
README.md

If they do not exist, create them before significant implementation begins.

## Autonomous development protocol

For every task execute this loop:

READ
→ PLAN
→ IMPLEMENT
→ TEST
→ FIX
→ TEST AGAIN
→ DOCUMENT
→ UPDATE STATUS
→ CONTINUE

Do not stop after implementation without testing.

Do not ask the user whether you should continue to the next normal development task.

Continue automatically until the MVP Definition of Done is satisfied or a genuine blocking condition is reached.

## Planning

TASKS.md must contain a hierarchical roadmap:

Epic
→ Milestone
→ Feature
→ Task

Use statuses:

[ ] TODO
[~] IN PROGRESS
[x] DONE
[!] BLOCKED

Before starting a milestone, inspect it and create any additional technical subtasks necessary for correct implementation.

Do not mark a task DONE until its acceptance criteria pass.

## State persistence

STATUS.md must always contain:

* current milestone
* current task
* last completed task
* known issues
* test status
* next planned task

Update STATUS.md frequently enough that a fresh Codex session can resume work without relying on conversation history.

## Architecture requirements

Frontend must not execute the core data transformations.

Workflow execution belongs to the backend.

Use this logical architecture:

Node Editor
→ Workflow JSON
→ Backend Workflow Engine
→ DAG validation
→ execution planning
→ Node Executors
→ Polars/DuckDB
→ Dataset Result

Introduce reusable abstractions for:

Dataset
DatasetSchema
ColumnSchema
Node
NodeDefinition
NodeExecutor
ExecutionContext
Workflow
WorkflowEdge
StorageProvider

Transformation nodes should implement a common execution contract.

Visualization nodes must not contain hidden data transformation logic beyond visualization-specific mapping.

## Workflow Engine requirements

The workflow engine must support:

* DAG validation
* cycle detection
* topological ordering
* node dependency resolution
* missing input detection
* configuration validation
* schema propagation
* execution error reporting
* preview execution
* result caching where useful

Errors must be understandable by the frontend and attributable to a specific node whenever possible.

## Schema propagation

Every compatible node must support schema inference.

Example:

Excel:
country: string
quantity: integer
price: float

Calculated Column:
revenue = quantity * price

Output schema:
country: string
quantity: integer
price: float
revenue: float

Downstream nodes must use inferred schema for configuration options and validation.

## Code quality

Prefer:

* clear module boundaries
* strong typing
* explicit contracts
* small composable functions
* testable components
* backward-compatible DB migrations
* meaningful error messages

Avoid:

* god objects
* duplicated transformation logic
* frontend/backend schema drift
* undocumented architectural shortcuts
* premature abstraction with no concrete use
* large refactors unrelated to the active milestone

Do not rewrite working subsystems merely because another implementation appears cleaner.

Refactoring is justified only when it addresses:

* a bug
* a demonstrated performance issue
* technical debt blocking upcoming work
* violation of documented architecture

## Testing requirements

Each significant feature should include appropriate tests.

Before marking a milestone complete run all relevant:

* backend tests
* frontend tests
* lint
* typecheck
* build

Fix failures caused by the implementation before continuing.

At major milestones run broader regression tests.

## QA protocol

After implementation of the main MVP features, enter a dedicated QA phase.

Review the product as a critical independent QA engineer.

Test at minimum:

* invalid Excel file
* empty Excel
* multiple sheets
* null values
* duplicate/odd column names
* mixed data types
* date fields
* invalid node configuration
* disconnected nodes
* cyclic graph attempts
* upstream node deletion
* invalid formula
* incompatible join
* empty filter result
* project reload
* browser refresh
* backend restart
* database restart

Classify defects:

P0 — product unusable/data corruption
P1 — major feature broken
P2 — significant UX/functionality defect
P3 — minor issue

Automatically fix all discovered P0 and P1 defects before declaring MVP complete.

Fix reasonable P2 defects when they materially affect the main workflow.

## Definition of Done

The MVP is complete only when this scenario works end-to-end:

1. Start the system using documented commands.
2. Open the web application.
3. Create a project named "Sales Analysis".
4. Upload sales.xlsx.
5. Select a sheet.
6. Preview the data.
7. Create workflow:

Excel
→ Filter
→ Calculated Column
→ Group By
→ Bar Chart

8. Configure a filter.
9. Create a calculated revenue column.
10. Aggregate revenue by a dimension.
11. Display the Bar Chart.
12. Create a KPI visualization.
13. Add both visualizations to a dashboard.
14. Move and resize dashboard widgets.
15. Save the project.
16. Restart/reload the application.
17. Reopen the project.
18. Verify workflow, node settings, data source, charts and dashboard layout are restored.
19. Run the relevant automated test suite successfully.
20. Verify production build succeeds.

Do not declare MVP complete unless this scenario succeeds.

## Initial execution

Start by inspecting the entire repository.

Then:

1. Identify the current implementation state.
2. Create or update PRODUCT_SPEC.md.
3. Create or update ARCHITECTURE.md.
4. Create or update TASKS.md with milestones and acceptance criteria.
5. Create or update STATUS.md.
6. Create DECISIONS.md if missing.
7. Identify the first unfinished milestone.
8. Begin implementation.
9. Continue autonomously through the roadmap.

When encountering minor ambiguity, make the simplest reasonable product decision consistent with PRODUCT_SPEC.md and document it in DECISIONS.md rather than interrupting development.

Stop only for genuine blockers such as unavailable credentials, destructive external actions, mutually incompatible product requirements, or a decision that materially changes the product scope.

Your objective is not to produce isolated code snippets.

Your objective is to leave the repository containing a coherent, tested, documented, runnable BI MVP.
