# AGENTS.md

## 1. Purpose

This repository contains the source code for a node-based Business Intelligence platform.

The primary objective of the development agent is to evolve this repository into a coherent, reliable, tested, and maintainable MVP without requiring continuous step-by-step supervision from the product owner.

The agent is expected to work autonomously within the boundaries defined by:

* `PRODUCT_SPEC.md`
* `ARCHITECTURE.md`
* `TASKS.md`
* `STATUS.md`
* `DECISIONS.md`
* this file

This file defines how an AI coding agent must operate inside the repository.

---

# 2. Product Mission

The product is a web-based BI system where users can:

1. Create BI projects.
2. Import Excel workbooks.
3. Inspect sheets, columns, data types, and sample data.
4. Build data transformation workflows using a node-based editor.
5. Execute workflows on the backend.
6. Preview the output of intermediate nodes.
7. Create charts, KPI widgets, and tables.
8. Arrange visualizations on dashboards.
9. Save the project state.
10. Restore projects after browser and server restarts.

The product should feel like a lightweight combination of:

* visual ETL;
* spreadsheet analytics;
* BI dashboards;
* node-based workflow editing.

The MVP must prioritize clarity, reliability, and extensibility over feature count.

---

# 3. Sources of Truth

The agent must use the repository documentation as persistent project memory.

The authority order is:

1. `PRODUCT_SPEC.md`
2. `ARCHITECTURE.md`
3. `DECISIONS.md`
4. `TASKS.md`
5. `STATUS.md`
6. existing implementation

If implementation conflicts with documented product or architecture decisions, the conflict must be investigated.

Do not silently redefine requirements based on the current implementation.

If documents conflict with one another, prefer the higher-authority document and record the conflict in `DECISIONS.md` if necessary.

---

# 4. Required Working Cycle

For every development task, follow this lifecycle:

READ
→ UNDERSTAND
→ PLAN
→ IMPLEMENT
→ TEST
→ FIX
→ TEST AGAIN
→ REVIEW
→ DOCUMENT
→ UPDATE PROJECT STATE
→ CONTINUE

Do not consider code generation alone to be task completion.

A task is complete only when:

* its acceptance criteria are satisfied;
* relevant automated tests pass;
* type checking passes where applicable;
* linting passes where applicable;
* related documentation is updated;
* no known P0/P1 defect remains in the implemented feature.

---

# 5. Autonomous Development Behavior

The agent should continue automatically from one normal development task to the next.

Do not ask the product owner questions such as:

* "Should I continue?"
* "Should I implement the next task?"
* "Would you like me to add tests?"
* "Should I update documentation?"

These actions are part of normal implementation responsibilities.

When a minor ambiguity exists, make the simplest reasonable decision consistent with the product specification and architecture.

Record meaningful decisions in `DECISIONS.md`.

Stop only when a genuine blocker exists.

Examples of genuine blockers:

* required credentials are unavailable;
* an external service cannot be accessed and no local substitute is appropriate;
* two requirements are fundamentally incompatible;
* proceeding requires destructive action outside the development environment;
* a decision would materially change the agreed product scope;
* implementation would require bypassing an explicit security constraint.

Minor UI, naming, implementation, or library decisions are not blockers.

---

# 6. Starting a Work Session

At the beginning of every development session:

1. Read `AGENTS.md`.
2. Read `STATUS.md`.
3. Read the relevant parts of `PRODUCT_SPEC.md`.
4. Read the relevant parts of `ARCHITECTURE.md`.
5. Inspect `TASKS.md`.
6. Read relevant decisions from `DECISIONS.md`.
7. Inspect the current repository state.
8. Identify the first unfinished actionable task.
9. Verify whether its prerequisites are complete.
10. Begin work.

Do not repeat already completed work unless regression, broken implementation, or specification changes require it.

---

# 7. Ending or Interrupting a Work Session

Before ending a development session, update `STATUS.md`.

At minimum record:

* current milestone;
* current task;
* last completed task;
* next task;
* current test status;
* known defects;
* blockers;
* important temporary context needed by the next session.

A new agent session must be able to resume development using repository files alone.

Conversation history must not be required to understand current project state.

---

# 8. Task Management

`TASKS.md` contains the implementation roadmap.

Use these statuses:

* `[ ]` TODO
* `[~]` IN PROGRESS
* `[x]` DONE
* `[!]` BLOCKED

Tasks should follow a hierarchy such as:

Epic
→ Milestone
→ Feature
→ Task
→ Subtask

Before implementing a milestone, inspect whether additional technical subtasks are required.

The agent may add implementation subtasks when necessary.

The agent must not silently expand product scope.

New product features that are outside the documented MVP should be added to a future-work section rather than implemented automatically.

---

# 9. Definition of Task Completion

A task must not be marked `[x] DONE` merely because code exists.

A task is complete when all applicable conditions are true:

* acceptance criteria pass;
* implementation is integrated with surrounding systems;
* relevant unit tests exist;
* relevant integration tests exist;
* error conditions are handled;
* user-facing errors are understandable;
* schema or API contracts are updated;
* frontend types are updated if necessary;
* database migration exists if persistence changed;
* relevant documentation is current;
* regression tests pass.

---

# 10. Architecture Discipline

Follow `ARCHITECTURE.md`.

Do not introduce alternate architectural patterns locally without documenting the decision.

Key principles include:

* backend owns data execution;
* frontend owns interaction and presentation;
* workflows are represented as explicit graphs;
* transformation nodes operate through common contracts;
* datasets use explicit schemas;
* persistence models are separate from execution models when appropriate;
* chart configuration must not hide arbitrary data transformation logic;
* storage must be abstracted behind defined interfaces;
* APIs must use explicit typed contracts;
* domain logic must not be scattered across route handlers or UI components.

---

# 11. Node System Rules

The node system is a core product subsystem and must remain extensible.

Every node type should have an explicit definition.

Where applicable, a node definition should describe:

* node type identifier;
* node version;
* display metadata;
* input ports;
* output ports;
* configuration schema;
* validation rules;
* schema inference behavior;
* execution behavior;
* UI configuration metadata.

Backend execution should use a common node executor contract.

Conceptually:

`Workflow`
→ `Graph Validation`
→ `Execution Plan`
→ `Node Executor`
→ `Dataset Result`

Node-specific execution logic must not be embedded directly inside generic graph traversal code.

---

# 12. Workflow Rules

A workflow must be treated as a directed graph.

The execution system must support:

* node identity;
* directed edges;
* port validation;
* DAG validation;
* cycle detection;
* dependency resolution;
* topological execution order;
* disconnected node handling;
* configuration validation;
* schema propagation;
* execution error attribution.

Whenever practical, workflow validation should happen before expensive execution begins.

Errors should identify the node that caused the problem.

---

# 13. Dataset Rules

The application must use an internal dataset abstraction independent of Excel.

Excel is a data source, not the core data model.

The internal dataset model must support explicit schemas.

Supported MVP logical types should include at minimum:

* string;
* integer;
* float;
* boolean;
* date;
* datetime;
* null/unknown.

Downstream nodes must not need to know whether upstream data originated from Excel, CSV, SQL, or another future source.

---

# 14. Schema Propagation

Schema inference is a first-class capability.

Where possible, nodes should be able to determine their output schema without executing the full dataset.

Example:

Input schema:

* quantity: integer
* price: float

Calculated column:

* revenue = quantity * price

Output schema:

* quantity: integer
* price: float
* revenue: float

Schema propagation should support:

* frontend field selectors;
* validation;
* type-aware configuration;
* visualization suggestions;
* earlier error detection.

Do not bypass schema propagation by hard-coding column names in UI components.

---

# 15. Backend Responsibilities

The backend is responsible for:

* project persistence;
* file ingestion;
* dataset metadata;
* workflow validation;
* workflow execution;
* transformation execution;
* schema inference;
* preview generation;
* execution errors;
* persistence APIs;
* dashboard configuration persistence where appropriate.

Core data transformation logic must not be duplicated in the frontend.

---

# 16. Frontend Responsibilities

The frontend is responsible for:

* project navigation;
* data source interaction;
* node editor interaction;
* node configuration interfaces;
* workflow visualization;
* schema-aware controls;
* data previews;
* chart rendering;
* dashboard editing;
* user feedback;
* error presentation.

Complex data processing must remain on the backend.

The frontend may perform lightweight presentation-only transformations when necessary for rendering.

---

# 17. API Rules

API contracts should be explicit and typed.

Avoid returning arbitrary unstructured dictionaries when a stable schema is possible.

APIs should provide predictable error responses.

Where relevant, errors should include:

* error code;
* human-readable message;
* node ID;
* field/configuration path;
* technical detail suitable for debugging.

Breaking API changes should be deliberate and documented.

---

# 18. Persistence Rules

Persistent product state should survive application restart.

For the MVP this includes where applicable:

* projects;
* uploaded source metadata;
* source configuration;
* workflows;
* nodes;
* edges;
* node configuration;
* chart configuration;
* dashboards;
* dashboard widgets;
* widget layout.

Do not rely on frontend-only state for information that the user expects to persist.

---

# 19. Database Changes

Database schema changes must use migrations.

Do not modify persistent schemas without creating or updating the appropriate migration.

Migrations should be:

* reproducible;
* ordered;
* safe for normal development upgrades;
* compatible with documented setup instructions.

Do not manually mutate production-like database state as a substitute for migrations.

---

# 20. File Storage

Source files must be accessed through a storage abstraction.

The MVP may use local filesystem storage.

Application logic must not assume that local filesystem storage will always be used.

The storage design should permit future implementations such as:

* S3;
* MinIO;
* Azure Blob Storage;
* other object stores.

Do not build S3 support unless required by the current scope.

---

# 21. Technology Boundaries

Preferred stack is defined in `ARCHITECTURE.md`.

Do not replace major technologies simply because another tool is personally preferable.

A major technology change requires:

1. a concrete problem with the current approach;
2. evaluation of alternatives;
3. impact analysis;
4. documentation in `DECISIONS.md`.

Examples of major technology choices:

* database;
* frontend framework;
* backend framework;
* dataframe engine;
* workflow execution model;
* charting library;
* persistence strategy.

---

# 22. Dependency Rules

Before adding a dependency:

1. Verify that existing dependencies do not already solve the problem.
2. Prefer mature and actively maintained libraries.
3. Avoid dependencies for trivial functionality.
4. Avoid overlapping libraries with the same role.
5. Consider frontend bundle size or backend operational cost where relevant.

Dependencies must not be added merely for convenience if they create unnecessary architectural complexity.

---

# 23. Code Quality

Prefer:

* strong typing;
* explicit domain models;
* focused modules;
* small composable functions;
* deterministic behavior;
* clear naming;
* reusable contracts;
* testable components;
* meaningful errors;
* minimal hidden state.

Avoid:

* god classes;
* god components;
* circular dependencies;
* duplicated business logic;
* giant route handlers;
* business logic inside React rendering code;
* magic string proliferation;
* unexplained constants;
* unnecessary abstraction layers;
* premature optimization.

---

# 24. Refactoring Rules

Do not perform broad refactors merely because another design appears cleaner.

Refactoring must address at least one concrete reason:

* known defect;
* architecture violation;
* measurable or obvious performance issue;
* excessive duplication;
* safety or reliability problem;
* technical debt blocking an upcoming milestone;
* inability to test important behavior.

If the refactor is substantial, record the rationale in `DECISIONS.md`.

Preserve working behavior unless the product specification requires changing it.

---

# 25. Scope Control

The MVP scope is defined by `PRODUCT_SPEC.md`.

Do not automatically implement attractive adjacent features.

Examples of features that may be intentionally deferred:

* Google Sheets;
* SQL connectors;
* REST connectors;
* collaborative editing;
* scheduled refresh;
* AI-generated dashboards;
* plugin marketplace;
* row-level security;
* enterprise permissions;
* email reports;
* realtime streaming;
* mobile applications.

Architecture may prepare for future extension, but implementation should remain proportional to current requirements.

---

# 26. Testing Strategy

Testing is part of implementation.

Use an appropriate combination of:

* unit tests;
* integration tests;
* API tests;
* frontend component tests;
* end-to-end tests.

Prioritize tests around:

* workflow execution;
* transformation correctness;
* schema inference;
* persistence;
* project restoration;
* invalid configurations;
* Excel parsing;
* graph validation;
* user-critical workflows.

Do not create tests merely to increase test counts.

Tests should protect meaningful behavior.

---

# 27. Required Quality Checks

Before completing a relevant task or milestone, run applicable checks such as:

Backend:

* unit tests;
* integration tests;
* formatting;
* lint;
* type checking where configured.

Frontend:

* tests;
* lint;
* TypeScript typecheck;
* production build.

End-to-end:

* critical user flows.

A failing required check must not be ignored without documentation.

---

# 28. Test Failure Policy

When a test fails:

1. Determine whether the test or implementation is incorrect.
2. Do not automatically weaken the test to make it pass.
3. Fix the underlying implementation when the test represents intended behavior.
4. Change a test only when the requirement or expected behavior was genuinely incorrect.
5. Record meaningful behavioral changes where necessary.

Never remove meaningful tests solely to obtain a green test suite.

---

# 29. QA Phase

After core MVP implementation, perform a dedicated QA phase.

Review the system from the perspective of a user and an adversarial tester.

Test at minimum:

* valid Excel workbook;
* invalid file type;
* corrupted workbook;
* empty workbook;
* empty sheet;
* multiple sheets;
* null values;
* duplicate column labels;
* unusual column labels;
* mixed values;
* date columns;
* large sheet behavior;
* invalid filter configuration;
* invalid calculated expression;
* disconnected workflow;
* cycle attempts;
* missing upstream inputs;
* deleted upstream nodes;
* invalid joins;
* empty transformation result;
* project refresh;
* browser reload;
* backend restart;
* database restart.

---

# 30. Defect Severity

Classify discovered defects:

## P0 — Critical

Examples:

* data corruption;
* severe security issue;
* application cannot start;
* primary MVP workflow cannot be completed.

Must be fixed before continuing to completion.

## P1 — Major

Examples:

* important MVP feature is unusable;
* workflow produces incorrect results;
* saved projects cannot be restored;
* significant regression in the core journey.

Must be fixed before MVP completion.

## P2 — Significant

Examples:

* substantial UX problem;
* non-critical feature partially broken;
* poor but recoverable error handling.

Fix when materially affecting MVP usability.

## P3 — Minor

Examples:

* visual polish;
* minor wording;
* edge-case convenience issue.

May be deferred.

---

# 31. Security Baseline

Even for the MVP:

* validate uploaded files;
* do not trust filenames;
* do not allow arbitrary filesystem paths;
* sanitize storage identifiers;
* validate API input;
* avoid arbitrary code execution in formula features;
* do not expose server stack traces to normal users;
* do not store secrets in source code;
* protect against obvious resource abuse where practical.

Calculated columns and formulas must not evaluate arbitrary Python or JavaScript supplied by users.

Use a controlled expression system.

---

# 32. Performance Baseline

Do not optimize prematurely, but avoid obviously inefficient designs.

Important considerations:

* do not repeatedly reload the same workbook unnecessarily;
* avoid transferring complete datasets to the browser when previews are sufficient;
* use pagination or row limits for previews;
* cache expensive intermediate results when justified;
* avoid executing unrelated workflow branches;
* prefer vectorized dataframe operations;
* avoid converting large dataframes to Python row dictionaries unnecessarily.

Performance improvements should remain measurable and understandable.

---

# 33. Observability

Errors during workflow execution should be diagnosable.

Where appropriate capture:

* workflow ID;
* node ID;
* node type;
* execution duration;
* failure category.

Do not log sensitive workbook contents unnecessarily.

Logs should help development and debugging without becoming an alternate persistence mechanism.

---

# 34. Documentation Responsibilities

Documentation must evolve with implementation.

Update:

`PRODUCT_SPEC.md`
when product behavior or scope changes.

`ARCHITECTURE.md`
when structural architecture changes.

`DECISIONS.md`
when meaningful technical/product decisions are made.

`TASKS.md`
when roadmap state changes.

`STATUS.md`
when development state changes.

`README.md`
when installation, startup, development, test, or operational instructions change.

---

# 35. Decision Recording

Use `DECISIONS.md` for significant decisions.

A decision entry should contain:

* ID;
* date if available;
* status;
* context;
* decision;
* reasoning;
* alternatives considered;
* consequences.

Examples:

* dataframe engine selection;
* workflow persistence representation;
* expression language;
* dashboard layout library;
* schema inference strategy;
* caching strategy.

Do not create decision records for trivial implementation details.

---

# 36. Git and Change Discipline

Keep changes logically related to the active task.

Avoid mixing unrelated cleanup with feature implementation.

If commits are available in the environment, prefer coherent commits corresponding to meaningful tasks or milestones.

Before considering a large task complete, inspect the diff for:

* accidental files;
* generated artifacts;
* debug code;
* temporary logs;
* commented-out obsolete code;
* secrets;
* unrelated changes.

---

# 37. Debugging Rules

When debugging:

1. Reproduce the problem.
2. Identify the failing layer.
3. Determine root cause.
4. Add or update a regression test when appropriate.
5. Implement the smallest correct fix.
6. Run affected tests.
7. Run relevant regression checks.

Avoid speculative multi-layer rewrites for isolated defects.

---

# 38. Error Handling

Errors should be explicit rather than silently ignored.

Prefer domain-specific errors where useful.

Examples:

* `InvalidWorkflowError`
* `CycleDetectedError`
* `MissingNodeInputError`
* `InvalidNodeConfigurationError`
* `DatasetSchemaError`
* `ExcelImportError`
* `FormulaValidationError`
* `JoinConfigurationError`

User-facing error messages should explain what the user can correct.

---

# 39. Feature Implementation Order

When dependencies permit, prefer this order:

1. domain contracts;
2. backend implementation;
3. API contract;
4. frontend integration;
5. persistence;
6. tests;
7. documentation.

For UI-first exploratory work, temporary mocks are acceptable only if clearly marked and removed before task completion.

---

# 40. MVP Completion Criteria

Do not declare the MVP complete until the end-to-end acceptance journey passes.

The required journey is:

1. Start the application using documented commands.

2. Create a project called `Sales Analysis`.

3. Upload an Excel workbook.

4. Select a worksheet.

5. Inspect a data preview.

6. Create a workflow:

   Excel Source
   → Filter
   → Calculated Column
   → Group By
   → Bar Chart

7. Configure the filter.

8. Create a calculated revenue field.

9. Aggregate revenue by a dimension.

10. Render the bar chart.

11. Create a KPI visualization.

12. Add both visualizations to a dashboard.

13. Move dashboard widgets.

14. Resize dashboard widgets.

15. Save the project.

16. Reload or restart the application.

17. Reopen the same project.

18. Verify that the source, workflow, node settings, visualizations, and dashboard layout are restored.

19. Verify required automated tests pass.

20. Verify the production build succeeds.

This journey must be reproducible.

---

# 41. MVP Completion Review

Before declaring completion:

1. Run the full relevant test suite.
2. Run linting.
3. Run type checking.
4. Run frontend production build.
5. Run database migrations from a clean database.
6. Run the documented local startup procedure.
7. Complete the MVP acceptance journey.
8. Review outstanding P0/P1 issues.
9. Review documentation.
10. Update `STATUS.md`.
11. Update `TASKS.md`.
12. Record remaining non-critical limitations.

Only then may the project status be changed to MVP complete.

---

# 42. Future-Friendly but MVP-Focused Design

The architecture should make future support possible for:

* CSV;
* SQL databases;
* APIs;
* cloud object storage;
* additional node types;
* plugins;
* scheduled execution;
* multiple users;
* permissions;
* collaborative dashboards.

However, future extensibility must not cause unnecessary complexity in the MVP.

Use abstractions where there is a clear boundary already present in the product.

Do not implement speculative infrastructure for requirements that do not yet exist.

---

# 43. General Decision Rule

When choosing between:

* a clever solution;
* a simple explicit solution;

prefer the simple explicit solution unless the clever solution solves a demonstrated problem.

When choosing between:

* short-term speed that creates architectural debt;
* slightly more work that preserves a documented core boundary;

preserve the core boundary.

When choosing between:

* implementing another feature;
* making the primary workflow reliable;

make the primary workflow reliable.

---

# 44. Final Agent Directive

The purpose of the agent is not to maximize code output.

The purpose is to incrementally create a dependable product.

Always optimize for:

1. correctness;
2. coherent architecture;
3. recoverable project state;
4. testability;
5. usability;
6. maintainability;
7. controlled scope;
8. development speed.

Continue autonomously through normal implementation work until the documented MVP Definition of Done is achieved or a genuine blocker is encountered.
