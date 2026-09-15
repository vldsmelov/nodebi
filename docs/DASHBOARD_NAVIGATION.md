# Dashboard parameters and navigation

All settings are ordinary project configuration. The dashboard maps selections to
explicit workflow parameters; each Filter chooses where a parameter affects the graph.
Compute global totals/ranks before the relevant filter when its denominator must stay global.

## Author through the UI

1. Declare typed parameters in the workflow editor and select them in Filter value sources.
2. Create the destination dashboard. Open Dashboard settings, add a typed parameter,
   choose whether it is required, and bind it to a declared workflow parameter.
3. Optionally select a choices workflow, node and field. Select a node before the
   parameter-dependent filter when the full list must remain selectable. Search is literal,
   case-insensitive and limited to 200 returned choices; truncation is clearly reported.
4. In the source dashboard, open Widget navigation, select a widget and destination,
   then map each destination parameter from a field ID, current parameter or constant.
5. If an ID must accompany chart/KPI values, select it under Navigation fields in the
   visualization node. Context fields accompany the result; tables hide them from display.
6. Add parent links under Dashboard settings. Links use current parameters or constants;
   they cannot refer to a selected row. Save dashboard configuration explicitly.
7. Click a table row, chart point/sector or KPI. Table rows and KPI accept Enter/Space too.

Applying selections updates URL state, not graph/layout revisions. The address includes
`dashboard=<id>` and a URL-encoded JSON `parameters` object with typed scalar values.
Reload and browser back/forward restore the same slice. Missing required values, wrong types
or malformed URL data show corrective feedback. A widget execution failure remains isolated.

Definitions, defaults, bindings and links persist through migration 0006. Existing saves
omitting the new configuration preserve it. Navigation cannot target another project.
Removing a referenced field/node/dashboard can invalidate a saved action; edit the reference
using the same controls. No automatic remapping by display label is performed.

Automated browser recipe: `frontend/e2e/dashboard-navigation.spec.ts` creates a synthetic
workflow and two dashboards through UI, configures choices and navigation, verifies the
selected slice, revision stability, reload, history, parent link and invalid-URL feedback.

This delivery does not complete the six-screen reference transfer. Highlighting, dynamic
titles and the five detailed reference dashboards are the next tasks.
# Dynamic titles and selected records

Visualization settings can enable **Use parameters in title** and insert a declared workflow
parameter as `{name}`. The default is a literal title, including any braces. Missing optional
values display an em dash. Invalid parameter references produce a configuration error.

**Highlight selection** pairs a result field with a workflow parameter of a compatible type.
Choose a stable record identifier when labels can repeat. Highlighting changes presentation
only: comparison rows, their order and values remain intact. Table rows and chart items show
the selection; table context fields can retain a hidden identifier. These settings are saved
on the visualization node and remain editable in all three languages and both themes.
