# PRODUCT_SPEC.md

## Approved extension: constructor dashboard parity (2026-09-14)

Reproduce the six analytical screens in opop_bi v1.2 using ordinary editable Node BI
graphs and dashboards. Financial mappings and formulas belong only to project
configuration, never special application endpoints or executors. Extend general
Excel layouts, preparation nodes, parameters, navigation and visualization controls
as specified in docs/OPOP_CONSTRUCTOR_PLAN.md. Three interface languages and both
themes remain supported. Spreadsheet editing and reference deployment/authentication
are outside this extension. This work is additional to the completed original MVP.

Large workflows must allow users to find and open existing nodes by configured name, type
or identity while preserving drafts. Selecting a node does not save a graph revision.
Nodes may have separate presentation labels, without renaming output fields. Authors can
highlight a node's sources/dependents, append a compatible next step with its connection and
replace an input without persisting a disconnected intermediate state. The approved usability
redesign follows docs/CONSTRUCTOR_UX_REVIEW.md; its stages are tracked separately from parity.
Saved formula fields expose their original workbook, sheet and header where lineage is available;
source search and details preserve rename and multi-input identity. This is value provenance,
not a claim to enumerate every row-filtering dependency.
Authors can arrange the graph by dependencies and undo/redo graph edits within the current
editor session. Undo saves through normal revision checks. A visualization used on a dashboard
must be detached there before removing its graph node; graph undo cannot delete its widgets.

Authors can organize nodes into named flat groups, collapse them while retaining boundary
connections, and open members from a list. Group membership survives saves; dissolving a group
preserves its nodes. Panel widths and collapse state restore on same-tab reload without graph
revisions. Group nesting and moving groups as a unit are not part of this delivery.

Calculated formulas provide a readable field-token view beside the canonical text editor.
Users can search fields by name, insert at the cursor and replace a selected token. Stable
references retain identity after upstream renaming; backend validation remains authoritative.

Authors can stage up to 20 dependent calculated fields in a table and apply them as one
ordinary node-chain edit. Existing chain tables read the graph itself and preserve connections;
no independent calculation engine or duplicate persisted recipe is introduced.

A preparation table stages field selection, names, target types, conversion-error policy and
missing-value handling. Before Apply it lists the ordinary nodes to create. Strict conversion
is the default. Filling creates new calculated fields; existing downstream edges are preserved.

Grouped Unpivot authoring assigns fields to named groups and independently labels articles,
including repeated labels. The result is an editable graph of ordinary Unpivot, Calculated
Column and Union nodes. Source field identities and individual records are preserved.

## 1. Document Purpose

This document defines the product requirements for the MVP of the node-based Business Intelligence platform.

It describes:

* the product vision;
* target users;
* primary user journeys;
* MVP capabilities;
* expected behavior;
* functional requirements;
* UX requirements;
* non-functional product requirements;
* explicit exclusions;
* acceptance criteria.

Technical implementation details belong primarily in `ARCHITECTURE.md`.

Development process rules belong in `AGENTS.md`.

---

# 2. Product Name

Working name:

**Node BI**

The final product name may change later.

---

# 3. Product Vision

Node BI is a web-based Business Intelligence application that allows users to transform Excel data into reusable analytical workflows and dashboards without writing code.

The core interaction model is visual and node-based.

Users should be able to:

* import data;
* visually transform it;
* inspect intermediate results;
* build charts;
* combine charts into dashboards;
* save their work;
* reopen and continue later.

The product should provide a simpler and more transparent alternative to traditional BI tools for users who prefer visual data pipelines.

---

# 4. Product Principles

The MVP should follow these product principles.

## 4.1 Visual First

The primary method of building data logic is a visual node graph.

Users should not need to write Python, SQL, or JavaScript to complete the core workflow.

---

## 4.2 Transparent Data Flow

Users should be able to understand where data comes from and how it changes.

The workflow should visually represent:

`Source → Transformation → Transformation → Visualization`

Intermediate results should be inspectable.

---

## 4.3 Immediate Feedback

Where practical, the interface should provide immediate feedback about:

* available columns;
* data types;
* invalid configurations;
* node errors;
* output schema;
* preview results.

---

## 4.4 Safe by Default

User-entered formulas or expressions must not execute arbitrary server-side code.

Invalid workflow configurations should fail clearly and predictably.

---

## 4.5 Progressive Complexity

Simple workflows should be easy to build.

More advanced functionality should not make basic workflows difficult to understand.

---

## 4.6 Persistent Work

Users must be able to save a project and return later without rebuilding the workflow or dashboard.

---

# 5. Target User

The primary MVP user is a business analyst or technically capable business user who works with Excel data.

Typical characteristics:

* comfortable with spreadsheets;
* understands columns, filters, grouping, formulas, and charts;
* may know basic BI concepts;
* does not necessarily know SQL or Python;
* wants more repeatable analysis than manual Excel work provides.

Example roles:

* financial analyst;
* sales analyst;
* operations analyst;
* marketing analyst;
* business owner;
* reporting specialist.

---

# 6. Primary User Problem

The user has business data stored in Excel and repeatedly performs operations such as:

* filtering;
* selecting columns;
* calculating new fields;
* grouping;
* aggregating;
* joining;
* sorting;
* creating charts;
* assembling reports.

In Excel, these workflows can become:

* difficult to reproduce;
* difficult to inspect;
* fragile;
* dependent on manual steps;
* hard to reuse.

Node BI should turn these steps into a persistent visual workflow.

---

# 7. Primary MVP User Journey

The primary user journey is:

1. User opens Node BI.
2. User creates a new project.
3. User uploads an Excel workbook.
4. User selects a worksheet.
5. User previews the imported data.
6. User opens the workflow editor.
7. User creates transformation nodes.
8. User connects the nodes.
9. User configures transformations.
10. User previews intermediate results.
11. User creates one or more visualizations.
12. User adds visualizations to a dashboard.
13. User rearranges dashboard widgets.
14. User saves the project.
15. User leaves the application.
16. User returns later.
17. User reopens the project.
18. The workflow and dashboard are restored.

This journey defines the central MVP experience.

---

# 8. Product Information Architecture

The MVP should conceptually contain the following main areas:

* Projects
* Data
* Workflow
* Dashboard

A project acts as the container for all related analysis state.

Conceptually:

`Project`
→ `Data Sources`
→ `Workflow`
→ `Visualizations`
→ `Dashboards`

---

# 9. Projects

## 9.1 Project Definition

A project is the top-level user workspace.

A project contains:

* project metadata;
* uploaded data sources;
* workflows;
* node configurations;
* visualizations;
* dashboards.

---

## 9.2 Project Requirements

The user must be able to:

* create a project;
* view existing projects;
* open a project;
* rename a project;
* delete a project.

A new project must have:

* unique ID;
* name;
* creation timestamp;
* last updated timestamp.

---

## 9.3 Project List

The project list should display at minimum:

* project name;
* last updated timestamp.

The user should be able to identify and open an existing project easily.

---

## 9.4 Project Deletion

Deleting a project is destructive.

The user should receive a confirmation step before permanent deletion.

Associated project resources should be removed or marked for removal according to the persistence architecture.

---

# 10. Authentication

User authentication is not required for the first MVP unless technically necessary.

The MVP may operate in single-user mode.

The architecture should not prevent future introduction of:

* user accounts;
* organizations;
* project ownership;
* permissions.

Multi-user authorization is outside MVP scope.

---

# 11. Data Sources

The MVP supports Excel as the primary data source.

Supported workbook formats:

* `.xlsx`;
* `.xlsm` where practical.

Legacy `.xls` support is optional for the first MVP and should not block release.

---

# 12. Excel Upload

The user must be able to upload an Excel workbook into a project.

The system must:

* validate that the upload is an accepted workbook type;
* store the uploaded source;
* inspect workbook metadata;
* discover worksheets;
* report errors for invalid or unreadable workbooks.

The user must not be required to manually describe the workbook schema.

---

# 13. Workbook Behavior

After upload, the system should expose:

* workbook filename;
* worksheet names;
* file size where useful;
* source status.

The system should not immediately load an entire large workbook into the browser.

---

# 14. Worksheet Selection

The user must be able to choose a worksheet from an uploaded workbook.

A worksheet used as a data source should expose:

* column names;
* inferred data types;
* row preview;
* approximate or exact row count where practical.

---

# 15. Header Detection

For MVP, the first non-empty row may be treated as the header row by default.

If implementation allows, the user may be able to override the header row.

Automatic advanced header detection is not required.

---

# 16. Column Names

The application must handle common problematic Excel column names.

Examples:

* spaces;
* punctuation;
* duplicate names;
* blank names;
* unicode;
* long names.

The UI should display recognizable user-facing labels.

Internally, the system may normalize or uniquely identify columns.

Normalization must not silently make two distinct columns indistinguishable.

---

# 17. Type Inference

The system should infer logical column types.

Supported logical types:

* string;
* integer;
* float;
* boolean;
* date;
* datetime;
* null/unknown.

The type model must be understandable to users.

Raw engine-specific types should not leak unnecessarily into the user interface.

---

# 18. Mixed-Type Columns

Excel columns may contain mixed values.

The system must handle mixed-type columns without crashing.

When a reliable specific type cannot be inferred, the system may infer the column as string or unknown according to documented behavior.

---

# 19. Null Values

Null or empty cells must be supported.

Transformations should behave predictably around null values.

The product must not silently replace missing values with arbitrary values.

---

# 20. Data Preview

Users should be able to preview data without opening the workbook externally.

Preview should display:

* a limited number of rows;
* column names;
* logical data types;
* values.

The interface should clearly indicate that the displayed data is a preview rather than necessarily the full dataset.

---

# 21. Workflow Editor

The workflow editor is the primary analytical workspace.

It must provide a visual canvas containing nodes and directed edges.

The user must be able to:

* add nodes;
* select nodes;
* move nodes;
* connect compatible nodes;
* disconnect nodes;
* delete nodes;
* configure nodes;
* inspect node status.

Zoom and canvas navigation should be supported.

---

# 22. Node Categories

The MVP contains three conceptual node categories:

## Source Nodes

Produce datasets from external data.

MVP:

* Excel Source

## Transformation Nodes

Receive one or more datasets and return transformed datasets.

MVP:

* Select Columns
* Rename Columns
* Filter
* Sort
* Limit
* Calculated Column
* Group By / Aggregate
* Join
* Union
* Pivot

## Visualization Nodes

Consume a dataset and produce a visualization configuration/result.

MVP:

* Table
* KPI
* Bar Chart
* Line Chart
* Area Chart
* Pie / Donut Chart
* Scatter Chart

---

# 23. Node Visual State

A node should visually communicate its state.

Possible states include:

* unconfigured;
* ready;
* executing;
* successful;
* warning;
* error.

The exact visual design is implementation-specific.

An error state must be discoverable without requiring the user to inspect server logs.

---

# 24. Node Configuration

Selecting a node should make its editable configuration accessible.

A configuration panel should display controls appropriate to the selected node.

Where possible, configuration controls should use upstream schema information.

Examples:

Instead of manually typing:

`revenue`

the user should be able to select `revenue` from available columns.

---

# 25. Connections

Users must connect nodes through compatible input and output ports.

The interface should prevent or clearly reject invalid connections.

Examples of invalid graph states:

* cycle;
* incompatible port type;
* missing required upstream dataset;
* unsupported number of inputs.

---

# 26. Workflow Execution

The workflow represents executable data logic.

When a node result is requested, the system should execute the dependencies necessary to produce that result.

The user should not need to manually execute every upstream node one by one.

---

# 27. Partial Workflow Execution

If the user previews an intermediate node, the system should execute only the relevant upstream dependency path where practical.

Unrelated workflow branches should not need to execute.

---

# 28. Node Preview

Transformation nodes should support output preview where practical.

When a user selects a successfully configured node, the user should be able to inspect a sample of its resulting dataset.

Preview should include:

* resulting columns;
* types;
* limited rows;
* execution status;
* understandable errors if execution fails.

Useful additional metadata may include:

* row count;
* execution duration.

---

# 29. Schema Propagation

The workflow editor must use output schemas from upstream nodes.

Schema propagation should allow the interface to:

* populate column selectors;
* validate configurations;
* display resulting columns;
* prevent some invalid operations before execution.

Schema propagation is part of the MVP, not a future enhancement.

---

# 30. Select Columns Node

The user can select which columns continue downstream.

Requirements:

* show available upstream columns;
* allow multiple selection;
* preserve chosen order where practical;
* reject missing selected columns.

Output contains only selected columns.

---

# 31. Rename Columns Node

The user can rename one or more columns.

Requirements:

* choose existing column;
* define new name;
* support multiple renames;
* detect conflicting resulting names.

The output schema must reflect renamed fields.

---

# 32. Filter Node

The user can filter rows using one or more conditions.

MVP operators should support appropriate subsets of:

For numbers:

* equals;
* not equals;
* greater than;
* greater than or equal;
* less than;
* less than or equal.

For strings:

* equals;
* not equals;
* contains;
* does not contain;
* starts with;
* ends with.

For general/null handling:

* is null;
* is not null.

For dates, support basic comparisons where possible.

---

# 33. Multiple Filter Conditions

The filter node should support multiple conditions.

At minimum the user should be able to combine conditions using:

* AND

OR support is desirable but may be introduced after basic AND behavior if necessary.

If OR is included, grouping behavior must remain understandable.

---

# 34. Sort Node

The user can sort by one or more columns.

Each sort field should support:

* ascending;
* descending.

Sorting priority should follow the configured field order.

---

# 35. Limit Node

The user can restrict the number of rows passed downstream.

Configuration:

* positive row limit.

The node must reject invalid negative limits.

---

# 36. Calculated Column Node

The user can create a new column from existing columns.

Example:

`revenue = quantity * price`

The system should support a controlled expression language.

The expression system must not execute arbitrary Python, JavaScript, shell commands, or operating-system code.

MVP expressions should support common arithmetic.

At minimum:

* addition;
* subtraction;
* multiplication;
* division;
* parentheses;
* references to columns;
* numeric constants.

Additional safe functions may be included where implementation remains manageable.

---

# 37. Calculated Column Validation

The system should detect common errors before or during execution.

Examples:

* unknown column;
* invalid expression;
* invalid operation between types;
* duplicate output field name.

Errors must identify the calculated column node.

---

# 38. Group By / Aggregate Node

The user can group rows by one or more dimensions and calculate aggregations.

Supported MVP aggregations should include:

* count;
* sum;
* average;
* minimum;
* maximum.

Useful additional aggregation:

* distinct count.

The UI should restrict incompatible aggregations where practical.

Example:

Group by:

`country`

Aggregation:

`sum(revenue)`

Result:

`country`
`sum_revenue`

---

# 39. Join Node

The Join node accepts two upstream datasets.

Supported MVP join types:

* inner;
* left.

Additional join types such as right and full outer may be included if straightforward.

The user must be able to select:

* left key;
* right key;
* join type.

Multiple-column joins are desirable but may be implemented after stable single-column joins.

---

# 40. Join Column Conflicts

When two joined datasets contain columns with the same name, the result must remain unambiguous.

The system should use a predictable conflict strategy.

For example:

* suffix conflicting columns;
* preserve join keys appropriately.

The behavior must be documented and visible to the user.

---

# 41. Union Node

The Union node combines rows from two compatible datasets.

The system must validate schema compatibility.

For MVP, union may require matching column sets and compatible types.

If schemas are incompatible, show a clear error.

---

# 42. Pivot Node

The Pivot node should support basic pivot-table behavior.

User selects:

* index/group field;
* pivot column;
* value field;
* aggregation.

The feature should target common spreadsheet-style pivot use cases rather than complex OLAP behavior.

---

# 43. Table Visualization

The Table visualization displays dataset rows.

Requirements:

* column headers;
* data rows;
* limited/paginated presentation;
* reasonable handling of wide tables.

The table must not attempt to render arbitrarily large datasets at once.

---

# 44. KPI Visualization

The KPI visualization displays a single primary value.

Example:

`Total Revenue`
`$1,204,302`

The KPI should accept a dataset result that can resolve to a single value.

Configuration may include:

* metric field;
* aggregation;
* title;
* numeric formatting.

---

# 45. Bar Chart

The Bar Chart should support:

* category axis;
* value axis;
* title;
* optional series grouping where practical;
* basic labels/legend behavior.

The user should select compatible fields from the upstream schema.

---

# 46. Line Chart

The Line Chart should support:

* X field;
* Y field;
* title;
* optional series.

Dates and ordered categories should render predictably.

---

# 47. Area Chart

The Area Chart behaves similarly to a line chart with filled series visualization.

Configuration should remain consistent with the Line Chart where possible.

---

# 48. Pie / Donut Chart

The Pie/Donut visualization should support:

* category field;
* value field;
* title;
* pie or donut presentation.

The application should avoid silently creating meaningless charts from incompatible data.

---

# 49. Scatter Chart

The Scatter Chart should support:

* numeric X field;
* numeric Y field;
* optional grouping/series where practical.

The UI should restrict clearly incompatible field types.

---

# 50. Visualization Configuration

Visualizations should provide a common configuration experience where practical.

Common settings may include:

* title;
* selected fields;
* aggregation where applicable;
* legend visibility;
* labels;
* number formatting.

Advanced styling is not required for MVP.

---

# 51. Separation of Transformation and Visualization

Visualization nodes should primarily visualize prepared data.

Users should not have to rediscover hidden transformation logic inside chart configuration.

Complex reusable transformation logic belongs in transformation nodes.

Simple visualization-specific aggregation may be supported where explicitly documented.

---

# 52. Dashboard

A dashboard is a layout containing visualization widgets.

Users must be able to:

* create a dashboard;
* add visualizations;
* remove widgets;
* move widgets;
* resize widgets;
* save layout.

At least one dashboard per project must be supported.

Multiple dashboards per project are desirable and should be supported if architecture allows without excessive complexity.

---

# 53. Dashboard Widget

A dashboard widget references a visualization.

A widget should store layout information such as:

* position;
* width;
* height.

Widget layout must persist.

Changing dashboard layout must not alter the analytical workflow itself.

---

# 54. Dashboard Editing

Dashboard edit mode should make it clear that widgets can be moved and resized.

The user should be able to arrange the dashboard without manually entering pixel positions.

---

# 55. Dashboard Viewing

A saved dashboard should render using the latest valid visualization configuration and associated workflow results.

The exact refresh behavior for MVP may be based on project open or explicit refresh.

Scheduled refresh is outside MVP scope.

---

# 56. Saving

The user should not lose meaningful project configuration when leaving the page.

The application should persist project changes predictably.

The final interaction design may use:

* explicit Save;
* autosave;
* or a combination.

The UI must make saved state understandable.

---

# 57. Reload Behavior

After a browser reload, the application should restore the active project's persisted state.

At minimum:

* sources;
* workflow nodes;
* edges;
* configurations;
* visualizations;
* dashboards;
* widget layouts.

---

# 58. Server Restart Behavior

Restarting the backend must not destroy persisted project configuration or metadata.

Uploaded source files should remain available according to the configured storage environment.

---

# 59. Error Experience

Errors should be associated with the relevant part of the product.

Examples:

Upload error:

`The workbook could not be read.`

Filter error:

`Column "Revenue" is no longer available from the upstream node.`

Formula error:

`Expression references unknown column "PriceUSD".`

Join error:

`Left and right join keys have incompatible types.`

Errors should favor actionable language.

---

# 60. Upstream Changes

If an upstream node changes its schema, downstream nodes may become invalid.

Example:

`Select Columns`

removes `Revenue`.

A downstream chart still references `Revenue`.

The chart should become invalid and clearly indicate why.

The system must not silently render stale results as though they were current.

---

# 61. Node Deletion

Deleting an upstream node may disconnect or invalidate downstream nodes.

The workflow editor must update graph state accordingly.

The user must not be left with invisible dependencies to deleted nodes.

---

# 62. Empty Results

A valid workflow may produce zero rows.

This is not necessarily an execution error.

The UI should distinguish:

* successful empty result;
* failed execution.

Visualizations should show an appropriate empty-state message.

---

# 63. Execution Feedback

When workflow execution takes noticeable time, the user should receive feedback.

Possible states:

* waiting;
* executing;
* success;
* error.

The MVP does not require a sophisticated distributed job monitoring interface.

---

# 64. Large Excel Files

The MVP should make reasonable attempts to handle larger workbooks without freezing the browser.

The product should:

* avoid sending entire datasets unnecessarily;
* limit previews;
* perform transformations server-side.

A strict supported maximum workbook size may be documented later based on testing.

---

# 65. Undo / Redo

Undo/redo is desirable but not mandatory for initial MVP acceptance unless implementation is straightforward.

The product must not delay MVP solely to provide a sophisticated command-history system.

---

# 66. Node Duplication

Node duplication is desirable because it improves workflow authoring efficiency.

If implemented, copied nodes should receive new IDs.

Duplicating a node should not automatically duplicate unrelated graph connections unless explicitly designed.

This feature is not a release blocker.

---

# 67. Auto Layout

Automatic graph layout is outside core MVP requirements.

Basic manual positioning, zooming, panning, and fit-to-view are sufficient.

---

# 68. Search

Global search across projects, nodes, or fields is outside MVP scope.

---

# 69. Collaboration

Real-time collaborative editing is outside MVP scope.

The MVP may assume one active editor.

---

# 70. Version History

Project version history and rollback are outside MVP scope.

Future architecture should not make versioning impossible, but no implementation is required.

---

# 71. Scheduled Refresh

Scheduled data refresh is outside MVP scope.

Users may manually refresh or re-execute the workflow.

---

# 72. External Connectors

The following are explicitly deferred:

* PostgreSQL source;
* MySQL source;
* SQL Server source;
* Google Sheets;
* REST API;
* CSV source;
* cloud warehouses.

CSV is likely an early post-MVP source because it fits the same Dataset abstraction.

---

# 73. AI Features

AI-generated transformations, natural-language querying, AI chart suggestions, and automatic dashboard generation are outside the MVP.

The MVP must remain fully usable without AI functionality.

---

# 74. Export

Exporting dashboards to PDF, PowerPoint, or images is outside the initial MVP.

Exporting transformed datasets is also optional post-MVP functionality.

---

# 75. Mobile

The workflow editor is primarily intended for desktop-sized screens.

Responsive behavior should prevent broken layouts, but full mobile workflow editing is outside MVP scope.

---

# 76. Browser Support

The MVP should target current major desktop browsers.

Primary target:

* Chromium-based browsers.

Reasonable support for current Firefox and Safari is desirable.

Legacy browser support is not required.

---

# 77. Accessibility

The MVP should use standard accessible UI controls where practical.

Important interactions should not depend exclusively on color.

Full formal accessibility certification is outside initial MVP scope.

---

# 78. Localization

The interface also supports light and dark themes (requested 2026-09-14). Dark remains the
default. A persistent theme selector is available alongside the language selector. Theme changes
must preserve drafts and saved data and apply consistently to forms, workflow canvas and charts.

The interface supports Russian (default), English and Tatar (Cyrillic), as requested on 2026-09-11.
An always-available language selector persists the choice across navigation and browser visits.
The initial server-rendered language and document language must agree with that choice.
Navigation, node controls, validation feedback, dashboards and accessibility labels are localized.
Numbers and dates use the selected locale for presentation; dates are displayed in UTC.
Project names, workbook/sheet/column names, chart titles and string data are user content and
must not be translated or rewritten. Formula syntax and API identifiers remain language-neutral.

---

# 79. Data Privacy

Uploaded workbook contents must be treated as user data.

The product should not transmit workbook contents to unrelated third-party services as part of core execution.

Logs should avoid including complete source rows unless specifically required for debugging in a development environment.

---

# 80. Formula Security

Calculated expressions are an important security boundary.

The expression system must not allow arbitrary:

* Python execution;
* JavaScript execution;
* shell execution;
* file access;
* network access;
* module imports.

Only explicitly supported operations and functions may be evaluated.

---

# 81. Data Integrity

Transformations must be deterministic for the same:

* input data;
* workflow configuration;
* engine version.

The product should avoid silent mutation of uploaded source data.

Original uploaded Excel files should be treated as immutable source artifacts.

---

# 82. User-Friendly Data Types

The product should expose logical BI-friendly types rather than library-specific implementation details.

Example UI labels:

* Text
* Integer
* Decimal
* Boolean
* Date
* Date & Time
* Unknown

Internal names may differ.

---

# 83. Number Formatting

Visualizations should support basic numeric formatting.

Useful MVP formats include:

* plain number;
* decimal;
* percentage;
* currency.

Full locale-aware formatting is desirable but not a release blocker.

---

# 84. Date Formatting

Dates should render in a consistent human-readable form.

The underlying data type should remain a date or datetime rather than being permanently converted to display text.

---

# 85. Workflow Validation

The product should identify invalid workflow states before execution where possible.

Examples:

* cycles;
* missing required input;
* invalid field selection;
* invalid formula;
* unsupported join configuration.

Not every runtime error can be known in advance, but obvious configuration errors should be caught early.

---

# 86. Workflow Persistence

A workflow must preserve:

* node identity;
* node type;
* node version;
* node position;
* node configuration;
* edges;
* port relationships where relevant.

Reloading a workflow must preserve the visual graph.

---

# 87. Node Versioning

Node types should contain a version identifier in persisted configuration.

The MVP does not require a complete migration framework for historical node versions.

However, saved workflows should not assume that node definitions can never evolve.

---

# 88. Visualization Persistence

Visualization state should persist independently from temporary execution results.

Persist:

* visualization type;
* field mapping;
* formatting configuration;
* title;
* relevant display options.

Do not require chart image snapshots to recreate the chart.

---

# 89. Project State Consistency

The project must not enter obviously contradictory saved states.

Examples to avoid:

* dashboard references nonexistent visualization;
* edge references deleted node;
* source node references deleted source metadata.

Deletion operations should clean up or explicitly invalidate dependent entities.

---

# 90. MVP UX Standard

The MVP does not need enterprise-grade polish.

However, the primary journey must feel coherent.

The user should not need developer knowledge to answer:

* Where do I upload data?
* How do I add a node?
* How do I configure it?
* Why is this node invalid?
* How do I preview the result?
* How do I create a chart?
* How do I put it on a dashboard?
* Did my work save?

---

# 91. Empty States

Major screens should provide meaningful empty states.

Examples:

Projects:

`No projects yet. Create your first project.`

Data:

`Upload an Excel workbook to start analyzing data.`

Workflow:

`Add an Excel Source node or drag a node from the node library.`

Dashboard:

`Add a visualization to start building your dashboard.`

---

# 92. Loading States

Longer operations should not appear frozen.

Loading states are required where appropriate for:

* workbook upload;
* worksheet inspection;
* preview execution;
* workflow execution;
* project loading;
* dashboard loading.

---

# 93. Destructive Actions

Destructive actions should require reasonable safeguards.

Examples:

* deleting project;
* deleting source currently used by workflow.

A confirmation dialog is appropriate where accidental action would cause significant loss.

---

# 94. Non-Functional Product Requirements

The MVP should prioritize:

1. correctness;
2. recoverability;
3. understandable errors;
4. acceptable interactive performance;
5. maintainability;
6. predictable persistence.

The MVP should not prioritize:

* extreme scale;
* enterprise administration;
* pixel-perfect visual customization;
* distributed computing.

---

# 95. Expected MVP Scale

The first MVP is intended for individual analytical workloads rather than enterprise-wide data processing.

Target use case:

* one active user;
* a small number of projects;
* workbook-scale datasets;
* local or small-server deployment.

Architecture should permit scaling later without requiring complete product redesign.

---

# 96. Performance Expectations

The interface should remain responsive during normal interaction.

For typical workbook previews and moderate transformations:

* the user should receive visible execution feedback quickly;
* the browser should not freeze because of dataset processing;
* previews should be bounded.

Hard performance SLAs are not required for the initial MVP.

Performance should be measured during QA and documented.

---

# 97. Reliability Expectations

An invalid node should not crash the entire application.

A failed workflow branch should produce a controlled error.

Reloading a project should not randomly change configuration.

Persisted project state should be recoverable after normal application restart.

---

# 98. MVP Acceptance Dataset

A representative acceptance workbook should exist for development and automated testing.

Suggested columns:

* order_id;
* order_date;
* country;
* category;
* product;
* quantity;
* price.

Representative data should contain:

* multiple countries;
* multiple categories;
* different dates;
* numeric values;
* some nulls.

---

# 99. Core Acceptance Workflow

The following workflow is the canonical MVP acceptance flow:

`Excel Source`
→ `Filter`
→ `Calculated Column`
→ `Group By`
→ `Bar Chart`

Example configuration:

Filter:

`country = "Korea"`

Calculated column:

`revenue = quantity * price`

Group By:

Dimension:

`category`

Aggregation:

`SUM(revenue)`

Bar Chart:

X:

`category`

Y:

`sum_revenue`

---

# 100. KPI Acceptance Flow

The user must also be able to create a KPI showing total revenue.

The exact workflow may use an aggregate transformation or visualization-supported aggregation according to final architecture.

Expected result:

A single value representing total revenue for the selected dataset.

---

# 101. Dashboard Acceptance Flow

The user creates a dashboard containing:

* the revenue-by-category Bar Chart;
* the total revenue KPI.

The user must be able to:

* position both widgets;
* resize at least one widget;
* save the dashboard.

---

# 102. Persistence Acceptance Flow

After saving:

1. reload the browser;
2. reopen the project;
3. verify uploaded source exists;
4. verify workflow nodes exist;
5. verify connections exist;
6. verify node settings exist;
7. verify chart configuration exists;
8. verify KPI exists;
9. verify dashboard exists;
10. verify widget positions and sizes exist.

---

# 103. Restart Acceptance Flow

After backend/database application restart:

* project metadata remains;
* persisted workflow remains;
* dashboard remains;
* uploaded workbook remains accessible;
* workflow can execute again.

Temporary cached execution results do not necessarily need to survive restart.

---

# 104. Error Acceptance Flow

At least the following user errors must produce controlled feedback:

* unsupported upload type;
* unreadable workbook;
* missing worksheet;
* filter references nonexistent column;
* invalid calculated expression;
* workflow cycle attempt;
* missing node input;
* incompatible join;
* visualization references removed field.

None of these should crash the whole application.

---

# 105. Definition of MVP Complete

The MVP is considered complete only when all of the following are true:

## Project Management

* project can be created;
* project can be reopened;
* project can be renamed;
* project can be deleted.

## Excel

* workbook can be uploaded;
* sheets can be inspected;
* worksheet can be selected;
* columns and types can be discovered;
* data can be previewed.

## Workflow

* nodes can be added;
* nodes can be moved;
* nodes can be connected;
* nodes can be configured;
* invalid cycles are rejected;
* graph persists after reload.

## Transformations

Working implementations exist for:

* Select Columns;
* Rename Columns;
* Filter;
* Sort;
* Limit;
* Calculated Column;
* Group By / Aggregate;
* Join;
* Union;
* Pivot.

## Schema

* schemas propagate downstream;
* configuration UI uses upstream schemas;
* removed fields invalidate dependent configuration clearly.

## Preview

* intermediate transformation results can be previewed;
* previews are row-limited;
* execution errors are attributable to nodes.

## Visualization

Working implementations exist for:

* Table;
* KPI;
* Bar;
* Line;
* Area;
* Pie/Donut;
* Scatter.

## Dashboard

* visualization can be added;
* widgets can be moved;
* widgets can be resized;
* layout can be saved;
* layout restores after reload.

## Persistence

* project configuration survives normal restart;
* workbook references survive restart;
* workflows restore;
* visualization configurations restore;
* dashboards restore.

## Quality

* P0 defects: 0;
* P1 defects: 0;
* critical automated tests pass;
* frontend production build succeeds;
* documented startup instructions work.

---

# 106. Explicit Non-Goals for MVP

The following are not required for MVP completion:

* authentication;
* team collaboration;
* enterprise permissions;
* row-level security;
* audit logs;
* SQL data sources;
* Google Sheets;
* API sources;
* realtime streaming;
* scheduled refresh;
* cloud SaaS deployment;
* mobile editor;
* workflow version history;
* dashboard sharing;
* public dashboard links;
* PDF export;
* PowerPoint export;
* dataset export;
* AI assistant;
* natural-language query;
* automatic dashboard generation;
* plugins;
* marketplace;
* distributed query engine;
* advanced OLAP model;
* semantic metrics layer;
* enterprise governance.

---

# 107. Post-MVP Candidate Roadmap

Potential post-MVP priorities:

## Data Connectivity

* CSV
* PostgreSQL
* MySQL
* SQL Server
* REST API
* Google Sheets

## Workflow

* additional formulas;
* conditional expressions;
* date transformations;
* string transformations;
* data cleaning nodes;
* reusable subflows;
* workflow templates.

## BI

* filters/slicers;
* dashboard-level filters;
* cross-filtering;
* drill-down;
* drill-through;
* richer formatting.

## Platform

* user authentication;
* organizations;
* cloud storage;
* scheduled refresh;
* background jobs;
* sharing;
* permissions.

## AI

* natural-language workflow creation;
* formula generation;
* chart recommendations;
* automated insights;
* dashboard generation.

These features must not be allowed to expand the MVP unless the product specification is intentionally revised.

---

# 108. Product Success Criteria

The first MVP is successful if a target user can take a normal Excel sales workbook and, without writing code:

1. import it;
2. transform it;
3. understand the transformation flow;
4. inspect intermediate data;
5. create useful visualizations;
6. assemble a dashboard;
7. save the analysis;
8. reopen it later;
9. modify the workflow without rebuilding everything.

The product does not need to compete with mature enterprise BI platforms at MVP stage.

The goal is to prove that the core interaction model is useful, reliable, and extensible.

---

# 109. Product Decision Priority

When product requirements compete, use the following priority:

1. data correctness;
2. user work persistence;
3. workflow clarity;
4. error transparency;
5. usability;
6. performance;
7. feature richness;
8. visual polish.

A smaller reliable workflow is preferred over a larger unreliable feature set.
