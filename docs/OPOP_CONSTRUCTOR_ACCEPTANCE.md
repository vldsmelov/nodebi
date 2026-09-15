# Six-screen constructor acceptance

Completed 2026-09-15. Reference: opop_bi v1.2/main, commit
`48ef6b0d2bfd4201b5ef6744ec1585739b3b8eec`. Scope: [approved plan](OPOP_CONSTRUCTOR_PLAN.md).

The retained local project is [available here](http://localhost:3000/projects/6547673e-c856-48f8-af35-83ef354d4a58/dashboard).
It contains one ordinary workflow with **168 editable nodes**, six saved dashboards and
**55 widget placements**. Calculations use the common node engine; financial column mappings,
expressions, aggregation, sorting, limits and navigation exist only in project configuration.
The reference application is used by test tooling as an oracle, never by Node BI at runtime.

| Dashboard | Widgets | Reference slices verified |
| --- | ---: | ---: |
| Overview | 9 | 1 |
| Class | 9 | 4 |
| Service | 8 | 36 |
| Cost type | 10 | 3 |
| Cost type in class | 9 | 12 |
| Cost type of service | 10 | 108 |
| Total | 55 | 164 |

## Data and editing evidence

Browser authoring recipes in `frontend/e2e/reference-*.spec.ts` create/configure nodes and
dashboards through ordinary editor controls. API reads and execution verify results. The
independent test-only oracle exporter reads the pinned original route calculations and the
same private workbook. All displayed amounts, shares, ranks, table rows and chart series were
compared across the 164 slices with Float64 tolerance. Source totals and detailed article sums
remain separate. Inefficiency is subtracted from indirect cost only for exclusive components;
it is not added a second time to total cost. Ties use original source-row identity.

The final presentation audit corrected four chart kinds through the UI without changing their
data. There are two doughnuts (overview/class cost structure) and ten bars with reference
orientations. Percent precision is one decimal, money two, counts/ranks zero; ratios remain
fractions. Some combined amount/share cards in the original are represented by separate KPI
or table values. Layout and application chrome intentionally remain Node BI.

Formula, grouping, article selection and transition settings were exercised through UI.
The synthetic preparation scenario changes Unpivot fields and verifies output sizes 6/3/6,
independently of the financial example. A searchable node picker opens distant nodes by name,
type or ID and preserves drafts without saving selection as a graph revision (ADR-068).
All six layouts were resized/dragged and restored with their bindings and actions unchanged.

## Final checks

- Backend: **247 passed**, three SQLite-only skips in the PostgreSQL run; Ruff lint/format
  (96 files) and mypy (66 files) pass. Migration and PostgreSQL integration checks pass.
- Frontend: **37 tests**, ESLint, TypeScript, OpenAPI drift and production build pass.
- Browser: **18 passed in 1.8 minutes**, ten opt-in authoring scenarios intentionally skipped
  after their separate authoring runs. Includes ordinary MVP, recovery/concurrency and the
  final private-project acceptance scenario.
- Final acceptance restarts frontend, backend and PostgreSQL; saved graph, dashboards and all
  55 widget results compare exactly before/after. Each of the six pages reopens and reloads
  its URL slice. The service-cost page additionally runs all three languages and both themes;
  browsing leaves saved revisions unchanged. Russian/light and Tatar/dark screenshots reviewed.

To repeat acceptance against this retained project and its private final artifact, from
`frontend` with the documented local Docker stack running:

```powershell
$env:NODEBI_REFERENCE_ACCEPTANCE='1'
$env:NODEBI_REFERENCE_RESTART='1'
npm run test:e2e
```

This restarts the local stack without removing volumes. Do not run PostgreSQL tests concurrently.
Authoring recipes are opt-in, sequential checkpoint tools, not an idempotent import command.
They refuse existing progress unless a supported interruption has been reviewed. Do not rerun
them on the finished project to reproduce read-only acceptance.

## Persistent context and limits

Private, Git-ignored evidence: `.backups/reference-finalized-project.json` holds the final graph,
dashboards, chart audit and acceptance flags; `.backups/reference-before-restart.json` contains
the before-restart results; `.backups/six-screen-full-e2e.log` records the final run.
Screenshots are `.backups/reference-final-{locale}-{theme}.png` and per-screen layout captures.
PostgreSQL backup: `.backups/constructor-parity-final-20260915.sql`; retain the original workbook
and uploaded storage separately, since a database dump does not contain source file bytes.
Earlier stage artifacts describe historical graphs, not the final baseline; some widget IDs
were updated during chart replacement. Original user projects were preserved; no data reset.

No open P0/P1 defect remains in this extension. A non-blocking selector limitation remains:
direct service selection displays the original row ID; tables and peer charts provide named
service navigation. Interface controls are localized, while authored titles and source data
retain their original language. Existing local single-user and resource limits still apply.
The delivered project is editable configuration in local persistence, not a bundled public
workbook/template. Credentials, source data, oracle outputs and backups are excluded from Git.
