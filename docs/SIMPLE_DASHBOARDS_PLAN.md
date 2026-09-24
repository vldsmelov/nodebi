# Simple dashboard constructor delivery

Agreed 2026-09-24. This plan supersedes the viewer-only/productization proposal.

Goal: Excel workbooks -> ordinary calculation nodes -> published results -> independent
visualizations -> saved dashboard layout. Everyone may author and view. No accounts, new
dashboard navigation, category-filter panels, hierarchical drill-down or UI redesign.
The existing period control remains available but is not required for the first example.

## Delivery sequence

1. Composite Join with explicit cardinality, retained field identities, common configuration
   UI and a repeatable two-book browser journey. Public monthly-price fixtures deliberately
   demonstrate the difference between joining Product and joining Product + Month.
2. Safe conditional/text/date expressions and an ordinary calculated-column condition form;
   Window cumulative sum/max/previous value and a calendar source. No report-specific executor.
3. Explicit source reading bounds and bounded unmatched/duplicate-key diagnostic row views.
4. Multiple numeric series for Bar/Line. Reuse ordinary tables, KPI, visualization configuration
   and dashboard placement; transformations remain in the graph.
5. Synthetic AlMaBi workbooks, rule matrix, editable P&L graph and basic dashboard; numerical
   regression for existing opop_bi and end-to-end/restart acceptance.

AlMaBi reference: dev at 7b05260a480a8330fde33495d666af89e42d2149. Source reports use accounting,
realization and cost books with optional plan/forecast. Synthetic data may be committed; private
workbooks may not. Unsupported/missing plans remain absent, not invented from actuals. Rules,
rates, source priorities and intentional differences from the reference must be visible.
Period filtering must not discard history needed by cumulative calculations.

No claim of full AlMaBi reproduction follows from the small two-book example. Real workbook
acceptance remains separate from synthetic expected-value checks. Batch source updates with
history/rollback are deferred. Existing data must not be reset.

## First example

Run `backend/.venv/Scripts/python.exe fixtures/build_multikey_demo.py` to recreate public books.
Upload `multikey-orders.xlsx` and `multikey-prices.xlsx`; select Orders and Prices.
Join Product to Product and Month to Month, inner, many-to-one. Calculate Quantity * Price,
publish its table and create a bar chart and table on that same publication. Expected values:
20 and 60; total 80. Joining only Product instead yields four matches and total 150.
Source C has no matching price and is explicitly reported as excluded by inner Join.

Add a Group By sum for an independent KPI; empty dimension selection means one overall total.
All these operations use normal editor forms, shared undo/save and common executors.

## Acceptance

Create/edit/save/reload via UI without technical IDs or JSON; changes propagate to dependent
visualizations. Check nulls, duplicate and incomplete keys, relationship errors, type mismatch,
two tabs, stale responses and resource limits. Retain Russian/English/Tatar and both themes.
Run backend/PostgreSQL/frontend checks and browser acceptance. Human speed remains unmeasured.
