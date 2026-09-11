# Sol → Astra implementation handoff

Updated: 2026-09-09. Status: revision in progress; MVP is not complete.

## Provenance and baseline

Previous local conversation: **Довести BI Platform до MVP**, thread
`01a06bbd-cdfe-75a3-829d-19c717eaa2c1`, 2026-09-04, model `gpt-5.6-sol`.
The original request and completion events were inspected on 2026-09-09.
The last turn stopped at a usage limit during Filter; implementation and documentation
were present and the baseline suite was independently rerun successfully.

| Milestones | Delivered baseline |
| --- | --- |
| M0–M3 | Product/architecture documents, Next.js/FastAPI, PostgreSQL, Alembic, eight tables, storage abstraction, project CRUD |
| M4–M5 | Excel upload/inspection/preview, logical datasets and schemas, Polars, deterministic sales fixture |
| M6 | Versioned node registry/executor contracts, workflow persistence, Excel Source |
| M7–M8 | React Flow, configuration panels, autosave, graph validation, schema propagation |
| M9 | Ancestor execution, runtime input routing, attributed errors, bounded preview, LRU cache |
| M10.1–M10.3 | Select Columns, Rename Columns, type-aware Filter with AND |

Baseline checks: 65 backend tests, 8 frontend tests; Ruff, format check, strict mypy,
ESLint, TypeScript and production build pass. Two dependency deprecation warnings.
PostgreSQL/restart claims in the earlier chat are historical, not current verification.
Docker Engine was unavailable during the audit; no browser acceptance automation existed.
The source directory had no Git history; a local baseline commit now preserves it.

## Transition note

Проект переходит с GPT-5.6 Sol на GPT-6 Astra. Переход используется для полной
повторной проверки архитектуры, контрактов и тестового покрытия. Прежняя реализация
сохраняет ценность как работающая основа. Изменения принимаются по воспроизводимым
дефектам, соответствию требованиям, снижению сложности и измеримому улучшению надёжности.

The user requested a full architecture revision, preserving the agreed product scope.
A clean start of test data is permitted after backup if necessary; no automatic reset.
Keep the modular monolith, PostgreSQL, FastAPI, Polars, Next.js, React Flow and ECharts.

## Audit findings

| ID | Severity | Evidence | Required resolution |
| --- | --- | --- | --- |
| A01 | P0 | Isolated SQLite reproduction: `save_graph` with another workflow's node ID reassigns its ownership through `merge` | Reject foreign node/edge IDs atomically; PostgreSQL regression |
| A02 | P1 | Excel headers `a,a,a__2` produce duplicate engine names and loading fails | Collision-safe deterministic naming |
| A03 | P1 | 101 numeric rows followed by text cause Polars ComputeError | Explicit full-input types and lossless mixed-type fallback |
| A04 | P1 risk | Debounce cleanup discards pending save on unmount; no editor behavioral tests | Durable drafts, navigation protection, retry, optimistic concurrency |
| A05 | Architecture | `workflow.version` increments per save although architecture calls it format version | Separate format version and revision |
| A06 | P1 risk | Cache lookup precedes executor validation and omits project context | Validate sources before cache hits; scope identities |
| A07 | P2 | Excel schema inference loads the entire worksheet again; cache bounded only by entry count | Reuse immutable source materialization; byte budget |
| A08 | Architecture | ExecutionContext imports SQLAlchemy Session; use cases in routes; handwritten API types | Application boundaries and generated contracts |
| A09 | P2 | Project deletion does not remove source files; upload commit failure leaves artifact | Compensating upload cleanup and repeatable deletion cleanup |
| A10 | Verification | SQLite-only automated persistence tests; no browser journey | PostgreSQL integration and browser acceptance |

Risks are not labelled as reproduced defects. Fix/test status is maintained in STATUS.md
and TASKS.md; this table preserves the original findings.

## Execution order

1. Graph ownership and Excel correctness regressions.
2. Revisions, autosave reliability, cache correctness, application boundaries and API types.
3. Complete M10; build early Bar Chart/KPI/dashboard acceptance slice.
4. M11 and remaining M12/M13 capabilities.
5. M14/M15 recovery, security, performance and user QA.
6. M16: clean migrations/startup, all tests, browser journey and restart verification.

No milestone becomes done solely because code or an empty persistence table exists.

## Checkpoint 2026-09-11

M10 and M11 are committed (e2987fb, 576d64a); early charts/dashboard are committed as 47076ba.
All remaining required charts and multi-dashboard management are implemented and verified.
Latest checks: 190 backend tests, 17 frontend tests, six browser scenarios together with real
backend/PostgreSQL restart plus two slow-save/navigation browser scenarios separately.
QA fixed a reproduced database-startup race and enabled Excel XML entity protection.
The 50000-row smoke benchmark and remaining release work are in docs/QA_REPORT.md.
MVP is not yet declared complete; continue from STATUS.md through M14-M16.
