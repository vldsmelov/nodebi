# Node BI Development Status

Last updated: 2026-09-11
Overall: **IN PROGRESS — MVP NOT COMPLETE**

## Current milestone and task

M12/M13 implementation is integrated. M14/M15 recovery and QA are active; M16 is not signed off.
Latest completed feature: all required chart types and multiple-dashboard management with
persisted widget titles, visibility and layout. Startup readiness fix passes actual restart acceptance.

## Implemented

M0–M9 foundation and Astra revision fixes; M10 Select, Rename, Filter, Sort, Limit, safe
Calculated Column and Group By; M11 inner/left Join, Union and data-dependent Pivot.
M12 Table, KPI, Bar, Line, Area, Pie, Donut, Scatter share workflow-owned semantic config.
M13 dashboard CRUD, widget add/remove/drag/resize, revision checks and recoverable local drafts.
No product data was reset. Basic stack remains unchanged.

Revision fixes include foreign graph ID rejection, explicit Excel type conversion and unique
headers, atomic expected revisions, serialized autosave, source access interfaces, bounded cache,
retryable file cleanup, generated API types and structured errors.

## Validation checkpoint

* Backend: 190 passed, two SQLite-only skips; their PostgreSQL variants pass. Ruff and strict mypy pass (57 application files).
* Frontend: 17 tests, ESLint, TypeScript, generated API drift check and Docker production build pass.
* Browser: six scenarios pass together with real backend/PostgreSQL restart. Two additional
  slow-save/navigation scenarios pass separately (eight scenarios total).
* Excel malicious/malformed XML rejection and oversized preview regressions pass.
* 50000-row benchmark: upload/inspect 699 ms; cold source 2017 ms; warm source 10 ms;
  Filter 17 ms; calculated/grouped output 17 ms; warm chart 18 ms. Exact total verified.
  These are one local run, not a concurrency/load guarantee. Reproduce with
  `backend/.venv/Scripts/python backend/scripts/benchmark_mvp.py` from repository root.

## Findings and limitations

* Restart race fixed and verified; no known open P0/P1 in the completed chart/dashboard features.
* XML entity protection was absent; defusedxml is pinned and enabled, with regression coverage.
* P2: abrupt process failure before upload compensation is recorded can leave an orphan artifact;
  operational reconciliation is still required for this narrow crash window.
* Slow-response/navigation autosave browser cases pass; final QA matrix remains to be completed.
* Cache memory accounting estimates dataframe bytes and excludes Python/engine overhead.
* Float64 arithmetic precision and single-key Join are explicit ADR-055/056 limitations.
* Two upstream TestClient deprecation warnings remain. No blocker currently.

## Next work

1. Complete application-boundary/editor review and remaining QA checklist.
2. Complete M14/M15 QA matrix, remaining application-boundary/editor review and documentation.
3. Perform M16 clean-install/migration/release review; only then mark MVP complete.

## Persistent resume context

Commits: `accc239` baseline; `e2987fb` revision/M10; `47076ba` early Bar/KPI/dashboard;
`576d64a` M11 and runtime dependency pins. Current chart/QA work is uncommitted.
Backup: `.backups/before-astra-migrations-20260910.sql` (ignored). No reset performed.
Migrations 0002–0004 introduce workflow revision, file cleanup queue and dashboard revision.
PostgreSQL tests create/drop their own generated schemas only. Use
`NODEBI_TEST_POSTGRES_URL=postgresql+psycopg://nodebi:nodebi_dev@127.0.0.1:5432/nodebi?connect_timeout=5`.
Python localhost/IPv6 connections hang in this environment; benchmark disables environment proxies.
`NODEBI_E2E_RESTART=1 npm run test:e2e` runs actual restart acceptance from frontend.
See docs/ASTRA_HANDOFF.md for Sol history and docs/ARCHITECTURE_REVIEW.md for ADR review.
