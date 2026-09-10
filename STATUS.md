# Node BI Development Status

Last updated: 2026-09-10
Overall status: **IN PROGRESS — MVP NOT COMPLETE**

## Current Milestone

Astra architecture revision gate before M10 continuation.

## Current Task

Early Bar Chart/KPI/dashboard slice verified. Next: M11 Join, Union, Pivot.

## Last Completed Task

M10 Sort, Limit, safe arithmetic formulas, Calculated Column and Group By, including configuration UI and browser restoration. Revision fixes implemented:
foreign graph ID rejection; Excel collision/mixed-type fixes; atomic workflow revisions;
recoverable serialized autosave; source access abstraction; cache validation/memory limits;
source/project artifact cleanup; generated OpenAPI types; editor configuration/card extraction.

## Test Status

* Backend: 155 passed, 2 SQLite-only skips (those cases pass in the PostgreSQL matrix).
  Ruff and strict mypy pass (47 application source files).
* Frontend: 14 tests, lint, typecheck and production build pass; OpenAPI drift check passes.
* Playwright: 4 scenarios pass on Docker: two-tab conflict, failed-save recovery,
  Excel preview/restoration and full M10 pipeline built through the editor.
* Docker backend/frontend/PostgreSQL healthy; migrations applied without data reset.
* npm audit last run: zero vulnerabilities. Backend dependency pinning remains a QA item.
* Two upstream TestClient deprecation warnings remain.
* Latest transaction snapshot fix passes the full local PostgreSQL test suite;
  deployed backend image precedes that fix and should be rebuilt before next acceptance.

## Known Defects and Review Items

* Original A01–A03 defects have fixes and regression coverage on SQLite/PostgreSQL.
* Autosave conflict/recovery browser verification passes; additional slow-response/navigation cases remain.
* Source deletion versus concurrent new workflow references needs final recovery hardening.
* Abrupt upload failure before compensation can be queued may require artifact reconciliation.
* M10 remainder, visualizations, dashboards and complete restart acceptance are unfinished.
* Original findings and ADR-001–ADR-049 dispositions are preserved in
  docs/ASTRA_HANDOFF.md and docs/ARCHITECTURE_REVIEW.md.

## Blockers

None currently. Docker Engine was started successfully; the previous outage is resolved.
Use 127.0.0.1 rather than localhost for Python PostgreSQL connections in this environment.

## Next Tasks

1. M11 Join, Union and Pivot contracts, implementation, UI and regression tests.
2. Finish remaining revision review items and backend dependency reproducibility.
3. M11 and remaining M12/M13.
4. M14–M16 recovery, QA and final release gates.

## Resume Context

Git baseline commit: accc239. Revision and M10 changes are recorded in the checkpoint commit following that baseline.
Database backup: .backups/before-astra-migrations-20260910.sql (ignored by Git).
No database/source storage reset has been performed.
Migration 0002 separates workflow format version from edit revision; migration 0003 adds
retryable file cleanup. Existing save clients must send expected_revision.
Run npm run api:generate after API changes; npm run api:check detects drift.
PostgreSQL test opt-in: NODEBI_TEST_POSTGRES_URL=postgresql+psycopg://nodebi:nodebi_dev@127.0.0.1:5432/nodebi?connect_timeout=5.
Tests create/drop only their private generated schemas.

## Active early-slice implementation

ADR-043/044 accepted: chart semantics live only in workflow node config; Visualization is
an automatically synchronized index. Dashboard uses react-grid-layout 2.2.4 and explicit
revision-checked save with a tab-local recoverable draft. Migration 0004 adds dashboard revision.
Bar/KPI executors, result service, dashboard APIs and UI are implemented and under test.
Full regression: 159 backend tests pass across SQLite/PostgreSQL; 14 frontend tests and build pass.
All 4 browser tests pass, including Bar/KPI, widget drag/resize/save, isolated widget error,
and a real backend/PostgreSQL restart (NODEBI_E2E_RESTART=1). Latest finite-value guard
is locally verified and will enter the next backend image.
MVP is not complete: M11, other charts, full dashboard management and QA remain.
Checkpoint before early slice: e2987fb. Early-slice work is not yet committed.

## M11 work in progress

Join (inner/left), Union and bounded Pivot are implemented with UI forms. Nine focused
regressions pass; full runtime-aligned backend suite: 168 passed plus two SQLite skips.
Value-dependent schema resolution executes the Pivot ancestor branch through the shared
cache, then propagates actual fields downstream. ADR-056 records matching/null/lineage/cap semantics.
Runtime versions now match local and Docker, with a cached dependency layer. Latest regression
also fixes blank-header-row data loss (test_excel.py); empty sheets still remain empty.
M11 browser acceptance passes: two-input Join/Union and Pivot fields consumed by Select Columns.
Next: remaining chart types, dashboard management and final QA.
Early slice is committed as 47076ba; M11 and dependency lock changes are not yet committed.
