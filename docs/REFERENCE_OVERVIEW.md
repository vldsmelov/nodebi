# Reference overview authored with the constructor

The approved target is all six opop_bi screens. This checkpoint covers the numerical
overview; cross-dashboard navigation and the five detailed screens remain pending.

## Reproducible authoring and verification

`frontend/e2e/reference-overview.spec.ts` is a browser authoring recipe. It creates
the project, uploads the workbook, connects/configures every node, configures chart
formats, adds/resizes/moves widgets and saves the dashboard through the ordinary UI.
Read-only API calls compare results and inspect the saved state. No DB writes,
special finance endpoints or backend financial executors are involved.

The default test suite skips this optional private-workbook scenario. Preparation
and presentation also have independent synthetic regression coverage. To reproduce
the reference comparison, use the reviewed opop_bi v1.2 checkout and a separate
Python environment containing its pinned pandas/openpyxl/FastAPI dependencies.
From the repository root, export the oracle with that environment's Python:

```text
python frontend/e2e/export-reference.py .backups/opop_bi-v1.2 data/data_example.xlsx .backups/opop-expected.json
```

Then, from `frontend`, run PowerShell:

```powershell
$env:NODEBI_REFERENCE_WORKBOOK='../data/data_example.xlsx'
$env:NODEBI_REFERENCE_EXPECTED='../.backups/opop-expected.json'
$env:NODEBI_REFERENCE_KEEP='1'
npx playwright test e2e/reference-overview.spec.ts
```

KEEP=1 retains only a successful project and writes its IDs and saved configurations
to `.backups/reference-overview-project.json`. Without KEEP, test projects are removed.
Failed authoring attempts are removed; existing projects are untouched. This scenario
requires the local running Node BI stack, but never requires the reference web server.

## Graph and display semantics

Import headers 3–4 and original row number; explicitly convert row numbers with
invalid-to-null mode, filter non-service records, clean class/service labels, then
strictly convert financial fields. Calculated Column nodes perform null replacement,
inefficiency, exclusive indirect cost and total calculations. Group By produces global
and class totals; Window and safe_divide produce ratios. Unpivot supplies the cost pie.
Sort/Limit define rankings and the top-40 table after full aggregation.

The overview has five KPI widgets (including inefficiency share), two donut charts,
and two tables. This preserves the reference's indicators; the share is a separate KPI
instead of a second value embedded in one card. Class shares use per-column percent
formatting; counts have zero decimal places. All underlying values remain unrounded.
The script verifies each KPI, all cost slices, class rows/shares/chart points and all
top-service rows against the original implementation. It also verifies widget geometry
and restoration after a browser reload. Full server restart is a separate acceptance gate.

No user workbook, oracle, screenshot, credentials or source financial values belong in Git.
