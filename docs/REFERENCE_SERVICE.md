# Reference Service dashboard

The shared workflow now has 92 nodes. The Service screen adds eight saved widgets: service
and class text KPI, total, indirect including inefficiency, class share, peer comparison,
cost-type amounts/shares and the top 25 nonzero articles. Financial logic is ordinary node
configuration. The three original amount/share cards are represented by three table rows.

Reusable preparation converts article fields strictly, selects and renames each cost family's
columns, then uses three Unpivot branches and Union. Field IDs accompany article labels;
identically named articles in different families remain distinct. Coalesce explicitly replaces
empty amounts with zero. Source totals and sums of article detail are separate measures.
The supplied workbook has 18 article fields; the percentage-rate column is excluded explicitly.

A service is selected by original row number, with class as an explicit second filter.
The peer comparison connects before the service filter and highlights the row identifier.
Its population and the class-share denominator therefore remain independent of selected service.
Class table rows navigate to Service; a parent link returns to the same class. URL reload restores
both values. Direct selection currently shows original row numbers; the class table provides
named service selection. Cost-detail destinations are the next authoring work.

`reference-service.spec.ts` authors the 45 new nodes and the dashboard through UI. All 36 service
slices matched the pinned original route outputs, including article order, amounts, cost shares
and all peers. Its first navigation attempt found an ambiguous test selector (parent link versus
widget destination), after all data checks had passed. The selector is now scoped to widget
settings. `reference-service-review.spec.ts` resumed the retained project, repeated the complete
36-service comparison, finished navigation and checked URL reload and unchanged earlier graph
nodes; it passed in 26.8 seconds. No data was reset or reconstructed behind the UI.

Private configuration/progress: `.backups/reference-service-project.json`; review is opt-in with
`NODEBI_REFERENCE_SERVICE_PROJECT` and `NODEBI_REFERENCE_EXPECTED`. Authoring additionally uses
`NODEBI_REFERENCE_CLASS_PROJECT` and refuses to overwrite an existing progress artifact.
