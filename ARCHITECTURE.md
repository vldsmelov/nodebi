# ARCHITECTURE.md

## Exact calculation navigation (ADR-082)

Dashboard widget links use workflow/node URL parameters. WorkflowPage verifies project
membership before resolving a requested graph; WorkflowEditor selects the requested node,
expands its group and highlights ancestors without changing graph persistence. Missing targets
are visible errors. Browser history and session drafts retain the existing dashboard state.

## Atomic visualization authoring (ADR-081)

dashboard_authoring composes graph/index and dashboard persistence in one transaction, with
project -> dashboard -> workflow locking and both revision checks. save_graph and DashboardService
save accept internal commit=False for this composition; their existing public paths still commit.
The additive dashboard visualizations endpoint creates a normal node/edge and adds/rebinds one
widget. CreateVisualizationDialog preserves stable IDs until success/explicit reload and reuses
the common visualization form. No copy of semantic config is stored in dashboard widgets.


## Dashboard visualization editing (ADR-080)

VisualizationSettingsDialog reuses the schema-aware workflow visualization form. It loads a
matching workflow/schema revision and changes one node config through saveWorkflow CAS. Saved
usages come from project dashboards; layout/title drafts remain in DashboardEditor untouched.
Errors preserve the modal draft; explicit reload discards it. No dashboard semantic copy or
multi-resource write is introduced. Successful saves invalidate all affected result caches.


## Saved calculation scope (ADR-079)

CalculationScopePanel uses calculation-scope to inspect saved Window/Group By ancestors and
Filter application points. Reachability is cycle guarded; after-calculation paths are the
intersection of calculation descendants and selected-node ancestors, keeping other Join inputs
separate. WorkflowEditor uses transient node/edge/selection snapshots for highlights and the
existing group projection/viewport functions. No view action is serialized into workflow state.


## Analytical authoring (ADR-078)

AnalyticsDialog stages share/rank configuration over an exact saved input schema. analytics-plan
produces PlannedStep records with stable UUID references; appendUnaryChain checks the proposed
branch before one graph update. Share uses Window + Calculated Column, rank uses Window, and
optional parameter selection uses a trailing Filter. The existing backend registry remains the
only execution model. Upstream filter explanations traverse actual input edges with cycle guards.


## Formula source presentation (ADR-077)

field-provenance resolves value origins by node and field identity from saved graph schemas.
Join ports and Union name alignment are explicit. It never parses expressions or executes data.
WorkflowEditor supplies origins only for its exact-current schema; FormulaEditor adds searchable
source labels and readable details. Missing metadata is disclosed, not inferred from global IDs.


## Grouped Unpivot authoring (ADR-076)

UnpivotConfig.labels is an optional source-ID-to-label map, validated as a subset of selected
value fields. Execution applies it only to field_name; stable field_id/provenance are unchanged.
GroupedUnpivotDialog stages identifiers, membership and labels. grouped-unpivot creates ordinary
unary branches through appendUnaryChain, then adds explicit Union left/right connections using
shared graph checks. WorkflowEditor applies the complete graph atomically through history and
revision-aware autosave. No recipe is persisted; node forms edit the generated graph directly.

## Preparation compiler (ADR-075)

preparation-plan maps a saved schema and transient rows to PlannedStep records with actual node
IDs. PreparationDialog previews these steps and submits the same plan to WorkflowEditor.
appendUnaryChain builds a complete proposed graph before state changes; both preparation and
calculated-field tables use it. Normal serialization, autosave, conflicts and history apply.
The plan contains only registered standard node types. Null-filling creates new calculated IDs;
final Select/Rename removes helpers and names the result. Integer fills use string coalesce and
explicit integer conversion to preserve precision without changing the formula engine.

## Calculated-field table (ADR-074)

calculated-chain constructs ordinary nodes/edges and reconstructs actual unbranched chains.
CalculatedFieldsDialog stages rows and uses FormulaEditor with the source schema plus stable
IDs of prior rows. Their types are explicitly unknown until backend inference. WorkflowEditor
applies a snapshot-checked batch through its existing history/autosave path. No separate recipe
is persisted. Editing existing chains changes config only; canvas edits remain authoritative.

## Named formula presentation (ADR-073)

FormulaEditor owns cursor/search interaction; formula-presentation recognizes canonical bracket
references while leaving quoted text intact. It resolves labels/types from input schemas,
never evaluates expressions. Token selection maps to canonical offsets; inserting a field
updates the existing expression config through ordinary autosave/history. Schema renames only
change presentation. No extra persisted display expression or formula source of truth exists.

## Configuration feedback (ADR-072)

WorkflowGraphValidator converts Pydantic structured errors to individual GraphIssue entries
without input dumps, library URLs or internal contexts. Each issue retains its node and config
path; schema and execution validation share this result. The frontend localizes controlled
messages and common configuration path labels, displaying list positions from one. Nested
issues and diagnostics survive English rendering too. No public shape or persistence change.

## Presentation groups and editor panels (ADR-071)

Group membership persists in node.ui.group. graph-groups derives hidden members, synthetic
proxy cards and boundary edges solely for rendering; serialization always uses original nodes
and edges. Proxy change events cannot mutate graph state. Each boundary handle retains the
original node/port identity. Group creation/rename/dissolution follows normal graph history.
GroupPanel provides member navigation; selecting a hidden member expands its group.
EditorPanels stores bounded widths and collapsed names separately in sessionStorage by workflow.
These view preferences do not change revisions, semantic configuration or execution caches.

## Graph history and layout (ADR-070)

GraphHistory observes serialized drafts, coalesces focused text edits/dragging and supplies
undo/redo drafts to the existing editor state and autosave writer. Revisions are never restored
from history. Selection, preview values and dependency highlighting do not enter history.
Graph layout computes topological layers and measured spacing; only positions are persisted.
protect_used_visualizations locks removed visualization rows before graph mutation and rejects
attached widgets with a typed 409 error, sharing the row-lock protocol of dashboard saves.

## Readable graph interaction (ADR-069)

The shared graph-interaction module resolves presentation labels and validates connection edits.
Optional node.ui.label changes only presentation; semantic output-field names stay in config.
Cards, finder and input selectors use the same label fallback. Dependency view is derived from
edges and applied only to React Flow rendering, outside serialized nodes/edges. Next-step
creation batches node/edge edits; input replacement validates the final edge set, preserving
port cardinality and DAG checks. Backend validation and revision-checked saves remain unchanged.

## Large-graph node access (ADR-068)

NodeFinder filters the current editor nodes locally by configured label/type/ID. Selection
opens the shared configuration panel and fits the React Flow viewport to the selected node.
Selection/viewport stay outside serialized graph state; pending edits remain in the autosave
draft. Reference authoring recipes are test tooling, with no application runtime dependency.

## Dashboard view state and navigation (ADR-066)

DashboardConfiguration is a typed JSON value persisted with dashboard revision (migration 0006).
It declares parameters, explicit workflow bindings, optional node/field choice sources and parent
links. WidgetConfig owns navigation actions; workflow visualization config still owns data fields
and presentation. context_column_ids adds stable row identities to visualization results and is
hidden in rendered tables. Clicked row fields are addressed by column ID, not labels or row text.

Dashboard page URL owns selected dashboard and typed values. Local layout/configuration drafts
remain separate. Applying filters does not write persistence; values map to the appropriate
workflow's parameter context. Result/query identity includes values so late slices cannot replace
the current one. The generic node-values application service executes an ordinary node, extracts
one distinct field, applies literal search and reports truncation. Schema/type and project checks
remain in existing domain/application layers; there are no reference-specific runtime rules.


## Typed workflow parameters (ADR-065)

Workflow JSON declarations are revision-protected; runtime values are separate typed inputs
on preview and POST visualization requests. ExecutionContext carries definitions/resolved
values without persistence dependencies. Filter validates declaration/column compatibility
during schema inference and requires its value during execution. Only dependent Filter cache
keys include referenced values; downstream keys inherit the change. Unrelated values never
invalidate Excel materialization. UI exposes declaration/default and temporary preview inputs;
parameter changes remount result panels, leaving the graph/autosave state intact.
Migration 0005 adds an empty-default JSON column. Legacy saves omitting declarations preserve
them. Dashboard parameter bindings/navigation are specified in ADR-066 above.


## Presentation extensions (ADR-064)

ADR-067 adds opt-in `{parameter}` title templates and a stable-field/parameter highlight pair.
Schema inference validates declared references and compatible identity types. Rendering adds
resolved title/highlight metadata after ordinary node execution; it never filters or reorders
the comparison population. Table hidden context can carry the highlighted identifier. Legacy
literal titles remain literal. Selection uses the same URL/request context as dashboard filters.

Workflow-owned VisualizationConfig includes vertical/horizontal Bar orientation and
column-ID-keyed numeric formats. The typed rendering result carries these settings.
KPI accepts a single numeric or string value; all other chart numeric checks remain.
The frontend formats ratios, counts and amounts without modifying prepared values.
Dashboard widgets continue to store references and layout only. Existing JSON config
accepts the new optional fields with compatible defaults; no migration is needed.


## Constructor preparation extensions (ADR-063)

WorksheetLayout is a frozen value passed from Excel Source through SourceAccess to
the workbook reader. Header start/count and row-number selection participate in
immutable source cache identity. A defused OOXML scan determines actual content bounds,
merged ranges and missing formula caches before bounded openpyxl materialization.
The worksheet part-path access is isolated in the reader (pinned openpyxl).
Excel preview and execution share layout preparation. Logical column IDs remain
positional; original header levels and source row identity are explicit metadata.

Convert Types, Unpivot and Window implement the ordinary NodeExecutor contract.
They have no storage/session dependencies. Convert Types preserves column identity;
Unpivot emits stable field IDs separately from display labels; Window keeps input
fields and adds a partition sum or an ordered row number. Each is configured through
the editor registry. Formulas compile an allowlisted typed AST into Polars; strings,
trim/lower, coalesce/nullif and safe_divide share inference and execution logic.

## 1. Purpose

This document defines the technical architecture of the Node BI MVP.

It describes:

* system boundaries;
* frontend architecture;
* backend architecture;
* persistence model;
* workflow representation;
* node contracts;
* execution model;
* schema propagation;
* dataset handling;
* visualization architecture;
* dashboard architecture;
* caching;
* storage;
* API conventions;
* error handling;
* security boundaries;
* testing boundaries;
* deployment model.

This document is the primary technical source of truth for the project.

Product behavior is defined in `PRODUCT_SPEC.md`.

Agent behavior is defined in `AGENTS.md`.

---

# 2. Architecture Goals

The architecture must optimize for:

1. correctness of data transformations;
2. clear separation between UI and execution;
3. persistence of user work;
4. extensible node system;
5. deterministic workflow execution;
6. understandable errors;
7. testability;
8. maintainability;
9. future support for additional data sources;
10. reasonable performance for workbook-scale data.

The MVP must not optimize for:

* distributed execution;
* multi-region deployment;
* enterprise-scale concurrency;
* streaming data;
* massive data warehouses;
* complex multi-tenant isolation.

---

# 3. Core Architectural Principle

The frontend describes analytical intent.

The backend executes analytical intent.

The frontend must not be the authoritative execution engine for data transformations.

Logical flow:

```text
User
  ↓
Frontend
  ↓
Workflow Definition
  ↓
Backend API
  ↓
Workflow Validation
  ↓
Schema Resolution
  ↓
Execution Planning
  ↓
Node Executors
  ↓
Dataset Engine
  ↓
Execution Result
  ↓
Frontend Visualization
```

---

# 4. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│  Next.js / React                                            │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Project UI  │  │ Workflow UI   │  │ Dashboard Editor │  │
│  └─────────────┘  └───────────────┘  └──────────────────┘  │
│          │                 │                  │              │
│          └─────────────────┴──────────────────┘              │
│                            │                                │
│                       API Client                            │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTP / JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│                                                             │
│ FastAPI                                                     │
│                                                             │
│ ┌─────────────────────── Application Layer ───────────────┐ │
│ │ Project Service                                          │ │
│ │ Source Service                                           │ │
│ │ Workflow Service                                         │ │
│ │ Execution Service                                        │ │
│ │ Dashboard Service                                        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                             │                               │
│ ┌──────────────────────── Domain Layer ───────────────────┐ │
│ │ Dataset / Schema                                         │ │
│ │ Workflow / Node / Edge                                   │ │
│ │ Node Registry                                            │ │
│ │ Graph Validator                                          │ │
│ │ Execution Planner                                        │ │
│ │ Node Executors                                           │ │
│ │ Formula Engine                                           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                             │                               │
│ ┌──────────────────── Infrastructure Layer ───────────────┐ │
│ │ PostgreSQL                                               │ │
│ │ File Storage                                             │ │
│ │ Polars                                                   │ │
│ │ DuckDB                                                   │ │
│ │ Excel Reader                                             │ │
│ │ Cache                                                    │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. Technology Stack

## 5.1 Frontend

Primary stack:

* Next.js
* React
* TypeScript
* React Flow
* TanStack Query
* Zustand
* ECharts
* Tailwind CSS
* shadcn/ui

Responsibilities:

* user interaction;
* graph editing;
* configuration forms;
* API communication;
* previews;
* chart rendering;
* dashboard layout.

---

# 5.2 Backend

Primary stack:

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic
* Polars
* DuckDB where appropriate
* openpyxl for workbook metadata and workbook-specific operations

Responsibilities:

* persistence;
* workbook ingestion;
* workflow validation;
* schema inference;
* transformation execution;
* preview generation;
* execution state;
* safe formula evaluation.

---

# 5.3 Database

Primary relational database:

PostgreSQL.

PostgreSQL stores product state, not bulk workbook contents.

Examples of persistent state:

* projects;
* source metadata;
* workbook metadata;
* workflow definitions;
* nodes;
* edges;
* visualization configuration;
* dashboards;
* dashboard layouts.

Large datasets should not be serialized into PostgreSQL as the normal execution mechanism.

---

# 5.4 File Storage

MVP implementation:

Local filesystem.

Access must occur through:

`StorageProvider`

Future implementations may include:

* S3;
* MinIO;
* Azure Blob Storage.

Business logic must not directly depend on absolute local filesystem paths.

---

# 6. Repository Structure

Recommended structure:

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
├── tests/
│   └── e2e/
│
├── fixtures/
│   └── excel/
│
├── docker/
└── docker-compose.yml
```

Exact directory names may change when justified, but the separation between:

* API;
* application;
* domain;
* infrastructure;

should remain clear.

---

# 7. Backend Layering

The backend should use four conceptual layers.

## 7.1 API Layer

Responsible for:

* HTTP routing;
* request parsing;
* authentication hooks in the future;
* response serialization;
* mapping application errors to HTTP responses.

The API layer must not contain dataframe transformation logic.

---

## 7.2 Application Layer

Responsible for use cases.

Examples:

* create project;
* upload source;
* create workflow;
* preview node;
* execute workflow;
* save dashboard.

Application services orchestrate domain and infrastructure components.

---

## 7.3 Domain Layer

Contains core BI concepts.

Examples:

* DatasetSchema;
* ColumnSchema;
* Workflow;
* NodeInstance;
* WorkflowEdge;
* NodeDefinition;
* NodeExecutor;
* ExecutionPlan;
* ExecutionResult.

The domain layer should be largely independent from FastAPI and SQLAlchemy.

---

## 7.4 Infrastructure Layer

Contains implementations that interact with external systems.

Examples:

* PostgreSQL repositories;
* local storage provider;
* Excel reader;
* Polars execution;
* DuckDB integration;
* cache implementation.

---

# 8. Core Domain Model

The primary domain relationships are:

```text
Project
 │
 ├── DataSource*
 │
 ├── Workflow*
 │    ├── Node*
 │    └── Edge*
 │
 ├── Visualization*
 │
 └── Dashboard*
      └── DashboardWidget*
```

---

# 9. Project

Conceptual model:

```text
Project

id
name
created_at
updated_at
```

A Project is the ownership boundary for MVP analytical state.

Every persistent source, workflow, visualization, and dashboard belongs to a project.

---

# 10. Data Source Model

A source represents an uploaded external data artifact.

Conceptual fields:

```text
DataSource

id
project_id
type
name
storage_key
original_filename
file_size
status
metadata
created_at
updated_at
```

MVP source type:

`excel`

Possible future source types:

* csv;
* postgres;
* mysql;
* api;
* google_sheets.

---

# 11. Excel Workbook Metadata

Workbook-specific metadata should be stored separately or inside structured source metadata.

Conceptually:

```text
WorkbookMetadata

source_id
sheet_names
workbook_properties
inspection_status
```

Worksheet metadata may include:

```text
WorksheetMetadata

sheet_name
estimated_rows
estimated_columns
columns
```

Do not persist full worksheet row data as metadata.

---

# 12. Dataset

`Dataset` is the runtime abstraction passed between data-processing nodes.

A Dataset is not an uploaded Excel file.

Conceptually:

```python
Dataset:
    schema: DatasetSchema
    frame: execution-engine-specific data representation
    metadata: DatasetMetadata
```

For MVP, the physical representation will normally be backed by Polars.

The interface should prevent downstream nodes from caring whether data originally came from:

* Excel;
* CSV;
* SQL;
* API.

---

# 13. Dataset Schema

Conceptually:

```text
DatasetSchema
└── columns: ColumnSchema[]
```

`ColumnSchema`:

```text
id
name
display_name
logical_type
nullable
metadata
```

The column `id` should remain stable within an execution lineage where practical.

This helps distinguish user-facing labels from internal identity.

---

# 14. Logical Data Types

The domain layer should define engine-independent logical types:

```text
STRING
INTEGER
FLOAT
BOOLEAN
DATE
DATETIME
UNKNOWN
```

`NULL` may be represented through nullability rather than as a permanent column type, depending on implementation.

Engine-specific Polars types must be translated into logical types at domain boundaries.

---

# 15. Workflow

A workflow is a persisted directed graph.

Conceptual model:

```text
Workflow

id
project_id
name
version
created_at
updated_at
```

The workflow contains:

* node instances;
* directed edges;
* graph-level metadata.

---

# 16. Node Instance

A persisted node instance represents one configured node placed on the canvas.

Conceptual structure:

```json
{
  "id": "node_123",
  "type": "filter",
  "version": 1,
  "position": {
    "x": 420,
    "y": 180
  },
  "config": {},
  "ui": {}
}
```

Important distinction:

`NodeInstance`

is persisted user configuration.

`NodeDefinition`

describes the capabilities of a node type.

---

# 17. Workflow Edge

Conceptual structure:

```json
{
  "id": "edge_123",
  "source_node_id": "node_a",
  "source_port": "dataset",
  "target_node_id": "node_b",
  "target_port": "input"
}
```

Edges must reference explicit ports.

This allows future node types with:

* multiple inputs;
* multiple outputs;
* non-dataset outputs.

---

# 18. Workflow JSON Contract

The API representation should resemble:

```json
{
  "id": "workflow_1",
  "name": "Sales Analysis",
  "version": 1,
  "nodes": [
    {
      "id": "source_1",
      "type": "excel_source",
      "version": 1,
      "position": {
        "x": 100,
        "y": 150
      },
      "config": {
        "source_id": "source_abc",
        "sheet_name": "Sales"
      }
    },
    {
      "id": "filter_1",
      "type": "filter",
      "version": 1,
      "position": {
        "x": 400,
        "y": 150
      },
      "config": {
        "conditions": [
          {
            "column": "country",
            "operator": "equals",
            "value": "Korea"
          }
        ],
        "mode": "and"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source_node_id": "source_1",
      "source_port": "dataset",
      "target_node_id": "filter_1",
      "target_port": "input"
    }
  ]
}
```

The exact JSON may evolve, but node identity, node version, explicit ports, configuration, and position must remain representable.

---

# 19. Node Definition

A `NodeDefinition` describes a node type.

Conceptually:

```python
class NodeDefinition:
    type: str
    version: int
    category: NodeCategory

    input_ports: list[PortDefinition]
    output_ports: list[PortDefinition]

    config_schema: type[BaseModel]

    executor_type: type[NodeExecutor] | None
```

Additional UI metadata may include:

```text
display_name
description
icon
configuration hints
```

Backend definitions remain authoritative for execution semantics.

---

# 20. Node Registry

All supported node types must be registered in a central `NodeRegistry`.

Conceptually:

```python
registry.register(ExcelSourceDefinition)
registry.register(FilterDefinition)
registry.register(GroupByDefinition)
```

The registry must support lookup by:

```text
node type
+
node version
```

Generic graph execution code must not use large `if node.type == ...` chains.

---

# 21. Node Executor Contract

Transformation and source nodes execute through a common contract.

Conceptually:

```python
class NodeExecutor(Protocol):

    def validate(
        self,
        node,
        input_schemas,
        context
    ) -> ValidationResult:
        ...

    def infer_schema(
        self,
        node,
        input_schemas,
        context
    ) -> DatasetSchema:
        ...

    def execute(
        self,
        node,
        inputs,
        context
    ) -> NodeExecutionResult:
        ...
```

The concrete signature may be async where infrastructure requires it.

The architectural behavior should remain equivalent.

---

# 22. Execution Context

Execution should receive an explicit context rather than depending on global state.

Conceptually:

```text
ExecutionContext

project_id
workflow_id
execution_id
storage_provider
source_repository
cache
logger
settings
```

Additional services may be added explicitly.

Avoid hidden mutable global execution state.

---

# 23. Node Inputs and Outputs

Data-processing nodes should pass typed runtime values.

Initial runtime output types:

```text
Dataset
ScalarValue
VisualizationSpec
```

Most MVP transformation nodes use:

```text
Dataset → Dataset
```

Join and Union:

```text
Dataset + Dataset → Dataset
```

Visualization:

```text
Dataset → VisualizationSpec
```

---

# 24. Visualization Architecture

Visualization nodes should not execute ECharts on the backend.

The backend should produce a normalized visualization specification or processed dataset result.

The frontend converts this specification into ECharts configuration.

Conceptual flow:

```text
Dataset
  ↓
Visualization Node Configuration
  ↓
VisualizationSpec
  ↓
Frontend Renderer
  ↓
ECharts
```

This keeps browser-specific rendering outside the backend.

---

# 25. Visualization Spec

Conceptual example:

```json
{
  "type": "bar",
  "title": "Revenue by Category",
  "encoding": {
    "x": {
      "field": "category",
      "type": "category"
    },
    "y": {
      "field": "sum_revenue",
      "type": "number"
    }
  },
  "options": {
    "legend": true
  }
}
```

Chart-specific frontend code translates this into ECharts configuration.

Do not persist generated ECharts internals as the primary product representation.

Persist semantic visualization configuration.

---

# 26. Transformation / Visualization Boundary

Reusable analytical transformations belong in transformation nodes.

Example:

Correct:

```text
GroupBy
  ↓
BarChart
```

Avoid hiding arbitrary reusable transformations inside:

```text
BarChart
```

Visualization nodes may perform small visualization-specific operations where required, but must not evolve into a second general-purpose data engine.

---

# 27. Workflow Validation Pipeline

Before execution, the backend should perform validation.

Recommended order:

```text
Structural Validation
        ↓
Node Type Validation
        ↓
Port Validation
        ↓
Cycle Detection
        ↓
Dependency Validation
        ↓
Configuration Validation
        ↓
Schema Propagation
        ↓
Execution Planning
```

Execution should not start when fatal validation errors are already known.

---

# 28. Structural Validation

Structural validation checks:

* duplicate node IDs;
* duplicate edge IDs;
* references to nonexistent nodes;
* invalid edge structure;
* malformed node definitions.

---

# 29. Port Validation

Port validation checks:

* source port exists;
* target port exists;
* output type is compatible with input type;
* maximum number of connections is respected;
* required inputs exist.

---

# 30. Cycle Detection

Workflows must remain DAGs for MVP execution.

Any edge that introduces a cycle must be rejected.

Both frontend and backend may detect cycles.

Backend validation is authoritative.

---

# 31. Schema Propagation Engine

Schema propagation runs through the graph in topological order.

Conceptually:

```text
Source schema
      ↓
Node infer_schema()
      ↓
Output schema
      ↓
Next node infer_schema()
```

The result should be available without full workflow execution where possible.

---

# 32. Schema Resolution Result

The backend may expose schema status for each node.

Conceptually:

```json
{
  "node_id": "group_1",
  "valid": true,
  "schema": {
    "columns": [
      {
        "name": "category",
        "type": "string"
      },
      {
        "name": "sum_revenue",
        "type": "float"
      }
    ]
  },
  "errors": []
}
```

This supports configuration UI.

---

# 33. Invalid Downstream Configuration

When upstream schema changes, downstream configuration must be revalidated.

Example:

```text
SelectColumns removes "revenue"
        ↓
BarChart still references "revenue"
```

Expected state:

BarChart becomes invalid.

The previously successful execution result must not be represented as current valid output.

---

# 34. Execution Planning

A preview or visualization request should not automatically execute the entire graph.

Given target node:

```text
Target Node
    ↓
Find ancestors
    ↓
Create required subgraph
    ↓
Topological order
    ↓
Execute only dependencies
```

Unrelated workflow branches should not run.

---

# 35. Workflow Execution

Conceptual execution loop:

```python
for node in execution_plan:
    inputs = collect_inputs(node)

    result = cache.get(node_cache_key)

    if result is None:
        result = executor.execute(
            node=node,
            inputs=inputs,
            context=context
        )

        cache.store(node_cache_key, result)

    execution_state[node.id] = result
```

Exact implementation may differ.

---

# 36. Execution Identity

Each explicit execution or preview operation should have an execution identifier.

Conceptually:

```text
Execution

id
workflow_id
target_node_id
status
started_at
completed_at
```

Persistence of full historical execution records is optional for MVP.

At minimum, execution IDs should be useful for:

* logs;
* errors;
* tracing.

---

# 37. Execution Status

Possible execution statuses:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

Cancellation support is optional in the first implementation.

---

# 38. Result Caching

Caching should be introduced primarily to avoid repeated expensive upstream execution.

Cache keys should depend on relevant inputs.

Conceptually:

```text
node type
node version
node config
upstream result identity
source identity/version
```

A config change must invalidate the affected node and its descendants.

---

# 39. Cache Scope

Initial cache may be:

* process memory;
* temporary filesystem;
* another simple local implementation.

Do not introduce distributed cache infrastructure for MVP unless required.

Cached results are disposable.

Persistent project correctness must never depend on cache survival.

---

# 40. Source Identity

Uploaded source files should be treated as immutable source artifacts.

If the user uploads a replacement workbook, it should receive a new source identity or explicit new source version.

Cache correctness must not depend only on filename.

---

# 41. DataFrame Engine

Polars is the primary dataframe transformation engine.

Use Polars for:

* filtering;
* selection;
* renaming;
* sorting;
* formulas;
* grouping;
* aggregation;
* joins;
* unions;
* pivots where suitable.

DuckDB may be used when it materially simplifies:

* larger analytical operations;
* SQL-like execution;
* intermediate query operations.

Do not mix engines arbitrarily within individual nodes.

---

# 42. Excel Ingestion

Excel ingestion should conceptually separate:

```text
Workbook Inspection
```

from:

```text
Dataset Loading
```

Workbook inspection discovers:

* sheets;
* headers;
* dimensions;
* basic metadata.

Dataset loading converts a selected worksheet into the internal Dataset representation.

---

# 43. Excel Reader Interface

Conceptual interface:

```python
class WorkbookReader(Protocol):

    def inspect(self, storage_key) -> WorkbookInfo:
        ...

    def load_sheet(
        self,
        storage_key,
        sheet_name,
        options
    ) -> Dataset:
        ...
```

Excel-specific logic should remain behind this boundary.

---

# 44. Excel Parsing Behavior

The ingestion layer must handle:

* missing cells;
* duplicate headers;
* blank headers;
* mixed data;
* dates;
* booleans;
* numeric values;
* strings.

A mapping between original labels and internal column identity may be maintained when normalization is required.

---

# 45. Source Node

The Excel Source node config should reference persistent source identity.

Example:

```json
{
  "source_id": "src_123",
  "sheet_name": "Sales"
}
```

It must not rely on a raw filesystem path controlled by the frontend.

---

# 46. Select Columns Executor

Input:

```text
Dataset
```

Configuration:

```text
selected column identifiers
```

Output:

```text
Dataset
```

Schema inference does not require full data execution.

---

# 47. Rename Columns Executor

Configuration maps source column identity to new display/name value.

Validation checks:

* source column exists;
* resulting names are valid;
* collisions are handled.

---

# 48. Filter Executor

Filter configuration should use a structured expression representation.

Example:

```json
{
  "mode": "and",
  "conditions": [
    {
      "column": "country",
      "operator": "equals",
      "value": "Korea"
    }
  ]
}
```

Do not transmit arbitrary Python expressions for filtering.

---

# 49. Calculated Column Executor

Calculated columns require a controlled expression AST or parser.

Example user expression:

```text
quantity * price
```

Conceptually converted to:

```text
Multiply(
    Column("quantity"),
    Column("price")
)
```

or another safe internal representation.

Never execute the expression through:

* Python `eval`;
* JavaScript eval;
* shell;
* arbitrary dynamic imports.

---

# 50. Formula Engine

The formula system should use an allowlist of supported syntax.

Initial operators:

```text
+
-
*
/
()
```

Later safe functions may include:

```text
abs
round
lower
upper
coalesce
date extraction
```

Only implemented, validated operations may execute.

---

# 51. Group By / Aggregate Executor

Configuration should explicitly separate:

```text
dimensions
```

and:

```text
aggregations
```

Example:

```json
{
  "group_by": [
    "category"
  ],
  "aggregations": [
    {
      "column": "revenue",
      "function": "sum",
      "output_name": "sum_revenue"
    }
  ]
}
```

---

# 52. Join Executor

Join has two dataset inputs:

```text
left
right
```

Configuration:

```json
{
  "join_type": "left",
  "keys": [
    {
      "left": "customer_id",
      "right": "customer_id"
    }
  ]
}
```

Supported MVP types:

* inner;
* left.

Output conflict strategy must be deterministic.

---

# 53. Union Executor

The Union executor accepts two or more compatible datasets.

MVP may initially support exactly two inputs.

Validation checks:

* column compatibility;
* logical type compatibility.

Schema coercion must be explicit rather than accidental.

---

# 54. Pivot Executor

Pivot configuration conceptually includes:

```text
index
columns
values
aggregation
```

Output schema may depend on data values.

Because pivot output columns may be data-dependent, schema inference may require limited data inspection.

This should be represented explicitly rather than pretending pivot is always statically inferable.

---

# 55. Static vs Dynamic Schema Inference

Nodes should declare their schema inference behavior.

Possible modes:

```text
STATIC
DATA_DEPENDENT
UNKNOWN_UNTIL_EXECUTION
```

Examples:

Select Columns:

`STATIC`

Rename:

`STATIC`

Filter:

`STATIC`

Calculated Column:

usually `STATIC`

Pivot:

often `DATA_DEPENDENT`

The UI must be able to handle temporarily unavailable downstream schema.

---

# 56. Preview Architecture

Preview is a bounded execution result.

Request:

```text
workflow
target node
row limit
```

Response:

```text
schema
rows
row_count where available
execution metadata
```

The backend must impose a server-side maximum preview size.

The browser cannot request unlimited rows.

---

# 57. Preview Response Example

```json
{
  "node_id": "filter_1",
  "status": "succeeded",
  "schema": {
    "columns": [
      {
        "name": "country",
        "type": "string"
      },
      {
        "name": "revenue",
        "type": "float"
      }
    ]
  },
  "rows": [
    {
      "country": "Korea",
      "revenue": 2500.0
    }
  ],
  "preview": {
    "limit": 100,
    "returned_rows": 100,
    "total_rows": 12450
  },
  "execution": {
    "duration_ms": 84
  }
}
```

`total_rows` may be omitted when expensive to calculate.

---

# 58. Persistence Strategy

Persist configuration, not transient dataframe state.

Persistent:

* projects;
* source metadata;
* workflow definitions;
* node configuration;
* graph positions;
* visualizations;
* dashboards;
* widget layout.

Transient/disposable:

* Polars DataFrames;
* preview frames;
* execution cache;
* generated ECharts options.

---

# 59. Database Schema

Initial relational schema should contain approximately the following tables.

---

# 60. projects

```text
projects

id UUID PK
name VARCHAR
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 61. data_sources

```text
data_sources

id UUID PK
project_id UUID FK → projects
type VARCHAR
name VARCHAR
original_filename VARCHAR
storage_key VARCHAR
file_size BIGINT
status VARCHAR
metadata JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 62. workflows

```text
workflows

id UUID PK
project_id UUID FK → projects
name VARCHAR
version INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 63. workflow_nodes

```text
workflow_nodes

id UUID PK
workflow_id UUID FK → workflows
node_type VARCHAR
node_version INTEGER
position_x DOUBLE
position_y DOUBLE
config JSONB
ui_state JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

The node instance UUID is also the graph node ID.

---

# 64. workflow_edges

```text
workflow_edges

id UUID PK
workflow_id UUID FK → workflows
source_node_id UUID FK → workflow_nodes
source_port VARCHAR
target_node_id UUID FK → workflow_nodes
target_port VARCHAR
created_at TIMESTAMP
```

Database constraints should prevent obviously invalid cross-workflow edges.

---

# 65. visualizations

```text
visualizations

id UUID PK
project_id UUID FK → projects
workflow_id UUID FK → workflows
source_node_id UUID
type VARCHAR
name VARCHAR
config JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

A visualization may reference the dataset-producing node it consumes.

If visualization nodes themselves are persisted directly in the workflow, this table may instead represent dashboard-reusable visualization entities.

The project should choose one model and record it in `DECISIONS.md`.

Recommended MVP model:

Visualization nodes live in the workflow and reusable dashboard visualization configuration is persisted as a visualization entity referencing a workflow node.

---

# 66. dashboards

```text
dashboards

id UUID PK
project_id UUID FK → projects
name VARCHAR
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 67. dashboard_widgets

```text
dashboard_widgets

id UUID PK
dashboard_id UUID FK → dashboards
visualization_id UUID FK → visualizations
title VARCHAR NULL
position_x INTEGER
position_y INTEGER
width INTEGER
height INTEGER
config JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 68. Referential Integrity

Deletion behavior must be deliberate.

Example:

Deleting project:

```text
Project
 ↓ cascade
Sources
Workflows
Nodes
Edges
Visualizations
Dashboards
Widgets
```

Deleting a node used by a visualization should either:

* invalidate the visualization;
* or delete dependent visualization records;

according to an explicitly documented rule.

Silent dangling references are not acceptable.

---

# 69. JSONB Usage

JSONB is appropriate for flexible node and visualization configuration.

Do not use JSONB for everything.

Stable relational relationships belong in relational columns.

Good JSONB candidates:

* node config;
* visualization config;
* source metadata;
* widget-specific options.

---

# 70. Database Repository Layer

Application services should access persistence through repositories.

Examples:

```text
ProjectRepository
SourceRepository
WorkflowRepository
VisualizationRepository
DashboardRepository
```

This prevents SQLAlchemy persistence details from spreading across domain logic.

---

# 71. API Style

The MVP uses REST-style JSON APIs.

Suggested base:

```text
/api/v1
```

Use UUID identifiers.

Endpoints should be resource-oriented where practical.

---

# 72. Project API

Suggested endpoints:

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{project_id}
PATCH  /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
```

---

# 73. Source API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/sources
POST   /api/v1/projects/{project_id}/sources/excel
GET    /api/v1/sources/{source_id}
DELETE /api/v1/sources/{source_id}

GET    /api/v1/sources/{source_id}/sheets
GET    /api/v1/sources/{source_id}/sheets/{sheet_name}/schema
GET    /api/v1/sources/{source_id}/sheets/{sheet_name}/preview
```

---

# 74. Workflow API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/workflows
POST   /api/v1/projects/{project_id}/workflows

GET    /api/v1/workflows/{workflow_id}
PUT    /api/v1/workflows/{workflow_id}
DELETE /api/v1/workflows/{workflow_id}
```

A whole-workflow PUT is acceptable for MVP graph persistence.

Fine-grained node mutation APIs may be introduced later if needed.

---

# 75. Workflow Validation API

Suggested endpoint:

```text
POST /api/v1/workflows/{workflow_id}/validate
```

Response should include:

* graph errors;
* node errors;
* resolved node schemas where available.

---

# 76. Preview API

Suggested endpoint:

```text
POST /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

Request:

```json
{
  "limit": 100
}
```

The server enforces a configured maximum.

---

# 77. Visualization API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/visualizations
POST   /api/v1/projects/{project_id}/visualizations

GET    /api/v1/visualizations/{visualization_id}
PATCH  /api/v1/visualizations/{visualization_id}
DELETE /api/v1/visualizations/{visualization_id}

POST   /api/v1/visualizations/{visualization_id}/data
```

Exact endpoint naming may evolve.

---

# 78. Dashboard API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/dashboards
POST   /api/v1/projects/{project_id}/dashboards

GET    /api/v1/dashboards/{dashboard_id}
PATCH  /api/v1/dashboards/{dashboard_id}
DELETE /api/v1/dashboards/{dashboard_id}

PUT    /api/v1/dashboards/{dashboard_id}/layout
```

---

# 79. API Error Contract

Errors should use a stable structured format.

Example:

```json
{
  "error": {
    "code": "INVALID_NODE_CONFIGURATION",
    "message": "Column 'revenue' does not exist in the upstream dataset.",
    "details": {
      "node_id": "node_123",
      "field": "config.column"
    }
  }
}
```

The frontend should not depend on parsing arbitrary error strings.

---

# 80. Error Categories

Useful domain error categories:

```text
PROJECT_NOT_FOUND
SOURCE_NOT_FOUND
INVALID_UPLOAD
WORKBOOK_READ_ERROR
SHEET_NOT_FOUND

WORKFLOW_INVALID
NODE_NOT_FOUND
UNKNOWN_NODE_TYPE
INVALID_EDGE
CYCLE_DETECTED
MISSING_NODE_INPUT

INVALID_NODE_CONFIGURATION
COLUMN_NOT_FOUND
TYPE_MISMATCH
FORMULA_INVALID
JOIN_INVALID

EXECUTION_FAILED
PREVIEW_FAILED
```

---

# 81. HTTP Mapping

Typical mappings:

```text
400 — malformed request / invalid user input
404 — missing project/source/workflow
409 — conflicting persistent state
422 — valid JSON but invalid domain configuration
500 — unexpected server failure
```

Exact mapping should remain consistent across the API.

---

# 82. Frontend Architecture

Frontend should be organized primarily by product feature.

Suggested structure:

```text
features/
├── projects/
├── data-sources/
├── workflow/
├── visualizations/
└── dashboards/
```

Shared components and primitives belong outside feature-specific modules.

---

# 83. Frontend Server State

TanStack Query should manage remote server state.

Examples:

* projects;
* source metadata;
* workflow loading;
* previews;
* dashboards.

Avoid duplicating full server state into Zustand without a clear reason.

---

# 84. Frontend Local State

Zustand may manage highly interactive editor state.

Examples:

* current node selection;
* panel visibility;
* temporary graph edits;
* viewport preferences;
* unsaved drag state.

Persisted graph state remains authoritative on the server once saved.

---

# 85. Workflow Editor State

React Flow represents the visual graph.

The frontend graph model should map cleanly to the backend Workflow contract.

Avoid maintaining two fundamentally different graph representations.

A translation adapter may exist, but semantics must remain consistent.

---

# 86. Workflow Autosave

Recommended MVP strategy:

* user actions update local graph state immediately;
* changes are persisted using debounced autosave;
* UI exposes saving status.

Possible states:

```text
Saved
Saving…
Save failed
Unsaved changes
```

An explicit Save action may also be provided.

---

# 87. Save Concurrency

Single-user MVP does not require sophisticated collaborative conflict resolution.

However, updates should avoid obvious accidental overwrite.

Workflow saves require expected_revision and atomically increment revision (ADR-050).
Stale writes return 409 and retain the browser draft. Dashboard saves use an independent revision.

---

# 88. Node Configuration UI

Node configuration should be schema-driven where practical.

Example:

Filter Node receives upstream schema.

Frontend displays:

```text
Column:
[Country ▼]

Operator:
[Equals ▼]

Value:
[Korea]
```

Do not force users to manually type field names when schema information exists.

---

# 89. Node Type Catalog

Frontend may fetch node definitions from backend or maintain a shared typed catalog.

For MVP, duplicated display metadata is acceptable only if semantic execution configuration remains aligned.

Preferred long-term direction:

backend exposes node metadata needed by the editor.

---

# 90. Dashboard Frontend

Dashboard editor should use a grid-based layout library.

The dashboard stores logical grid positions, not raw browser pixel coordinates.

Conceptually:

```text
x
y
w
h
```

This makes persistence and future responsive layouts easier.

---

# 91. Dashboard Rendering

Dashboard widgets retrieve their visualization specification and data.

Conceptual flow:

```text
Dashboard
  ↓
Widget
  ↓
Visualization
  ↓
Workflow target
  ↓
Execution
  ↓
Visualization data
  ↓
ECharts/Table/KPI
```

Dashboard rendering should reuse the same execution system as workflow previews.

---

# 92. Duplicate Execution Prevention

When multiple dashboard widgets depend on the same upstream workflow state, caching should prevent unnecessary repeated source and transformation execution.

Optimization may occur progressively.

Correctness is more important than perfect cache efficiency.

---

# 93. StorageProvider Contract

Conceptual interface:

```python
class StorageProvider(Protocol):

    def save(
        self,
        stream,
        object_name
    ) -> StorageObject:
        ...

    def open(
        self,
        storage_key
    ):
        ...

    def exists(
        self,
        storage_key
    ) -> bool:
        ...

    def delete(
        self,
        storage_key
    ) -> None:
        ...
```

The API must never trust a frontend-provided local path.

---

# 94. Storage Keys

Storage keys must be generated by the backend.

Example:

```text
projects/{project_uuid}/sources/{source_uuid}/workbook.xlsx
```

Do not use original filename as the security boundary.

Original filename is metadata.

---

# 95. File Upload Security

Backend must validate:

* supported extension;
* expected workbook structure where possible;
* maximum configured upload size;
* safe storage key.

Do not execute workbook macros.

`.xlsm` may be parsed for data, but macros are treated as inert content.

---

# 96. Formula Security Boundary

The Formula Engine must be isolated from Python runtime execution.

Forbidden approaches:

```python
eval(user_expression)
exec(user_expression)
```

Forbidden capabilities:

* imports;
* filesystem access;
* process execution;
* network access;
* reflection;
* arbitrary callable invocation.

---

# 97. Resource Limits

The backend should define configurable limits.

Examples:

```text
MAX_UPLOAD_BYTES
MAX_PREVIEW_ROWS
MAX_WORKFLOW_NODES
MAX_FORMULA_LENGTH
MAX_JOIN_KEYS
```

Initial values should be conservative and documented.

These limits protect both UX and server stability.

---

# 98. Background Jobs

A dedicated task queue is not required for the first MVP.

Initial workflow execution may occur synchronously through API requests if execution remains within reasonable interactive limits.

Architecture should keep `ExecutionService` sufficiently separated so background execution can be introduced later.

Possible future:

```text
API
 ↓
Job Queue
 ↓
Worker
 ↓
Execution Engine
```

Do not implement queue infrastructure prematurely.

---

# 99. Execution Timeouts

Execution should have a configurable timeout or other protective mechanism where practical.

A pathological workbook or transformation must not permanently occupy server resources.

Implementation details may depend on process model.

---

# 100. Logging

Use structured application logging.

Useful fields:

```text
request_id
project_id
workflow_id
execution_id
node_id
node_type
duration_ms
error_code
```

Avoid logging complete workbook rows by default.

---

# 101. Request Correlation

Each request should have or receive a request identifier.

Execution errors should be traceable between:

* API response;
* backend logs;
* execution logs.

---

# 102. Observability Scope

MVP observability should include:

* structured logs;
* execution duration;
* error attribution;
* basic health endpoints.

Full metrics infrastructure is optional.

---

# 103. Health Endpoints

Suggested:

```text
GET /health
GET /ready
```

`health`:

process is running.

`ready`:

critical dependencies such as PostgreSQL are reachable.

---

# 104. Configuration

Application configuration should come from environment variables or configuration files appropriate for the deployment environment.

Examples:

```text
DATABASE_URL
STORAGE_ROOT
MAX_UPLOAD_BYTES
MAX_PREVIEW_ROWS
LOG_LEVEL
```

Secrets must not be committed to source control.

---

# 105. Local Development Deployment

Docker Compose should provide:

```text
frontend
backend
postgres
```

Source storage may use a mounted volume.

Developer should be able to start the complete local stack using documented commands.

---

# 106. Production Build

Both frontend and backend must support production-oriented execution.

Frontend:

production build must succeed.

Backend:

must run without development-only hot reload.

Production deployment architecture beyond a single-server environment is outside MVP scope.

---

# 107. Database Migrations

All schema changes must use Alembic.

Fresh environment flow:

```text
create database
    ↓
run migrations
    ↓
start backend
```

The repository should not depend on manually created tables.

---

# 108. Testing Architecture

Testing should follow system boundaries.

---

# 109. Domain Unit Tests

Unit-test:

* graph validation;
* cycle detection;
* schema inference;
* formula parsing;
* node configuration validation;
* join compatibility;
* logical type handling.

These should require minimal infrastructure.

---

# 110. Executor Tests

Each executor should have correctness tests.

Examples:

```text
FilterExecutor
SelectColumnsExecutor
CalculatedColumnExecutor
GroupByExecutor
JoinExecutor
UnionExecutor
PivotExecutor
```

Use small deterministic datasets.

---

# 111. Excel Integration Tests

Fixture workbooks should cover:

* normal workbook;
* multiple sheets;
* null values;
* mixed types;
* date columns;
* duplicate headers;
* empty worksheet;
* malformed workbook.

---

# 112. Repository Integration Tests

Use a real test PostgreSQL database where important.

Verify:

* create project;
* save graph;
* reload graph;
* delete project;
* dashboard persistence.

---

# 113. API Integration Tests

Test critical endpoint flows.

Example:

```text
Create Project
    ↓
Upload Excel
    ↓
Create Workflow
    ↓
Save Nodes
    ↓
Preview Node
```

---

# 114. Frontend Tests

Focus on behavior rather than implementation details.

Test:

* project creation;
* node configuration;
* validation messages;
* schema-aware controls;
* dashboard interactions;
* saving status.

---

# 115. End-to-End Tests

At least one E2E test must implement the canonical MVP journey.

It should cover:

```text
create project
upload workbook
create workflow
configure transformation
preview result
create visualization
create dashboard
reload
verify persistence
```

---

# 116. Acceptance Fixture

The repository should contain a deterministic Excel fixture representing sales data.

Suggested:

```text
order_id
order_date
country
category
product
quantity
price
```

Calculated:

```text
revenue = quantity * price
```

This fixture must contain enough variation for filter, grouping, join, and visualization tests.

---

# 117. Join Fixture

A second worksheet or workbook may contain:

```text
product
supplier
cost
```

This supports deterministic Join tests.

---

# 118. API / Domain Separation

Pydantic request/response models are API contracts.

SQLAlchemy models are persistence contracts.

Domain models represent BI concepts.

These should not automatically be treated as the same object.

Mapping code is acceptable when it preserves architectural separation.

---

# 119. Transaction Boundaries

Application services should define database transaction boundaries.

Examples:

Saving a workflow graph should not leave:

* nodes saved;
* edges partially saved;

if the operation fails halfway.

Where practical, graph persistence should occur atomically.

---

# 120. Workflow Persistence Strategy

Recommended MVP approach:

When saving workflow:

1. validate identifiers;
2. begin database transaction;
3. update workflow metadata;
4. upsert current nodes;
5. delete removed nodes;
6. upsert edges;
7. delete removed edges;
8. commit.

Alternative implementation is acceptable if it guarantees coherent graph state.

---

# 121. Node Deletion

Deleting a node must remove associated edges.

Dependent persisted visualization references must either:

* be deleted;
* or become explicitly invalid.

The decision must be consistent.

---

# 122. Source Deletion

If a source is referenced by an active workflow, deletion should not silently break persisted state.

Recommended MVP behavior:

prevent deletion and return a dependency error until references are removed.

This is safer than silent cascade deletion of analytical workflows.

---

# 123. Dashboard Deletion

Deleting a dashboard should delete its widget layout records.

It should not delete referenced workflow nodes or source data.

Deleting a visualization should remove or invalidate dashboard widgets referencing it.

---

# 124. Versioning Strategy

Revision update (ADR-050): `workflow.version` is the persisted format version and
remains 1 for the current format. `workflow.revision` is a separate edit counter.
Every save supplies `expected_revision`; an atomic conditional update rejects stale
writes with HTTP 409 before graph mutation. Migration 0002 moves historical save
counters into revision. Schema/preview responses include the graph revision.

Three independent concepts may have versions:

```text
API version
Workflow format version
Node definition version
```

API:

```text
/api/v1
```

Workflow:

```text
workflow.version
```

Node:

```text
node.version
```

Do not assume these numbers are interchangeable.

---

# 125. Node Migration

Full historical node migration infrastructure is not required for MVP.

However, node executor lookup must include node version.

Future migration may follow:

```text
filter v1
   ↓ migrate
filter v2
```

Persisting version now prevents a major compatibility problem later.

---

# 126. Frontend Type Contracts

API models are generated from FastAPI OpenAPI into `frontend/lib/api-schema.d.ts`.
Feature modules import aliases from generated components. `npm run api:generate`
updates the types; `npm run api:check` fails on drift. Node-specific analytical forms
remain explicit components selected through a registry (ADR-053).

Where practical, generate or synchronize TypeScript API types from backend OpenAPI definitions.

Avoid manually maintaining incompatible duplicate request/response models.

Exact tooling can be chosen during implementation.

---

# 127. User-Facing Data Formatting

Formatting is presentation logic.

Raw analytical values should remain typed.

Example:

Stored/executed value:

```text
1204302.45
```

Displayed KPI:

```text
$1.20M
```

Formatting must not permanently convert analytical numbers into text upstream.

---

# 128. Date Handling

Internal date and datetime values must remain typed.

Serialized API representation should use a predictable ISO-compatible representation.

Timezone complexity should not be introduced for date-only fields.

Datetime behavior should be explicitly documented when encountered.

---

# 129. Null Semantics

Null handling should follow dataframe semantics consistently.

User-facing filter operations should explicitly support:

```text
is null
is not null
```

Avoid silently converting null values into empty strings globally.

---

# 130. Column Identity

Column names alone may be insufficient because Excel may contain duplicate labels.

Recommended model:

```text
column_id
display_name
engine_name
```

Example:

```text
column_id: col_3
display_name: Revenue
engine_name: Revenue__2
```

User sees:

```text
Revenue
```

but internal transformations remain unambiguous.

The exact identity strategy should be finalized in `DECISIONS.md`.

---

# 131. Schema Serialization

Schemas returned to frontend should contain stable field identifiers.

Example:

```json
{
  "columns": [
    {
      "id": "col_country",
      "name": "country",
      "display_name": "Country",
      "type": "string",
      "nullable": true
    }
  ]
}
```

Node configs should preferably reference stable column IDs when feasible.

---

# 132. Validation vs Execution Errors

Distinguish:

`Validation Error`

from:

`Execution Error`

Validation:

the configuration is known to be invalid.

Execution:

configuration appeared valid but data-dependent execution failed.

The frontend should present these differently where useful.

---

# 133. Node Result Model

Conceptually:

```text
NodeExecutionResult

node_id
output_type
value
schema
metadata
warnings
```

Warnings should not automatically make execution fail.

Example warning:

```text
Some values could not be parsed as dates.
```

---

# 134. Warning Policy

Warnings are appropriate when:

* output remains usable;
* user should know about data quality;
* behavior is deterministic.

Do not downgrade correctness failures into warnings merely to keep execution green.

---

# 135. Visualization Data Volume

Chart payloads should be bounded.

A chart must not accidentally send hundreds of thousands of points to the browser.

Potential strategies:

* require aggregation;
* impose point limits;
* return validation/warning;
* apply chart-specific sampling later.

MVP should use explicit safe limits rather than hidden destructive aggregation.

---

# 136. Table Data Volume

Table visualization should use:

* bounded pages;
* preview semantics;
* server-side limits.

Do not serialize the entire transformed dataset for initial display.

---

# 137. Dashboard Execution

Dashboard loading may trigger execution of visualization dependencies.

Execution should be deduplicated where practical.

The UI must display per-widget loading and failure states rather than blocking the entire dashboard for one failing visualization.

---

# 138. Partial Failure

One failed visualization must not prevent unrelated dashboard widgets from rendering.

Likewise, one invalid workflow branch should not necessarily prevent previewing a valid unrelated branch.

---

# 139. Frontend Error Boundary

Major frontend areas should use error boundaries or equivalent controlled error handling where appropriate.

Unexpected rendering failure in one visualization should not ideally destroy the entire application shell.

---

# 140. Security Architecture

MVP security assumptions:

* single-user deployment;
* trusted application operator;
* untrusted uploaded file contents;
* untrusted node configuration payloads.

Even without authentication, backend inputs must be validated.

---

# 141. Path Traversal Protection

Never construct storage paths directly from:

* user filenames;
* source names;
* sheet names.

Use generated identifiers.

---

# 142. Workbook Macros

Macro code must never be executed.

For `.xlsm` files, treat macros as opaque workbook content.

Only data extraction is relevant.

---

# 143. Formula Injection

Generated exported spreadsheets are outside MVP scope.

If spreadsheet export is later implemented, formula injection must be considered separately.

---

# 144. Arbitrary SQL

The MVP has no user-entered SQL execution.

Future SQL connectors must introduce separate security architecture.

---

# 145. Deployment Boundary

Initial supported deployment:

```text
single application environment
```

containing:

```text
browser
frontend
backend
PostgreSQL
local persistent file volume
```

This is sufficient for MVP acceptance.

---

# 146. Scalability Path

Future scale may introduce:

```text
Object Storage
Redis
Job Queue
Workers
Multiple API Instances
External Database
```

Current interfaces should make this possible without implementing these systems now.

Especially preserve:

* StorageProvider;
* ExecutionService boundary;
* Repository interfaces;
* stateless HTTP APIs where practical.

---

# 147. Architectural Non-Goals

Do not implement for MVP:

* Kubernetes;
* microservices;
* Kafka;
* distributed tracing infrastructure;
* distributed execution;
* event sourcing;
* CQRS;
* plugin runtime;
* multi-region failover;
* data warehouse;
* semantic layer engine.

The MVP should remain a modular monolith.

---

# 148. Modular Monolith Decision

The backend should be implemented as a modular monolith.

Benefits:

* simpler deployment;
* easier transactions;
* easier debugging;
* faster MVP development;
* domain boundaries can still remain explicit.

Do not split Project, Workflow, Execution, or Dashboard into network services during MVP.

---

# 149. Architecture Enforcement

During implementation, the agent should reject patterns that violate core boundaries.

Examples:

Bad:

```text
React FilterNode directly transforms 100,000 workbook rows.
```

Good:

```text
React FilterNode edits config.
Backend FilterExecutor transforms data.
```

Bad:

```text
API route contains 300 lines of Polars transformation logic.
```

Good:

```text
API route → ExecutionService → FilterExecutor
```

Bad:

```text
Dashboard stores ECharts-generated pixel configuration only.
```

Good:

```text
Dashboard references semantic visualization configuration.
```

---

# 150. Required Initial Architectural Decisions

Before or during the first implementation milestones, record decisions for:

1. column identity strategy;
2. node registry implementation;
3. formula parser / expression engine;
4. workflow persistence update strategy;
5. visualization persistence model;
6. dashboard layout library;
7. cache implementation;
8. Excel dataframe loading strategy;
9. frontend/backend API type synchronization.

These belong in `DECISIONS.md`.

---

# 151. Architecture Definition of Done

The architecture is considered successfully implemented when:

* frontend and backend responsibilities remain separated;
* workflows persist as explicit graph structures;
* graph validation is backend-authoritative;
* nodes execute through a registry/executor abstraction;
* Dataset and DatasetSchema are source-independent;
* schema propagation works;
* Excel is implemented as a source adapter;
* previews use bounded backend execution;
* formula evaluation is sandboxed through an allowlisted engine;
* persistence survives restart;
* dashboards reference persistent visualization definitions;
* migrations recreate database state;
* file storage uses `StorageProvider`;
* critical execution behavior is covered by tests;
* canonical MVP flow works end-to-end.

---

# 152. Architecture Change Policy

The Astra revision is recorded in ADR-050–ADR-054 and `docs/ARCHITECTURE_REVIEW.md`.
ExecutionContext receives a source-access protocol, not ORM sessions. Source schema
resolution and execution reuse bounded immutable materialization. Cache hits still
validate source ownership and artifact availability; the LRU has both count and byte
budgets. File deletion uses a transactional cleanup queue retried at startup or via
`python -m app.services.file_cleanup`. See the ADRs for failure/recovery boundaries.

This document may evolve during implementation.

A meaningful architectural change should:

1. solve a concrete problem;
2. be recorded in `DECISIONS.md`;
3. update this document if the architectural contract changes;
4. update affected tasks;
5. avoid silent divergence between documentation and implementation.

Implementation convenience alone is not sufficient reason to bypass a documented architecture boundary.

---

# 153. Final Architecture Summary

Node BI MVP is a modular-monolith web application.

The key architectural chain is:

```text
Excel File
   ↓
StorageProvider
   ↓
Excel Source Adapter
   ↓
Dataset
   ↓
Workflow DAG
   ↓
Node Executors
   ↓
Polars
   ↓
Dataset Results
   ↓
Visualization Specification
   ↓
Frontend Renderer
   ↓
Dashboard
```

Persistent state:

```text
PostgreSQL
```

Bulk uploaded source data:

```text
File Storage
```

Transient analytical state:

```text
Execution Memory / Cache
```

Frontend:

```text
interaction + visualization
```

Backend:

```text
data semantics + execution + persistence
```

The architecture should remain simple enough for a fast MVP while preserving the core boundaries required to evolve into a larger BI platform.

## M10 implementation contracts (ADR-042 and ADR-055)

The formula compiler parses an allowlisted arithmetic AST directly into Polars expressions.
Schema inference and execution share it. Arithmetic and numeric sum/average use Float64;
nulls propagate and non-finite results fail explicitly. Stable field references use [column_id].
Group By supports dimensions or a global aggregate, with explicit count/null semantics.
Node cache keys include node identity because calculated and aggregate output IDs derive from it.
Workflow reads take a shared database row lock while collecting revision, nodes and edges.
Save responses are constructed before committing the accepted revision, preventing a subsequent
writer from changing what the first request acknowledges. Read locks currently live until the
request transaction ends; long execution can delay saves and remains a performance QA item.

## Early presentation slice (ADR-043 and ADR-044)

Bar Chart and KPI are terminal workflow nodes with schema-aware configuration. A synchronized
Visualization index shares the node ID and contains no independent semantic config. The
presentation service executes prepared data and returns a typed rendering specification.
Dashboard widgets refer to that index. Removing a chart node removes its index and widgets;
removing only an upstream node preserves an editable chart with an explicit input error.
Dashboard saves use a separate optimistic revision and validate widget/visualization ownership.
The frontend uses react-grid-layout 2.2.4 and isolates each widget request/error. Drag/resize
changes are local until explicit save; a tab-local draft survives reload and failed requests.

## Completed visualization adapters and startup recovery (ADR-057/058)

The domain visualization catalog owns eight chart types, shared semantic configuration and
validation. Backend results retain workflow revision; table-only offset/limit pagination is explicit.
Other chart series remain complete under the 2000-point ceiling. Visualization index rows carry
no independent configuration. Widgets may override presentation title/visibility without duplicating
semantic fields. Each widget has an independent query/error boundary.

Excel uses defusedxml for forbidden XML entities; initial and lazy worksheet parsing map failures
to domain errors. Startup probes database availability before invoking Alembic, with bounded retries
and connection timeout. Migration failures are not retried or hidden.

## Source references and final application boundaries (ADR-059/060)

Project/workflow CRUD orchestration and Excel preview live in application services. HTTP handlers
retain transport adaptation. The editor delegates autosave, node configuration and output preview
to separate modules. Output data and errors are tied to the acknowledged graph revision.
Graph saves and source/project deletion lock the project row before changing references.
A supplied source ID must exist in that project; an unconfigured node remains a saveable draft.

One cold source materialization runs at a time in each execution cache; warm reads and transforms
remain independent. This avoids simultaneous duplicate workbook parsing and limits peak memory.
The default Compose stack publishes only loopback ports, matching the single-user release boundary.

## Color themes (ADR-062)

The server layout reads the allowlisted `nodebi-theme` cookie (light/dark; dark default) and renders
`data-theme` before hydration. ThemeProvider changes only this attribute and presentation context;
it never remounts the editor or writes semantic state. CSS semantic tokens in globals.css own
surface, text, border, action and feedback colors. React Flow uses matching colorMode and concrete
palette values for edges/handles/grid/minimap. ECharts recreates its disposable renderer with the
selected library theme and series palette; data/configuration and query identity are unchanged.

## Interface localization (ADR-061)

The root server layout reads the allowlisted `nodebi-language` cookie (ru/en/tt; ru default)
and initializes a React locale provider. Language changes update presentation in place and persist
a one-year, path-wide SameSite=Lax cookie. No graph or dashboard is remounted or rewritten.
`frontend/lib/translations.ts` holds English source keys with Russian and Tatar translations;
`locale.ts` owns interpolation, node labels and Intl presentation formatting. No i18n dependency
is required for three unprefixed interface languages. The browser URL and API contracts are unchanged.
Errors are translated at rendering time: application codes provide stable fallbacks, known domain
messages preserve specific guidance, and field/node/diagnostic identifiers remain intact. Raw
unknown server prose is replaced with a localized message; diagnostics remain in backend logs.
User content and semantic configuration never pass through the message translator. Locale is not
part of execution/cache identity. Numeric dates are formatted in UTC to avoid calendar-day drift.
