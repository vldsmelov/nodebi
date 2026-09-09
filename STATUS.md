# Node BI Development Status

Last updated: 2026-09-04

Overall status: **IN PROGRESS**

## Current Milestone

`M10 — Core Transformation Nodes` (`IN PROGRESS`)

## Current Task

`M10.4 — Sort`

## Last Completed Task

`M10.3 — Filter`

Completed milestones: M0 through M9. M10 is in progress.

## Current Repository State

The application supports persistent projects, secure Excel sources, source-independent datasets, versioned node definitions, atomic workflow graph persistence, and Excel Source, Select Columns, Rename Columns, and Filter executors. Filter provides type-aware numeric, string, boolean, null, date, and datetime comparisons with AND composition; string containment is literal rather than regex-based. The frontend provides a React Flow canvas with a searchable categorized node library, schema-aware configuration, local port compatibility, deletion, debounced autosave, save feedback, preview, and schema/error display.

The backend now provides reusable graph validation, cycle detection, deterministic topological ordering, per-node schema resolution, target-ancestor execution planning, typed runtime routing, structured execution failures, and a bounded content-addressed LRU cache. Generic preview execution is exposed at `POST /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview`; the editor renders its bounded results.

## Test Status

* Backend: 65 passing; Ruff, formatting, and strict mypy pass.
* Frontend: 8 passing; ESLint, strict TypeScript, and production build pass.
* Migrations: ORM drift check and PostgreSQL upgrade checks previously pass; no schema change was made in M7/M8.
* Docker Compose: PostgreSQL, backend, and production frontend are healthy after rebuilding the current images.
* Live workflow smoke: an `Excel Source → Filter` workflow with two AND conditions returned the expected two rows and unchanged seven-column schema. An invalid integer/string operator combination persisted as a draft and schema validation reported `INVALID_FILTER`.
* E2E: no browser automation configured yet.

Two upstream FastAPI/Starlette `TestClient` deprecation warnings remain; no product defect is known.

## Known Blockers

None.

## Known Defects

None recorded.

## Next Planned Tasks

1. Implement multi-column Sort with ascending and descending directions.
2. Implement Limit with strict positive-value validation.
3. Continue with the controlled Formula Engine required by Calculated Column.

## Resume Notes

The Compose stack is running with the latest backend and frontend images. Temporary Filter acceptance workflows were removed after successful validation. Optional Filter OR composition is deliberately deferred until condition grouping semantics are specified; AND covers the MVP requirement. ADR-049 records that registered but incomplete nodes are persisted as drafts while execution remains strictly validated.

Always inspect `TASKS.md`, the working tree, and live container state before continuing.
