# Reference Class dashboard

The existing reference project now contains Overview and Class dashboards in one workflow.
Class adds 18 nodes and nine widgets; the original 29 overview nodes remain unchanged.
The private progress/configuration artifact is `.backups/reference-class-project.json`.

Group By computes count, direct, indirect (excluding inefficiency), inefficiency and total.
Window computes the global total before the class Filter; a calculated ratio gives class share.
Unpivot supplies the three cost slices. A separate Window partitions prepared services by class
before filtering, giving the service-share denominator. Sort uses total descending and original
row ascending. The service table retains hidden class and source-row identifiers for drill-through.

The screen has class-name, count, total, direct, indirect and share KPI, a cost donut, a horizontal
service comparison and a six-column service table. The original combined direct/indirect card is
represented by two KPI. A required class parameter binds explicitly to workflow `class_name`;
choices come from the prepared table before filtering. Overview class rows and class sectors
navigate here; a saved parent link returns to Overview. Values live in the URL.

`frontend/e2e/reference-class.spec.ts` authors every change through ordinary editor controls and
uses API reads/execution only for verification. Opt in with `NODEBI_REFERENCE_PROJECT` pointing
to the overview artifact and `NODEBI_REFERENCE_EXPECTED` pointing to the private oracle export.
It extends an existing project, preserves it on failure, and refuses to rerun over its progress
artifact without review. It never deletes or resets data. Output remains ignored by Git.

Verification on 2026-09-15: all four classes, every displayed scalar, share, chart value and service
row match the pinned original implementation. Browser navigation/reload and preservation of all
original nodes pass (45.5 seconds). Subsequent service/cost destinations and full six-screen
acceptance are complete; see the final report linked below.

Final status (2026-09-15): [six-screen acceptance](OPOP_CONSTRUCTOR_ACCEPTANCE.md) supersedes
this historical checkpoint, including final graph/widget IDs, chart kinds and restart evidence.
