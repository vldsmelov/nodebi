# Reference cost-type overview

The fourth saved screen, Cost type, uses 34 additional nodes (126 total) and ten widgets.
All three cost types match the original: total/share, class and service leaders, every class
and service row, class distribution, top 25 positive services and top 15 positive articles.
The supplied-data browser authoring/parity check passes in 39.2 seconds after reviewed resume.
The graph's prior 92 nodes remain unchanged. URL selection and reload are verified.

Cost Filter selects one type from the reusable service-cost Unpivot branch. Group By computes
full totals. Window supplies service/class denominators before any top-list limit. A separate
article branch groups by both stable article ID and label, joins the ordinary total node and
computes article share. Article sum is never substituted for the declared cost total.
Positive-only filtering and Limit exist as explicit chart branches; tables retain zero rows.

Authoring initially stopped because the open Navigation fields section duplicated a table
field label. The shared authoring helper now closes optional sections before editing a new
node. Recovery focuses retained nodes through the canvas's keyboard-focus panning and verifies
selection before changing anything. It reuses completed nodes and only reconfigures the known
interrupted table. No persisted data or graph nodes were removed.

Private artifact: `.backups/reference-cost-project.json`. The opt-in recipe is
`frontend/e2e/reference-cost.spec.ts`; it needs `NODEBI_REFERENCE_SERVICE_PROJECT`,
`NODEBI_REFERENCE_EXPECTED` and `NODEBI_REFERENCE_AUTHOR_COST=1`. Recovery requires explicit
`NODEBI_REFERENCE_RESUME_COST=1` and validates the reviewed interruption point. Raw workbook,
reference outputs and recovery backups remain ignored by Git.

Cost/class, cost/service and complete cross-screen navigation are now delivered.

Final status (2026-09-15): [six-screen acceptance](OPOP_CONSTRUCTOR_ACCEPTANCE.md) supersedes
this historical checkpoint, including final graph/widget IDs, chart kinds and restart evidence.
