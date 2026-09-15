# DECISIONS.md

# ADR-064 - Prepared values and presentation formats

Date: 2026-09-15. Status: ACCEPTED.
Context: reference screens require horizontal rankings, text titles as KPI values and
tables mixing counts, amounts and ratios. Decision: add orientation and column-ID-keyed
number formats to the existing workflow visualization config; allow one string row for KPI.
Ratios remain fractions and Intl formats them as percentages. Horizontal bars retain upstream
ordering. Alternatives rejected: multiplying ratios in rendering, implicit chart aggregation
or a second semantic config on widgets. Existing JSON config and default values preserve
old projects without a migration. No runtime dependency is added.
Evidence: the overview is authored through UI with ordinary nodes; independent original-code
oracle checks every displayed indicator and row. Private workbook/oracle remain outside Git.


# ADR-063 - Dashboard parity through general constructor capabilities

Date: 2026-09-14. Status: ACCEPTED; implementation in progress.
Context: the user requires replacement of six opop_bi analytical screens as proof
of the constructor, explicitly rejecting a dedicated financial backend.
Decision: all financial expressions, column mappings, totals and drill paths live
in editable project configuration. Extend common import, node and presentation
contracts; retain existing persistence, execution and visualization boundaries.
Alternative rejected: custom calculation service/template screen bypassing the graph.
Consequences: complete parity depends on parameters/navigation as well as preparation;
the original MVP remains released but the new scope is not complete yet.

Preparation decisions: explicit header start/count with actual merged ranges; preserve
column identity and expose an optional source-row column. Ignore formatting-only tails,
reject real oversized content and missing saved formula results rather than lose data.
Source cache v3 includes layout; validate ownership/artifact availability before cache hits.
Strict Convert Types is default; loss-to-null is an explicit author choice. String
dates accept ISO YYYY-MM-DD and datetimes YYYY-MM-DDTHH:MM:SS. Fractional floats do not
silently truncate to integers. Generic nullif is added alongside the planned functions
because blank-but-non-null class labels require an explicit empty-string policy.
Unpivot keeps field IDs separate from names. Window row numbering follows explicit
sort keys, stable input order for ties; reference graphs must include source-row tie keys.
No runtime dependency or database migration is required for these preparation changes.

## ADR-062 — Persistent light/dark presentation themes

Date: 2026-09-14. Status: Accepted.
Context: the product owner requested a light theme in addition to the existing dark interface.
Decision: shared CSS color tokens, an explicit theme selector and a server-read preference cookie.
Dark remains the default. Native controls follow color-scheme; React Flow and ECharts receive
the corresponding theme. Keep theme-independent graph/dashboard state and cache keys.
Reasoning: light surfaces need readable foreground/action/error colors, including canvas renderers.
Alternatives: CSS inversion distorts charts; separate page styles duplicate presentation logic;
system-following mode was not requested. No new runtime dependency is needed.
Consequences: new UI should use semantic palette tokens. The two themes require browser/visual
checks, including switching with unsaved drafts. Cookies persist choice without data migrations.

## ADR-061 — Russian, English and Tatar presentation layer

Date: 2026-09-11. Status: Accepted. Supersedes PRODUCT_SPEC section 78's English-only recommendation.
Context: the product owner explicitly requested Russian as the primary language plus English and Tatar.
Decision: use a shared source-key catalog, a React locale provider and a server-read preference cookie.
Translate navigation, controls, node metadata and error presentation; preserve all user content and
machine identifiers. Use Intl formatting for numeric/date presentation, with UTC for dates.
Reasoning: changing locale must preserve active editors, unsaved drafts and the meaning of saved data.
Alternatives: URL-prefixed routing adds navigation/remount risk with no requirement for translated
URLs; a full i18n framework adds a dependency unnecessary for this catalog; DOM text replacement
cannot safely distinguish user data, translated labels and accessible controls.
Consequences: dictionaries require complete Russian/Tatar entries and placeholder parity checks.
API errors remain stable transport contracts and are localized at the UI boundary. Unknown codes
receive a translated fallback with diagnostics; new domain messages should extend the catalog.

## 1. Purpose

This file records significant architectural and product decisions for Node BI.

Use it for decisions that materially affect:

* system architecture;
* persistent data model;
* workflow semantics;
* execution behavior;
* security boundaries;
* major technology choices;
* long-term compatibility.

Do not use this file for trivial implementation details.

Each decision should contain:

* ID;
* Status;
* Context;
* Decision;
* Reasoning;
* Alternatives;
* Consequences.

Possible statuses:

* `ACCEPTED`
* `PROPOSED`
* `SUPERSEDED`
* `REJECTED`

---

# ADR-001 — Use a Modular Monolith

Status:

`ACCEPTED`

## Context

The MVP contains several logical subsystems:

* projects;
* data sources;
* workflows;
* execution;
* visualizations;
* dashboards.

Splitting these into separate network services would increase operational complexity without providing meaningful MVP value.

## Decision

Implement the backend as a modular monolith.

Logical modules should remain separated internally, but they run within one backend application.

## Reasoning

Benefits:

* simpler local development;
* easier deployment;
* simpler database transactions;
* lower operational overhead;
* easier debugging;
* faster iteration;
* architectural boundaries can still be preserved.

## Alternatives

### Microservices

Rejected for MVP.

Reasons:

* unnecessary network boundaries;
* distributed transactions;
* additional deployment complexity;
* slower development.

### Single unstructured application module

Rejected.

Reason:

Would make future growth and subsystem testing difficult.

## Consequences

The codebase must preserve clear internal module boundaries even though it deploys as one backend service.

---

# ADR-002 — Backend Owns Data Execution

Status:

`ACCEPTED`

## Context

The frontend contains a node editor and data previews.

It would be technically possible to execute some transformations directly in JavaScript.

## Decision

All authoritative dataset transformations execute on the backend.

The frontend edits workflow configuration and renders results.

## Reasoning

This provides:

* one execution model;
* deterministic behavior;
* better handling of larger datasets;
* easier testing;
* stronger security boundaries;
* simpler future support for SQL and other data sources.

## Alternatives

### Frontend execution

Rejected as the authoritative model.

Lightweight presentation-only transformation remains allowed.

### Hybrid arbitrary execution

Rejected because it would create inconsistent semantics between frontend and backend.

## Consequences

React components must never become the primary implementation of Filter, Join, GroupBy, Formula, or similar transformations.

---

# ADR-003 — PostgreSQL for Persistent Product State

Status:

`ACCEPTED`

## Context

The application requires persistence for:

* projects;
* source metadata;
* workflows;
* nodes;
* edges;
* visualizations;
* dashboards.

## Decision

Use PostgreSQL as the primary persistent relational database.

## Reasoning

PostgreSQL provides:

* strong relational integrity;
* transactions;
* JSONB for flexible node config;
* mature tooling;
* reliable migrations;
* future scalability.

## Alternatives

### SQLite

Considered for a prototype, rejected as the primary MVP architecture because PostgreSQL better matches the intended future deployment model.

### Document database

Rejected because much of the application state is relational.

## Consequences

Development environment must include PostgreSQL.

All persistent schema changes must use Alembic migrations.

---

# ADR-004 — Uploaded Files Live Outside PostgreSQL

Status:

`ACCEPTED`

## Context

Excel workbooks are potentially large binary files.

## Decision

Store uploaded files in file/object storage.

Store only metadata and storage references in PostgreSQL.

## Reasoning

This avoids:

* database bloat;
* inefficient binary handling;
* coupling storage to relational persistence.

## Alternatives

### PostgreSQL bytea

Rejected for normal workbook storage.

## Consequences

A `StorageProvider` abstraction is mandatory.

---

# ADR-005 — Local StorageProvider for MVP

Status:

`ACCEPTED`

## Context

The MVP needs persistent workbook storage but does not require cloud infrastructure.

## Decision

Use a local filesystem implementation of `StorageProvider`.

## Reasoning

Benefits:

* simplest local deployment;
* easy Docker volume persistence;
* no cloud credentials;
* fast development.

## Alternatives

### S3

Deferred.

### MinIO

Deferred unless object-storage compatibility becomes necessary during development.

## Consequences

Application logic must access files through `StorageProvider`, not raw filesystem paths.

---

# ADR-006 — Polars as Primary DataFrame Engine

Status:

`ACCEPTED`

## Context

Node BI needs dataframe-style operations for Excel-scale analytics.

Required operations include:

* selection;
* filtering;
* sorting;
* calculated columns;
* grouping;
* joins;
* unions;
* pivots.

## Decision

Use Polars as the primary dataframe execution engine.

## Reasoning

Polars provides:

* strong performance;
* vectorized execution;
* expressive transformations;
* suitable typed dataframe semantics;
* good fit for backend analytical pipelines.

## Alternatives

### Pandas

Considered but not selected as the primary engine.

Reason:

Polars provides a stronger performance baseline and clearer expression-oriented execution model.

### DuckDB only

Not selected as the sole engine because dataframe-native node execution is useful.

## Consequences

Domain types must remain independent of Polars-specific types.

---

# ADR-007 — DuckDB Is Optional and Complementary

Status:

`ACCEPTED`

## Context

DuckDB can simplify some analytical workloads.

## Decision

DuckDB may be used where it materially improves or simplifies execution, but Polars remains the default engine.

## Reasoning

Avoid premature complexity from switching between engines.

## Alternatives

### Mandatory DuckDB execution layer

Rejected for MVP.

## Consequences

Individual nodes should not arbitrarily mix Polars and DuckDB.

Any significant DuckDB usage should have a concrete reason.

---

# ADR-008 — Workflow Is Persisted as Explicit DAG

Status:

`ACCEPTED`

## Context

The core user interaction is a node graph.

## Decision

Persist workflows as:

* node instances;
* directed edges;
* explicit ports;
* node versions.

## Reasoning

This preserves:

* graph structure;
* visual positions;
* multiple-input support;
* future extensibility;
* deterministic execution planning.

## Alternatives

### Persist generated code or SQL only

Rejected.

The visual graph itself is first-class product state.

## Consequences

Backend must validate the graph as a DAG.

---

# ADR-009 — Backend Graph Validation Is Authoritative

Status:

`ACCEPTED`

## Context

React Flow can perform local connection validation.

However, frontend checks can be bypassed.

## Decision

Frontend may provide immediate validation feedback, but backend graph validation is authoritative.

## Reasoning

This protects:

* execution correctness;
* persisted graph integrity;
* API clients other than the main UI.

## Alternatives

Frontend-only validation rejected.

## Consequences

Backend must independently validate every workflow before execution.

---

# ADR-010 — Node Types Use Registry + Executor Contracts

Status:

`ACCEPTED`

## Context

The MVP already requires many node types and future versions may add many more.

## Decision

Implement node behavior through:

* `NodeDefinition`;
* `NodeRegistry`;
* `NodeExecutor`.

Avoid central node-type switch statements.

## Reasoning

Benefits:

* extensibility;
* isolated tests;
* version-aware lookup;
* clear contracts;
* reduced coupling.

## Alternatives

### Large conditional execution service

Rejected.

## Consequences

Every executable node must register a definition and executor.

---

# ADR-011 — Node Versions Are Persisted

Status:

`ACCEPTED`

## Context

Node semantics may evolve after users have saved workflows.

## Decision

Every persisted node contains a node version.

Node registry lookup uses:

`node_type + node_version`

## Reasoning

Without versioning, future behavior changes could silently reinterpret old workflows.

## Alternatives

Versionless nodes rejected.

## Consequences

Full migration support is not required in MVP, but version identity must exist from the beginning.

---

# ADR-012 — Dataset Is Source-Independent

Status:

`ACCEPTED`

## Context

Excel is only the first data source.

## Decision

Downstream transformation nodes operate on a generic `Dataset` abstraction rather than Excel-specific objects.

## Reasoning

This allows future sources such as:

* CSV;
* PostgreSQL;
* APIs;

without rewriting transformations.

## Alternatives

Passing worksheet-specific objects through the graph rejected.

## Consequences

Excel parsing ends at the source adapter boundary.

---

# ADR-013 — Explicit Logical Schema Layer

Status:

`ACCEPTED`

## Context

Raw Polars or Excel types are not suitable as the product-level type system.

## Decision

Use engine-independent logical types:

* STRING;
* INTEGER;
* FLOAT;
* BOOLEAN;
* DATE;
* DATETIME;
* UNKNOWN.

## Reasoning

This supports:

* UI controls;
* validation;
* future execution engines;
* predictable API contracts.

## Alternatives

Expose Polars dtypes directly.

Rejected.

## Consequences

Mapping between physical and logical types is required.

---

# ADR-014 — Schema Propagation Is First-Class

Status:

`ACCEPTED`

## Context

Node configuration depends heavily on upstream fields.

## Decision

Each compatible node implements output schema inference.

Schema propagation runs through the graph independently of full execution where possible.

## Reasoning

Benefits:

* early errors;
* field selectors;
* type-aware configuration;
* better UX;
* less wasted execution.

## Alternatives

Infer schemas only after running data.

Rejected as the general model.

## Consequences

Some nodes may declare data-dependent schema.

---

# ADR-015 — Support Data-Dependent Schema

Status:

`ACCEPTED`

## Context

Some operations such as Pivot may generate output columns from actual values.

## Decision

Node definitions may declare one of:

* `STATIC`
* `DATA_DEPENDENT`
* `UNKNOWN_UNTIL_EXECUTION`

schema modes.

## Reasoning

Pretending every node has statically inferable output would create incorrect contracts.

## Alternatives

Require static inference for every node.

Rejected.

## Consequences

Frontend must gracefully handle temporarily unavailable downstream schema.

---

# ADR-016 — Visualization Config Is Semantic

Status:

`ACCEPTED`

## Context

ECharts configuration is renderer-specific and can be verbose.

## Decision

Persist semantic visualization configuration rather than generated ECharts internals.

Example:

* chart type;
* x field;
* y field;
* title;
* formatting.

Frontend converts this semantic configuration into ECharts options.

## Reasoning

This preserves:

* renderer independence;
* easier persistence;
* easier migrations;
* cleaner product model.

## Alternatives

Persist ECharts option JSON as the product model.

Rejected.

## Consequences

An ECharts adapter layer is required in frontend.

---

# ADR-017 — Visualization Is Not a General Transformation Layer

Status:

`ACCEPTED`

## Context

BI tools often allow charts to hide aggregation and transformation logic.

## Decision

Reusable analytical transformations belong in transformation nodes.

Visualization nodes should remain primarily concerned with encoding and rendering prepared data.

## Reasoning

This keeps workflows transparent.

## Alternatives

Allow arbitrary transformation pipelines inside each chart.

Rejected for MVP.

## Consequences

Some simple visualization-specific aggregation may be allowed only when explicitly documented.

---

# ADR-018 — Single-User MVP

Status:

`ACCEPTED`

## Context

Authentication and multi-user permissions would significantly expand scope.

## Decision

The MVP operates without mandatory user authentication and may assume a single user.

## Reasoning

This keeps focus on validating the core BI workflow.

## Alternatives

Build authentication first.

Rejected for MVP.

## Consequences

Architecture should preserve future ownership boundaries but no current authorization system is required.

---

# ADR-019 — Modular Frontend by Product Feature

Status:

`ACCEPTED`

## Context

A large UI organized only by generic component type can become difficult to navigate.

## Decision

Organize major frontend code by product feature:

* projects;
* data-sources;
* workflow;
* visualizations;
* dashboards.

Shared primitives remain separate.

## Reasoning

This aligns code structure with product boundaries.

## Alternatives

Flat global component hierarchy.

Rejected.

---

# ADR-020 — TanStack Query for Server State

Status:

`ACCEPTED`

## Context

The frontend needs caching and synchronization of backend state.

## Decision

Use TanStack Query for remote/server state.

## Reasoning

It provides:

* loading state;
* caching;
* invalidation;
* retry;
* async lifecycle management.

## Alternatives

Store all API data manually in Zustand.

Rejected.

## Consequences

Do not duplicate full server resources into global client state without reason.

---

# ADR-021 — Zustand for Interactive Editor State

Status:

`ACCEPTED`

## Context

React Flow and dashboard editing require transient client-side state.

## Decision

Use Zustand where appropriate for editor-local interaction state.

Examples:

* selected node;
* open panel;
* temporary graph edits;
* viewport state.

## Alternatives

Use Zustand as the primary persistence model.

Rejected.

## Consequences

Persisted workflow state remains server-backed.

---

# ADR-022 — React Flow for Workflow Editor

Status:

`ACCEPTED`

## Context

The product requires a node-based visual graph editor.

## Decision

Use React Flow as the workflow editor foundation.

## Reasoning

It provides mature support for:

* nodes;
* edges;
* ports;
* zoom;
* pan;
* drag;
* custom node rendering.

## Alternatives

Custom graph editor from scratch.

Rejected for MVP.

## Consequences

Backend graph contracts must remain independent of React Flow internals.

---

# ADR-023 — ECharts for Visualization Rendering

Status:

`ACCEPTED`

## Context

The MVP requires several chart types.

## Decision

Use Apache ECharts for chart rendering.

## Reasoning

It supports:

* bar;
* line;
* area;
* pie;
* scatter;
* responsive rendering;
* rich future customization.

## Alternatives

Chart.js, Recharts, Vega.

Not selected for initial implementation.

## Consequences

Use an adapter from semantic visualization config to ECharts configuration.

---

# ADR-024 — Debounced Workflow Autosave

Status:

`ACCEPTED`

## Context

Users should not lose graph edits but explicit save-only workflows create friction.

## Decision

Use debounced autosave for workflow graph changes.

Expose save state to the user.

Possible states:

* Saved
* Saving
* Unsaved
* Save failed

## Reasoning

This provides a smoother editing experience while retaining persistence clarity.

## Alternatives

Explicit Save only.

Not selected as default.

## Consequences

Autosave failure must be visible.

---

# ADR-025 — Original Uploaded Files Are Immutable

Status:

`ACCEPTED`

## Context

Cache and reproducibility depend on source identity.

## Decision

An uploaded source artifact is immutable.

Replacing a workbook creates a new source or explicit future source version.

## Reasoning

This avoids hidden mutation of workflow inputs.

## Alternatives

Overwrite files in place while keeping same source identity.

Rejected.

## Consequences

Cache keys can safely depend on source identity.

---

# ADR-026 — Cache Is Disposable

Status:

`ACCEPTED`

## Context

Execution caching improves responsiveness.

## Decision

Cached analytical results are never authoritative persistent product state.

## Reasoning

A cache may be deleted without losing projects or workflow definitions.

## Alternatives

Persist essential workflow output only in cache.

Rejected.

## Consequences

All results must be reproducible from source + configuration.

---

# ADR-027 — Synchronous Execution for Initial MVP

Status:

`ACCEPTED`

## Context

Introducing queues and workers would increase infrastructure complexity.

## Decision

Initial workflow preview and execution may run synchronously through the backend API.

## Reasoning

Appropriate for workbook-scale MVP workloads.

## Alternatives

Celery/RQ/worker queue from day one.

Deferred.

## Consequences

ExecutionService must remain isolated enough to move behind a job queue later.

---

# ADR-028 — REST API Under `/api/v1`

Status:

`ACCEPTED`

## Context

Frontend and backend require stable application contracts.

## Decision

Expose REST-style endpoints under:

`/api/v1`

## Reasoning

Simple, explicit, suitable for MVP.

## Alternatives

GraphQL.

Rejected for MVP.

## Consequences

Breaking API behavior should require deliberate versioning or coordinated migration.

---

# ADR-029 — JSONB for Flexible Configuration, Relational Columns for Relationships

Status:

`ACCEPTED`

## Context

Node configurations vary substantially by node type.

## Decision

Use JSONB for flexible configuration such as:

* node config;
* visualization config;
* source metadata.

Use relational fields for stable identity and relationships.

## Reasoning

This provides flexibility without sacrificing relational integrity.

## Alternatives

Store entire project as one JSON document.

Rejected.

## Consequences

Pydantic/domain validation must enforce JSONB structure.

---

# ADR-030 — Whole-Workflow Save Is Acceptable for MVP

Status:

`ACCEPTED`

## Context

Graph editing may generate frequent changes to nodes and edges.

## Decision

A complete workflow graph may be persisted using a whole-workflow PUT/update operation.

The backend should apply it atomically.

## Reasoning

This is simpler than exposing a large number of fine-grained mutation endpoints.

## Alternatives

One API call per node/edge mutation.

Deferred.

## Consequences

Workflow save must use transaction boundaries and prevent partial graph state.

---

# ADR-031 — Source Deletion Is Blocked When Referenced

Status:

`ACCEPTED`

## Context

Deleting an Excel source could silently break workflows.

## Decision

Prevent deletion of a source while active workflow nodes reference it.

## Reasoning

Safer and more understandable than cascading workflow deletion.

## Alternatives

Cascade delete all dependent nodes.

Rejected for MVP.

## Consequences

API must provide a dependency error.

---

# ADR-032 — Formula Execution Must Use Safe Parsed Expressions

Status:

`ACCEPTED`

## Context

Calculated Column accepts user-defined expressions.

## Decision

Expressions must be parsed into an allowlisted representation and compiled into safe dataframe operations.

Never use:

* `eval`;
* `exec`;
* arbitrary Python callables;
* arbitrary JavaScript execution.

## Reasoning

Formula input is an untrusted execution boundary.

## Alternatives

Python expression evaluation.

Rejected for security reasons.

## Consequences

A formula parser or safe expression library must be selected before Calculated Column implementation.

---

# ADR-033 — Table and Preview Results Are Bounded

Status:

`ACCEPTED`

## Context

Large datasets should not be transmitted wholesale to the browser.

## Decision

Preview and table APIs enforce server-side row limits.

## Reasoning

Protects:

* browser responsiveness;
* backend memory;
* network usage.

## Alternatives

Frontend-only limiting.

Rejected.

## Consequences

APIs must clearly indicate preview semantics.

---

# ADR-034 — Chart Point Counts Are Bounded

Status:

`ACCEPTED`

## Context

Sending extremely large chart datasets to the browser can make the UI unusable.

## Decision

Visualization data responses must have configurable point limits.

The system must not silently perform arbitrary aggregation solely to satisfy the limit.

## Reasoning

Correctness and transparency are more important than silently changing analytical meaning.

## Consequences

The product may return:

* warning;
* validation message;
* request for upstream aggregation.

---

# ADR-035 — Original Source Data Is Never Mutated

Status:

`ACCEPTED`

## Context

Transformations must be reproducible.

## Decision

All transformation nodes produce new logical dataset results.

Uploaded workbook source artifacts remain unchanged.

## Consequences

Workflow execution is conceptually immutable.

---

# ADR-036 — Dashboard Stores Logical Grid Layout

Status:

`ACCEPTED`

## Context

Pixel-position persistence is brittle across viewport sizes.

## Decision

Dashboard widgets persist logical grid values:

* x;
* y;
* width;
* height.

## Reasoning

This integrates naturally with grid layout libraries and supports future responsiveness.

## Alternatives

Absolute CSS pixel coordinates.

Rejected.

---

# ADR-037 — One Failed Dashboard Widget Must Not Break the Dashboard

Status:

`ACCEPTED`

## Context

Different visualizations may depend on different workflow branches.

## Decision

Dashboard widgets have independent loading and error states.

## Reasoning

Partial failure should not make unrelated analytical results unavailable.

## Consequences

Dashboard execution and rendering must isolate widget failures.

---

# ADR-038 — Structured API Errors

Status:

`ACCEPTED`

## Context

The frontend needs actionable error handling.

## Decision

Backend errors should follow a structured contract containing at least:

* code;
* message;
* optional details.

Node-related errors should include node identity when available.

## Reasoning

Parsing arbitrary text errors is fragile.

## Consequences

Domain errors must map consistently into API responses.

---

# ADR-039 — Deterministic Acceptance Fixtures

Status:

`ACCEPTED`

## Context

End-to-end BI correctness is difficult to test without known data.

## Decision

Maintain deterministic Excel fixtures inside the repository.

At minimum:

`sales.xlsx`

with known expected analytical outputs.

## Reasoning

This allows repeatable:

* executor tests;
* API tests;
* E2E tests;
* release acceptance.

## Consequences

Fixture data should be small enough for source control and rich enough for edge cases.

---

# ADR-040 — MVP Is a Desktop-First Web Application

Status:

`ACCEPTED`

## Context

Node editing is inherently spatial and difficult on small screens.

## Decision

Optimize the MVP for desktop-sized browsers.

## Reasoning

This keeps interaction quality high without creating a separate mobile UX.

## Alternatives

Full mobile workflow editing.

Deferred.

---

# Pending Decisions

The following decisions must be resolved before the associated implementation becomes deeply coupled.

---

# ADR-041 — Column Identity Strategy

Status:

`ACCEPTED`

Required before:

M5 completion.

## Context

Excel may contain:

* duplicate headers;
* blank headers;
* renamed columns.

Relying only on display names is unsafe.

## Decision

Represent each field with:

* stable `column_id`;
* user-facing `display_name`;
* engine-safe `engine_name`.

Node configs should reference stable column identity where practical.

Source column IDs are positional (`col_1`, `col_2`, ...) and scoped by the dataset schema. They are deterministic for an immutable source worksheet. Rename operations preserve `column_id` while changing display and engine names. Duplicate display labels receive deterministic `__N` engine-name suffixes and blank labels become `Column N`.

Join preserves lineage identity internally and assigns deterministic collision-safe output identities. Pivot-generated columns derive identity from their normalized pivot value and producing node identity.

## Consequences

Column IDs are not globally meaningful without their dataset/schema context. Replacing or structurally editing an uploaded workbook creates a new immutable source and may invalidate dependent configuration.

---

# ADR-042 - Formula Parser Implementation

Date: 2026-09-10. Status: ACCEPTED.

Context: Calculated Column needs arithmetic with predictable types and no host-code execution.
Decision: parse with Python ast in expression mode, then visit an explicit allowlist and
construct Polars expressions directly. No eval, exec, Python bytecode compilation,
functions, attributes, subscripts, imports or runtime name lookup are permitted.
Supported syntax: numeric constants, fields, +, -, *, /, unary signs and parentheses.
Bare identifiers refer to engine names; [column_id] references survive field renaming.
Limit input to 4096 characters, 256 syntax nodes and 64 levels of visitor depth.
Schema inference and execution share the same compiler. Numeric arithmetic uses Float64;
nulls propagate, non-finite results fail explicitly with node attribution.

Alternatives: a custom tokenizer/parser duplicates tested parsing infrastructure;
third-party expression engines add unnecessary execution capabilities and dependencies.
Consequences: floating point precision applies, including integer inputs above 2^53.
This is not a decimal accounting engine. Additional functions require explicit contracts
and security tests. Validation and adversarial cases are in test_arithmetic_nodes.py.

---

# ADR-043 - Visualization persistence

Date: 2026-09-10. Status: ACCEPTED.
Context: a visualization is both a terminal workflow node and a reusable dashboard reference.
Decision: workflow node configuration is the sole source of semantic chart settings.
Visualization rows form a project-scoped index synchronized in the graph-save transaction;
the row ID equals its node ID. Its config stays empty; type/name are derived index metadata.
Deleting a visualization node deletes its index and dashboard widgets; deleting an upstream
node leaves the visualization editable with an explicit missing-input error.
A visualization result is prepared Dataset plus a typed rendering specification returned
by the presentation service. Terminal visualization nodes expose no downstream ports.
KPI accepts exactly one prepared row. Bar charts accept at most 2000 rows and reject larger
results explicitly. Aggregation belongs upstream; the chart never silently truncates totals.
Alternatives: independent chart settings on both rows and nodes drift; dashboard-only charts
break the documented node-based journey. Consequence: chart edits use workflow revisions.

# ADR-044 - Dashboard grid and persistence

Date: 2026-09-10. Status: ACCEPTED.
Decision: react-grid-layout 2.2.4 with its typed v2 API handles drag/resize on a 12-column grid.
Persist widget visualization references and integer x/y/width/height. Each widget loads its
own visualization result so a broken chart does not block the rest of the dashboard.
Dashboard saves require an expected revision, just as workflow saves do. Layout editing
keeps a local draft and explicit save/retry rather than silently overwriting concurrent work.
Alternatives: custom pointer/resize geometry adds unnecessary browser behavior to maintain;
CSS grid alone cannot provide drag/resize. No chart configuration is copied into widgets.
Reference: https://github.com/react-grid-layout/react-grid-layout (v2 API checked 2026-09-10).

---

# ADR-045 — Initial Execution Cache Implementation

Status:

`SUPERSEDED BY ADR-052`

Required before:

M9 completion.

## Decision

Use a thread-safe, in-process LRU cache bounded to 32 dataset results initially.

Cache identity should incorporate:

* node type/version;
* node config;
* upstream result identity;
* source identity.

Keys are content-addressed SHA-256 values. A downstream key includes its upstream keys, so changing a source, node version, or configuration makes the affected node and all descendants miss the cache without maintaining a separate invalidation graph.

## Reasoning

Preview execution is synchronous and process-local for the MVP. A small bounded cache avoids repeated workbook loading while remaining simple, disposable, and independent from persistent product correctness. Content-addressed descendant invalidation is deterministic and avoids stale results caused by mutable invalidation bookkeeping.

## Alternatives

Temporary filesystem caching was rejected initially because Dataset serialization and cleanup add complexity before measured memory pressure exists.

Redis is deferred until multiple backend processes or distributed workers create a demonstrated need.

## Consequences

Cache entries do not survive restart and do not need to. Capacity is counted by result count rather than bytes; memory behavior must be measured during QA, and the capacity or implementation must be revised if workbook-sized datasets make this unsafe.

---

# ADR-046 — Excel Worksheet Loading Strategy

Status:

`ACCEPTED`

Required before:

M4/M5 completion.

## Context

openpyxl is suitable for workbook metadata but may not be ideal as the only path for dataframe loading.

## Decision

Use openpyxl in `read_only`, `data_only` mode with VBA preservation disabled for workbook inspection and bounded preview. The first worksheet row is the header. Empty and duplicate labels are normalized according to ADR-041.

Preview type inference examines the bounded returned rows. Nullability therefore means “nullable in the inspected sample,” not a full-workbook guarantee. Numeric mixtures become float; incompatible mixed types fall back to string. Dates and datetimes are serialized as ISO 8601 values.

Full execution loading converts worksheet values through the source-independent Dataset layer into Polars. It must preserve the same header identities and may perform broader type validation than preview inference.

Macros are never retained or executed. `.xlsm` is accepted only as an inert data container.

## Consequences

Inspection remains bounded in memory where openpyxl supports streaming. Downstream code does not receive openpyxl worksheet objects.

---

# ADR-047 — API Type Synchronization

Status:

`ACCEPTED; implementation specified by ADR-053`

Required before:

large frontend API surface.

## Context

Pydantic backend models and TypeScript frontend models can drift.

## Proposed Direction

Generate or synchronize TypeScript API types from FastAPI OpenAPI schema.

## Alternatives

Manually duplicated types.

Acceptable only temporarily during bootstrap.

## Required Decision

Choose exact tooling based on frontend build setup.

---

# ADR-048 — Optimistic Concurrency for Workflow Saves

Status:

`ACCEPTED; implementation specified by ADR-050`

Required before:

autosave hardening.

## Context

Even single-user applications can experience overlapping autosave requests.

## Proposed Direction

Add a workflow revision integer.

Client sends expected revision when saving.

Backend rejects stale writes.

## Alternative

Rely solely on request ordering.

## Required Decision

Evaluate implementation complexity before M14.

---

# ADR-049 — Persist Incomplete Workflow Drafts

Status:

`ACCEPTED`

## Context

The editor exposes explicit unconfigured and invalid node states. Requiring every node configuration to pass its complete execution schema before saving makes it impossible to persist a node while the user is still connecting and configuring it.

## Decision

Workflow persistence validates node type/version identity, graph references, and persistence integrity, but permits incomplete configuration for registered node types. Full configuration, port, schema, and DAG validation remains authoritative before schema-dependent use and every execution.

## Reasoning

Incomplete graphs are legitimate editable project state, not executable graphs. Preserving them prevents autosave races and data loss while maintaining the backend execution safety boundary.

## Alternatives

Rejecting incomplete graphs on save was rejected because it conflicts with the documented unconfigured node state and makes normal multi-step editing unreliable. Storing drafts only in the browser was rejected because expected project state must survive reload and restart.

## Consequences

Successfully persisted does not mean executable. Schema and preview APIs must return structured validation issues, and the UI must visibly distinguish saved drafts from valid executable workflows. Unknown node types remain rejected at persistence time.

---

# Decision Update Rules

When creating a new ADR:

1. choose the next sequential ID;
2. describe the real problem;
3. record current status;
4. explain selected decision;
5. include meaningful alternatives;
6. document consequences.

When a decision changes:

Do not silently edit history.

Instead:

* mark original ADR `SUPERSEDED`;
* reference the replacement ADR.

Example:

```text id="6fkjbi"
ADR-007

Status:
SUPERSEDED BY ADR-052
```

---

# Current Decision Summary

Accepted architectural foundations:

* modular monolith;
* backend-authoritative execution;
* PostgreSQL persistence;
* external workbook storage;
* local StorageProvider for MVP;
* Polars primary dataframe engine;
* explicit workflow DAG;
* node registry/executor architecture;
* source-independent Dataset abstraction;
* logical schema layer;
* schema propagation;
* semantic visualization configuration;
* React Flow editor;
* ECharts renderer;
* single-user MVP;
* bounded previews;
* safe formula parsing;
* synchronous initial execution;
* REST `/api/v1`;
* debounced autosave;
* deterministic test fixtures.

Major pending decisions:

No architectural decisions remain pending for the required MVP. M11 is specified in ADR-056;
complete visualization/recovery/reference contracts are in ADR-057 through ADR-060.

Review disposition and remaining limitations for ADR-001 through ADR-049 are recorded in
`docs/ARCHITECTURE_REVIEW.md`.

# ADR-050 — Workflow ownership and optimistic revision checks

Date: 2026-09-09. Status: ACCEPTED.

Context: merge-by-global-ID could move another workflow's node. `version` mixed
format identity with an edit counter. Serialized browser requests alone cannot
protect against two tabs/processes.

Decision: reject foreign node/edge IDs before mutation; insert new rows rather than
merging unknown IDs. Keep `version=1` as the format, add `revision`, and require
`expected_revision` for saves. An atomic conditional update returns 409 on conflict.
Migration 0002 preserves the previous counter as revision and resets format to 1.
Schema and preview responses identify the revision they represent.

Alternatives: request ordering alone does not protect other writers; resetting all
existing projects is unnecessary. Consequence: save API clients must send revisions.

# ADR-051 — Explicit Excel conversion and collision-safe column names

Date: 2026-09-09. Status: ACCEPTED.

Context: generated suffixes collided with literal Excel headers; Polars inferred
only an initial row prefix and failed on later mixed values.

Decision: reserve input labels before assigning suffixes, keep positional column
IDs, infer each complete input column, normalize mixed values to strings and build
typed Series. Nulls remain null; temporal strings use ISO representation. Source
preview inference remains explicitly sample-based; execution schema examines the
whole permitted worksheet. Column identity/lineage principles in ADR-041 remain.

Alternatives: increasing a sampling prefix still misses later values; silently
dropping incompatible values corrupts analytical input. Consequence: first source
materialization scans the complete worksheet subject to explicit resource limits.

# ADR-052 — Project-scoped source access and bounded reusable cache

Date: 2026-09-09. Status: ACCEPTED. Supersedes ADR-045.

Decision: ExecutionContext uses SourceAccess rather than SQLAlchemy Session or ORM
entities. ProjectSourceAccess adapts persistence/storage and reuses immutable sheet
materialization for schema and execution. Before a cached result can be returned,
validate source project ownership and artifact availability. Cache identity includes
project scope and immutable source storage identity; downstream keys include upstream
identities and node IDs (derived output field identity). LRU is bounded by 32 entries and 256 MiB of estimated dataframe storage.
Oversized results execute without being retained. Python object overhead remains an
additional cost to measure in QA.

Alternatives: Redis, distributed execution and full persistent result storage add
unneeded infrastructure. Consequences: cache remains disposable; warm results cannot
hide a deleted/missing source. First schema resolution may materialize a bounded sheet.

# ADR-053 — Recoverable editor drafts and generated API contracts

Date: 2026-09-09. Status: ACCEPTED.

Decision: a per-workflow serialized writer coalesces edits and uses acknowledged
server revisions. Pending drafts live in tab-scoped sessionStorage, survive page
navigation/reload, and never implicitly overwrite a newer server revision. Leaving
with unsaved edits warns the user. Explicit retry preserves the draft; discard/reload
is a user action. Successful saves clear drafts. Closing the tab ends session draft
storage; durable product state is the server-acknowledged graph.

Generate TypeScript API contracts from FastAPI OpenAPI using openapi-typescript;
`npm run api:check` detects drift. Specialized node forms use a component registry.
Shared ApiError retains structured node/field/error identifiers.

Alternatives: handwritten duplicated schemas drift; a universal JSON form reduces
the usability of analytical controls. Consequence: Node configuration remains typed
on the backend, with explicit UI adapters for each implemented node.

# ADR-054 — Repeatable artifact cleanup

Date: 2026-09-09. Status: ACCEPTED.

Decision: source/project deletion atomically enqueues storage keys with database
deletion. Cleanup removes files idempotently and only then removes queue rows.
Failed uploads roll back their source metadata and compensate their stored artifact.
Startup and `python -m app.services.file_cleanup` retry queued deletions.

Alternatives: deleting files before committing risks broken references on rollback;
ignoring storage failures permanently leaks files. Consequence: cleanup is eventually
consistent and may require retry after a storage outage. A process/database failure
before a compensation record is created still requires operational reconciliation.

# ADR-055 - M10 arithmetic and aggregation semantics

Date: 2026-09-10. Status: ACCEPTED.
Context: analytical results need stable field identity and explicit empty/null behavior.
Decision: Sort is stable, multi-key and nulls-last in both directions. Limit requires a
strictly positive integer. Calculated fields use calc_<node UUID>; Group By preserves
dimension IDs and assigns agg_<node UUID>_<index> to aggregation outputs. Reordering
aggregations changes those IDs and requires downstream revalidation.
Group By with no dimensions returns one global aggregate row. Count without a field
counts rows; count(field) counts non-null values; distinct count excludes nulls.
Sum/average use Float64; sum of no non-null values is null. Min/max preserve field type.
Grouped empty input has no groups; global empty input has counts zero and other values null.
Duplicate output names and nonnumeric sum/average are rejected. Backend performs all
aggregation before preview limits; no analytical rows are silently dropped.
Alternatives: preview-side aggregation gives wrong totals; arbitrary automatic coercion
of text to numbers hides source problems. Consequence: configuration forms expose compatible
operations and downstream references must be repaired after aggregation reorder.

# ADR-056 - Join, Union and value-dependent Pivot schemas

Date: 2026-09-10. Status: ACCEPTED.
Join supports inner/left with one key pair. Key types must match (unknown/null may adopt
the other type); numeric conversions must be explicit upstream to avoid rounded join keys.
Null keys do not match. Both key columns remain. Conflicting right names receive a
collision-safe __right suffix; right IDs are namespaced by the join node and input side.
A key-frequency preflight rejects output beyond 250000 rows, 1024 columns or 2000000 cells
before allocating a many-to-many result. Left order is preserved, then right match order.
Union matches names with compatible identical logical types, not source-local column IDs;
it preserves left field order/IDs and records both origins. It applies the same output cap.

Pivot supports one index, one pivot field and count/sum/average/min/max. It builds bounded
conditional Polars aggregations (maximum 128 categories); null and literal '(empty)' remain
distinct. Output IDs hash typed pivot values and node identity. Fields follow first occurrence;
count excludes nulls, missing aggregates stay null except count zero. Sum/average use Float64.
Schema resolution executes only a value-dependent node's ancestor branch through the common
executor/cache, then propagates its actual schema to downstream controls. Static transforms
continue to infer without execution. No preview sample is used to infer Pivot columns.
Alternatives: inferring Pivot from a sample loses fields; unconstrained many-to-many joins can
exhaust memory; silently casting numeric keys risks false matches above float precision limits.

# ADR-057 - Complete visualization and dashboard contracts

Date: 2026-09-11. Status: ACCEPTED.
Context: all mandatory charts must share execution, persistence and error semantics.
Decision: the domain catalog includes Table, KPI, Bar, Line, Area, Pie, Donut and Scatter.
Workflow node config remains the sole semantic owner. Tables request bounded backend pages;
charts receive complete prepared series up to 2000 points, otherwise an explicit error.
No browser aggregation or silent sampling is permitted. Scatter requires numeric axes;
Pie/Donut require non-negative values with a positive total. Nonfinite numeric axes fail clearly.
Date axes, number formatting, legend and labels are presentation settings.
Dashboard CRUD supports multiple dashboards. Widgets store optional title override and
title visibility alongside visualization references and grid coordinates, never copied semantics.
Alternative: a second chart editor on dashboards would create conflicting configuration copies.
Consequences: aggregation belongs upstream; widget errors remain isolated; table paging does not
change aggregate totals. Optional multiple series is deferred within the documented optional scope.

# ADR-058 - Safe Excel XML parsing and restart readiness

Date: 2026-09-11. Status: ACCEPTED.
Context: QA found defusedxml absent and reproduced backend startup failure during simultaneous
backend/PostgreSQL restart because Compose restart does not wait for dependency health.
Decision: pin defusedxml 0.7.1; translate invalid/forbidden XML errors from both initial and lazy
worksheet parsing. Apply the 1024-column limit to previews as well as materialization.
Before migrations, probe database availability for up to 60 seconds, with five-second connection
timeouts. Retry only availability probes; migration failures remain fatal and visible.
Alternatives: merely ordering the acceptance test hides the restart race; retrying migrations
indiscriminately can conceal real migration defects. Consequence: recovery is automatic when the
database becomes available within the startup budget; persistent outages still fail explicitly.
The parser protection follows the [openpyxl security guidance](https://openpyxl.readthedocs.io/en/stable/).

# ADR-059 - Source reference integrity and completion of application boundaries

Date: 2026-09-11. Status: ACCEPTED; refines ADR-031/049 and completes ADR-053 boundaries.
Context: source references live in node JSON and cannot be protected by ordinary foreign keys.
Saving a new reference concurrently with source deletion must have one consistent outcome.
Decision: graph saves, source deletion and project deletion acquire the project row lock first.
A configured source ID must exist in the same project; empty/unconfigured source nodes and
other incomplete configs remain saveable drafts. Existing sources with missing files may still
be saved, but schema/preview report the unavailable artifact. Invalid source IDs return 422 with
node attribution; no graph changes commit. Source deletion after a successful reference save
returns SOURCE_IN_USE. PostgreSQL competing-operation regression verifies both valid outcomes.
Alternatives: accepting deleted IDs creates dangling new references; generic JSON foreign-key
infrastructure adds disproportionate complexity. Consequence: writes within a project serialize;
the prior draft test now uses an existing source with an unavailable artifact instead of a fake ID.

Project/workflow create/read/update/delete orchestration and Excel preview belong to services.
HTTP handlers adapt typed input/output. NodeOutputPanel owns revision-aware preview rendering;
late results and errors from earlier revisions are hidden and covered by component tests.

# ADR-060 - Bounded cold source loading and local deployment defaults

Date: 2026-09-11. Status: ACCEPTED.
Context: multiple dashboard widgets can request the same uncached workbook simultaneously.
Decision: cache source materialization uses double-checked locking. One cold source load runs
at a time, while warm cache reads and Polars transformations remain independent. Failures release
the lock and can be retried. This avoids duplicate workbook parsing and reduces peak memory;
threaded regression verifies one load for concurrent requests. Existing cache byte/entry budgets
still apply. Alternative: per-key future infrastructure is unnecessary for the synchronous MVP.

Compose publishes ports only on 127.0.0.1, consistent with the unauthenticated single-user MVP.
Remote production hosting requires a separate deployment design; it is outside this release.
Unexpected API errors include the diagnostic UUID in both the response and plain log message.

Final error-path validation: unexpected errors are handled outside the normal CORS middleware.
The 500 response therefore explicitly preserves the same configured origin allowlist, allowing
the browser to read the sanitized diagnostic response. ApiError includes the diagnostic UUID
in its user-visible message. API regression verifies CORS and log correlation; frontend regression
verifies the displayed identifier.
