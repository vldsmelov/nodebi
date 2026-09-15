# TASKS.md

## Manual-authoring UX review and proposed redesign (2026-09-15)

* [x] Review current manual journey, saved graph and editor forms; distinguish functional acceptance from human usability.
* [x] Document findings and staged redesign in docs/CONSTRUCTOR_UX_REVIEW.md.

Implementation authorized; stages below remain incomplete until their acceptance passes:

* [~] U0: Human baseline tasks and prototypes; collect time, errors and assistance needed.
  * [x] Define operator tasks, evidence collection and comparison protocol (docs/UX_OPERATOR_PROTOCOL.md).
  * [ ] Conduct baseline with actual operators; no measurements claimed yet.
* [x] U1: Meaningful node cards, groups, dependency focus, layout, next-step insertion and undo/redo.
  * [x] Presentation names, dependency view, connected next-step creation and atomic input replacement (40 frontend tests, 19 browser scenarios including restart).
  * [x] Dependency layout and bounded undo/redo through normal revision-aware autosave.
  * [x] Reject deletion of attached visualizations, including concurrent widget attachment (PostgreSQL race and browser recovery checked).
  * [x] Persistent flat groups, collapse with boundary connections, member navigation and configurable panels; projection/revision/undo/output regression verified.
* [~] U2: Named formula tokens and batch preparation forms backed by ordinary explicit nodes.
  * [x] P2: Field-specific configuration feedback replaces raw Pydantic dumps; nested errors retained in English/Russian/Tatar; empty Filter repair verified.
  * [ ] Named formula tokens, cursor insertion and schema-aware field lookup.
  * [ ] Batch preparation/calculated-field forms and grouped Unpivot authoring.
* [ ] U3: Share/rank builders with explicit denominator scope and parameter dependency explanations.
* [ ] U4: Widget creation/editing from dashboards, ID/label selectors, guided navigation and view mode.
* [ ] U5: Apply to a project copy, repeat 164-slice parity/restart checks and human usability evaluation.

## Approved constructor/dashboard parity extension (2026-09-14)

* [x] Excel layout, real content bounds, merged headers, row identity and formula diagnostics.
* [x] Convert Types and typed string/null/safe division formulas.
* [x] Unpivot and Window with configuration forms and UI acceptance.
* [x] Build and verify the editable overview graph on the supplied workbook (29 nodes, 9 widgets).
* [x] Horizontal Bar, text KPI and per-column table formats with persistence and regression checks.
* [x] Typed workflow declarations/defaults, Filter references, execution values and cache isolation.
* [x] Editor parameter forms, preview values, stale response protection and UI acceptance.
* [x] Dashboard parameter bindings, URL state, value selectors and navigation actions; UI and restart regression pass.
* [x] Parameterized titles and stable-ID highlighting; preserve complete comparison data.
* [x] Five detailed saved dashboards, following the verified overview.
  * [x] Class: editable branches, four-slice parity, overview actions, URL restoration.
  * [x] Service: shared strict article preparation, full 36-service parity, class navigation.
  * [x] Cost-type overview: totals, leaders, services, classes and article charts; all three types match.
  * [x] Class/Service layout authoring via drag/resize with preserved bindings/navigation.
  * [x] Cost/class: all 12 slices, global class ranks, service shares and article detail.
  * [x] Cost/service: all 108 slices, peer ranks/highlighting, article shares and navigation.
  * [x] Six-screen transitions, normalized labels and reference display precision through UI.
  * [x] Search/open distant workflow nodes; retain draft and avoid selection-only graph saves.
  * [x] All detail layouts, complete restart/theme/language acceptance and final quality gates.
* [x] Reference parity, UI construction/editing, restart and full quality checks.

Specification and screen matrix: docs/OPOP_CONSTRUCTOR_PLAN.md.
Completed: docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md (164 slices, 168 nodes, six dashboards).

## User-requested light theme — 2026-09-14

* [x] Semantic light/dark palette, persistent selector and matching initial server rendering.
* [x] Theme-aware workflow canvas, diagrams, forms and dashboards; preserve unsaved state.
* [x] Browser checks, visual review, documentation and local frontend deployment.

Verified: 26 frontend tests, 13 browser scenarios, ESLint/TypeScript/OpenAPI drift and production build.

## User-requested localization — 2026-09-11

* [x] Russian default, English and Tatar interface, persisted language selector and SSR locale.
* [x] Localized forms, node catalog, errors, dashboards, accessibility, numeric/date presentation.
* [x] Catalog completeness, language-switch/draft preservation and browser acceptance tests.
* [x] Update product/architecture documentation and deploy the checked local frontend.

Verified 2026-09-14: 26 frontend tests, 11 browser scenarios including full restart,
ESLint/TypeScript/OpenAPI check and Docker production build. See docs/LOCALIZATION.md.

## 1. Purpose

This file is the implementation roadmap for the Node BI MVP.

It is intended to be used by an autonomous coding agent.

The roadmap is hierarchical:

Epic
→ Milestone
→ Feature
→ Task
→ Subtask

Task statuses:

* `[ ]` TODO
* `[~]` IN PROGRESS
* `[x]` DONE
* `[!]` BLOCKED

A task must not be marked complete until its acceptance criteria are satisfied.

---

# 2. Global Execution Rules

Before starting any task:

1. Read `AGENTS.md`.
2. Read `STATUS.md`.
3. Read relevant sections of `PRODUCT_SPEC.md`.
4. Read relevant sections of `ARCHITECTURE.md`.
5. Read relevant entries from `DECISIONS.md`.
6. Inspect existing implementation.
7. Confirm prerequisites.
8. Mark the task `[~] IN PROGRESS`.

After implementing:

1. run relevant tests;
2. fix failures;
3. run tests again;
4. review implementation;
5. update documentation if needed;
6. mark task `[x] DONE`;
7. update `STATUS.md`;
8. continue to the next actionable task.

Do not stop between normal tasks.

---

# 3. Global Definition of Done

The MVP is complete only when:

* all release-blocking milestones are complete;
* all P0 defects are fixed;
* all P1 defects are fixed;
* backend tests pass;
* frontend tests pass;
* E2E critical journey passes;
* lint passes;
* TypeScript typecheck passes;
* frontend production build succeeds;
* migrations work from a clean database;
* documented Docker Compose startup succeeds;
* canonical user journey succeeds;
* project persists across restart.

---

# 4. Milestone Dependency Graph

## Astra revision gate (2026-09-09)

Preserve completed milestone history; the findings below reopen their affected acceptance criteria.
See `docs/ASTRA_HANDOFF.md` for provenance and the original defect reproductions.

* `[x]` A01: reject foreign graph IDs atomically; regress on SQLite and PostgreSQL.
* `[x]` A02/A03: collision-safe Excel headers and explicit full-sheet type conversion.
* `[x]` A04/A05: separate format/revision, optimistic concurrency, durable autosave and stale-result handling.
* `[x]` A06/A07: source validation before cache, scoped keys, memory bounds and source/schema reuse.
* `[x]` A08: application boundaries, editor decomposition, generated API types and structured errors.
* `[x]` A09: compensating upload cleanup and repeatable source/project file deletion.
* `[x]` A10: PostgreSQL regressions and browser acceptance automation.
* `[x]` Review ADR-001–ADR-049 individually and record evidence/limitations/disposition.
* `[x]` Revalidate deployment, resource limits, dependency reproducibility and documentation.
* `[x]` After M10, build an early Bar Chart + KPI + dashboard acceptance slice, then
  complete M11 and all remaining M12/M13 requirements before M14–M16.


```text
M0 Specification
      ↓
M1 Repository Bootstrap
      ↓
M2 Persistence Foundation
      ↓
M3 Project Management
      ↓
M4 Excel Data Sources
      ↓
M5 Dataset + Schema Domain
      ↓
M6 Workflow Persistence + Node Registry
      ↓
M7 Workflow Editor
      ↓
M8 Validation + Schema Propagation
      ↓
M9 Execution Engine
      ↓
M10 Core Transformation Nodes
      ↓
M11 Advanced Transformation Nodes
      ↓
M12 Visualization System
      ↓
M13 Dashboard System
      ↓
M14 Persistence + Recovery Hardening
      ↓
M15 QA + Performance + Security
      ↓
M16 MVP Release Gate
```

Some frontend and backend tasks may be developed in parallel when dependencies permit.

---

# 5. Milestone M0 — Product and Architecture Baseline

Status:

`[x] DONE`

Goal:

Establish the persistent documentation and architectural boundaries required for autonomous development.

## Tasks

* `[x]` M0.1 Create `AGENTS.md`
* `[x]` M0.2 Create `PRODUCT_SPEC.md`
* `[x]` M0.3 Create `ARCHITECTURE.md`
* `[x]` M0.4 Create `TASKS.md`
* `[x]` M0.5 Create initial `STATUS.md`
* `[x]` M0.6 Create initial `DECISIONS.md`
* `[x]` M0.7 Create initial `README.md`

## Acceptance Criteria

* all required root documentation files exist;
* responsibilities of each document are clear;
* MVP scope is explicit;
* architecture boundaries are explicit;
* roadmap exists;
* Codex can determine the next task from repository state alone.

---

# 6. Milestone M1 — Repository Bootstrap

Status:

`[x] DONE`

Goal:

Create a runnable frontend/backend development environment.

Depends on:

M0.

## M1.1 Repository Structure

* `[x]` Create `frontend/`
* `[x]` Create `backend/`
* `[x]` Create `tests/e2e/`
* `[x]` Create `fixtures/excel/`
* `[x]` Create Docker-related files
* `[x]` Add `.gitignore`
* `[x]` Add `.env.example`

Acceptance:

Repository structure matches architectural boundaries.

---

## M1.2 Frontend Bootstrap

* `[x]` Initialize Next.js application
* `[x]` Enable TypeScript strict mode
* `[x]` Configure Tailwind
* `[x]` Configure shadcn/ui
* `[x]` Configure ESLint
* `[x]` Configure frontend tests
* `[x]` Add base application shell

Acceptance:

* frontend starts locally;
* lint succeeds;
* typecheck succeeds;
* production build succeeds.

---

## M1.3 Backend Bootstrap

* `[x]` Initialize Python backend
* `[x]` Configure FastAPI
* `[x]` Configure Pydantic settings
* `[x]` Configure SQLAlchemy
* `[x]` Configure Alembic
* `[x]` Configure test framework
* `[x]` Configure formatter/linter
* `[x]` Add application startup
* `[x]` Add `/health`
* `[x]` Add `/ready`

Acceptance:

Backend starts and health endpoint returns success.

---

## M1.4 PostgreSQL

* `[x]` Add PostgreSQL service to Docker Compose
* `[x]` Add database environment configuration
* `[x]` Verify backend connection
* `[x]` Verify migrations can run

Acceptance:

Fresh local environment can connect to PostgreSQL.

---

## M1.5 Docker Compose

* `[x]` Add frontend service
* `[x]` Add backend service
* `[x]` Add PostgreSQL service
* `[x]` Add persistent database volume
* `[x]` Add persistent source-file volume
* `[x]` Verify internal networking

Acceptance:

```text
docker compose up
```

starts the complete development stack.

---

## M1 Quality Gate

Run:

* backend tests;
* frontend tests;
* lint;
* typecheck;
* frontend production build;
* clean Docker Compose startup.

Do not start M2 until this gate passes.

---

# 7. Milestone M2 — Persistence Foundation

Status:

`[x] DONE`

Goal:

Establish database, repository, transaction, and storage foundations.

Depends on:

M1.

---

## M2.1 Base Database Model

* `[x]` Create UUID strategy
* `[x]` Create timestamp conventions
* `[x]` Create SQLAlchemy base
* `[x]` Create migration infrastructure
* `[x]` Define cascade conventions

---

## M2.2 Initial Database Tables

Create migrations for:

* `[x]` `projects`
* `[x]` `data_sources`
* `[x]` `workflows`
* `[x]` `workflow_nodes`
* `[x]` `workflow_edges`
* `[x]` `visualizations`
* `[x]` `dashboards`
* `[x]` `dashboard_widgets`

Acceptance:

All tables can be created from a clean database using migrations.

---

## M2.3 Repository Interfaces

Create interfaces or equivalent abstractions for:

* `[x]` ProjectRepository
* `[x]` SourceRepository
* `[x]` WorkflowRepository
* `[x]` VisualizationRepository
* `[x]` DashboardRepository

---

## M2.4 PostgreSQL Repository Implementations

* `[x]` Implement project repository
* `[x]` Implement source repository
* `[x]` Implement workflow repository
* `[x]` Implement visualization repository
* `[x]` Implement dashboard repository

---

## M2.5 StorageProvider

* `[x]` Define `StorageProvider`
* `[x]` Implement `LocalStorageProvider`
* `[x]` Generate backend-controlled storage keys
* `[x]` Prevent path traversal
* `[x]` Add delete behavior
* `[x]` Add existence checks

---

## M2.6 Transaction Behavior

* `[x]` Define transaction boundaries
* `[x]` Implement atomic workflow save
* `[x]` Add rollback tests

Acceptance:

Partial workflow persistence cannot remain after failed transaction.

---

## M2 Quality Gate

Tests must verify:

* clean migrations;
* CRUD repository behavior;
* storage persistence;
* path safety;
* transaction rollback.

---

# 8. Milestone M3 — Project Management

Status:

`[x] DONE`

Goal:

Allow users to create and manage BI projects.

Depends on:

M2.

---

## M3.1 Project Backend

Implement:

* `[x]` create project
* `[x]` list projects
* `[x]` get project
* `[x]` rename project
* `[x]` delete project

API:

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{project_id}
PATCH  /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
```

---

## M3.2 Project Validation

* `[x]` validate project name
* `[x]` handle missing project
* `[x]` implement deletion confirmation contract
* `[x]` verify cascade behavior

---

## M3.3 Project Frontend

* `[x]` project list page
* `[x]` create-project interaction
* `[x]` open project
* `[x]` rename project
* `[x]` delete project
* `[x]` loading states
* `[x]` empty state
* `[x]` error states

---

## M3.4 Project Shell

Within an open project provide navigation for:

* `[x]` Data
* `[x]` Workflow
* `[x]` Dashboard

---

## M3 Acceptance

User can:

1. create `Sales Analysis`;
2. reload browser;
3. see project;
4. open project;
5. rename project;
6. delete a separate test project.

---

# 9. Milestone M4 — Excel Data Sources

Status:

`[x] DONE`

Goal:

Allow users to upload and inspect Excel workbooks.

Depends on:

M2, M3.

---

## M4.1 WorkbookReader Contract

* `[x]` define `WorkbookReader`
* `[x]` define WorkbookInfo
* `[x]` define WorksheetInfo
* `[x]` define worksheet loading options

---

## M4.2 Excel Inspection

Support:

* `[x]` `.xlsx`
* `[x]` `.xlsm`
* `[x]` worksheet discovery
* `[x]` workbook metadata
* `[x]` sheet dimensions where practical
* `[x]` basic validation

---

## M4.3 Upload Pipeline

* `[x]` multipart upload endpoint
* `[x]` validate extension
* `[x]` enforce upload size limit
* `[x]` generate storage key
* `[x]` persist DataSource metadata
* `[x]` inspect workbook after upload
* `[x]` return structured errors

---

## M4.4 Excel Security

* `[x]` macros never execute
* `[x]` filenames are metadata only
* `[x]` source path cannot be provided by frontend
* `[x]` corrupt workbook produces controlled error

---

## M4.5 Worksheet Metadata

* `[x]` sheet list API
* `[x]` column discovery
* `[x]` type inference
* `[x]` nullability inference where practical
* `[x]` row preview

---

## M4.6 Excel Edge Cases

Test:

* `[x]` empty workbook
* `[x]` empty sheet
* `[x]` multiple sheets
* `[x]` blank headers
* `[x]` duplicate headers
* `[x]` unicode headers
* `[x]` dates
* `[x]` booleans
* `[x]` null values
* `[x]` mixed-type columns

---

## M4.7 Data Source Frontend

* `[x]` upload interface
* `[x]` upload progress/loading
* `[x]` source list
* `[x]` worksheet selector
* `[x]` schema display
* `[x]` table preview
* `[x]` source errors
* `[x]` delete unused source

---

## M4.8 Source Dependency Protection

* `[x]` prevent deleting source used by workflow
* `[x]` return dependency error
* `[x]` display user-friendly message

---

## M4 Acceptance

User can:

1. open project;
2. upload Excel workbook;
3. inspect sheets;
4. select `Sales`;
5. inspect columns;
6. preview rows;
7. reload project;
8. still see uploaded source.

---

# 10. Milestone M5 — Dataset and Schema Domain

Status:

`[x] DONE`

Goal:

Create source-independent analytical data abstractions.

Depends on:

M4.

---

## M5.1 Logical Data Types

Implement:

* `[x]` STRING
* `[x]` INTEGER
* `[x]` FLOAT
* `[x]` BOOLEAN
* `[x]` DATE
* `[x]` DATETIME
* `[x]` UNKNOWN

---

## M5.2 ColumnSchema

Define:

* `[x]` stable ID
* `[x]` internal name
* `[x]` display name
* `[x]` logical type
* `[x]` nullable
* `[x]` metadata

---

## M5.3 DatasetSchema

* `[x]` ordered columns
* `[x]` lookup by stable ID
* `[x]` lookup by name
* `[x]` duplicate label support
* `[x]` serialization

---

## M5.4 Dataset

* `[x]` define runtime Dataset abstraction
* `[x]` define metadata
* `[x]` wrap Polars representation cleanly
* `[x]` prevent Excel-specific semantics leaking downstream

---

## M5.5 Polars Type Mapping

Implement:

```text
Polars dtype
→
Logical Data Type
```

and relevant reverse mappings.

Status: `[x] DONE`

---

## M5.6 Column Identity Strategy

* `[x]` finalize internal column identity approach
* `[x]` record decision in `DECISIONS.md`
* `[x]` implement duplicate header behavior

---

## M5 Acceptance

A selected worksheet can be loaded as a source-independent Dataset with deterministic schema.

---

# 11. Milestone M6 — Workflow Persistence and Node Registry

Status:

`[x] DONE`

Goal:

Create persistent workflow graph and extensible node system.

Depends on:

M5.

---

## M6.1 Workflow Domain

Implement:

* `[x]` Workflow
* `[x]` NodeInstance
* `[x]` WorkflowEdge
* `[x]` Position
* `[x]` ports
* `[x]` workflow version

---

## M6.2 Workflow Persistence

Backend:

* `[x]` create workflow
* `[x]` get workflow
* `[x]` save complete graph
* `[x]` delete workflow
* `[x]` atomic save
* `[x]` reload graph

---

## M6.3 NodeDefinition

Define:

* `[x]` type
* `[x]` version
* `[x]` category
* `[x]` input ports
* `[x]` output ports
* `[x]` config schema
* `[x]` schema inference mode
* `[x]` executor binding
* `[x]` display metadata

---

## M6.4 Node Registry

* `[x]` create registry
* `[x]` lookup by type/version
* `[x]` duplicate registration protection
* `[x]` unknown node handling
* `[x]` node catalog listing

---

## M6.5 Node Executor Contract

Implement common contract for:

* `[x]` validate
* `[x]` infer_schema
* `[x]` execute

---

## M6.6 Initial Excel Source Node

Implement:

```text
ExcelSource
```

with:

* `[x]` source selection
* `[x]` sheet selection
* `[x]` schema inference
* `[x]` execution
* `[x]` errors

---

## M6.7 Node Catalog API

Expose node definitions required by frontend.

At minimum:

* `[x]` type
* `[x]` version
* `[x]` category
* `[x]` display name
* `[x]` port metadata

---

## M6 Acceptance

A workflow containing one Excel Source node can be persisted, reloaded, schema-resolved, and executed.

---

# 12. Milestone M7 — Workflow Editor

Status:

`[x] DONE`

Goal:

Provide visual graph editing using React Flow.

Depends on:

M6.

---

## M7.1 Editor Canvas

* `[x]` React Flow integration
* `[x]` pan
* `[x]` zoom
* `[x]` fit view
* `[x]` node movement

---

## M7.2 Node Library

* `[x]` source category
* `[x]` transformation category
* `[x]` visualization category
* `[x]` searchable or clearly browsable node list
* `[x]` add node to canvas

Search functionality may remain simple.

---

## M7.3 Node Rendering

Node card should display:

* `[x]` node name
* `[x]` node type/icon
* `[x]` input ports
* `[x]` output ports
* `[x]` node state
* `[x]` error indicator

---

## M7.4 Selection

* `[x]` select node
* `[x]` deselect
* `[x]` selected state
* `[x]` configuration panel opens

---

## M7.5 Edges

* `[x]` connect nodes
* `[x]` disconnect edges
* `[x]` validate local compatibility
* `[x]` display connections clearly

Backend validation remains authoritative.

---

## M7.6 Delete Operations

* `[x]` delete node
* `[x]` delete edge
* `[x]` remove associated edges from local state
* `[x]` persist deletion

---

## M7.7 Workflow Persistence

* `[x]` load graph
* `[x]` map backend nodes to React Flow
* `[x]` save graph
* `[x]` debounced autosave
* `[x]` save status UI
* `[x]` failed-save UI

---

## M7.8 Editor State

Use:

* TanStack Query for server state;
* Zustand where appropriate for editor interaction state.

Do not duplicate persistent workflow state unnecessarily.

---

## M7 Acceptance

User can:

1. open workflow;
2. add Excel Source;
3. move it;
4. add another node;
5. connect nodes;
6. reload browser;
7. see same graph positions and edges.

---

# 13. Milestone M8 — Validation and Schema Propagation

Status:

`[x] DONE`

Goal:

Make graph configuration type-aware and fail early.

Depends on:

M6, M7.

---

## M8.1 Graph Validator

Implement:

* `[x]` duplicate node ID detection
* `[x]` invalid edge detection
* `[x]` missing node detection
* `[x]` port validation
* `[x]` required-input validation
* `[x]` maximum-input validation

---

## M8.2 Cycle Detection

* `[x]` detect cycles
* `[x]` reject cyclic graph execution
* `[x]` expose structured error
* `[x]` optionally prevent cycle in frontend

---

## M8.3 Topological Ordering

* `[x]` deterministic topological sort
* `[x]` tests for independent branches
* `[x]` tests for invalid DAG

---

## M8.4 Schema Propagation

Implement:

```text
source schema
→
node inference
→
downstream schema
```

* `[x]` schema resolution service
* `[x]` per-node schema result
* `[x]` validation errors
* `[x]` warnings

---

## M8.5 Schema Inference Modes

Implement support for:

* `[x]` STATIC
* `[x]` DATA_DEPENDENT
* `[x]` UNKNOWN_UNTIL_EXECUTION

---

## M8.6 Frontend Schema Integration

* `[x]` fetch resolved schemas
* `[x]` populate column selectors
* `[x]` show logical types
* `[x]` invalidate removed fields
* `[x]` display schema errors

---

## M8 Acceptance

Removing an upstream field causes affected downstream config to become visibly invalid without crashing the application.

---

# 14. Milestone M9 — Execution Engine

Status:

`[x] DONE`

Goal:

Execute target workflow branches deterministically.

Depends on:

M8.

---

## M9.1 ExecutionContext

Implement:

* `[x]` project ID
* `[x]` workflow ID
* `[x]` execution ID
* `[x]` repositories
* `[x]` storage
* `[x]` logger
* `[x]` settings
* `[x]` cache

---

## M9.2 Execution Planner

Given target node:

* `[x]` discover ancestors
* `[x]` create execution subgraph
* `[x]` topologically order dependencies
* `[x]` exclude unrelated branches

---

## M9.3 Runtime Input Routing

* `[x]` map edge outputs to target ports
* `[x]` support one-input nodes
* `[x]` support two-input nodes
* `[x]` validate missing runtime values

---

## M9.4 Node Execution

* `[x]` resolve NodeDefinition
* `[x]` resolve NodeExecutor
* `[x]` execute node
* `[x]` retain intermediate results
* `[x]` attribute errors to node

---

## M9.5 Execution Result

Define structured result containing:

* `[x]` status
* `[x]` output
* `[x]` schema
* `[x]` metadata
* `[x]` warnings
* `[x]` duration

---

## M9.6 Execution Errors

Support structured failures:

* `[x]` validation failure
* `[x]` source failure
* `[x]` transformation failure
* `[x]` type failure
* `[x]` internal failure

---

## M9.7 Cache

Implement simple cache.

* `[x]` cache key generation
* `[x]` source identity included
* `[x]` node version included
* `[x]` config included
* `[x]` upstream identity included
* `[x]` descendant invalidation behavior

Initial implementation may use memory.

---

## M9.8 Preview API

Implement:

```text
POST /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

with:

* `[x]` server-side row limit
* `[x]` schema
* `[x]` preview rows
* `[x]` duration
* `[x]` total rows where practical
* `[x]` structured errors

---

## M9.9 Frontend Preview

* `[x]` preview panel
* `[x]` table
* `[x]` schema
* `[x]` row count
* `[x]` execution duration
* `[x]` loading state
* `[x]` error state
* `[x]` empty result state

---

## M9 Acceptance

User can select an Excel Source node and preview data through the generic workflow execution system.

---

# 15. Milestone M10 — Core Transformation Nodes

Status:

`[x] DONE`

Goal:

Implement the most common data manipulation operations.

Depends on:

M9.

Implementation sequence:

1. Select Columns
2. Rename Columns
3. Filter
4. Sort
5. Limit
6. Calculated Column
7. Group By / Aggregate

Each node must include:

* config model;
* validation;
* schema inference;
* execution;
* frontend configuration;
* unit tests;
* integration tests.

---

## M10.1 Select Columns

* `[x]` backend definition
* `[x]` executor
* `[x]` schema inference
* `[x]` config UI
* `[x]` tests

Acceptance:

Output contains only selected fields in configured order.

---

## M10.2 Rename Columns

* `[x]` backend definition
* `[x]` collision validation
* `[x]` schema inference
* `[x]` executor
* `[x]` config UI
* `[x]` tests

---

## M10.3 Filter

Support:

Numeric:

* `[x]` equals
* `[x]` not equals
* `[x]` greater than
* `[x]` greater/equal
* `[x]` less than
* `[x]` less/equal

String:

* `[x]` equals
* `[x]` not equals
* `[x]` contains
* `[x]` does not contain
* `[x]` starts with
* `[x]` ends with

Null:

* `[x]` is null
* `[x]` is not null

Combination:

* `[x]` AND

Optional if stable:

* `[ ]` OR

---

## M10.4 Sort

* `[x]` multi-column sort
* `[x]` ascending
* `[x]` descending
* `[x]` schema unchanged
* `[x]` tests

---

## M10.5 Limit

* `[x]` positive limit
* `[x]` reject invalid limit
* `[x]` schema unchanged
* `[x]` tests

---

## M10.6 Formula Engine

Before Calculated Column:

* `[x]` select parser strategy
* `[x]` record ADR
* `[x]` parse allowlisted arithmetic
* `[x]` build safe AST
* `[x]` reject arbitrary function access
* `[x]` reject imports/code execution
* `[x]` validate column references
* `[x]` infer output type

Security tests are mandatory.

---

## M10.7 Calculated Column

* `[x]` output field name
* `[x]` expression
* `[x]` formula validation
* `[x]` executor
* `[x]` schema inference
* `[x]` config UI
* `[x]` error UI
* `[x]` tests

Canonical acceptance:

```text
revenue = quantity * price
```

---

## M10.8 Group By / Aggregate

Group dimensions:

* `[x]` one field
* `[x]` multiple fields

Aggregations:

* `[x]` count

* `[x]` sum

* `[x]` average

* `[x]` min

* `[x]` max

* `[x]` distinct count if practical

* `[x]` generated output names

* `[x]` custom output names where appropriate

* `[x]` type validation

* `[x]` schema inference

* `[x]` config UI

* `[x]` tests

Canonical acceptance:

```text
group by category
sum revenue
```

---

## M10 Quality Gate

Verified 2026-09-10: browser-built Excel -> Filter -> Calculated Column -> Group By,
preview and reload restoration. 155 backend tests, 14 frontend tests, 4 browser scenarios.


Canonical pipeline must work:

```text
ExcelSource
→ Filter
→ CalculatedColumn
→ GroupBy
```

User must be able to preview final aggregated result.

---

# 16. Milestone M11 — Advanced Transformation Nodes

Status:

`[x] DONE`

Goal:

Complete required MVP transformation set.

Depends on:

M10.

---

## M11.1 Join

Support:

* `[x]` two dataset inputs
* `[x]` inner join
* `[x]` left join
* `[x]` one join key
* `[x]` compatible key validation
* `[x]` duplicate field strategy
* `[x]` schema inference
* `[x]` executor
* `[x]` config UI
* `[x]` tests

Optional after stable implementation:

* `[ ]` multi-column joins
* `[ ]` right join
* `[ ]` full outer join

---

## M11.2 Union

* `[x]` two inputs
* `[x]` matching column validation
* `[x]` type compatibility
* `[x]` deterministic column order
* `[x]` executor
* `[x]` config UI
* `[x]` tests

---

## M11.3 Pivot

* `[x]` index/group field
* `[x]` pivot field
* `[x]` value field
* `[x]` aggregation
* `[x]` data-dependent schema handling
* `[x]` preview
* `[x]` config UI
* `[x]` tests

---

## M11.4 Advanced Node Failure Cases

Test:

* `[x]` incompatible join keys
* `[x]` missing join key
* `[x]` duplicate column conflict
* `[x]` incompatible union
* `[x]` pivot with unexpected values
* `[x]` empty datasets

---

## M11 Acceptance

Verified 2026-09-10: 9 focused node/schema tests and browser Join/Union/Pivot/downstream field-selection scenario.


All transformation nodes listed in `PRODUCT_SPEC.md` operate through the common NodeExecutor architecture.

---

# 17. Milestone M12 — Visualization System

Status:

`[x] DONE`

Goal:

Create reusable semantic visualization system.

Depends on:

M10.

M11 is not required for initial visualization work.

---

## M12.1 Visualization Domain

Implement:

* `[x]` Visualization entity
* `[x]` VisualizationSpec
* `[x]` semantic field encodings
* `[x]` number formatting config
* `[x]` chart configuration validation

---

## M12.2 Visualization Persistence Decision

Finalize and record:

* `[x]` relation between workflow visualization nodes and persisted visualization entities
* `[x]` source node reference behavior
* `[x]` deletion semantics

---

## M12.3 Table

* `[x]` semantic config
* `[x]` bounded data endpoint
* `[x]` frontend table renderer
* `[x]` loading
* `[x]` empty state
* `[x]` errors

---

## M12.4 KPI

Support:

* `[x]` metric field
* `[x]` single-value result
* `[x]` title
* `[x]` number format
* `[x]` frontend renderer

---

## M12.5 Bar Chart

* `[x]` X field
* `[x]` Y field
* `[x]` title
* `[x]` legend
* `[x]` frontend ECharts adapter

---

## M12.6 Line Chart

* `[x]` X field
* `[x]` Y field
* `[ ]` optional series (deferred; not required for MVP)
* `[x]` date handling
* `[x]` renderer

---

## M12.7 Area Chart

* `[x]` line-compatible semantic config
* `[x]` area rendering
* `[x]` tests

---

## M12.8 Pie / Donut

* `[x]` category
* `[x]` value
* `[x]` pie mode
* `[x]` donut mode
* `[x]` renderer

---

## M12.9 Scatter

* `[x]` numeric X
* `[x]` numeric Y
* `[x]` type-aware selector
* `[x]` renderer

---

## M12.10 Chart Data Limits

* `[x]` server-side maximum chart points
* `[x]` controlled warning/error behavior
* `[x]` no silent arbitrary aggregation

---

## M12.11 Visualization Invalidations

Test:

```text
upstream field removed
→
visualization invalid
→
clear UI error
```

---

## M12 Acceptance

Canonical aggregated dataset can produce:

* Bar Chart;
* KPI.

Both must survive project reload.

---

# 18. Milestone M13 — Dashboard System

Status:

`[x] DONE`

Goal:

Allow visualizations to be arranged into persistent dashboards.

Depends on:

M12.

---

## M13.1 Dashboard Persistence

Backend CRUD:

* `[x]` create dashboard
* `[x]` list dashboards
* `[x]` get dashboard
* `[x]` rename dashboard
* `[x]` delete dashboard

---

## M13.2 Dashboard Widget Persistence

Support:

* `[x]` visualization ID
* `[x]` title
* `[x]` x
* `[x]` y
* `[x]` width
* `[x]` height
* `[x]` widget config

---

## M13.3 Dashboard Layout Library

* `[x]` evaluate suitable grid library
* `[x]` record ADR
* `[x]` integrate library

---

## M13.4 Dashboard Editor

* `[x]` empty state
* `[x]` add visualization
* `[x]` remove visualization
* `[x]` drag
* `[x]` resize
* `[x]` save layout
* `[x]` loading states

---

## M13.5 Dashboard Rendering

Per-widget:

* `[x]` loading
* `[x]` success
* `[x]` empty
* `[x]` error

One failed widget must not break unrelated widgets.

---

## M13.6 Dashboard Persistence

Verify:

```text
move
resize
save
reload
```

produces the same layout.

---

## M13.7 Multiple Dashboards

If architecture remains simple:

* `[x]` support multiple dashboards per project

Otherwise:

* Not applicable: multiple dashboards are implemented.

At least one dashboard is mandatory.

---

## M13 Acceptance

Create dashboard containing:

* Revenue by Category Bar Chart
* Total Revenue KPI

Move and resize widgets.

Reload and verify layout.

---

# 19. Milestone M14 — Persistence and Recovery Hardening

Status:

`[x] DONE`

Goal:

Ensure user work survives expected application lifecycle events.

Depends on:

M13.

---

## M14.1 Browser Reload

Verify persistence of:

* `[x]` project
* `[x]` sources
* `[x]` workflow
* `[x]` nodes
* `[x]` positions
* `[x]` edges
* `[x]` configs
* `[x]` visualizations
* `[x]` dashboards
* `[x]` widget layouts

---

## M14.2 Backend Restart

* `[x]` restart backend
* `[x]` reopen project
* `[x]` execute workflow again

---

## M14.3 Database Restart

* `[x]` restart PostgreSQL
* `[x]` verify persistent volume
* `[x]` reload project

---

## M14.4 Source Storage Restart

* `[x]` verify workbook remains
* `[x]` source can execute after container restart

---

## M14.5 Broken References

Test and resolve:

* `[x]` missing source artifact
* `[x]` visualization references deleted node
* `[x]` widget references deleted visualization
* `[x]` edge references missing node

---

## M14.6 Autosave Reliability

* `[x]` debounce behavior
* `[x]` save-failure feedback
* `[x]` retry behavior if appropriate
* `[x]` no silent loss of unsaved state

---

## M14 Acceptance

Canonical project survives full normal stack restart.

---

# 20. Milestone M15 — QA, Security, Performance, UX Hardening

Status:

`[x] DONE`

Goal:

Review the product critically before MVP release.

Depends on:

M14.

---

## M15.1 Dedicated QA Pass

Act as an independent QA engineer.

Do not assume implementation choices are correct.

Create defects for all discovered issues.

---

## M15.2 Excel QA

Test:

* `[x]` unsupported extension
* `[x]` corrupt workbook
* `[x]` empty workbook
* `[x]` empty sheet
* `[x]` large sheet
* `[x]` multiple sheets
* `[x]` blank headers
* `[x]` duplicate headers
* `[x]` unicode
* `[x]` nulls
* `[x]` mixed types
* `[x]` dates

---

## M15.3 Workflow QA

Test:

* `[x]` disconnected node
* `[x]` missing input
* `[x]` invalid port
* `[x]` cycle attempt
* `[x]` node deletion
* `[x]` edge deletion
* `[x]` upstream schema changes
* Not applicable: node duplication is optional and deferred.
* `[x]` browser reload during edits

---

## M15.4 Transformation QA

Test:

* `[x]` empty filter result
* `[x]` divide by zero behavior
* `[x]` invalid formula
* `[x]` unknown field
* `[x]` null arithmetic
* `[x]` sort with null
* `[x]` group empty dataset
* `[x]` incompatible aggregation
* `[x]` join missing key
* `[x]` join incompatible type
* `[x]` union mismatch
* `[x]` pivot unusual categories

---

## M15.5 Visualization QA

Test:

* `[x]` empty result
* `[x]` one-row result
* `[x]` invalid field
* `[x]` large category count
* `[x]` large point count
* `[x]` null values
* `[x]` date values
* `[x]` negative numbers
* `[x]` invalid numeric format

---

## M15.6 Dashboard QA

Test:

* `[x]` empty dashboard
* `[x]` add widget
* `[x]` remove widget
* `[x]` drag
* `[x]` resize
* `[x]` reload
* `[x]` failed widget
* `[x]` multiple widgets sharing upstream data

---

## M15.7 Formula Security QA

Prove that formulas cannot execute:

* `[x]` Python code
* `[x]` imports
* `[x]` filesystem access
* `[x]` shell commands
* `[x]` network access
* `[x]` arbitrary attributes/callables

---

## M15.8 Upload Security QA

Test:

* `[x]` fake extension
* `[x]` path traversal filename
* `[x]` oversized file
* `[x]` invalid source ID
* `[x]` `.xlsm` macro remains inert

---

## M15.9 API Robustness

Test:

* `[x]` invalid UUID
* `[x]` nonexistent project
* `[x]` malformed JSON
* `[x]` domain validation
* `[x]` unexpected server error format
* `[x]` request correlation

---

## M15.10 Performance Pass

Measure representative workload.

Record:

* `[x]` upload time
* `[x]` workbook inspection time
* `[x]` source preview time
* `[x]` filter preview time
* `[x]` group-by preview time
* `[x]` dashboard load time
* `[x]` browser responsiveness

Do not optimize without identified bottleneck.

---

## M15.11 Obvious Performance Problems

Fix issues such as:

* `[x]` unnecessary workbook reload
* `[x]` duplicate executions
* `[x]` full dataset sent to frontend
* `[x]` repeated schema execution
* `[x]` inefficient Python row iteration

---

## M15.12 UX Pass

Review whether user can understand:

* `[x]` where to upload
* `[x]` how to add node
* `[x]` how to connect
* `[x]` how to configure
* `[x]` how to preview
* `[x]` why a node failed
* `[x]` how to create visualization
* `[x]` how to add to dashboard
* `[x]` whether changes are saved

---

## M15.13 Defect Classification

Classify all defects:

* P0
* P1
* P2
* P3

Rules:

* `[x]` all P0 fixed
* `[x]` all P1 fixed
* `[x]` important P2 fixed
* `[x]` deferred P2/P3 documented

---

# 21. Milestone M16 — MVP Release Gate

Status:

`[x] DONE`

Goal:

Prove the complete product meets Definition of Done.

Depends on:

M15.

---

## M16.1 Clean Environment Test

From a clean environment:

* `[x]` copy `.env.example`
* `[x]` start PostgreSQL
* `[x]` run migrations
* `[x]` start backend
* `[x]` start frontend
* `[x]` verify health
* `[x]` verify readiness

Prefer verifying through documented Docker Compose workflow.

---

## M16.2 Canonical Acceptance Workbook

Create or verify deterministic:

```text
fixtures/excel/sales.xlsx
```

Required columns:

```text
order_id
order_date
country
category
product
quantity
price
```

Include:

* multiple countries;
* multiple categories;
* dates;
* nulls;
* representative numeric values.

---

## M16.3 Canonical End-to-End Journey

Execute:

### Project

* `[x]` Create project `Sales Analysis`

### Data

* `[x]` Upload `sales.xlsx`
* `[x]` Select `Sales`
* `[x]` Preview data

### Workflow

Build:

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

Filter:

```text
country = Korea
```

Calculated column:

```text
revenue = quantity * price
```

Group By:

```text
dimension = category
aggregation = SUM(revenue)
```

Bar Chart:

```text
X = category
Y = sum_revenue
```

Verify:

* `[x]` graph valid
* `[x]` preview valid
* `[x]` chart renders

---

## M16.4 KPI Acceptance

Create KPI showing:

```text
Total Revenue
```

Verify correct numeric value.

---

## M16.5 Dashboard Acceptance

Create dashboard.

Add:

* `[x]` Bar Chart
* `[x]` KPI

Then:

* `[x]` move Bar Chart
* `[x]` resize Bar Chart
* `[x]` move KPI
* `[x]` save

---

## M16.6 Browser Reload Acceptance

Reload.

Verify:

* `[x]` project
* `[x]` source
* `[x]` workflow
* `[x]` nodes
* `[x]` edges
* `[x]` node config
* `[x]` chart
* `[x]` KPI
* `[x]` dashboard
* `[x]` layout

---

## M16.7 Stack Restart Acceptance

Restart normal application stack.

Verify:

* `[x]` project remains
* `[x]` workbook remains
* `[x]` workflow executes
* `[x]` dashboard renders

---

## M16.8 Full Automated Checks

Run:

Backend:

* `[x]` unit tests
* `[x]` integration tests
* `[x]` lint/format checks

Frontend:

* `[x]` tests
* `[x]` lint
* `[x]` typecheck
* `[x]` production build

E2E:

* `[x]` canonical journey

---

## M16.9 Migration Validation

From empty database:

* `[x]` run all migrations
* `[x]` verify application startup
* `[x]` run critical persistence tests

---

## M16.10 Documentation Review

Verify:

* `[x]` `AGENTS.md` current
* `[x]` `PRODUCT_SPEC.md` current
* `[x]` `ARCHITECTURE.md` current
* `[x]` `TASKS.md` current
* `[x]` `STATUS.md` current
* `[x]` `DECISIONS.md` current
* `[x]` `README.md` startup works

---

## M16.11 Final Defect Gate

Required:

```text
P0 = 0
P1 = 0
```

Remaining P2/P3 must be documented.

---

## M16.12 Release Status

Only after all M16 acceptance criteria pass:

* `[x]` mark MVP COMPLETE in `STATUS.md`
* `[x]` update README limitations
* `[x]` record final MVP test state
* `[x]` mark milestone DONE

---

# 22. Technical Debt Passes

Technical debt review should occur after major architecture-heavy milestones.

Recommended after:

* M6
* M10
* M13
* M15

Review:

* duplication;
* oversized modules;
* architecture violations;
* missing types;
* poor errors;
* missing tests;
* unstable interfaces;
* inefficient execution;
* undocumented decisions.

Only fix debt that:

* blocks upcoming work;
* creates correctness risk;
* creates serious maintainability problems;
* violates architecture.

Do not perform aesthetic rewrites.

---

# 23. Decision Checkpoints

The following decisions must be recorded in `DECISIONS.md` before the related implementation becomes deeply coupled.

## ADR-041

Column identity strategy.

Required before:

M5 completion.

---

## ADR-050

Workflow graph persistence update strategy.

Required before:

M6 completion.

---

## ADR-010

Node registry structure.

Required before:

M6 completion.

---

## ADR-042

Formula parser / safe expression engine.

Required before:

M10 Calculated Column.

---

## ADR-043

Visualization persistence model.

Required before:

M12.

---

## ADR-044

Dashboard layout library.

Required before:

M13.

---

## ADR-052

Execution cache strategy.

Required before:

M9 completion.

---

## ADR-046

Excel worksheet loading strategy.

Required before:

M4/M5 completion.

---

## ADR-053

Frontend/backend API type synchronization.

Required before substantial frontend API integration.

---

# 24. Optional MVP Features

These features may be implemented only if they do not materially delay release:

* `[ ]` OR condition grouping
* `[ ]` workflow node duplication
* `[ ]` undo/redo
* `[x]` multiple dashboards
* `[ ]` right/full joins
* `[ ]` multi-column join
* `[ ]` advanced formula functions
* `[ ]` graph auto-layout

Optional tasks must never become accidental release blockers unless `PRODUCT_SPEC.md` is explicitly updated.

---

# 25. Explicit Post-MVP Backlog

Do not implement during MVP without product-scope change.

## Data Sources

* `[ ]` CSV
* `[ ]` PostgreSQL
* `[ ]` MySQL
* `[ ]` SQL Server
* `[ ]` REST API
* `[ ]` Google Sheets

## Platform

* `[ ]` authentication
* `[ ]` users
* `[ ]` organizations
* `[ ]` roles
* `[ ]` permissions
* `[ ]` project sharing

## Execution

* `[ ]` background queue
* `[ ]` scheduled refresh
* `[ ]` distributed workers
* `[ ]` Redis
* `[ ]` persistent execution history

## BI

* `[ ]` dashboard filters
* `[ ]` slicers
* `[ ]` drill-down
* `[ ]` cross-filtering
* `[ ]` semantic metrics
* `[ ]` reusable datasets

## Export

* `[ ]` CSV export
* `[ ]` Excel export
* `[ ]` PDF dashboard export
* `[ ]` image export
* `[ ]` PowerPoint export

## AI

* `[ ]` AI workflow creation
* `[ ]` natural language queries
* `[ ]` formula generation
* `[ ]` chart recommendations
* `[ ]` automatic insights

---

# 26. Autonomous Task Selection Algorithm

When selecting the next task:

1. identify the first incomplete milestone whose prerequisites are complete;
2. locate the first actionable TODO task;
3. skip tasks explicitly marked BLOCKED;
4. inspect whether additional technical subtasks are needed;
5. add those subtasks if they are within existing scope;
6. mark active task IN PROGRESS;
7. implement it;
8. test it;
9. mark DONE only after acceptance criteria pass;
10. continue.

Do not jump to visually interesting frontend work if foundational dependency tasks are incomplete.

---

# 27. Blocker Handling

If blocked:

1. mark task `[!] BLOCKED`;
2. explain blocker in `STATUS.md`;
3. identify whether another independent task can proceed;
4. continue independent work if safe;
5. stop only when no meaningful unblocked work remains.

Examples:

```text
BLOCKED: external credential required
```

is valid.

```text
BLOCKED: unsure which button color to use
```

is not valid.

---

# 28. Failed Task Handling

If implementation attempt fails:

1. do not mark task DONE;
2. preserve useful diagnostics;
3. identify root cause;
4. add regression test where appropriate;
5. implement corrected approach;
6. rerun relevant checks;
7. update `STATUS.md` if work spans sessions.

---

# 29. Regression Policy

When a previously completed milestone breaks because of later work:

1. reopen the affected task or create regression task;
2. mark it IN PROGRESS;
3. fix the regression;
4. rerun affected quality gates;
5. only then continue.

Completed status does not override evidence of a real regression.

---

# 30. Progress Reporting

`STATUS.md` should summarize progress rather than duplicating this entire file.

This file contains roadmap truth.

`STATUS.md` contains current execution truth.

Example:

```text
Current milestone:
M10 — Core Transformation Nodes

Current task:
M10.6 Formula Engine

Completed:
M0–M9

Known blockers:
None

Tests:
Backend 142 passing
Frontend 61 passing
E2E 4 passing

Next:
M10.7 Calculated Column
```

---

# 31. MVP Completion Rule

Do not declare completion because:

* most screens exist;
* the happy path works once;
* screenshots look finished;
* code compiles;
* most tests pass.

MVP is complete only when M16 passes in full.

The highest priority is a reliable end-to-end analytical workflow, not the number of implemented files.

## Release evidence (2026-09-11)

Required M0-M16 acceptance is complete. See docs/QA_REPORT.md for test counts,
clean PostgreSQL installation, full browser/restart evidence, findings and deferred limitations.
Optional OR, advanced functions, multi-key/right/full Join, multiple series, duplication,
undo/redo and automatic layout remain outside the required release gate.
