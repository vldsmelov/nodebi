# Dashboard parity through the Node BI constructor

Approved scope (2026-09-14): reproduce the six analytical screens of
Alvik403/opop_bi v1.2, commit 48ef6b0d2bfd4201b5ef6744ec1585739b3b8eec.
All financial rules must live in editable workflow configuration. No financial
executor, special dashboard endpoint, or hidden calculation is permitted.

## Delivery sequence

1. Excel header start/count, merged headers, actual content bounds, row identity,
   cached-formula diagnostics; consistent preview/execution and source cache keys.
2. General Convert Types and typed safe string/null/division expressions.
3. General Unpivot and Window (partition sums and ordered row numbers).
4. Build the overview using ordinary editable nodes.
5. Typed workflow/dashboard parameters, explicit filter bindings, navigation,
   URL state, parameter-aware caching and stale-response protection.
6. Horizontal bars, selected-row highlighting, text KPI, column formats and
   parameterized titles. Build the other five editable dashboards.
7. Compare every displayed value, series, table and rank with the reference;
   browser construction/editing, restart restoration, PostgreSQL and quality gates.

## Screen mapping

| Screen | Graph operations | Presentation / acceptance |
| --- | --- | --- |
| Overview | Convert, Calculate, Group, Unpivot, Sort, Limit | Counts, totals, cost pie, classes and top services |
| Class | Window totals, parameter Filter, Group | Class share, service comparison and table |
| Service | Window class total, Filter by row ID | Service share, peer comparison, articles |
| Cost type | Unpivot totals, Filter, Group, Window | Type share, class/service leaders, articles |
| Cost type / class | Window ranks before class Filter | Global class rank/share, services and articles |
| Cost type / service | Window ranks before service Filter | Peer rank, service share, nonzero articles |

Preserve source row identity and article field identity, including duplicate labels.
Indirect Excel totals already contain inefficiency: subtract inefficiency for the
exclusive cost component; grand total equals direct plus original indirect total.
Article totals and declared totals remain distinct. Ratios use zero fallback and
are stored as fractions. Financial text errors fail strictly; blank amounts become
zero through explicit graph expressions. Reference authentication, deployment,
spreadsheet editing and unused statistics are excluded. Preserve three languages
and both themes. User workbooks and secrets are not committed. No data reset.

Completion requires all six screens, editable without DB/hidden JSON changes,
numeric parity on the supplied workbook, unrelated-domain regression fixtures,
URL restoration, restart acceptance, tests, lint, types and production build.

## Completion

All six screens delivered and verified on 2026-09-15. See [final acceptance](OPOP_CONSTRUCTOR_ACCEPTANCE.md)
for the saved project, 164 reference slices, UI editing, full restart and quality evidence.
