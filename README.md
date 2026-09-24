# Node BI

Regular workbook updates, report checks and frozen releases:
[operator guide](docs/REPORT_CYCLE.md). The report-cycle worker currently requires a single
backend process. Back up both PostgreSQL and source storage before applying migrations.

Dashboard editing: [right-side settings, in-place preview, placement and shared copies](docs/DASHBOARD_WORKSPACE.md).
Usability review: [findings and limits](docs/USABILITY_REVIEW.md); focused check: `npx playwright test usability.spec.ts`.
Browser acceptance: `npm run test:e2e -- e2e/dashboard-workspace.spec.ts` in `frontend`.

Simple multi-book dashboard: [four-book P&L, rules and operator walkthrough](docs/ALMA_SIMPLE_DASHBOARD.md).
Recreate public fixtures with `backend/.venv/Scripts/python.exe fixtures/build_alma_demo.py`.
Browser authoring acceptance: `npm run test:e2e -- e2e/alma-dashboard.spec.ts` in `frontend`.
Set `NODEBI_KEEP_ALMA_DEMO=1` to retain its editable project in the local database.

New authoring walkthrough: [two Excel books, Join, calculated field and visible result cards](docs/TABLE_AUTHORING.md).

Primary dashboard workflow: [published results, independent visualizations and shared period](docs/PUBLISHED_DASHBOARDS.md).
The current financial project uses 28 publications and 53 independent visualizations; its
calculation graph contains no chart nodes. ADR-106 supersedes the historical bound-chart workflow below.

Field-node authoring: [operator guide](docs/FIELD_EDITOR_GUIDE.md).
The local six-screen financial project has been assembled with field expressions, explicit scalars,
bound charts and composite blocks: [results and impartial UX review](docs/FIELD_FINANCIAL_REVIEW.md).
It uses private workbook data and is stored in the local database, not bundled as a public fixture.

Editable reference overview and reproduction instructions: [constructor overview](docs/REFERENCE_OVERVIEW.md).

Workflow parameters can be declared in the editor and selected as Filter values. Defaults
are saved with the graph; temporary preview values do not create a revision. Preview and
POST visualization-result requests accept a typed `parameters` object. Existing GET results
use defaults. Migration 0005 adds declarations while preserving existing graphs. Dashboard
parameter controls, data choices and navigation are described in [dashboard navigation](docs/DASHBOARD_NAVIGATION.md).

## Constructor extensions for dashboard parity

The approved six-screen migration is tracked in `docs/OPOP_CONSTRUCTOR_PLAN.md`;
its new field-node project passes the 164-slice numerical comparison. General preparation controls are available in the workflow
editor: Excel Source header row/count and source row number, Convert Types,
Unpivot and Window. For the supplied reference workbook select header row **3**,
header count **2**, and enable source row number. Formatting-only tails are ignored.

Convert Types defaults to strict errors. Choose loss-to-null explicitly when desired;
use `coalesce([field_id], 0)` to replace missing numbers. String ISO date conversion
accepts `YYYY-MM-DD`, datetime accepts `YYYY-MM-DDTHH:MM:SS`.
Safe expressions include `trim`, `lower`, `coalesce`, `nullif` and
`safe_divide(numerator, denominator, fallback)`; for example
`coalesce(nullif(trim([class_id]), ""), "Unclassified")`.
Unpivot produces field ID, field name and value columns. Window supports partition
sums and ordered row numbers; supply an extra stable sort key to resolve ties.

Светлая и тёмная темы переключаются вверху страницы: **Тема → Светлая / Тёмная**.
Выбор сохраняется в браузере; по умолчанию используется тёмная тема. Смена темы применяется
к формам, схеме обработки и диаграммам и сохраняет текущие правки.

## Языки интерфейса / Interface languages

Русский используется по умолчанию. Переключатель в верхней части каждой страницы позволяет
выбрать **Русский**, **English** или **Татарча**. Выбор сохраняется в браузере на год и применяется
при следующем открытии. Смена языка сохраняет текущие правки схемы и дашборда.
Названия проектов, листов, столбцов, диаграмм и строковые данные не переводятся.

The interface supports Russian (default), English and Tatar (Cyrillic). Use the language selector
at the top of any page; a browser cookie restores the choice on later visits. User data and
formula/API identifiers are unchanged. See [localization notes](docs/LOCALIZATION.md).

Node BI is a web-based Business Intelligence platform for building analytical workflows and dashboards from Excel data using a visual node-based interface.

The MVP allows a user to:

* create a BI project;
* upload an Excel workbook;
* inspect worksheets and columns;
* build a visual transformation workflow;
* preview intermediate datasets;
* create charts and KPI visualizations;
* assemble a dashboard;
* save the project;
* reopen the project after application restart.

---

# 1. Product Concept

The core interaction model is:

```text
Excel
  ↓
Transformation Nodes
  ↓
Prepared Dataset
  ↓
Visualization
  ↓
Dashboard
```

Example workflow:

```text
Excel Source
      ↓
Filter
      ↓
Calculated Column
      ↓
Group By
      ↓
Bar Chart
```

Example calculated column:

```text
revenue = quantity * price
```

Example aggregation:

```text
Group by:
category

Aggregation:
SUM(revenue)
```

---

# 2. MVP Scope

## Data Sources

MVP:

* Excel `.xlsx`
* Excel `.xlsm` where practical

Post-MVP candidates:

* CSV
* PostgreSQL
* MySQL
* REST API
* Google Sheets

---

## Transformation Nodes

MVP nodes:

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

---

## Visualization Nodes

MVP visualizations:

* Table
* KPI
* Bar Chart
* Line Chart
* Area Chart
* Pie / Donut Chart
* Scatter Chart

---

## Dashboard

The MVP dashboard supports:

* adding visualizations;
* removing widgets;
* dragging widgets;
* resizing widgets;
* persisting layout.

---

# 3. Architecture Overview

Node BI is implemented as a modular monolith.

```text
┌──────────────────────────────────────┐
│              Frontend                │
│                                      │
│ Next.js                              │
│ React                                │
│ TypeScript                           │
│ React Flow                           │
│ ECharts                              │
└──────────────────┬───────────────────┘
                   │
                   │ REST / JSON
                   ▼
┌──────────────────────────────────────┐
│               Backend                │
│                                      │
│ FastAPI                              │
│                                      │
│ Project Service                      │
│ Source Service                       │
│ Workflow Service                     │
│ Execution Service                    │
│ Dashboard Service                    │
│                                      │
│ Workflow DAG                         │
│ Node Registry                        │
│ Node Executors                       │
│ Dataset / Schema                     │
│ Formula Engine                       │
└───────────────┬───────────┬──────────┘
                │           │
                ▼           ▼
          PostgreSQL    File Storage
                │
                ▼
         Uploaded Excel
```

The frontend does not perform authoritative analytical transformations.

The execution path is:

```text
Node Editor
    ↓
Workflow JSON
    ↓
Backend Validation
    ↓
Execution Planner
    ↓
Node Executors
    ↓
Polars / DuckDB
    ↓
Dataset Result
```

---

# 4. Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* React Flow
* TanStack Query
* Zustand
* Apache ECharts
* Tailwind CSS
* shadcn/ui

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic
* Polars
* DuckDB where useful
* openpyxl

## Persistence

* PostgreSQL

## File Storage

MVP:

* local filesystem through `StorageProvider`

Future:

* S3
* MinIO
* Azure Blob Storage

## Infrastructure

* Docker
* Docker Compose

---

# 5. Repository Documentation

Before making significant changes, read the project documentation.

## `AGENTS.md`

Defines how autonomous coding agents must work inside the repository.

Includes:

* development lifecycle;
* testing requirements;
* scope rules;
* architecture discipline;
* QA requirements;
* completion rules.

---

## `PRODUCT_SPEC.md`

Defines what the product must do.

Includes:

* target users;
* MVP behavior;
* user journeys;
* node requirements;
* dashboard behavior;
* explicit non-goals;
* product acceptance criteria.

---

## `ARCHITECTURE.md`

Defines how the product is technically structured.

Includes:

* frontend/backend boundaries;
* domain model;
* workflow format;
* NodeDefinition;
* NodeExecutor;
* schema propagation;
* persistence;
* APIs;
* execution model;
* storage;
* testing architecture.

---

## `TASKS.md`

Contains the autonomous implementation roadmap.

Current roadmap:

```text
M0  Product and Architecture Baseline
M1  Repository Bootstrap
M2  Persistence Foundation
M3  Project Management
M4  Excel Data Sources
M5  Dataset and Schema Domain
M6  Workflow Persistence and Node Registry
M7  Workflow Editor
M8  Validation and Schema Propagation
M9  Execution Engine
M10 Core Transformation Nodes
M11 Advanced Transformation Nodes
M12 Visualization System
M13 Dashboard System
M14 Persistence and Recovery Hardening
M15 QA / Security / Performance / UX
M16 MVP Release Gate
```

---

## `STATUS.md`

Contains the current development snapshot.

Use it to determine:

* current milestone;
* current task;
* blockers;
* test status;
* next task.

A fresh development session should read `STATUS.md` before starting work.

---

## `DECISIONS.md`

Contains architecture decision records.

Examples:

* why the backend is a modular monolith;
* why Polars is the primary dataframe engine;
* how workflow execution works;
* how formulas are secured;
* how visualization configuration is stored.

---

# 6. Repository Structure

Target repository structure:

```text
/
├── AGENTS.md
├── PRODUCT_SPEC.md
├── ARCHITECTURE.md
├── TASKS.md
├── STATUS.md
├── DECISIONS.md
├── README.md
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   └── tests/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── main.py
│   │
│   ├── migrations/
│   └── tests/
│
├── fixtures/
│   └── excel/
│
├── tests/
│   └── e2e/
│
├── docker/
├── docker-compose.yml
└── .env.example
```

The exact structure may evolve during implementation.

Architectural boundaries defined in `ARCHITECTURE.md` must remain intact.

---

# 7. Development Status

Current phase: **MVP complete (0.1.0), 2026-09-11**. Required M0-M16 behavior passes
the automated acceptance gates. See docs/QA_REPORT.md for evidence and supported limits.

Always inspect:

```text
STATUS.md
```

for the current authoritative development state.

---

# 8. Local Development

## Astra revision checks (2026-09-10)

The prior implementation and the architecture review are recorded in
`docs/ASTRA_HANDOFF.md` and `docs/ARCHITECTURE_REVIEW.md`.

Additional checks from `frontend/`:

```powershell
npm run api:generate
npm run api:check
npm run test
npx playwright install chromium
npm run test:e2e
```

Browser tests expect the documented Compose stack on localhost ports 3000/8000.
They create and remove their own projects. Override `NODEBI_E2E_URL` and
`NODEBI_E2E_API` for other test endpoints.

Run backend checks with real PostgreSQL in addition to SQLite:

```powershell
cd backend
$env:NODEBI_TEST_POSTGRES_URL = 'postgresql+psycopg://nodebi:nodebi_dev@127.0.0.1:5432/nodebi?connect_timeout=5'
.\.venv\Scripts\python -m pytest
```

Tests migrate private UUID schemas and remove only those schemas. They cover
concurrent writers, graph ownership, migration roundtrips and ORM drift. The three
PostgreSQL-only cases skip on the SQLite half of the matrix.

Workflow saves now require `expected_revision`. HTTP 409 preserves the local draft;
retry does not force an overwrite. Draft recovery is scoped to the browser tab and
survives page reload/navigation. Closing the tab ends its session draft storage.
Workflow format `version` is independent of the returned edit `revision`.

Uploaded files are immutable. Workbook materialization is bounded to 250,000 rows,
1,024 columns and 2,000,000 cells; expanded archive size is limited to 256 MiB and
10,000 entries. Oversized inputs produce an error, not a truncated analytical result.
Data preview type inference describes the returned sample; execution schema uses the
whole permitted sheet. The execution cache retains at most 32 entries and 256 MiB
of estimated dataframe storage; Python/engine overhead is additional.

Source/project deletions queue file cleanup atomically. Failed cleanup is retried
at startup and can be retried manually from the backend environment:

```powershell
python -m app.services.file_cleanup
```

The frontend public API URL is a Docker build argument because Next.js embeds it
during compilation. Rebuild the frontend after changing `NEXT_PUBLIC_API_URL`.

Vitest is updated to 4.1.11. The js-yaml 4.3.2 override fixes a transitive development
dependency advisory; current npm audit is clean. API types use openapi-typescript
and browser tests use Playwright; these are development dependencies.

Copy `.env.example` to `.env` only when you need to override the safe development defaults, then run:

```bash
docker compose up --build --wait
```

This starts:

* frontend;
* backend;
* PostgreSQL.

Open `http://localhost:3000`. The API documentation is at `http://localhost:8000/docs`.

Local quality checks:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-runtime.txt -c constraints-dev.txt -e ".[dev]"
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\ruff check .
.\.venv\Scripts\ruff format --check .
.\.venv\Scripts\mypy app

cd ..\frontend
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
```

---

# 9. Environment Configuration

The repository should contain:

```text
.env.example
```

Expected configuration includes values similar to:

```text
DATABASE_URL=
STORAGE_ROOT=
MAX_UPLOAD_BYTES=
MAX_PREVIEW_ROWS=
LOG_LEVEL=
```

Additional configuration may be introduced during implementation.

Never commit production secrets.

---

# 10. Database Setup

Database schema changes are managed using Alembic.

The expected fresh-environment lifecycle is:

```text
Create PostgreSQL database
        ↓
Run Alembic migrations
        ↓
Start backend
```

A fresh environment must not require manually creating database tables.

Exact migration commands must be documented after backend bootstrap.

Expected shape:

```bash
alembic upgrade head
```

Run the command from the backend environment as configured by the implementation.

---

# 11. Backend Development

Target backend location:

```text
backend/
```

Main application:

```text
backend/app/main.py
```

Expected development responsibilities include:

* FastAPI startup;
* application configuration;
* database connection;
* repository layer;
* workflow domain;
* execution engine;
* node registry;
* dataset engine.

Exact environment setup commands must be added during M1.

---

# 12. Frontend Development

Target frontend location:

```text
frontend/
```

The frontend provides:

* project management;
* source upload;
* workflow editor;
* node configuration;
* data preview;
* visualizations;
* dashboard editor.

Exact package manager and commands must be documented after frontend bootstrap.

Expected capabilities include commands for:

```text
development
lint
typecheck
tests
production build
```

Do not assume package-manager-specific commands until the repository bootstrap establishes them.

---

# 13. Health Checks

The backend should expose:

```text
GET /health
```

Purpose:

Confirms that the application process is running.

And:

```text
GET /ready
```

Purpose:

Confirms that critical dependencies are available.

At minimum, readiness should consider PostgreSQL connectivity.

---

# 14. API

Primary API prefix:

```text
/api/v1
```

Examples:

```text
GET    /api/v1/projects
POST   /api/v1/projects

POST   /api/v1/projects/{project_id}/sources/excel

GET    /api/v1/workflows/{workflow_id}

POST   /api/v1/workflows/{workflow_id}/validate

POST   /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

See `ARCHITECTURE.md` for the expected API model.

---

# 15. Workflow Model

A workflow is a directed acyclic graph.

Conceptually:

```json
{
  "nodes": [],
  "edges": []
}
```

Each node contains:

```text
id
type
version
position
config
```

Each edge contains:

```text
source node
source port
target node
target port
```

The backend is authoritative for graph validation.

---

# 16. Node Architecture

Node behavior must follow the common architecture:

```text
NodeDefinition
      +
NodeExecutor
      +
NodeRegistry
```

Conceptually:

```text
NodeDefinition
 ├── type
 ├── version
 ├── input ports
 ├── output ports
 ├── config schema
 └── schema inference behavior
```

Execution:

```text
NodeInstance
      ↓
NodeRegistry
      ↓
NodeExecutor
      ↓
Dataset Result
```

Do not implement generic execution using large node-type conditional chains.

---

# 17. Dataset Model

Excel is a source adapter.

It is not the analytical data model.

The execution engine operates on:

```text
Dataset
+
DatasetSchema
+
ColumnSchema
```

Logical data types include:

```text
STRING
INTEGER
FLOAT
BOOLEAN
DATE
DATETIME
UNKNOWN
```

---

# 18. Schema Propagation

Schema propagation is part of the MVP.

Example:

```text
Excel Source

quantity : INTEGER
price    : FLOAT

        ↓

Calculated Column

revenue = quantity * price

        ↓

Output

quantity : INTEGER
price    : FLOAT
revenue  : FLOAT
```

Downstream node configuration should use these resolved schemas.

---

# 19. Excel Handling

Uploaded Excel files are treated as immutable source artifacts.

The system should:

* inspect worksheets;
* infer schema;
* preview rows;
* load selected worksheets into Dataset representation.

The application must never execute workbook macros.

User filenames are metadata only.

Backend-generated storage keys are used for actual storage.

---

# 20. Formula Security

Calculated Column expressions must never use:

```python
eval(...)
```

or:

```python
exec(...)
```

User expressions must be parsed using a controlled allowlisted expression system.

Initial supported syntax should include:

```text
+
-
*
/
()
column references
numeric constants
```

Example:

```text
quantity * price
```

---

# 21. Preview Behavior

Node previews are bounded.

The browser must not receive entire datasets by default.

Preview responses should include:

* schema;
* limited rows;
* execution status;
* execution duration;
* row count when practical.

Server-side limits are authoritative.

---

# 22. Visualization Model

The application persists semantic visualization configuration.

Example:

```text
type: bar

X:
category

Y:
sum_revenue

title:
Revenue by Category
```

The frontend converts semantic configuration into Apache ECharts options.

Generated ECharts internals are not the primary persistent product model.

---

# 23. Dashboard Model

Dashboards contain visualization widgets.

Widget layout uses logical grid coordinates:

```text
x
y
width
height
```

The dashboard must support:

* drag;
* resize;
* save;
* reload.

A failed widget should not prevent unrelated widgets from rendering.

---

# 24. Persistence

Persistent product state includes:

```text
Projects
Data Source Metadata
Workflows
Nodes
Edges
Node Configuration
Visualizations
Dashboards
Widget Layouts
```

Transient execution state includes:

```text
DataFrames
Preview Results
Execution Cache
Generated Chart Options
```

Transient state may be deleted without losing the user's project.

---

# 25. Testing

Testing is part of feature implementation.

Required test categories include:

* domain unit tests;
* executor tests;
* Excel integration tests;
* database integration tests;
* API integration tests;
* frontend behavior tests;
* end-to-end tests.

---

# 26. Acceptance Fixtures

The repository should contain deterministic workbook fixtures.

Primary fixture:

```text
fixtures/excel/sales.xlsx
```

Suggested columns:

```text
order_id
order_date
country
category
product
quantity
price
```

Canonical calculation:

```text
revenue = quantity * price
```

The fixture should include:

* multiple countries;
* multiple categories;
* multiple dates;
* null values;
* representative numeric data.

---

# 27. Canonical MVP Acceptance Journey

The MVP is not complete until this flow succeeds.

## Step 1 — Project

Create:

```text
Sales Analysis
```

---

## Step 2 — Excel

Upload:

```text
sales.xlsx
```

Select:

```text
Sales
```

Preview the data.

---

## Step 3 — Workflow

Create:

```text
Excel Source
      ↓
Filter
      ↓
Calculated Column
      ↓
Group By
      ↓
Bar Chart
```

Configure Filter:

```text
country = Korea
```

Configure Calculated Column:

```text
revenue = quantity * price
```

Configure Group By:

```text
Dimension:
category

Aggregation:
SUM(revenue)
```

Configure Bar Chart:

```text
X:
category

Y:
sum_revenue
```

---

## Step 4 — KPI

Create a KPI representing:

```text
Total Revenue
```

---

## Step 5 — Dashboard

Add:

* Revenue by Category Bar Chart;
* Total Revenue KPI.

Then:

* move widgets;
* resize widgets;
* save layout.

---

## Step 6 — Recovery

Reload the browser.

Verify:

* source still exists;
* workflow still exists;
* nodes retain positions;
* edges remain;
* configuration remains;
* visualizations remain;
* dashboard remains;
* widget layout remains.

---

## Step 7 — Restart

Restart the normal application stack.

Verify:

* project remains;
* workbook remains available;
* workflow executes again;
* dashboard renders.

---

# 28. Quality Gate

Before declaring MVP complete:

Backend:

```text
tests pass
lint passes
database migrations pass
```

Frontend:

```text
tests pass
lint passes
TypeScript typecheck passes
production build passes
```

E2E:

```text
canonical MVP journey passes
```

Defects:

```text
P0 = 0
P1 = 0
```

---

# 29. Development Workflow for Codex

Autonomous coding agents must use:

```text
READ
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
FIX
 ↓
TEST AGAIN
 ↓
REVIEW
 ↓
DOCUMENT
 ↓
UPDATE STATUS
 ↓
CONTINUE
```

Do not stop after every normal task asking for permission.

See:

```text
AGENTS.md
```

for complete agent rules.

---

# 30. Starting a New Coding Session

A new Codex session should begin by reading:

```text
AGENTS.md
STATUS.md
TASKS.md
PRODUCT_SPEC.md
ARCHITECTURE.md
DECISIONS.md
```

Then inspect:

```text
repository
git status
git diff
existing tests
```

After that, resume from the first unfinished actionable task.

---

# 31. Resume Prompt

A minimal resume instruction for Codex is:

```text
Read AGENTS.md, STATUS.md, TASKS.md,
PRODUCT_SPEC.md, ARCHITECTURE.md and DECISIONS.md.

Inspect the current repository state and git diff.

Resume autonomous development from the first
unfinished actionable task.

Do not repeat completed work.

Follow the development protocol in AGENTS.md.

Continue through TASKS.md until the MVP Definition
of Done is satisfied or a genuine blocker prevents
all meaningful progress.
```

---

# 32. Current MVP Non-Goals

Do not expand MVP into:

* authentication;
* multi-user collaboration;
* organizations;
* enterprise permissions;
* row-level security;
* scheduled refresh;
* SQL connectors;
* Google Sheets;
* REST connectors;
* realtime streaming;
* mobile workflow editor;
* PDF export;
* PowerPoint export;
* plugin marketplace;
* distributed execution;
* AI workflow generation;
* natural-language analytics.

These may be addressed after the core product is validated.

---

# 33. Security Baseline

Even in single-user MVP mode:

* validate API input;
* validate uploaded files;
* enforce upload limits;
* prevent path traversal;
* never execute workbook macros;
* never evaluate arbitrary formula code;
* do not commit secrets;
* use backend-generated storage keys;
* avoid exposing stack traces as normal user errors.

---

# 34. Performance Baseline

The MVP targets workbook-scale analytical workloads.

Important rules:

* transformations run server-side;
* previews are bounded;
* chart point counts are bounded;
* avoid unnecessary workbook reloads;
* avoid Python row-by-row loops where vectorized operations exist;
* cache repeated execution when justified.

Do not introduce distributed infrastructure without demonstrated need.

---

# 35. Architecture Change Process

When a significant architectural change is required:

1. identify the concrete problem;
2. evaluate alternatives;
3. create or update an ADR in `DECISIONS.md`;
4. update `ARCHITECTURE.md`;
5. update affected tasks;
6. implement the change;
7. test the migration or changed behavior.

Do not silently diverge from documented architecture.

---

# 36. Product Scope Change Process

When MVP scope changes intentionally:

1. update `PRODUCT_SPEC.md`;
2. update `TASKS.md`;
3. record significant reasoning in `DECISIONS.md`;
4. update `STATUS.md`;
5. update this README if user-facing behavior changes.

Do not allow implementation convenience to silently redefine product requirements.

---

# 37. Project State Files

The following documents together form the persistent memory of the project:

```text
AGENTS.md
PRODUCT_SPEC.md
ARCHITECTURE.md
TASKS.md
STATUS.md
DECISIONS.md
README.md
```

Conversation history must not be required to continue development.

---

# 38. Current Status

Required MVP implementation and release validation are complete.
The maintained release snapshot is in STATUS.md and docs/QA_REPORT.md.

Always verify the current state in:

```text
STATUS.md
```

before beginning implementation.

---

# 39. MVP Goal

The MVP succeeds when a user can take an ordinary Excel workbook and, without writing code:

```text
Import
  ↓
Transform
  ↓
Inspect
  ↓
Visualize
  ↓
Build Dashboard
  ↓
Save
  ↓
Return Later
  ↓
Continue Working
```

The goal is not to reproduce the entire functionality of mature enterprise BI platforms.

The goal is to prove a reliable, understandable, extensible node-based BI workflow.

### Early visualization/dashboard acceptance

Build a prepared aggregate and connect Bar Chart; use a separate global Group By for KPI.
Chart configuration is stored only on the workflow node. The dashboard page lists these
saved visualizations; add widgets, drag their header, resize the lower-right corner and
click Save dashboard. Conflicting saves retain the local draft and return 409.

`npm run test:e2e` exercises the full Excel/filter/revenue/group/bar/KPI/dashboard flow.
For local Docker restart acceptance in PowerShell:

```powershell
$env:NODEBI_E2E_RESTART='1'
npm run test:e2e
```

This opt-in restarts the development frontend, backend and PostgreSQL containers, preserving volumes.
Bar charts reject more than 2000 points rather than silently truncating analytical data.
KPI requires exactly one upstream row; missing values display as No value.
Migration 0004 adds dashboard revisions. M11, all required chart types, dashboard management
and release QA are complete. The optional backlog remains in TASKS.md.

### Reproducible backend dependencies

Runtime versions are pinned in backend/requirements-runtime.txt, including platform markers
for Linux uvloop and Windows support packages. Development tool versions are constrained in
backend/constraints-dev.txt. Install with `pip install -r requirements-runtime.txt -c constraints-dev.txt -e ".[dev]"`.
Update these files deliberately and rerun PostgreSQL and browser acceptance. Docker installs
runtime dependencies in a separate cached layer before copying application code.

## Chart and recovery checkpoint (2026-09-11)

All required transforms and Table/KPI/Bar/Line/Area/Pie/Donut/Scatter are implemented.
Chart semantics are edited in workflow nodes; dashboards hold references and presentation overrides.
Use Group By upstream for totals; charts reject more than 2000 points rather than silently sampling.
Tables page through backend results. Dashboard names, titles, title visibility and grid layout persist.

Startup waits for database availability before migrations, including simultaneous stack restarts.
Excel XML entity protection is installed through pinned defusedxml.
Run the repeatable 50000-row smoke benchmark with
`backend/.venv/Scripts/python backend/scripts/benchmark_mvp.py`.
Do not run PostgreSQL tests while restart acceptance restarts the same database.
Current release evidence and limitations: [QA report](docs/QA_REPORT.md), [status](STATUS.md).

## MVP 0.1.0 operational limits

Compose binds all published ports to 127.0.0.1. This release is a local single-user application.
Configured Excel source IDs must belong to the workflow project; missing source IDs are rejected
on save, while unconfigured nodes remain valid drafts. Project/source deletion and graph saves
serialize reference changes. Cold workbook loads are shared between concurrent widget requests.

Known non-blocking limits: Float64 arithmetic loses integer precision above 2^53; Join supports
one key pair and inner/left only; Pivot is limited to 128 categories. Optional OR, multi-series
charts, advanced formulas and undo/redo are deferred. Cache bytes exclude Python/engine overhead.
An abrupt process/database failure before upload compensation is journaled can leave an orphaned
file; inspect storage against source metadata before manual cleanup. No automatic orphan purge runs.
The tab-scoped draft survives navigation/reload, but closing the browser tab ends that storage.

Release checks: 208 backend tests, 20 frontend tests and 8 browser scenarios; three PostgreSQL-only
cases skip on SQLite and pass on PostgreSQL. Production Docker builds and OpenAPI drift checks pass.
The release was also installed into a separate stack with fresh database/storage volumes; no existing
project data was reset. See docs/QA_REPORT.md for reproducing the acceptance run.

## Six-screen constructor project (2026-09-15)

Graph authoring improvements: [node labels, dependency view and connected next steps](docs/GRAPH_AUTHORING.md).

The approved opop_bi transfer is complete as ordinary editable Node BI configuration:
168 nodes, six dashboards, 55 widget placements. See the [final acceptance report](docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md)
for the local project link, reference comparison, restart evidence and repeat commands.
Final checks: 247 backend tests, 37 frontend tests and 18 browser scenarios pass.
