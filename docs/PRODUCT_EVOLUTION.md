# Report-first product evolution

Approved 2026-10-08. Delivery status is in TASKS.md and STATUS.md.

## A4-M1 bounded renderer inventory — 2026-10-13

Pie/donut real SVG tests reproduced default fill contrast below 3:1 (light #b6d634 on white
1.659:1; dark defaults also fail against some chart surfaces) and absent separators. Both now
reuse the tested eight-colour basic palette, with 2px panel-coloured boundaries and explicit
unchanged hover fill. Sorted category labels determine colours and existing patterns; rows,
values and saved specs remain unchanged. Context highlighting keeps boundaries and uses its
existing 1/0.35 opacity. Four real SVG cases now pass; this is base-fill/separator evidence,
not a guarantee for every patterned/antialiased pixel or intentionally dimmed observation.

| Existing registry families (21 total) | A4-M1 evidence / remaining work |
| --- | --- |
| bar, line, area, scatter (4) | Representative real SVG fills/lines/markers pass >=3:1 after actual alpha composition in both themes; area contour also contrasts with its own translucent fill. Earlier eight-series palette/cue checks remain complementary. |
| pie, donut (2) | Normal base fills and separators verified in real SVG; category patterns/legend/missing/zero/reorder have existing regressions. Record composited pattern/highlight limitations separately. |
| box plot, histogram (2) | Verified real SVG outlines in both orientations/themes. Normal stroke contrasts >=3:1 with CSS surfaces and composited interior; width >=2px box / >=1px histogram. Context stroke alpha 0.3 is verified separately, not claimed as normal contrast. |
| heatmap (1) | Label/fill scale contrast already checked; explicitly reconcile cell boundaries, missing/zero distinction and selected outline against adjacent fills. |
| radar (1) | Real SVG verifies eight distinct profile strokes and 24 markers in both themes; normal lines pass >=3:1 against surfaces and own 0.05-alpha area. Selected/muted contour alpha 1/0.25 checked separately. Arbitrary overlapping-profile perception is not certified. |
| waterfall, combo, Pareto (3) | Both-theme real SVG verifies normal waterfall solid/outlined/zero/tiny marks (both orientations), eight combo colours and Pareto contribution/share/reference. Zero-total Pareto has no drawable share/reference geometry. Existing context-opacity regressions remain complementary. |
| bubble (1) | Verified real SVG fill colours and alpha across all eight groups in both themes: normal 0.75 composition passes >=3:1 on CSS panel/surface. Highlight fixture verifies selected 0.75 and muted 0.2 separately. No runtime change required; no claim for arbitrary overlapping/antialiased pixels. |
| bullet, funnel (2) | Custom rendered band/actual/target/stage marks; distinguish semantic mark contrast from decorative connectors and background bands. |
| treemap, sunburst (2) | Explicit thematic fills and separators; verify actual adjacent-region boundaries and highlighted state. |
| KPI, table, analytical table (3) | No chart mark/background obligation; text/controls/conditional formatting remain within their existing accessibility/state checks. |

No new chart families or unlimited density permutations are needed to close this bounded
inventory. Human perception and H1/H2 remain distinct from measured contrast.

Verification of the pie/donut change: full frontend 651/116 passes (46.66s); 11 browser
cases pass (1.1m), `.backups/r6-pie-mark-contrast-20261013`. Both-theme exact tables, zero/missing
legend hide/restore, keyboard visibility, tooltips, reload and basic-series regression pass.
Light pie/dark donut screenshots inspected. Lint/types/API/default build pass. Backend
unchanged/not rerun. Subsequent bubble normal-alpha audit passes without runtime changes.
Subsequent box-plot/histogram boundary audit passes without runtime changes.
Subsequent representative basic and radar paint audits pass without runtime changes.
Subsequent waterfall/combo/Pareto normal mark audit passes without runtime changes.
Next concrete mark audit: heatmap boundaries and bullet/funnel semantic marks, then hierarchy.

Waterfall/combo/Pareto evidence: six real SVG cases inspect actual fills, strokes and normal
opacity. Waterfall covers filled changes, outlined balances/subtotals, zero line and tiny
nonzero dot; outlines also contrast against their translucent interior. Combo exercises all
eight colours with real bars/lines rather than legend swatches. Pareto verifies the reference
and removes its drawable geometry when shares are undefined. Initial zero assertion counted
an empty SVG path (`d=""`); it now tests drawable geometry, without changing the renderer.
The initial combo test fixture omitted required series names; the typed fixture was corrected.
No business logic, statistical preparation or saved configuration changed.
Full frontend 669/116 passes (39.02s); lint/types/API/default build pass. Browser/backend
not rerun because only tests/docs changed; no acceptance services started.

Basic/radar paint evidence: four basic renderer cases and two radar theme cases inspect
real SVG output, including actual fill/stroke opacity. Radar emits polylines for profiles;
the initial path-only selector failed before measurement and was corrected to select those
actual contours. Area fills similarly need their non-interactive path rather than only
interactive SSR elements. Both-theme normal mark contrast passes without runtime changes;
radar normal markers remain opaque and context lines use explicit 1/0.25 alpha. This does not
certify arbitrary multi-profile overpainting, antialiasing or human perception.
Full frontend 663/116 passes (55.99s); lint/types/API/default production build pass. Only
tests/documentation changed; browser/backend not rerun and no acceptance services started.

Box/histogram boundary evidence: four SVG tests render both orientations and normal/context
states, extract actual stroke/width/alpha and require normal >=3:1 against CSS panel/surface
and the composited interior. The shared test-only contrast helper now accepts eight-digit hex
fill alpha and multiplies it by fill-opacity; independent 0x80 and combined-alpha oracles
protect that calculation. Initial tests rejected unsupported #RRGGBBAA rather than falsely
passing opaque comparisons; supporting the actual renderer format resolved the test failures.
No production palette, statistical preparation or persistence change was required. Antialiased
pixels, tiny-mark geometry and intentional dimming are not certified by this contour check.
Full frontend 657/116 passes (57.43s); lint/types/API/default build pass. Browser/backend suites
not rerun because only tests/documentation changed; no acceptance services started.

Bubble composition evidence: two real SVG tests extract rendered fills and fill-opacity,
verify all eight group colours are represented, composite the normal alpha over actual CSS
panel/surface tokens and require >=3:1. They also render a selected observation with seven
muted observations, verifying 0.75 versus 0.2 rather than claiming the latter has normal
contrast. Composition has independent 0/0.5/1 alpha oracles. No radius, coordinate, colour,
statistics or stored configuration changed. This is rendered-vector/compositing evidence,
not a fresh browser pixel measurement or human perceptual trial.
Full frontend 653/116 passes (51.92s); lint/types/API/default production build pass. Only
test/documentation edits: no browser/backend rerun and no acceptance services started.

## Pareto short-card label correction — 2026-10-13

Real canvas text-bound observation reproduced overlapping value-axis labels before the fix.
Native axis-label collision handling now retains endpoints and omits only colliding labels;
the existing resize observer restores intermediate labels when the card grows. Server bounds,
custom tick values, normalized points, statistics, paging and saved dimensions are unchanged.
Full frontend 647/116 passes (36.51s). Final three browser cases pass (30.0s),
`.backups/r6-pareto-axis-final-20261013`: populated/zero Pareto, increase/decrease of the actual
container and executive demo. Light/narrow-dark screenshots inspected. The first new zero-case
assertion incorrectly required two left ticks; it now explicitly requires its single exact
zero tick, retaining spacing checks for both nondegenerate axes. Lint/types/API/default build
pass; backend unchanged/not rerun. This closes the identified P2, not all A4-M1 mark contrast.

## A4-T1 remaining tooltip renderers — 2026-10-13

Actual pointer hover now verifies line, area, scatter, pie, donut and Pareto in light/dark.
The basic test observes real canvas arc positions (pie uses a sector interior), waits for
settled rendering and checks the resulting HTML content, opaque backing and computed text
contrast. Pareto checks the first ranked contribution through actual pointer positioning.
Seven browser cases pass (42.1s), `.backups/r6-remaining-tooltip-contrast-20261013`, including
existing populated/zero Pareto, paging and persistence assertions. Light pie and dark Pareto
screenshots inspected. No production code changed; lint/types/API/default build pass.
This closes the six-family sampling gap, not mark contrast or final consolidated regression.
Screenshot review identified a separate P2: short populated Pareto cards crowd axis tick
labels. The subsequent correction above preserves full-population scales and saved dimensions.

## A4-L1 keyboard legend delivery — 2026-10-13

Shared renderer controls now expose native buttons with synchronized pressed states and
formatted labels (ADR-206). Escape/Close restores disclosure focus; controls are named by
chart title. Visibility remains transient presentation state, never a table/graph mutation.
Full frontend 647 tests pass. Twenty scoped browser cases pass (2.0m); final accessible-title
revision passes eight cases (42.4s), `.backups/r6-keyboard-legend-final-20261013`.
Actual Tab/Space hide/restore and pointer synchronization cover bar/line and pie/donut in both
themes, including unchanged exact tables and saved graph. Menu text contrast and >=24px
button targets pass; scrolled focused-button screenshots inspected in light/dark themes.
This closes the shared interaction gap, not H2 screen-reader observations or consolidated A6.

## A5 evidence reconciliation — 2026-10-13

Pie/donut non-colour cues: reuse eight patterns selected by sorted unique category display
labels, preserving assignment under row reordering and repeated-label source rows. ECharts
renders seven patterned sectors plus seven corresponding legend swatches in both-theme SVG
checks. More than eight labels repeat patterns with explicit EN/RU/TT table/bar-chart guidance;
no rows are removed or aggregated. Three new regressions fail before implementation; six new
tests also cover actual legend rendering and scatter: incomplete X/Y pairs do not become
origin points, while signed coordinates and true (0,0) remain with their original data indexes.
Full frontend 641/114 passes (41.78s); five browser cases pass (25.5s),
`.backups/r6-pie-category-cues-20261013`, preserving prior zero-sum legend fix, exact tables,
reload and unchanged graph. Settled light pie/dark donut screenshots inspected. Lint/types/API/
default build pass. Backend untouched/not rerun. This closes the scoped category-cue and
scatter-null questions, not arbitrary density/mark contrast or human perception certification.
Next reconcile the finite A4/A5 inventory against accumulated evidence before adding more
chart-specific audit variants; consolidated A6 and H1/H2 remain separate requirements.

Pie/donut zero-share correction: backend already rejects negative/non-positive source data,
but hiding the only positive category in the canvas legend left zeros/missing values that
ECharts rendered as two equal shares. Two real SVG regressions reproduced actual sector arcs,
excluding legend icons. stillShowZeroSum=false/showEmptyCircle=false and missing-value `-`
projection prevent synthesis while retaining source indexes/exact tables. Viewer guidance is
localized EN/RU/TT. Both-theme browser canvas pixels verify disappearance/restoration;
zero/null table distinction, saved graph and reload remain intact. Three browser cases pass
(17.4s), `.backups/r6-pie-zero-shares-20261013`; dark empty-donut screenshot inspected.
Full frontend 635/114 passes (38.25s), 10 existing backend negative/nullable input cases pass
(1.13s). Lint/types/API/default build pass. No backend behavior or schema changes; full backend
suite not rerun. Corrected documentation that had implied duplicate-series authoring was
allowed: only the renderer is defensive for repeated-field payloads; backend rejects duplicates.
Remaining pie/donut/scatter non-colour/mark audit, A5/A6 and human acceptance stay open.

Shared tooltip contrast evidence: `tooltip-contrast.ts` waits for opaque settled text and
checks computed text/background contrast using the existing independently tested sampler.
The popup itself must have opaque RGB backing: compositing a body-level translucent popup
over DOM ancestry would miss the canvas underneath, so that unsupported case fails explicitly.
Positive black-on-white, negative white-on-white and rejected translucent-popup browser
oracles pass. Both-theme real hover checks cover 12 types: bar, box plot, heatmap, histogram,
radar, waterfall, combo, bubble, bullet, funnel, treemap and sunburst. Exact text and viewport
bounds remain checked. Initial 17/18 run failed on a captured pre-resize bar width (296 vs
settled 166), not contrast; live bounding-box polling corrected the test harness. Final
25-case run passes (2.1m), `.backups/r6-tooltip-contrast-verified-20261013`; separate box-plot,
helper-oracle and executive-demo run has 3 passes (21.9s), `.backups/r6-tooltip-executive-20261013`.
These are two scoped runs, not a fresh consolidated public A6 run. Executive light and
compact-dark screenshots inspected; eight widgets, exact refreshed revenue/profit/margin
and unchanged layout verified. No production code/backend changes in this increment;
lint/types/API/default build pass, full unit suites were not rerun. Remaining basic-family
mark distinctions, unsampled tooltip families and A5/A6/H1/H2 are not closed by this evidence.

Basic multi-series cue audit: bar/line previously had only colour to distinguish all eight
measures (two failing regressions: one cue instead of eight). Added patterns/marker shapes
selected by stable field IDs without changing order, data or saved settings. Real SVG
checks verify bar and legend patterns in both themes plus legend hide/restore; repeated-field
legacy configs retain unique renderer IDs. Follow-up production browser evidence:
`.backups/r6-basic-series-contrast-20261013`, four cases pass (33.3s), including both themes,
eight-series legend hide/restore verified through actual painted label disappearance/return,
exact source table and persisted bindings after reload. Screenshots wait for stable canvas
pixels (early frames had undersized animated markers); settled light bar/line and dark line
images inspected. Light palette regression reproduced 2.1423:1 second-series/panel contrast;
darkened light hues pass >=3:1 for opaque fills on actual CSS panel/surface tokens. Dark
palette and calculation semantics unchanged. Full frontend 633/114 passes (39.28s), lint,
types/API/default build pass. No backend suite rerun. Intentionally muted marks, antialiased
edges and arbitrary chart densities are not certified by the opaque-fill test. Human H1/H2
and the rest of A4/A5/A6 remain open; this is not whole-product accessibility certification.

Basic tooltip audit: narrow half-width horizontal bar screenshot reproduced right-clipped
long category/value. New basic-tooltip.ts resolves source row and series field before shared
escaped bounded HTML rendering, preserving exact decimal strings rather than pie drawing
numbers, numeric X, dates and missing values. Eight regressions protect six types, additional
series and source coordinates. Full frontend 627/114 passes (42.01s), two browser journeys
pass (18.4s), `.backups/r6-basic-tooltip-fixed-20261013`; both-theme 420px content/bounds pass,
dark screenshot inspected. Initial test hit a canvas replaced during theme change; scrolling
the stable widget corrected the harness. Long-hover browser evidence is bar-specific, not
six independent tooltip journeys. No backend, graph, plot coordinate or saved-spec changes.
Next: basic multi-series non-colour cues and remaining finite mark/contrast/state inventory.

Basic bar/line/area/scatter/pie/donut labels: six real SVG regressions first fail at inherited
alpha 0.35, then pass normal/muted in both themes (bar also horizontal). Shared presentation
ink/backing preserves mark opacity, formatting and coordinates. Full frontend 619/114 passes
(37.98s), two production-browser journeys pass (11.3s),
`.backups/r6-basic-chart-labels-settled-20261013`. Labels explicitly enabled on the six-widget
fixture; numeric 4.00 canvas paint observed in both themes. Initial screenshot captured
appearance animation; final capture waits for opaque label paint and light screenshot was
inspected with complete drawings. Muted-state matrix is SVG evidence, not browser selection
wiring. Next: basic-chart tooltip and remaining non-colour/mark contrast inventory.

Analytical-table conditional-format audit: four real UI rules (negative, positive, warning,
neutral missing measure) survive reload and show text plus non-colour symbols. Browser
computed-style sampling composes translucent badge fills over actual cells and verifies
>=4.5 contrast in both themes, including the grand-total badge and exact 4410 value.
Eight cases pass (35.4s), `.backups/r6-analytical-rule-contrast-final-20261013`; dark totals
screenshot inspected. Ten focused table/layout/theme unit tests pass. Existing sampler
extracted to `e2e/computed-contrast.ts`; independent black/white/alpha/OKLab oracle tests pass.
Initial runs failed on test locators: badge text changes accessible cell names, and a nested
table-scoped `has` locator could not match inside a row. Corrected locators preserve exact
values/counts, no runtime/style changes. Highlighted-row background permutations and full A4
remain open. Next: finite remaining legacy chart-family rendered-state audit.

Histogram long-interval tooltip: initial hover before bar animation settled showed nothing;
repeated hover then proved 16-digit endpoints fit. A 30-digit integer-part decimal(38,2)
fixture reproduces right-clipped upper endpoint. Bounded escaped HTML retains full interval,
inclusive bracket and count in both themes at 420px; final dark screenshot inspected.
Real CSV import/UI range editing/reload now runs integer and exact-decimal variants with
independent [1,2,2,3] counts and included/missing/below/above accounting, no injected values.
Full frontend 613/114 passes (34.22s), four histogram/hierarchy cases pass (30.7s),
`.backups/r6-histogram-tooltip-fixed-20261013`. Source-text escaping and exact endpoint
transport protected by unit regression. No backend/statistical changes. Next: analytical
table conditional-format contrast and remaining finite A4/A5 inventory.

Histogram count labels: real SVG tests first reproduce default light-grey ink and inherited
alpha 0.3, then pass normal/muted states in both themes and orientations using opaque themed
text/backing. Bar opacity and prepared counts stay unchanged. Browser explicitly enables
labels and observes actual 2/3 canvas text under injected highlight metadata; this is renderer
evidence, not selection-wiring certification. Narrow dark screenshot inspected. Full frontend
612/114 passes (34.80s), three histogram/hierarchy production cases pass (20.9s),
`.backups/r6-histogram-labels-20261013`. Exact table boundaries/counts/population and hierarchy
keyboard/tooltip regressions retained. Next: histogram long exact-interval tooltip readability.

Hierarchy label P2 closed: real SVG regressions first fail on default text ink, then verify
themed opaque labels/halo and hide-labels behavior in both chart variants/themes. Browser
canvas observer is cleared immediately before hover and confirms A/B/C alpha 1 and themed
ink after real hover in both themes. Full frontend 610/114 passes (36.57s); two production
journeys pass (14.0s), `.backups/r6-hierarchy-label-halo-20261013`. Both normal dark screenshots
inspected: category fills retained. Initial opaque-background attempt passed tests but hid
treemap fills because its text box spans the tile; rejected after screenshot review. Final
code uses a 3px neutral text halo, not an opaque rectangle, with a regression guarding this.
No backend/weight/selection changes; dense-label and mark-boundary states remain separate.

Hierarchy tooltips: treemap/sunburst long measure names clip right at 420px with old canvas
tooltips, reproduced in both screenshots. Shared bounded escaped HTML now retains path,
amount and share with both-theme viewport assertions. Two unit regressions first failed;
full frontend 608/114 passes (31.36s). Two production-browser journeys pass (11.0s),
`.backups/r6-hierarchy-tooltip-fixed-20261013`, including keyboard group navigation and
zero leaf. Dark tooltip screenshot inspected. This is not hierarchy A4 completion: the
normal dark treemap screenshot shows low-contrast white leaf labels on pastel fills;
white contrast on configured #a8c977/#6acbb6 is about 1.86/1.94. P2 next: inspect actual
normal/emphasis/blur label rendering and correct hierarchy label contrast. No data changes.

Bubble/bullet tooltips: short bubble names fit before changes; long observation-field names
clip right, and bullet band text clips below its short canvas. Screenshots reproduce both.
Shared bounded escaped HTML fixes content/bounds at 420px in both themes. Two unit regressions
first fail then protect exact decimal/source-text transport. Full frontend 606/114 passes
(32.88s), six bubble/bullet/funnel production cases pass (40.9s),
`.backups/r6-bubble-bullet-tooltip-fixed-20261013`; both dark tooltip screenshots inspected.
An initial long-X-axis probe missed the moved bubble because ECharts adjusted the plot;
it is not clipping evidence. Final long observation-field fixture keeps axes unchanged.
Marks, radii, scales and selection are unchanged. Next: treemap/sunburst rendered details;
arbitrary text lengths/viewport heights and whole-product A4 remain unverified.

Funnel tooltip: 420px scrolled-stage screenshot reproduces hidden initial-retention/loss
rows with the old canvas tooltip. Shared bounded escaped HTML now retains long stage names,
exact retention and loss; both-theme content/viewport assertions pass and dark screenshot
inspected. Four funnel/bullet production cases pass (25.0s),
`.backups/r6-funnel-tooltip-fixed-20261013`. Full frontend 604/114 passes (34.97s).
Unit regression first failed, then verifies HTML escaping and exact large decimal values.
No statistics, persistence or stage geometry changes. Other scroll positions, arbitrary
text lengths and bubble/bullet tooltip readability remain separate audit work.

Bullet label clipping: actual renderer bounds reproduce first text at y=8.48 against y=15
clip. Including existing top padding only when labels are enabled fixes six heights from
71 to 400px, without moving marks/scales. Full frontend 603/114 passes (39.49s), lint/types/
API/default build pass. Four bullet/funnel browser cases pass (38.0s),
`.backups/r6-bullet-label-clip-20261013`; bullet now explicitly enables labels, and narrow
dark screenshot shows complete -50.00. Funnel coverage here remains functional regression.

Bubble labels: two real SVG regressions reproduce inherited normal alpha 0.75, then pass
normal/muted states in both themes with opaque text/backing and unchanged radii/mark opacity.
Full frontend 602/114 passes (38.58s), lint/types/API pass. Six browser cases pass (49.8s),
`.backups/r6-bubble-labels-20261013`, including bullet/funnel functional regression. Canvas
paint confirms A/B alpha 1 on narrow light/dark views; dark screenshot inspected. Highlight
and hidden-legend metadata are injected to isolate observation labels, not selection wiring.
Bullet/funnel optional label geometry and tooltip checks are still separate unfinished work.

Combo/Pareto tooltip: after waiting for canvas resize, the 420px long-series-name screenshot
reproduces clipped axis/value. Shared bounded escaped HTML now retains full name and Left
axis: 100 in both themes; dark screenshot inspected. Five browser cases pass (33.5s),
`.backups/r6-combo-tooltip-fixed-20261013`. Pareto functional/zero-population and shared-option
tests pass; a dedicated long-name Pareto hover is not claimed. Full rerun 600/114 passes
(35.90s). Initial catalog focus test raced DOM presence against the existing focus effect;
it now waits for focus itself, without weakening the assertion or changing runtime behavior.

Combo/Pareto collision layout: real SVG regression first renders two overlapping labels,
then passes with one label in a 220px chart and both restored at 900px. Shared ECharts
hideOverlap changes presentation only; exact tooltip/table values remain intact. Full frontend
600/114 passes (39.84s), lint/types/API/build pass. Five browser cases pass (34.9s),
`.backups/r6-combo-label-layout-20261013`; dark eight-series screenshot inspected and the
table's eight first-row values checked. This closes the scoped P2 label-overlap defect,
not all mark/tooltip contrast or human interpretation. Dense charts need not print every label.

Combo non-colour cues: two regressions first reproduce identical cues for seven bars/lines,
then pass with stable-ID patterns/markers. Full frontend 599/114 passes (32.51s), lint/types/
API/default build pass. Five browser cases pass (38.2s), `.backups/r6-combo-series-cues-20261013`,
including eight-series save/reload/two-axis authoring. Dark screenshot confirms four different
bar patterns, four line markers and matching legend. It also demonstrates P2 numeric-label
overlap in the short card; that is the next actionable correction. Unit uniqueness is not
human perceptual certification of all seven cues. One-bar/one-line/Pareto appearance unchanged.

Waterfall tooltip: wide short-name screenshot fits; 420px long-name screenshot clips title
and running balance. Radar's existing bounded escaped-HTML option is now shared through
chart-tooltip.ts and used by waterfall. Four browser cases pass (32.1s),
`.backups/r6-waterfall-tooltip-fixed-20261013`, with complete text and viewport bounds in
both themes plus orientation/windows/reload and radar regressions. Dark screenshot inspected.
Full frontend 597/114 passes (38.27s), lint/types/API/default build pass. Old-renderer missing
DOM tooltip roles were test failures, not themselves clipping proof; screenshots establish
the narrow defect. Arbitrary long text/very short viewports are not certified.

Comparison/contribution labels: combo/Pareto and waterfall text no longer inherits muted
alpha 0.3. Four regressions first failed; combo real SVG paint and waterfall custom render
items now pass, with two Pareto exact-label adapter checks. Full frontend 597/114 passes
(33.97s), lint/types/API/default build pass. Six browser scenarios pass (35.7s),
`.backups/r6-contribution-labels-20261013`. Both-theme actual canvas paint confirms opaque
combo -40/80 and horizontal waterfall -150/40; dark captures inspected. Highlight metadata
is injected into real results, not a cross-filter wiring claim. Dense overlap, tooltip
clipping and wider mark/non-colour checks remain separate; no calculations changed.

Eight-axis radar tooltip: original screenshot clips final axis; HTML conversion then exposes
narrow x=-195 overflow. Final escaped body-level tooltip wraps to actual chart width with
ECharts confinement. Four browser scenarios pass (36.0s), including 1600/420px both-theme
content/bounds and wizard/box/radar regression: `.backups/r6-radar-eight-confined-20261013`.
Narrow dark screenshot inspected. Full frontend 591/114 passes (40.59s). Hostile text escaping
and width handling have unit coverage; box-plot SVG tests verify legend/median synchronization.
Very long multi-line content and short viewports are not certified by this eight-axis fixture.

Box-plot median labels: native boxplot label configuration was ignored by ECharts. Two real
SVG-renderer regressions first failed, then passed with a silent scatter text layer using
backend medians. Both themes/orientations, muted groups and label disabling are covered;
null groups stay empty. Full frontend 590/114 passes (38.36s), lint/types/API/default build pass.
Production browser canvas observes exact 305.50 at alpha 1 in both themes; tables, paging,
reload and orientation change pass (1 case, 7.4s): `.backups/r6-box-median-labels-exact-20261013`.
Dark screenshot inspected. Browser observer initially expected 305.5 instead of exact 305.50;
corrected without changing application output. Muted/orientation label evidence is SVG-based.
No backend or saved-contract changes; this does not close all A4 readability or human gates.

New radar report geometry: report-wizard creation now allocates 12 grid rows rather than 8.
Existing layouts, calculation edits and type changes keep author sizes. Regression first
reproduced 8, then checks 12 on creation and retained custom 6 on edit. Full backend 1542 pass /
32 PostgreSQL/opt-in skips (149.90s). Browser creation/edit/reload verifies canvas >=300px:
1 passed (5.5s), `.backups/r6-radar-default-size-20261013`, screenshot inspected. Mypy/ruff,
frontend lint/types/API/default build pass. No new API/schema or automatic layout migration.

Radar label follow-up: ECharts inherits item opacity unless label opacity is explicit.
Optional exact labels now use opaque themed ink/backing while profile marks stay muted.
Two regressions first fail then pass; 588 frontend tests pass (38.64s), lint/types/API/default
build pass. Final browser renderer run: 1 passed (8.6s), `.backups/r6-radar-labels-bound-20261013`;
real fillText observes 3/8/5 with alpha 1 in both themes. The corrected presentation-only
highlight fixture uses actual category_field, not original source label. Dark screenshot
inspected. This is not selection-wiring, dense-overlap or whole-family contrast certification.

Radar non-colour follow-up: explicit marker shapes and legend icons complement colour and
line styles. A failing-then-passing regression covers 20 distinct combinations and stability
under row reversal/incomplete-profile omission. Full frontend 586 tests pass (36.40s), with
lint/types/API/default build. Two production radar cases pass (18.5s),
`.backups/r6-radar-symbols-20261013`; light hover capture visually confirms matching shapes.
This does not prove perceptual discrimination of a dense 20-profile plot; H1/H2 and wider A4
mark/text/tooltip contrast remain open. Calculation contracts are unchanged.

Box/radar A4 follow-up: actual box hover capture reproduced clipped final missing-count row.
Shared escaped HTML tooltip fixes box plot while preserving heatmap behavior; 3 browser cases
pass (22.2s), `.backups/r6-box-tooltip-fixed-20261013`, with both-theme exact-quartile/final-row/
viewport assertions. Full frontend 585 pass (35.87s), lint/types/API/default build pass. Radar
runtime unchanged; light long-name hover inspected without clipping in that fixture only.
Box dark capture includes theme animation, so it is not settled-mark geometry evidence.

Heatmap label P2 closed: hover lift(-0.1) caused another below-4.5:1 boundary; explicit
emphasis fill now preserves the scale colour and leaves the border as hover cue. Three
1001-position, two-theme sweeps first failed then passed. Browser canvas pixel comparisons
retain numeric/missing fill before/after hover, including muted themes: 1 case passed (6.8s),
`.backups/r6-heatmap-emphasis-20261013`. Full 585 frontend tests pass (32.77s). This is
label-specific evidence, not certification of every heatmap mark/axis/tooltip state. Continue
the finite A4 box-plot/radar batch rather than reopening the implemented label correction.

Heatmap paint evidence: `.backups/r6-heatmap-ink-20261013`, 1 browser case passed (7.2s).
Real CanvasRenderingContext2D.fillText calls confirm -3/10 labels use black/white and alpha 1
under injected highlighting in light/dark themes; numeric -3 hover values and viewport bounds
pass, muted screenshots inspected. The response injection modifies only presentation metadata,
not rows/scale, and does not verify dashboard selection wiring. ECharts automatic emphasis fill
lift and full rendered contrast sweep remain to inspect; do not infer those from two labels.

Settings occlusion follow-up: name-field centre hit-testing failed in the narrow workbench,
confirming the screenshot risk. Keeping bottom actions in normal flow within the existing
below-80rem layout fixes it. Browser workbench case passes (18.8s), including narrow/enlarged
hit-tests and sequential Tab; fixed screenshot reviewed. Evidence:
`.backups/r6-settings-footer-fixed-20261013`; 585 frontend tests pass (38.26s), lint/types/API/
default build pass. This does not establish every field/state free from occlusion.

Heatmap rendered follow-up (ADR-205): light/dark screenshots reproduced tooltip clipping in
short widgets. Body-level escaped HTML now preserves all rows; both-theme hover assertions
check the last line and viewport bounds. Heatmap + executive browser regression: 2 passed
(18.1s), `.backups/r6-heatmap-tooltip-20261013`; full frontend 585 passed (30.65s), lint/types/
API/default build pass. Highlighted numeric canvas labels and numeric hover contrast are not
certified by these missing-measure hover cases; A4 stays open.

Public integration checkpoint completed: **253 browser tests passed in one uninterrupted
run (23.5m)**, `.backups/r6-public-state-reconciled-20261013`. Production candidate stayed
unchanged. Includes the eight-widget executive demo and 100k-row/3-column and 20-column
browser journeys. Private opt-in files are excluded; this does not refresh PostgreSQL or
process-restart evidence. Test projects were cleaned, owned services stopped and default
production build restored. Full frontend passed 579 tests before adding three heatmap contrast
regressions, which first reproduced the defect. Luminance-selected black/white text and opaque
muted-label backing now pass those sweeps and two marker tests: 584 frontend tests pass.
The 253-case browser run predates that runtime change. Rendered/highlight/hover verification
is next; option-level checks do not certify canvas readability. A4/A5/H1/H2
and final R1/R6 acceptance remain open despite the green public checkpoint.

The five common state labels (empty/loading/incomplete/error/previous) now have explicit
EN/RU/TT component assertions for accessible names, visible markup and busy/alert roles.
The 11-file focused run passed 119 tests (6.43s). This proves common labels and the scoped
transitions below, not every screen/locale/assistive-technology combination.

| Surface | Current inspected/tested evidence | Remaining evidence boundary |
| --- | --- | --- |
| Overview | `project-overview.test.tsx`: loading vs empty, failed section hides cached success, retry; browser contrast/error checks. | Full RU/TT state-copy review, not merely theme/navigation labels. |
| Import | `import-drafts.test.tsx`: conversion/key failure, retained edits, conflict, restore without stale preview; wizard browser create/repair/update. | Source-level stale draft and every parser-error translation are not covered by the common panel test. |
| Standard report | `report-builder.test.tsx`: EN/RU/TT empty completion and invalidation; error/retry; real empty save/reload. | Error wording across arbitrary server errors is not certified. |
| Statistical/alignment | `statistical-reports.test.tsx`, `alignment-reports.test.tsx`, `alignment-editing.test.tsx`: error, pending, outdated, empty and save guards; browser delayed alignment requests. | Delayed statistical page and real empty alignment browser evidence remain absent; RU/TT integration coverage is partial. |
| Graph/preparation | `node-output.test.tsx`: late port/parameter/revision responses hidden, empty result, stale revision/error attribution; preparation browser correction. | Screen-reader announcements and full locale error inventory still unobserved. |
| Dashboard/results | `visualizations.test.tsx`: EN/RU/TT retained-result/refetch/error/retry; real paging/notice contrast. | Chart-specific empty/missing semantics use family tests, not generic loading labels; A4 canvas/tooltip audit remains. |
| History/source updates | `report-history.test.tsx`, `dataset-updates.test.tsx`: unknown state gates, failure/empty/retry, locale version retry; browser normal freeze/update/restore. | Injected history outage in browser and complete locale wording review remain unverified. |

Do not reopen implemented fixes merely because a stronger evidence layer is missing. The
remaining boundaries are verification tasks, not authorization for new product scope.
A5 remains open. The broad isolated public-browser integration checkpoint passed;
its result and output path are recorded in STATUS.md. It is not final R6 acceptance while
A4/A5/H1/H2 remain open. Private opt-in project tests are explicitly excluded from this run.

A5 source-version recovery: version selection and dataset-binding fieldsets wait for a
successful version read, with pending feedback and retry. Source/dataset catalog errors
also offer retry. EN/RU/TT regressions reproduce the original enabled-unknown-selector issue
and verify failure/retry preserves selected update with only read calls. Full frontend 576
tests pass (114 files, 31.05s); three desktop/narrow/enlarged CSV lifecycle browser cases pass
(40.7s), `.backups/r6-version-retry-20261012`. Browser outage injection is not claimed.
Lint/types/API/default build pass; backend unchanged. Reconcile A5 and remaining A4/A6/H1/H2
evidence before claiming whole-product acceptance.

A5 history readiness: initial loading and confirmed-empty update/release lists are explicit;
fetch errors offer retry. Update/check/editor actions require successful jobs/state/updates,
and freezing additionally requires successful release history. Component regression first
reproduced enabled actions with unknown job state, then verifies failed history -> read-only
retry -> confirmed empty. Full frontend 573 tests pass (43.71s); the extended retry assertion
passes separately. Five normal browser update/freeze/restore/recovery cases pass (1.3m),
`.backups/r6-history-state-20261012`. These are not injected-outage browser evidence.
Lint/types/API/default build pass; no backend changes. A5 source-version and A4/A6/H1/H2
residuals remain; no claim that the full acceptance gates are complete.

A5 alignment state parity: create/edit now identify pending, successful-empty and invalidated
previews, hide prior tables during recalculation/error and retain matching-preview save gating.
Two component regressions reproduced missing loading status before correction and now cover
pending -> empty -> edited/stale. Full frontend 572 tests pass (114 files, 31.29s). Three
statistical/alignment browser cases pass (4.8s), `.backups/r6-alignment-state-20261012`,
including delayed real create/edit preview responses. Empty alignment remains component-only
evidence in this increment. Lint/types/API/default build pass; no backend changes.

A5 statistical state correction: failed previews no longer display an unrelated incomplete
configuration panel. Changed settings invalidate settled previews with explicit outdated copy
(EN/RU/TT); loading a page identifies retained statistics as previous data. A regression first
reproduced the contradictory error/incomplete state. Full frontend 570 tests pass (30.43s);
3 statistical/alignment create/edit browser cases pass (4.7s),
`.backups/r6-statistical-state-20261012`. Lint/types/API/default build pass. No backend change.
The pending-page notice itself was not separately exercised with a delayed browser response;
remaining A5 alignment/history states and other acceptance gates remain open.

A5 empty report preview: ReportBuilder explicitly distinguishes a successful zero-row result
from incomplete/error states, preserving schema headers and saveability. Settings changes
invalidate the notice with the preview. Three EN/RU/TT regressions failed before correction
and pass after it. Full frontend 570 tests / 114 files pass (31.58s); real filtered-empty report
save/open/reload passes in light/dark at 420px, 2 cases (4.1s),
`.backups/r6-empty-report-20261012`. Lint/types/API/default build pass. Backend unchanged.
This closes the identified empty-preview defect, not all A5 states or R1/R6 acceptance.

A5 pending visualization state follow-up: plain-table paging now disables when no paging
callback is available, including pending requests and frozen/read-only rendering. A regression
reproduced the enabled-looking no-op Next button before correction. Full frontend 567 tests
pass (114 files, 33.50s). Seven browser cases pass (25.0s),
`.backups/r6-pagination-state-20261012`: delayed real 201-row pagination, previous-page label,
disabled controls and keyboard return. The previous-result notice's computed text contrast
passes in both themes at 420px, superseding its previously unmeasured status. Lint/types/API
and default build pass. Other canvas/tooltip/state/human gates remain open.

R6 statistical/hierarchy keyboard evidence (2026-10-12): four production-browser cases
pass (17.7s), .backups/r6-statistical-keyboard-20261012. Box-plot summary/outlier pages,
radar profile/scales and scroll-region entry, and treemap/sunburst group exploration/return
use sequential Tab/Enter rather than programmatic focus or clicks. Exact summary values,
100 + 10 outliers, missing radar measures and zero hierarchy leaves remain verified.
Setup/theme selection still use API/pointer harness actions. This is scoped data-alternative
evidence, not canvas contrast, complete keyboard authoring or human accessibility acceptance.
Lint/types/API/default build pass; runtime/backend unchanged, previous unit suites not rerun.

Timezone refresh evidence: two complete API scenarios preserve distinct Europe/Berlin fold
instants through Parquet, report grouping, explicit renamed/reordered field mapping and rollback.
Ambiguous autumn/nonexistent spring local times fail staged checks; even warning acknowledgement
cannot apply them, and active data/report stay unchanged. Successful UTC-based replacement keeps
logical IDs/timezone metadata; rollback restores exact report rows/columns while revision advances.
No runtime defect found. 49 related source/import/update/recovery tests pass (8.19s), with two
PostgreSQL-only concurrency skips and two existing dependency warnings; strengthened rollback
report assertions pass separately (2 cases, 1.94s). Ruff/format and mypy pass. Test:
backend/tests/test_timezone_refresh.py. Separate PostgreSQL evidence is not relabeled as this run.

Contribution/retention decimal parity: six seeded common monetary populations are checked across
Pareto, waterfall and funnel against integer cents/Fraction arithmetic, including independent
half-even rounding (no production rounding calls). Covers amounts above 2^53, exact differences,
ties, zero contributions, cumulative shares, signed cancellation with checkpoints, losses and
zero-denominator retention under a Decimal precision of 3. No numeric defect found. 119 related
node/API/visualization tests pass (9.15s); Ruff/format and mypy (175 app files) pass, with two
existing dependency warnings. Test: backend/tests/test_contribution_decimal_parity.py.
This extends R2/R6 evidence without claiming all-operation or human acceptance completion.

Helper-dialog reflow acceptance: two complete single/composite Join authoring journeys pass
(36.6s), exercising Join, calculated-field and grouping dialogs at 420px and doubled root text.
Tests verify horizontal fit, real Tab traversal to an entirely visible Cancel, native Enter
confirmation/declined discard and retained configuration before final graph/dashboard parity.
Existing Escape/condition-confirmation/reload assertions remain. Initial direct focus on an
already-active resized button did not request a fresh scroll; the harness now traverses real
focus order. No application fix was warranted. Evidence:
.backups/r6-helper-dialog-reflow-verified-20261012. Lint/types/build pass; owned projects/services
cleaned, default build restored. This covers three helper forms, not all forms or human trials.

Report-first reflow evidence: four production wizard journeys pass (23.9s), covering desktop,
compact, 420px/dark and doubled-root-text/light. Each imports, rejects/corrects an invalid type,
preserves leading-zero codes, calculates decimal sums, edits to means, applies reordered-source
replacement and verifies exact 0.35 after reload. Field-page horizontal fit, sequential keyboard
navigation, computed table text and full row bounds are checked; native End reveals the last row
at enlarged text. Evidence: .backups/r6-wizard-reflow-verified-20261012. Initial screenshots alone
suggested clipped data, but existing native scrolling provides complete row access; no runtime
change was warranted. Lint/types/build pass; isolated projects/services cleaned and default build
restored. Browser zoom, other dialogs, human and screen-reader acceptance remain separate.

Analytical text-enlargement check: removed rem/pixel mismatch between row-level width and sticky
offset, using shared 160/200/100 px layout constants. Text still scales/wraps. Fourteen affected
tests pass; five repeated production journeys (20.1s) verify 14 -> 28 px table text, actual pin
geometry, restoration and complete narrow-cell access. A flaky earlier scroll assertion started
before the grid width transition ended (73 px later clipping); it now awaits active animations,
not a fixed delay. Settled screenshot confirms exact Total 4410. Evidence:
.backups/r6-table-text-settled-20261012. Full lint/types/build pass; owned projects/services cleaned.
This is not whole-app browser zoom or human accessibility acceptance.

Basic-table and responsive-pinning increment (ADR-192): ordinary tables gain named keyboard
regions/captions; legacy chart numeric headers align with cells. Two failing regressions fixed,
31 affected basic-renderer cases pass. Narrow analytical table pins could cover every measure;
effective pinning now reserves 200 px for data and unpins row level below 360 px, with localized
notice, no persisted changes and restoration on expansion. 29 affected/boundary/localization
cases, two browser journeys (5.9s) and a strengthened full-cell/hit-test/stability case (4.1s)
pass; lint/types/build pass. Evidence: .backups/r6-basic-table-narrow-accepted-20261012 and
r6-table-pinning-stability-20261012. Earlier test scroll-to-end did not target the Total column;
corrected to target-cell scrolling and explicit complete-cell bounds. Transient screenshots
are not used as proof of settled visibility. Owned projects/services cleaned, default build restored.

Table accessibility increment (2026-10-12): eleven complex-chart views gain localized captions
and named tab-focusable scroll regions; names include visualization titles and, for radar/boxplot,
the selected table purpose. Analytical table already had this structure. Eleven fail-first cases
reproduced the omissions; 53 affected and 488 full frontend tests pass (103 files, 52.78s).
Four production browser journeys pass (35.5s), including actual Tab, visible outline and native
horizontal arrow scrolling in both themes on the overflowing 420 px radar table. Initial test
assumed focus preserved a previous right-edge scroll offset; corrected the test setup explicitly.
Evidence: .backups/r6-table-accessibility-verified-20261012. This is programmatic/browser evidence,
not a screen-reader user trial. Basic table and narrow sticky-column audits remain actionable.
The remaining eight families also passed 15 browser regression scenarios (46.8s), recorded in
.backups/r6-table-accessibility-regression-20261012. Lint/types/default production build pass;
isolated projects and owned services were cleaned up.

## Requirement reconciliation — 2026-10-12

R1 history navigation (ADR-194): saved selection lives in the URL, preserving other query
settings without adding history entries. Missing/foreign references are explicit. A newly
created rollback opens for review, not apply; confirmed create responses populate the local
query before selection. Five new component cases cover addressed selection, guard refusal,
query preservation, missing references and guarded rollback callback. Errors from actions
focus their panel; background failures do not steal focus. 504 frontend tests pass/105 files
(37.02s), lint/types/OpenAPI/default build pass. Six production import/report journeys pass
(1.1m), including injected save-conflict focus and retained range settings; four further
legacy/report-cycle/executive-showcase scenarios pass (38.6s). Eight-widget exact refresh and
unchanged layout are verified. Evidence: .backups/r6-history-navigation-20261012 and
.backups/r6-history-showcase-20261012. This does not persist unsaved release form values.

R1 import-feedback increment: ImportIssues groups review actions by stable field identity,
offers separate row-key review, labels truncated issue samples and keeps conversion decisions
server-owned. One-shot focus opens key details or selects the type control; ordinary Back still
focuses the step heading. Preview has a named tab stop/caption/scoped headers. Two component
regressions prove action deduplication, no implicit saves/apply or profile changes, and ordinary
Back behavior. Full frontend: 499/104 files passed (33.67s); lint/types/build pass. Six production
journeys pass (58.3s), including exact calculations after field/key correction on 420px and
doubled-root-text layouts and existing relocated-Excel update/rollback. Evidence:
.backups/r6-import-correction-20261012. This does not replace human/screen-reader acceptance.

R2 functional reconciliation (after ranges and key authoring): complete, with R1/R6 usability,
accessibility, deployment-matrix and human gates still open. This status is about the approved
Excel/CSV delivery, not a claim of universal connector coverage or real 1C integration.

| R2 requirement | Implementation and acceptance evidence |
| --- | --- |
| Independent connector/resource/profile/snapshot contracts | `domain/ingestion.py`, `FileAdapter`, generic DatasetAccess/dataset_source; `test_ingestion.py` Excel/CSV schema/result parity and fake 1C contract |
| Reading and confirmed mapping | Five-step ImportWizard; `import-range.spec.ts`, `test_excel_range.py`: rectangles, multi-row headers, exclusions, physical identities, renamed/reordered fields |
| Explicit types and full-data quality | `normalization.py`; `test_ingestion.py`, `test_normalization_decimal_fast.py`: leading zeros, large IDs, strict decimal conversion, null/error policies, diagnostics beyond preview/sample limits |
| Row meaning, keys and field metadata | ImportProfile grain/key_fields and field unit/currency/precision/timezone; wizard optional key controls, composite duplicate/null refresh API tests and four `wizard-focus` journeys |
| Exact downstream calculations without changing old float nodes | Versioned expression/window/pivot/field/parameter contracts, `test_decimal_composition.py`, exact-node suites and independent statistical/contribution parity tests; legacy versions explicitly retained |
| Immutable files/Parquet, saved drafts and atomic publication | StorageProvider, snapshots and migration 0011; import-draft/CAS/idempotency/crash-recovery suites; pre-range receipt hash compatibility test |
| Updates, rollback, releases and changed schemas | `test_dataset_updates.py`, `test_timezone_refresh.py`, `test_excel_range.py`; failed checks preserve active data, explicit mappings retain logical IDs, frozen restore preserves old exact results |
| Scope/scale boundary | Excel/CSV supplied; 1C stays planned/test-adapter only. Existing documented 100k-row narrow/wide normalization/HTTP/browser evidence remains separate from this increment; unchanged whole-workbook safety limits apply |

No further unspecified R2 audit task remains. New concrete defects, if discovered, must be
tracked as defects rather than leaving a permanently unbounded audit placeholder. Human trial
results and complete accessibility certification are still missing and stay in R1/R6.

R3–R5 functional parent tasks were stale despite their completed children. Their delivery
status now matches inspected implementation and regression evidence; R0–R6 as a whole is
not complete. This does not move or waive any cross-cutting UI, accessibility or human gate.

| Requirement | Inspected evidence | Remaining boundary |
| --- | --- | --- |
| R1 task-oriented UI and modern readable design | Workspace/overview, report workbench, navigation, five scripted journeys, current helper recovery/focus tests; all complex-chart tables updated to 14 px with numeric alignment and browser regression | Named table regions, keyboard scrolling, remaining narrow-layout checks, general accessibility and real economist trials |
| R2 universal sources and exact data | Requirement matrix above, including delivered range and composite-key authoring | Functional delivery complete; whole-product R1/R6 acceptance and live-1C deferral remain explicit |
| R3 simple authoring without a second engine | Report builder, inputs/measures/comparison/alignment suites; `test_report_editing.py`, `test_alignment_editing.py` and `test_statistical_editing.py` explicitly preserve manual/shared branches and reject destructive edits | Unsupported advanced suffixes intentionally remain graph-only, as approved; cross-cutting human/editor audits remain R1/R6 |
| R4 first visualization delivery | Registry contract test compares every ChartType; typed renderer dispatch and chart-specific full-data/invalid-binding/selection/release/restore tests cover heatmap, boxplot, radar, histogram, waterfall, combo and analytical tables | Feature delivery does not certify every rendered color, screen-reader interaction or chart-table typography |
| R5 second delivery and templates | Bubble/Pareto/hierarchy/bullet/funnel preparation and renderers; standard/analytical templates and catalog tests cover mapping, receipts, conflicts and release restoration | Sankey and cross-project template libraries remain explicitly deferred, not hidden unfinished work |
| R6 consolidated acceptance | Fresh backend 1516 passed/32 skipped (140.09s), frontend 488 passed/103 files (61.41s); historical broad-browser `.backups/r6-public-verified-20261012/.last-run.json` remains passed, with subsequent focused evidence above | Fresh default backend run excludes PostgreSQL/opt-in daemon restart; their separate 517-case and restart evidence is not relabeled as this run. Five-economist success gate remains unverified |

Readability increment: radar profiles/scales and histogram intervals use 14 px primary text,
right-aligned numeric bounds/counts and shrinkable scroll containers. Histogram headings have
column scope and controls wrap. Exact values, missing profiles and selection behavior remain
covered by regression tests. Two fail-first cases reproduced the old 12 px baseline; 47 affected
chart/report/localization tests pass. Two production journeys now pass at 420 px in both themes
(8.7s), checking computed font/alignment, bounded scroll containers and genuine long-profile
overflow with access to the final column. Evidence: .backups/r6-table-readability-verified-20261012.
Full lint/types/build pass; owned projects/services cleaned and default API build restored.
The other ten complex-chart tables (boxplot, analytical table, combo, waterfall, heatmap, bubble,
bullet, funnel, hierarchy and Pareto) now also use 14 px primary text and shrinkable containers.
Numeric headers match cell alignment; boxplot adds explicit column scope. Ten failing baseline
cases were corrected; all 46 affected tests and 17 production browser journeys pass (1.3m).
Boxplot adds 420 px horizontal-scroll/both-theme checks; analytical table keeps pinning/rules/totals.
Evidence: .backups/r6-complex-table-readability-20261012. Full lint/types/build pass; projects and
owned services cleaned. Next audit named table regions, keyboard scrolling and remaining narrow
layouts. Fine annotations remain smaller; this is not whole-page accessibility certification.

Inspector scratch recovery (ADR-191, 2026-10-12) supersedes the reset-on-selection limitation:
condition controls and their last-applied baseline use validated node/version-scoped tab storage
with the shared bounded current-document fallback. Recovery performs no graph mutation; missing
fields block insertion. Explicit insertion transfers the expression to graph autosave and retires
the scratch. Discard is separate from deleting/changing the formula and fails closed on errors.
Malformed payloads report recovery failure; denied/quota writes preserve the newest memory copy
with a visible warning about reload/close. Physical cleanup denial still cannot guarantee that
stale disk data will not return after a full reload; same-document retirement remains protected.
46 affected component/localization cases and five production browser scenarios passed (19.8s),
including graph v1/v3 × formula v1/v2 return/reload/discard and exact signed-value regression.
Lint, types and production build passed. Evidence: .backups/r6-condition-recovery-20261012.
This is not server-persisted scratch, cross-tab synchronization or all-helper recovery acceptance.

Inspector identity safety (2026-10-12): the common configuration wrapper keys its child by
node ID/version; both graph editors supply that ID. Same-node re-renders preserve local input.
Two failing v1/v2 tests reproduced scratch condition reuse between different nodes. The classic
editor lacked this boundary; the field editor already keyed its outer details. Final browser
verification covered graph v1/v3 × formula v1/v2, empty scratch on the second node and independent
persisted formulas: 4 passed (10.0s). 30 affected component/localization tests, lint, types and build
passed. Evidence: .backups/r6-inspector-scope-verified-20261012. Earlier browser failures were
missing expansion of legacy advanced settings; cleanup was hardened with an independent context.
This prevents wrong-node application, but does not retain unapplied inspector scratch across
selection changes. Scoped scratch restoration remains a separate unfinished UX requirement.

Parent submission safety (2026-10-12): saving a calculation with an unapplied condition now
requires explicit confirmation that the current formula should be saved without those scratch
changes. A visible RU/EN/TT notice points to Use condition for inclusion. Declining neither
mutates the graph nor closes the form; accepting uses the unchanged current formula, never
silently inserts the nested condition. Both create/edit cases failed before the guard and pass
afterward. 39 affected component/localization cases and two complete production authoring
journeys passed (33.5s); the browser verifies the graph still has three nodes after declining.
Evidence: .backups/r6-condition-submit-20261012. This closes parent-submit policy for this
helper, not standalone inspector navigation recovery or general durable draft storage.
Consolidated frontend regression after these helper changes: 476 passed in 101 files (56.77s);
full ESLint, generated API agreement, TypeScript and default production build passed. Test
projects and owned acceptance processes were cleaned up. No backend rerun claimed this increment.

Exact condition authoring (ADR-190, 2026-10-12): a failing regression demonstrated literal
9007199254740993 becoming 9007199254740992 before saving. The helper now emits bounded validated
numeric tokens without Number reserialization. Exact calculated-column v2 exposes decimal /
integer / text conditions with numeric branch outputs, existing precision/scale and backend
rounding; Float64 inputs are excluded. The legacy helper clearly states its approximate execution.
This is not an implicit upgrade of saved formulas. Invalid token syntax/hex/nonfinite entries
are rejected; leading zeros are canonicalized without changing numeric precision.
37 frontend/localization and 59 backend conditional tests passed. Three production scenarios
passed (38.3s), followed by a strengthened exact all-row signed-value check (1 passed, 7.0s).
Evidence: .backups/r6-exact-condition-20261012 and r6-exact-condition-values-20261012.
Lint, TypeScript and production build passed; API and runtime numeric engines unchanged.

Nested condition draft safety (2026-10-12): an optional dirty-state callback lets the table
calculation dialog include ConditionBuilder scratch settings in its dismissal/reload guard.
The baseline advances only after successful insertion; reverting settings clears dirty status.
One new failing regression reproduced the omission; 11 affected component tests and two complete
production authoring scenarios passed (32.6s), including declined native Escape/Cancel before any
parent field changes. Lint, types and production build passed. Evidence:
.backups/r6-condition-discard-20261012. No automatic insertion, graph write or durable storage
was introduced. Standalone inspector recovery and parent-submit handling remain separate audits.

Helper dismissal safety (2026-10-12): Join/calculation/group forms now compare their mounted
settings against the initial state and reuse a small localized confirmation/beforeunload hook.
Declining Cancel or native Escape retains the form and its settings without applying anything.
Keyboard events do not bubble to the graph; Join/calculation dialogs expose localized names.
Three pre-fix regressions failed; 11 affected unit/component cases and two production browser
journeys passed (32.4s). Browser scenarios decline both Escape and Cancel in all three forms,
then finish single/composite Join, calculations, totals, publication and dashboard reload.
Lint, TypeScript and production build passed. Evidence: .backups/r6-table-discard-20261012.
Beforeunload handling and listener cleanup are component-tested; this is not durable draft
storage, cross-route recovery or coverage of nested condition-builder scratch settings.

Calculated-field helper accessibility increment (2026-10-12): adding a row focuses its name;
removing one focuses the nearest survivor or Add when empty; moving a row focuses that same
field at its new position rather than a now-disabled move button. This reuses the common
explicit-action focus hook without changing graph/formula semantics or stealing focus on typing.
Three regressions failed before the fix; 11 affected tests and three production browser journeys
passed afterward (40.6s), including calculation, undo/redo, reload/edit and single/composite Join
authoring. ESLint, TypeScript and production build passed. Browser evidence:
.backups/r6-calculated-focus-20261012. This is not full sequential-tab/screen-reader certification.

Latest R6 restart evidence (2026-10-12): the executive process-replacement test now has
an opt-in PostgreSQL variant owning a unique Docker container and anonymous volume. It
applies real Alembic migrations, builds eight widgets and freezes a release, stops the API,
restarts PostgreSQL (verified changed StartedAt), then starts a fresh API process. Saved
workflows/dashboards/datasets, frozen widget results, independent financial/statistical
expectations and restored-project recalculation all pass. Combined SQLite/PostgreSQL restart
and HTTP benchmark regression: 8 passed, 2 upstream warnings, 25.01s; targeted lint/format
and helper mypy passed. The first attempt exposed ephemeral Docker port reuse in the fixture;
reading the current mapping before each API start fixed it without relaxed assertions/timeouts.
Both failed and successful runs cleaned their owned containers. No runtime product code changed.
This supersedes the earlier missing database-restart evidence for this demo; graceful restart
does not prove crash durability, live-connection recovery, all user projects or human usability.

Latest R6 PostgreSQL revalidation (2026-10-12): `pytest -q -k postgresql --maxfail=3`
with NODEBI_TEST_POSTGRES_URL targeting disposable PostgreSQL 17-alpine completed with
517 passed, 2 skipped, 1544 deselected and two upstream deprecation warnings (392.19s, exit 0).
Both skips are SQLite parametrizations selected by matching test names, not skipped PostgreSQL
variants. Each database test used a fresh migrated UUID schema; zero test schemas remained.
The temporary loopback-only container used no working data volumes and was removed afterward.
This supersedes earlier unavailable-Docker observations and the narrower 31-case migration/lock
selection below. It does not rerun frontend tests, certify database-process restart or replace
whole-app accessibility and economist acceptance. No application code changed in this increment.

Project-local template catalog (ADR-183/184) is delivered for both standard and analytical families:
server-side name/grain discovery, family/archive filters, paging, revision-guarded rename/archive/
restore, unchanged calculation definitions, preserved frozen metadata and exact request retries.
The Reports-linked screen supports RU/EN/TT, themes and narrow layouts. Cross-project catalogs and
templates for additional calculation families are deferred; comprehensive R6 gates remain open.

Decimal composition correction (ADR-166): Join v1/v2, Union and diagnostic record previews share
exact common-scale matching/casting. Mixed scales widen to their maximum; physical schema mismatches,
incompatible known currencies/units and overflow fail explicitly. Exact transport and stable field
identities survive composition and release restoration. This fixes incorrect matches/truncated values,
not a new rounding mode. Frozen artifacts remain unchanged. Field-wire decimal parity remains open.
Field-wire metadata correction (ADR-167) now preserves direct/conditional decimal fields through
Append Field, preview and exact table sums; static schema and execution use the same branch-scale
and unit rules. Nullif preserves the left scale. Decimal scalar outputs remain unsupported and now
fail in preflight with guidance; exact field arithmetic/sum/scalar parity is still open.

## Implemented foundation (updated 2026-10-09)

These are incremental vertical slices, not completion of every milestone below. Project Data has
"Connect data" and prepared tables. The five-step initial import supports Excel/CSV with strict
full-table checking, editable logical fields, decimal precision/scale, date/timezone options and
explicit null-on-error policy. Preview rows are bounded independently of validation scope.
SourceAdapter is tested with a fake 1C entity reader; no live 1C connection is offered.

After upload the source URL can be reopened without uploading again. **Data -> Resume import**
lists unfinished imports. **Save import draft** persists reading options, table selection and
field settings; inspection and **Check all rows** also save settings. Keystrokes alone are not
saved. Unsaved-change warnings accompany leaving via links or unloading the page. A structurally
invalid profile must be corrected before saving. Resuming restores the form but requires a fresh
full-data check, not an old preview. Concurrent saves return a conflict and retain local edits;
**Reload saved import** explicitly discards them. If the source changed, **Restart mapping**
starts with its current file after confirmation. A completed import reopens its saved receipt.
Drafts do not change active reports or their check fingerprints; they are not frozen-release data.

Migration `20261008_0011` stores append-only DatasetSnapshot records linked to immutable raw
SourceVersion records. Parquet lives behind StorageProvider. `dataset_source@1` consumes a
resource from the source pointers pinned by ProjectSourceAccess; profile apply uses source CAS,
request identity and bumps affected workflow revisions. Releases copy/restore normalized artifacts
as well as raw files, and deletion queues both. Legacy Excel APIs only list their legacy sources.
The existing report-cycle endpoints now also accept universal sources through typed dataset
bindings; old worksheet bindings and legacy behavior remain intact (ADR-115).

The **Update data and history** link opens saved update drafts. Upload/select an immutable file
version, choose incoming tables and verify full-data checks before atomic apply. Mapping follows
unique original headers, with explicit selection for renamed/ambiguous fields; logical resource
and field IDs, types and decimal precision stay unchanged. All active tables from the file are
replaced together, including unreferenced ones. Extra unmapped columns warn, invalid values block
the update even beyond the bounded diagnostic sample. CSV encoding/delimiter and per-table header
rows are configurable. New raw versions/Parquet are retained without changing active reports.
Checks reuse staged snapshots by version/profile fingerprint. Rollback is a checked update restoring
old pointers; source/workflow revisions only increase. Generic append-period mode is not supported.

For imported tables, `/projects/{id}/build` creates an ordinary editable v3 graph with row formulas,
optional Filter, Group By v3 and after-total formulas. Older API clients without stable measure IDs still create v2.
Preview persists nothing; apply creates graph/publication/visualization/dashboard and a request
receipt in one transaction. The receipt is not a saved calculation recipe. The selected snapshot
is checked before calculation/apply and request reuse with different settings conflicts.
The aggregation wizard offers table/bar/line/KPI. **Create analytical report** additionally builds
histogram/box-plot/heatmap/analytical-table reports from imported or prepared observations (ADR-146/147).
Heatmap requires explicit aggregation; tables offer ordered grouping, stable measures and optional
subtotals/grand totals, including observation-based averages and ratio-of-sums. Appearance is edited
after saving through existing visualization controls. It uses ordinary graph
preparation and typed chart/table presentations with complete frozen datasets (ADR-128/129/130).
Filters are applied before full-input statistics. Exact preview, source revision guards, atomic save,
local draft recovery and idempotent retry apply to this route too. ADR-148 adds structural round-trip
editing for exclusive compatible terminal analyses: manual upstream work, identities and appearance
stay intact. Shared/context/interactive terminal bindings stay explicit graph steps. Table rebinding
requires confirmation and never silently removes formatting rules. Other advanced graph editing and
remaining R4/R5 charts are still future work.

**Calculations -> All operations -> Heatmap cells** (ADR-131) prepares two dimensions and a numeric
measure. Choose the aggregation explicitly: sum, average, minimum, maximum or count of non-empty
numeric values. Exact average has a configurable 0–18 decimal places (default 6), half-even rounding.
The output distinguishes missing combinations (present=false), existing rows with missing measures
and measured zero. Source, valid and missing counts accompany each cell. Up to 200 categories per
axis and 10000 cells are supported; coarser grouping/filtering is required beyond these limits.
The entire selected input is aggregated before preview paging. Settings persist in the graph; the
result can be published as a table, frozen and restored. In visualization settings choose **Heatmap**
for this publication (ADR-132). **Appearance -> Colour range** offers data extent, symmetric zero and
fixed bounds. Fixed bounds use exact decimal text and only saturate colours: outside-cell counts
remain visible. No source rows (x) and missing measures (dash) have separate markers/colours, while
numeric zero remains a value. Exact tooltips and **Cell table** retain values/counts; table selection
is keyboard accessible. Zoom and 100-row table pages change only the view. Entire bounded matrices
and colour scales are frozen/restored, not just displayed pages. New bindings and settings support
EN/RU/TT and both themes. Guided heatmap creation remains open; preparation still lives in the graph.

In dashboard edit mode, **Widget actions -> Edit in report wizard** reopens the current graph.
It recognizes Group By v2/v3, an optional exclusive literal Filter v1, and wizard-authored exact
row/after-total formula chains. Measures, formulas, dimensions, filters and decimal average scale
can be changed with a fresh full-data preview.
**How it is calculated** identifies preserved preparation steps and links to their graph nodes.
Upstream manual calculations, other branches, containers, publication IDs and layout are retained.
Shared or parameterized filters stay upstream; a new simple filter does not overwrite them.
Shared calculation outputs, contextual/interactive bindings and unsupported terminal nodes instead
show an explanation and graph link. Summary formulas included in manual workbooks/blocks remain
graph-only. Legacy Group By versions are never silently upgraded.

Field order, series and appearance stay unchanged by default. **Update visualization field bindings**
explicitly binds the selected dimensions/measures and enables changing table/bar/line/KPI type.
This does not remove custom formatting or exposed graph fields: unavailable references must be
corrected in their detailed settings. Preview shows calculation output, including fields not selected
for display. Renaming affects the visualization, not its dashboard title or workflow name.
If several widgets use the visualization, acknowledge updating all of them before preview/apply.
Concurrent project changes conflict; the local form remains intact. **Reload saved report** confirms
discarding local changes. Reload disables form controls until the saved state arrives and resets
local settings even when no server changes occurred. Edits are in-memory until Save report, with
navigation/unload warnings;
report-edit drafts are not yet persisted. Apply and its retry receipt are atomic and idempotent.
This is the first existing-report round-trip, not support for arbitrary graph restructuring.

Decimal sums/min/max are exact; decimal averages use explicit scale and half-even rounding
(default six fractional digits). Overflow beyond Decimal128 precision fails. Group By v1 and
legacy Float64 calculations are unchanged. Integer sums/averages still yield Float64: map money
to decimal explicitly at import before using exact formulas over totals. Decimal values and unsafe JavaScript integers in
normalized previews/results are transported as strings. Excel values already rounded inside
the workbook cannot be recovered by changing their import type.

**Calculations -> All operations -> Exact Calculated Column · v2** adds opt-in exact arithmetic
(ADR-118). Connect its input with the keyboard-accessible connection selector and insert named
decimal/integer fields. Set total precision (1–38 digits) and decimal places (0–precision, default 2).
The formula uses +, -, *, / and abs/minimum/maximum/coalesce/nullif/safe_divide. Numeric constants
are decimal, including scientific notation; Float64 fields are disabled and rejected server-side.
For example `(1 / 3) * 3` produces `1.00`; `1.005` rounds to `1.00` and `1.015` to `1.02` at scale 2.
Each node rounds only its final output, to the nearest even digit on a tie. Chained nodes consume
the previous node's rounded result. Ordinary arithmetic preserves missing values. Use
`amount / nullif(quantity, 0)` to return null for a zero denominator, or
`safe_divide(amount, quantity, 0)` for an explicitly chosen fallback on null/zero denominators.
coalesce and safe_divide do not evaluate unused branches. Overflow/division errors stop execution;
they are never silently changed to zero. Limits: 4096 characters, 256 syntax nodes, 64 nesting
levels, 38-digit numeric constants and 512-bit rational intermediates. Simplify excessive formulas.
The graph editor autosaves settings; preview executes on the server. Report suffix editing keeps
manually authored upstream exact steps intact. Legacy calculations are not upgraded.
Exact conditions (ADR-160) use `if_else(condition, numeric_result, otherwise)`, `is_null`, comparisons
`==`, `!=`, `<`, `<=`, `>`, `>=`, and boolean `and`/`or`/`not`. String, boolean, date and datetime
fields are available for conditions only; the output remains decimal. Types must be compatible;
dates compare with dates and datetimes require matching timezone metadata, not implicit text parsing.
Boolean fields support equality, not ordering. Comparisons with missing values remain unknown;
`is_null` explicitly tests absence. False/unknown conditions select otherwise. Boolean operations
use three-valued logic (false AND unknown is false; true OR unknown is true) and short-circuit.
Both branches are schema-checked, but only the selected one is calculated. For example
`if_else(not is_null(plan) and plan != 0, actual / plan, None)` safely guards empty/zero denominators.
These functions work in graph, row, after-total and alignment formulas. Release restoration preserves
quoted constants even when they contain text resembling generated IDs. No v1 migration is needed.
**Exact Window · v3** (ADR-161) prepares partition sums, cumulative sums/maxima, previous-row values
and row numbers in the graph. Decimal/integer inputs produce exact Decimal128 values at source scale
(integer scale 0); numbering remains integer. Partition sums retain source order, ignore missing
observations and leave all-null groups empty. Other operations require an explicit unique ordering
inside each partition, sort null keys last and return the sorted table. Cumulative null rows remain
null without resetting state; previous includes nulls and means previous row, not previous period.
Overflow of any emitted value fails; there is no silent rounding or Float64 coercion. Existing
Window v1/v2 behavior is unchanged. Output caps: 250000 rows, 1024 columns, 20000000 cells; import and
join limits are unchanged. The 100k x 100 engine benchmark is separate from file-import limits.
The **Share and rank** shortcut now uses these exact nodes for decimal fields (ADR-162). For integer
fields choose **Exact calculation** explicitly; the legacy default remains available. Float64 stays
approximate. **Share decimal places** selects 0-38 places, default 6; the output must fit 38 total
digits, so high scales leave fewer places for the integer part and may produce an explicit overflow.
Null/zero denominator fallback is explicit. Exact row ranks reject unresolved ties and are not dense
ranks. Optional parameter selection remains after the calculation, preserving full input/group scope.
Other analytical shortcuts and durable helper drafts still require follow-up.
Decimal Unpivot preserves all digits at the maximum declared source scale (ADR-163). It retains
common known unit/currency metadata and rejects conflicting units/currencies, missing scale metadata
or overflow. The previous fixed six-place decimal cast was a correctness defect and is removed.
Previously frozen artifacts are not rewritten; recalculate the live graph from its retained source.
**Exact Pivot · v2** (ADR-164) computes decimal/integer sums, averages and extrema over all selected
rows. Averages expose 0-38 decimal places (default 6) and half-even rounding; other numeric results
retain source scale (integer scale 0). Every numeric result must fit 38 digits. Count supports any
value type and excludes nulls. Missing/all-null numeric cells are empty; counts are zero. Null index
and category values form ordinary groups. Category fields are dynamic but retain stable identities;
at most 128 categories and the existing bounded output limits apply. Legacy Pivot v1 remains available.
Changing/removing categories may require explicit downstream report field rebinding. Frozen releases
retain exact values; restored graphs use the same ordinary schema/execution engine.
Convert Types no longer silently truncates fractional decimal values when converting to integer
(ADR-165). They obey the selected error/null policy; exact whole values and existing overflow checks
are unchanged. No existing frozen artifact is modified by this correction.
Other analytical decimal parity, locale-aware exact currency
formatting and remaining chart role contracts remain open.

The report wizard's **Measures** step now offers **Formulas for each row** and **Formulas after
totals** (ADR-119). Row formulas run before literal filters/aggregation, rounding once per node.
After setting their names, expressions and precision, use **Check formula fields** to refresh
field choices from the backend. Row results then become available to measures, dimensions and
filters; unchanged checked prefixes can supply the next row formula. Define the measures and
check fields again to select aggregated values for after-total formulas. These settings generate
ordinary exact calculation nodes, not a hidden browser calculation. The check does not save or
compute report totals; value-dependent advanced upstream schemas use their existing resolver.
Full **Preview calculation** checks all selected data, showing at most 50 result rows.

For rows actual/plan = 1.00/1.00 and 9.00/3.00, a mean of row ratios is 2.0000; the ratio of
totals is 10.00/4.00 = 2.5000. Use after-total formulas for the latter, differences and percentages.
Do not treat either calculation as interchangeable. Formula scales default to two decimal places;
choose more when intermediate ratios need them. Division by zero and overflow block saving unless
the expression explicitly handles them. New measures have stable UUID field identities, so changing
their order or names preserves references; removing a required denominator produces an error.

**Primary output measure** can select a formula for a KPI while retaining supporting totals in the graph.
Tables include all bound fields; charts retain their existing eight-series limit. Existing reports
preserve display bindings unless explicitly rebound. The same graph remains editable after release
restoration. Legacy Group By v2 reports allow row formulas but need a new report or explicit graph
work for after-total formulas; their positional output identities are not silently migrated.
Limits: 16 row formulas, 16 measures and 16 after-total formulas; exact arithmetic accepts only
integer/decimal fields. After-total field selectors currently list aggregate measures, not earlier
summary formulas. Dedicated previous-period controls and broader reusable-measure composition remain open,
as do full UX and human acceptance.

### Reports using prepared calculation results (ADR-120)

Choose **Data -> Report data source -> Prepared calculation results**, then a named table output.
The list includes its calculation name; only the selected output's ancestor schema is resolved.
Unavailable/contextual/scalar inputs are not silently converted into an ordinary table. Scalar
results can already be displayed directly as KPI. Context-filtered results require graph work, and
tables in manual blocks must expose a full-table output port. The source graph link remains visible.

The report adds ordinary nodes and an edge to the existing workflow, then creates its own publication,
visualization and dashboard. Existing preparation, other branches, identities, containers and report
layout stay unchanged. Source refresh and shared preparation edits affect all dependent reports.
An upstream report that has become shared is protected by the existing graph-only editing rule;
the new exclusive suffix remains editable. The whole shared workflow survives frozen-release restore.

Selection uses a publication to identify the table endpoint, but the saved edge references the actual
node/port. Retargeting the publication alone does not rewire existing report calculations. This is not
a new cross-workflow publication pointer. Use the workflow's current parameter defaults; another
dashboard's parameter/context selections are not inherited. Dedicated contextual input controls and
cross-workflow execution remain outside this slice.

Preview saves nothing. Apply checks the project state token and workflow revision, then commits
the graph branch and all new objects together. Concurrent writers cannot replace each other's branch;
repeating a committed request returns its original result. **Reload input fields** preserves local
measures, disables editing during refresh and invalidates stale preview/schema choices. Correct any
missing fields and preview again before saving. Changing the selected input clears input-specific
measures, formulas, filters and dimensions. Legacy imported-table API requests and retries still work.

### Named reusable measures (ADR-121)

Data now includes a catalog of measures with business names/descriptions, numeric field bindings
and explicit grain. A definition references a prepared publication, not a copied formula. Select
all fields identifying one prepared row; empty grain is reserved for a single total. Registration
checks the full dataset, including duplicate/null keys and numeric type. Renaming the definition
does not rename the calculation field or existing report titles. Field/grain changes require a new
definition. Old graph clients omitting this metadata preserve it.

Create report from measure previews exact prepared values and creates independent presentation
objects only: the same workflow/publication is retained, without another aggregation or graph node.
Table includes all grain fields and value. Bar/Line require one grain field; KPI requires a single
total. The saved visualization retains a full-data grain guard, including after appearance changes,
copies and release restoration. Shared changes producing duplicate grain fail visibly, not silently
sum or average existing values. Removing the catalog definition leaves existing reports intact.
The publication binding stays live; retargeting it must still satisfy the saved field/grain contract.

Preview is read-only; apply is atomic, idempotent and project-revision guarded. Input refresh keeps
the report name/presentation but invalidates the old preview. Workflow parameter defaults apply;
context-filtered results remain excluded. ADR-125 adds up to eight distinct measures from the same
publication and grain to one table. Select additional measures in Create report from measure; no
join or aggregation is introduced. All selected fields and the shared grain are checked over full
data on every render. Saved/copy/release guards survive catalog removal and older appearance clients.
Unavailable selections remain visible until explicitly deselected. Single-measure charts/KPI remain
unchanged. Cross-publication alignment is not implicit in direct catalog reuse.

The explicit alignment node (ADR-126), also used by the guided builder, consumes two prepared
branches in the same workflow, one numeric field each, with 1–8 key pairs. Full one-to-one alignment
retains keys from either side, exact values and nulls. Presence columns distinguish absent rows.
Both sides must have unique full-data key tuples; duplicates are errors, never reaggregated. Empty
keys require explicit matching; type/timezone conversions belong upstream. Preview reports matched
and unmatched counts over the full inputs. Settings and dynamic field identities survive graph
saves and release restoration. ADR-127 adds Create alignment report: choose one workflow and two
eligible published tables, then explicit keys, fields and names. Preview persists nothing; save checks
the project token and commits a new ordinary alignment branch, publication, guarded table, dashboard
and idempotency receipt together. Existing nodes/edges/parameters/containers stay unchanged. Reload
preserves settings and invalidates preview. ADR-158 adds up to 16 exact formulas after alignment,
including backward references to earlier formula results. Server-only field inference does not
execute rows; full-data preview/apply uses ordinary calculated_column@2 nodes with explicit rounding.
Both input measures, row-presence flags and full match counts remain visible. Missing values remain
null; zero denominators need an explicit expression policy. Drafts, old receipts and complete releases
remain compatible. ADR-159 adds guarded in-place alignment/formula editing without rewriting either
input branch. Field rebinding and shared-widget acknowledgement are explicit; advanced/shared/context
terminal results stay graph steps. Revision/receipt/draft/release lifecycle is preserved. Cross-workflow
references and mixed-unit charts remain unfinished.

### Calendar comparison reports (ADR-122–124)

In a new report, include a date grouping dimension. On Filters, check formula fields and enable
Compare calendar periods. Choose month/quarter/year and compare a prepared measure (including an
after-total formula) with the preceding calendar period or same period last year. The graph contains
an explicit calendar bucketing step before aggregation and a comparison step after formulas.

Output adds previous, difference, change % and baseline-exists columns. Missing periods are not
substituted with the last available row; absent/empty values remain null. Zero baselines retain the
difference but have no percentage. Percentage is (current - previous) / previous * 100; negative
denominators retain their sign. Integer/decimal calculations use exact arithmetic and half-even
rounding; Float64 stays approximate. All rows are checked for duplicate keys/non-finite values.
Null partition keys match; null dates fail. Convert timestamps to dates explicitly first.

Filters apply to raw rows before calendar bucketing and therefore affect both compared populations.
No complete-period coverage or extrapolation is implied. Other dimensions define independent groups.
The first slice supports one compared measure and table presentation. Both nodes have graph forms.
ADR-123 adds round-trip wizard editing for exclusive compatible calendar/comparison chains. Existing
node/field IDs, positions, appearance and unrelated branches are preserved. Shared/manual or mismatched
chains stay graph-only. Adding/removing comparison requires explicit visualization field rebinding;
removal also removes calendar grouping. Old clients omitting comparison cannot silently delete it.
ADR-124 adds Bar/Line with exactly two series: selected current value and calendar baseline. Only the
date dimension is permitted; multiple partitions require a table. Charts never mix the percentage,
difference, availability flag or unrelated measures into that axis. Table previews retain all outputs.
Bindings use the terminal comparison node identity; renaming follows the schema. Changing the selected
measure requires explicit rebinding. Existing ordinary rendering retains prepared order, exact string
transport and null gaps (no connectNulls); this does not imply exact numeric pixel coordinates.
Broader measure composition, partitioned comparison charts and complex visualization types remain open.
No DDL or new dependencies. Atomic creation, idempotency, ordinary field IDs and release restoration
use the existing infrastructure. 100k prepared-row executor smoke check: ~1.68 s cold / 2.00 s repeat
on this Windows environment while other checks ran; excludes import, network, browser and memory
profiling and is not full R6 acceptance.

Engine-only benchmark `python -m scripts.benchmark_exact_formulas` (2026-10-08, local Windows,
Python 3.13/Polars 1.44.2): 100k rows, two columns, cold/repeat 1.247/1.213 s; 100k rows, 100 columns,
1.314/1.266 s. Only two columns are referenced. Separate traced runs peak at 12.74/12.31 MiB Python
allocations; full output frames are 3.81/78.58 MiB. Source construction, network, browser and native
allocation peaks are excluded; repeat is recomputation, not cache. The wide engine benchmark
deliberately bypasses the import cell limit and does not claim 10-million-cell imports are allowed.
This is a reproducible baseline, not completion of R6 performance acceptance.

Limits currently follow the existing file boundary: 50 MiB uploads by default, 250,000 rows,
1,024 columns and two million cells. Adapters provide bounded batches to callers but file readers
currently materialize the bounded table; this is not a streaming/out-of-core engine. Initial and
replacement files, profile-apply and staged snapshots have process-crash cleanup intents before
writes. Metadata adoption and intent removal are atomic; a committed snapshot is retained even
when its response is lost. Saved initial-import and update drafts survive browser/server restart.
For manual server startup, run `python -m app.services.file_cleanup` after migrations and before
starting the single backend worker. Docker Compose already runs it in that order. Never run this
staging-recovery command concurrently with live writes. Subprocess tests cover forced termination
after initial raw/Parquet writes and after metadata commit, followed by fresh-connection recovery.

## Intent and scope

Economists/business analysts, one local author, typical datasets up to 100,000 rows.
Preserve Next.js/React/React Flow, FastAPI/Polars, PostgreSQL, ECharts, storage boundaries,
existing projects and releases. Retain Russian/English/Tatar and light/dark preferences.
Direct 1C, accounts, hosted deployment and schedules are excluded from this delivery.

## R1 — Workspace

New visual system: neutral light default, optional dark, blue accent, tabular numerals,
14–16px primary text, ordinary/compact table density and consistent accessible controls.
Project navigation: Overview, Data, Reports, Calculations, History. Keep legacy deep links.
Prepared datasets replace publication terminology in the primary journey, not domain identity.
Report authoring: fields at left, report/preview at center, contextual settings at right.
Show empty/loading/incomplete/error/stale states separately. Preserve drafts when navigating.
All drag operations have keyboard and button alternatives. Target WCAG 2.2 AA.
Acceptance journeys: import, prepare, create report, change calculation, update data.

Delivered overview slice (ADR-139): actual saved-report cards with search/six-card pages and separate
view/edit links, prepared-table and unfinished-import summaries, legacy Excel access, project-level
checks/update state and restored selections. Populated reports precede empty layouts; no inferred
readiness or graph execution on navigation. Section loading/error/retry states remain independent;
cached success is hidden on failed refresh. Inline rename supports Enter/Escape/focus return.
The overview is responsive and localized. The report workbench layout (ADR-140) adds a searchable
schema field panel, central selected/unplaced preview and contextual settings sharing one draft.
Buttons assign simple data roles; advanced roles remain explicit. Narrow layouts stack with keyboard
section anchors. Schema failures suppress old preview success and block apply. Existing close/switch
guards, revision checks and graph links remain. ADR-141 adds tab-local recovery for new/edited/copied
visualizations, explicit restore/discard, original CAS revision retention and guarded workspace links.
History navigation is not intercepted; reopening settings recovers the draft in the same tab.
Unavailable-storage/closed-tab recovery, other authoring forms, ambiguous in-flight creation,
five-journey polish, comprehensive accessibility and human acceptance remain open.

## R2 — Universal data

2026-10-12 range delivery (ADR-193): the Tables step now accepts explicit Excel rectangles,
with the top row starting headers. Clearing the range restores whole-sheet/header-row behavior.
Header count and Excel/CSV row exclusions are available in a native disclosure. Physical column
IDs remain stable, selected headers cannot cut merged cells, and outside formula caches do not
block selected data. Workbook safety limits remain. API tests verify exact report refresh,
rollback and frozen restoration; compatibility tests preserve old whole-sheet receipt hashes.
Two production range keyboard/reload journeys and four existing CSV report journeys pass (27.2s).
Evidence: .backups/r6-import-range-verified-20261012. Initial test cleanup lacked confirm=true;
fixed the harness and removed only its two owned synthetic projects. This is not human acceptance.

Replacement mapping now exposes those options per prepared dataset. Stale check suggestions
cannot overwrite edited options; sibling datasets retain their bindings. A moved/reordered/
renamed table passes explicit mapping, failed-bound checks preserve old report values, and
corrected apply/rollback preserve logical identity and exact amounts. Six production scenarios
passed in 52.7s (.backups/r6-range-refresh-accepted-20261012); API fixture also verifies frozen
restoration after relocated input. Frontend full regression: 494 tests; 29 targeted backend
range/refresh/timezone cases pass. This increment changes refresh authoring, not server execution.

ConnectorDefinition describes version, validated options and capabilities. SourceResource is
a sheet/table/entity; ImportProfile owns reading/mapping; DatasetSnapshot pins normalized data,
schema, source version and lineage. Adapters discover resources, inspect schemas and read batches.
Original files and normalized Parquet are immutable StorageProvider artifacts; PostgreSQL stores
metadata. Keep legacy Excel APIs/nodes and explicitly preserve stable logical fields on updates.
Wizard: source -> acquisition -> tables -> fields -> validate/apply. Excel/CSV are available;
1C OData/HTTP is planned and tested through a fake adapter, without claiming live integration.
Leading-zero identifiers stay text; invalid conversions fail by default; null is not zero.
Store unit/currency/precision/timezone metadata and optional keys/grain. Nested API collections
will become related resources. Add exact decimal and safe large-integer serialization; old
Float64 operations retain their semantics. Apply updated source sets atomically after checks;
history, compatible rollback, frozen releases and restore must include normalized sources.

## R3 — Report wizard

Choose dataset, measures, dimensions, filters/comparisons, then presentation. Preview is transient;
apply is atomic, revision-checked and idempotent. Generate ordinary editable graph nodes and
published outputs. No duplicate calculation DSL/engine. Simple/steps/graph views project the
same graph. Unsupported hand-authored subgraphs remain intact and visible as advanced steps.
Keep sum/average/ratio-of-sums explicit, preserve denominator and cumulative history scope,
and show Join cardinality diagnostics. Reusable measures reference actual graph outputs.

## R4/R5 — Visualizations

Versioned typed VisualizationSpec and catalog describe role bindings, compatibility and controls.
Frontend ECharts adapters own appearance only. Named data layers (e.g. box summary/outliers)
must share a source snapshot; click identities must not depend solely on row positions.
First wave: heatmap, boxplot, radar, histogram, waterfall, bar/line combo and analytical tables.
Guided waterfall (ADR-181) now reuses the analytical wizard and existing waterfall_steps/WaterfallSpec.
Order is explicit: input rows or ascending unique nonempty integer/decimal/date/datetime keys.
Existing graphs retain input order. Exact role markers, reconciliation, draft/edit/template recovery
and complete frozen results use the same graph; chart rendering does not accumulate balances.
Heatmap distinguishes null/zero and requires explicit duplicate-cell aggregation. Radar uses
3–8 axes and explicit scales/normalization. Boxplot uses full-data linear quartiles, Tukey
1.5-IQR observation whiskers and separate outliers/counts. Histogram defaults to 20 equal bins.
Statistical preparation is represented by backend graph operations; display caps never change
the population. Waterfall marks totals explicitly; dual axes require explicit configuration.
Second wave: bubble, Pareto, treemap/sunburst, bullet, funnel and reusable report patterns.
Sankey awaits an actual flow-analysis scenario. Each chart offers a data-table alternative,
purpose guidance, accessible colors, contextual filters, error feedback and persistence.

Delivered statistical foundation (ADR-128): boxplot_stats@1 emits summary and outlier tables from
one complete input, with optional grouping, missing/observation counts and stable group/point multiset
identities. Exact integer/decimal quartiles use rational interpolation and Decimal128 output with
two additional scale places; out-of-range exact results fail rather than round. Float64 inputs retain
approximate output. Empty and constant populations have explicit tested behavior. Graph controls,
named-output selectors, publications and release restoration are integrated. Subsequent deliveries
add graphical box plot (ADR-129), exact histogram preparation/rendering (ADR-130) and heatmap cells/
rendering (ADR-131/132). These share versioned specs, exact tables and complete frozen datasets.

Radar (ADR-133) uses any prepared publication with one row per nonempty profile. Guided radar
(ADR-180) now creates aggregations and
optional row/after-total formulas through the standard report wizard, with explicit scales,
full-result preview, guarded suffix editing and draft/release restoration. No hidden calculation.
The typed presentation contract remains unchanged; graph operations own aggregation/alignment.
Bind 3–8 distinct numeric axes, up to 20 profiles, and explicit
shared or per-axis min-max bounds. Shared mode checks declared unit/currency equality; absent metadata
does not infer meaning. Mixed declared units require min-max. Full-result duplicate/range/type checks
precede saving; no hidden aggregation, automatic scales, clipping or missing-to-zero conversion.
Incomplete profiles stay in an exact table with an explicit notice, not a partial polygon. Server
rational differences produce only presentation coordinates. Stable profile identities, accessible
axis ordering, inspectable scales, copy/CAS, full frozen results and restoration are integrated.
Waterfall preparation (ADR-134) adds an explicit ordered graph node with initial/change/subtotal/total
roles and configurable source text markers. Subtotals never add twice; expected totals reconcile
exactly. Appending a final total is explicit. Missing contributions, invalid order, duplicate labels,
overflow and excessive steps fail instead of silently changing the balance. Up to 2000 output steps;
use upstream grouping/sorting for business detail/order. Exact value/start/end/balance fields retain
lineage, stable step IDs and complete frozen-table data. WaterfallSpec/graphical rendering (ADR-135)
adds exact-role validation, full-data rationally normalized endpoints, zero-inclusive axes and exact
ticks, vertical/horizontal bars, a complete paged table, stable selection and upstream-only contexts.
Zero strokes and explicitly described nonzero sub-pixel dots remain distinct. Keyboard chart windows
complement slider zoom without recalculation. Complete typed frozen results preserve every step.
Combination charts (ADR-136) bind 2–8 prepared numeric series to bars/lines and explicit primary/
secondary axes. One row per nonempty category, at most 2000 categories, matching units within each
axis, no implicit aggregation/sorting/stacking. Both styles are required. Secondary-axis use is
explicit and visibly explained. Full-data zero-inclusive rational scales carry exact bounds/ticks;
gaps stay missing, original numbers survive tooltips/tables. Keyboard viewports and table paging
leave full scales intact. Stable selection, CAS/copy, complete releases and restoration are supported.
Analytical-table preparation (ADR-137) now provides table_rollup@1: 0–8 dimensions, 1–16 named stable
measures, explicit sum/average/min/max/count/count_rows/ratio_of_sums. Leaf and ancestor results use
unrounded observation states; null keys, missing measures and subtotal placeholders stay distinct.
Both subtotal/grand-total choices are explicit. Exact output, grouping order, stable identities,
full preview/publication/release/restore and graph settings are supported. Maximum 20000 complete
output rows including totals; no silent truncation. The dedicated analytical-table contract (ADR-138)
adds hidden technical roles, explicit row levels, pinned columns, measure order/visibility, density
and exact server-side conditional formatting. Bounded pages and full frozen artifacts preserve
the same totals and formatting; no browser aggregation. Remaining registry expansion, legacy typed
contract migration, wizard-generated rollups and R5 representations remain open.

R5 bubble chart (ADR-149/150): typed key/X/Y/size/label/group bindings, full-input validation/scaling,
area-proportional size, exact bounds/table, stable typed identities and distinct missing/zero states.
Up to 2000 input-order observations per internal page (public API up to 1000, UI 100); page bounds
never alter extents/population counts. A 100000-row narrow/wide benchmark keeps unused fields out of
transport. The public registry/API, validated save/copy/retry, complete release/restore and schema-aware
editor/chart/table now share the same contract. Close large values use explicitly explained offset
tick labels; exact original numbers are retained. Group colour is identity-based across pages.
R5 Pareto (ADR-151) is available through pareto@1 and a typed Pareto chart: explicit prepared
unique categories, descending contributions/native-key ties, exact sums and rational shares,
12-place rounded percentages, zero-total undefined state and full-input validation. Two named ports
retain ranks and population; graphical pages retain the full denominator and fixed percent axis.
The configurable reference is only a visual guide. Exact tables, stable selection, complete frozen
releases, restore and ordinary graph authoring are integrated. The 100k-row benchmark is separate
from end-to-end response time. Guided Pareto creation is delivered in ADR-155;
reusable templates remain open.

R5 hierarchy (ADR-152): treemap/sunburst share ordinary table_rollup@1 preparation and typed bindings.
Only sum/count measures with all grouping levels and grand total are accepted. Complete <=5000-node
trees retain exact amounts, full-root fractions, stable parent/path identities and zero/null-category
states. There is no partial-tree API paging or browser aggregation. Keyboard table group exploration,
identity-based selection, save/copy/retry, complete releases and restore are integrated. Float totals
remain approximate (1e-12 reconciliation tolerance); exact decimal/integer totals remain exact.
Direct hierarchy creation is available in the analytical report wizard (ADR-155).
Compatible hierarchy round-trip editing is supplied by ADR-156; templates and human/accessibility
gates remain open.

R5 bullet (ADR-153): category/actual/target bindings, matching units, authored decimal scale including
zero and 1–5 named ordered ranges. Missing actual/target are separate from zero. Full-input guards
reject duplicate/empty categories, nonfinite or out-of-scale values before pagination. Exact rational
comparisons determine band membership; bounded normalized geometry is separate from exact table values.
The horizontal renderer has actual bars and target/zero markers, explicit tone meanings, exact tables
and responsive 1–5-row keyboard windows. Page/window changes never change scale or full counts.
Save/copy/retry, full frozen populations and restore use the same contracts. No chart aggregation,
new dependency or DDL. Unknown metadata still requires the author's unit confirmation. A 100k-row
benchmark covers narrow/wide input while transporting only the selected fields.

R5 funnel (ADR-154): funnel_steps@1 computes losses and previous/initial retention over unique
prepared stages in explicit integer order. Nonnegative/nonempty/finite values must not increase;
the author prepares a consistent population/unit upstream. No value sorting or inferred event
conversion. Exact fractions/amounts and half-even 12-place percentages preserve meaningful zero
denominator states. Stage and summary ports are reusable independently of the visualization.
The typed chart binds both from one execution and returns all <=50 stages, unaffected by paging.
Width encodes value; a flat final stage avoids an implied final drop. Exact tables, stable selection,
keyboard scrolling, full save validation, complete frozen results and restore use existing lifecycle.
Guided funnel authoring is delivered in ADR-155; this is not a cohort engine.

R5 guided profiles (ADR-155): the analytical report route creates Pareto/funnel/treemap/sunburst
from imported or shared prepared inputs. It generates ordinary preparation nodes and typed
visualizations with full-data preview, atomic apply, revision guards and exact retry receipts.
Hierarchy creation uses one explicitly selected additive measure and every grouping total;
Pareto/funnel never infer aggregation of duplicate prepared keys. Compatible Pareto/funnel suffixes
are editable without changing manual preparation, presentation or layout. Local draft recovery
keeps original revisions and requires a fresh preview.
Reusable graph-backed templates and the remaining guided chart types remain open.

Hierarchy editing (ADR-156) recognizes compatible single-additive-measure rollups without changing
their underlying node type. Grouping/measure-identity changes require explicit rebinding; appearance
and manual preparation remain intact. Dangling format/navigation fields fail explicitly. Shared,
multi-measure, context-bound and unknown rollups remain graph steps rather than being simplified.
Preview, atomic apply, CAS/receipts, tab-local recovery and release restoration use the same lifecycle.

R5 analytical templates (ADR-157): immutable project-local snapshots of a recognized analytical
calculation/filter configuration with neutral roles, source field labels/types/known unit/currency
and declared input grain. No source data/manual preparation/appearance is copied. Explicit one-to-one
mapping validates source revision and schema; the existing wizard performs preview/atomic apply.
Captured metadata survives source-report deletion, restart and release restoration. Pending capture
requests support exact retry and same-tab recovery without source metadata. Eight current analytical
types are covered, with waterfall added in ADR-181.
R5 report templates (ADR-182) extend reuse to standard grouped/formula reports, calendar comparisons
and combo/radar bindings/scales. Explicit input roles and deterministic new calculation IDs preserve
formula dependencies without copying data/manual graph preparation. Saved report projection, common
schema inference, revision/receipt guards, normal wizard preview/application, draft recovery and
complete release restoration remain authoritative. Both families share a 200-template project limit.
Catalog management/cross-project sharing and other template families remain open.

## R6 — Acceptance

Report contrast/data-alternative increment (2026-10-12): combined 6 cases pass (24.0s,
.backups/r6-report-contrast-20261012). Light/dark computed DOM table contrast, switch focus
and target dimensions retain exact 50.123456/150.123456 through native Tab/Enter chart/table
switching without graph changes. Existing actual-canvas numeric-label geometry still checks
resize/locale/theme separation and full raw values, now with sequential keyboard table access.
Includes overview/color-oracle regressions; lint/types/API/default build pass. Runtime unchanged.
Does not certify canvas mark/tooltip contrast or all statistical/hierarchical chart families;
those remain A4 inventory work, with A1/A3 residuals/A5/A6/H1/H2 explicitly open.

Rendered overview contrast baseline (2026-10-12): 3 passed / 18.0s,
.backups/r6-rendered-contrast-verified-20261012. Browser computed sRGB colors and alpha
ancestor composition cover visible text in initial/error states across both themes; native
relative-color conversion handles Oklab. Independent black/white/half-alpha/Oklab oracles
validate arithmetic. Rename focus and overview button dimensions are checked. Unsupported
gradient/filter/opacity/blend paint fails explicitly. Canvas, placeholders, pseudo-elements,
hover and other screens are not certified. Initial failures were harness color parsing and
an ambiguous route-announcer selector, not UI defects. Runtime unchanged; lint/types/API/build
pass. Threshold sources: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [W3C target minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Release primary keyboard actions (2026-10-12): five cases pass (1.0m,
.backups/r6-keyboard-release-20261012), including unchanged two-book update regression.
Name/label/comment/dashboard selection/check/restore/All-time/freeze/open use Tab and native
keys, as does storage-denied in-app draft recovery. Frozen five rows remain isolated after
working data changes to four and restore into a new project. Date inputs, warning checkbox,
some setup/restore, native confirmation and reload remain harness/pointer actions; this is
not a whole report-cycle keyboard-only claim or filtered-release certification. Runtime
unchanged; lint/types/API/default build pass. Next priority A4 rendered audit; residual A1/A3
exceptions and A5/A6/H1/H2 remain open.

Dashboard sequential authoring/recovery (2026-10-12): two 1600/420px keyboard-only UI paths
create an independent table from a fixture publication, save/view/reload/edit with five rows
and unchanged graph (4.8s, .backups/r6-keyboard-dashboard-authoring-20261012). Six malformed/
stale-draft paths now use Tab/native input, preserve focus/state and explicitly recover from
409 via discard/reload of the newer server report (10.0s,
.backups/r6-keyboard-dashboard-recovery-20261012). API fixture setup and confirmation-dialog
handling remain harness actions. Runtime unchanged; release/focus-return A1 work remains open.

Graph/preparation sequential acceptance (2026-10-12): six cases pass (1.2m,
.backups/r6-keyboard-graph-final-20261012), covering both editor formats, executable Limit
creation/connection/preview/reconnection/reload and node-local condition scratch across both
formula versions. Three preparation layouts pass (54.1s, .backups/r6-keyboard-preparation-20261012):
native keyboard type/missing policies, error correction and undo/redo retain integer
9007199254740993 and Cost [10.5,0,0]. API previews provide independent numeric checks;
fixture setup and reload are explicit harness actions. Four wizard regression cases pass
(50.7s, .backups/r6-keyboard-wizard-regression-20261012). Initial graph failures used a wrong
test label; actual finder labels include node type. Final lint/types/API/build pass, runtime
unchanged. Dashboard/release/focus-return A1 paths and human gates are still open.

Sequential keyboard primary journey (2026-10-12): wizard-focus removes programmatic focus,
click, fill and selectOption shortcuts. Browser Tab/Shift+Tab, native radio/select keys and
typed input cover overview/import/key-and-conversion repair/create/edit/history update/reopen.
Four layouts/themes pass (50.4s), .backups/r6-keyboard-full-journeys-20261012, retaining exact
0.30 -> 0.15 -> 0.35 and identifier 001. Project creation is API fixture setup; file payloads
are attached after reaching input (OS picker not tested). Reload and final geometry probes are
explicit harness actions. Lint/types/API/default build pass; runtime unchanged. Preparation,
both graph editors and remaining A1 paths plus H1/H2 still need their scoped evidence.

Advanced dashboard form reconciliation (2026-10-12): legacy parameter/choices/link and
widget-navigation forms at 420px/enlarged text pass the complete slice/history journey
(14.6s, .backups/r6-dashboard-navigation-reflow-20261012). Shared visualization consent,
conflict retention/reload and independent dashboard drafts pass three layouts (17.0s,
.backups/r6-shared-settings-reflow-20261012). Modern publication navigation passes narrow/
enlarged dialog bounds, preserves period and KPI 10.00 without graph changes (17.1s,
.backups/r6-publication-navigation-20261012). Test-only; final lint/types/API/build pass.
Scoped primary-form geometry evidence now spans all named families; this does not prove
native browser zoom, every optional setting permutation or A1/A4/A5/A6/H1/H2. Next work is
sequential keyboard journeys rather than indefinitely multiplying geometry-only tests.

Dashboard workbench/recovery (ADR-204, 2026-10-12): reproduced fixed side panels consuming
the enlarged-text preview and hiding section links. A text-relative container rule stacks the
same editors. Final 11 cases / 36.2s (.backups/r6-dashboard-reconciled-20261012) verify panel
geometry, field controls, wide locale/theme layouts, malformed/stale drafts and date recovery.
Frontend 563 passed (40.38s); final lint/types/API/default build pass. Font is set before
viewport resizing in the test; live font mutation after resize did not reevaluate the query
in this run, so native zoom is not certified. Earlier absent-main inference is withdrawn:
DashboardEditor source has a main landmark. A1/H2 require direct accessibility evidence.

Publication/group and period acceptance (2026-10-12): two full Join/calculation/publication/
shared-dashboard cases pass (52.1s), .backups/r6-publication-form-20261012. All helper controls
are bounded at narrow/enlarged layouts; publication Tab sequence and preserved name verified.
Four period-recovery cases pass (9.5s), .backups/r6-dashboard-period-final-20261012, including
420px dark/enlarged/denied storage. Restored date input is separate from applied URL filters,
and dashboard revisions stay unchanged. Test helper now accepts explicit root because the
dashboard has no main wrapper; initial test failures reflected that selector assumption.
Runtime unchanged; lint/types/API/default build pass. Dashboard authoring/recovery reflow and
landmark/focus/human audits remain open; no blanket A3 or accessibility completion claim.

Overview/helper reflow (2026-10-12): desktop, narrow and doubled-root-text analytics share/rank,
grouped-Unpivot and overview scenarios pass: 9 cases / 1.7m, .backups/r6-overview-helpers-final-20261012.
Initial overview 2 pass/1 fail reproduced heading/pagination overflow at 390px/32px RU;
bounded heading width and wrapping pagination fix it without changing state or calculations.
Checks include unavailable overview state/retry, RU/TT dark layouts, share denominators 60/100,
stable ranking, repeated Unpivot labels and reload. Full frontend 563 passed (39.07s),
lint/types/API/default build pass. Remaining helpers/dashboard states and A1/A4/A5/A6/H1/H2
are not inferred complete from this scoped run.

Preparation dialog acceptance (ADR-203, 2026-10-12): initial matrix had seven passes and one
420px preparation-table overflow failure. Stacked translated cells retain one form state and
desktop table layout. Final eight cases passed (1.5m), .backups/r6-preparation-dialogs-final-20261012,
covering preparation/calculated fields in three layouts and existing single/composite Join
journeys. Exact 9007199254740993, null/conversion rules, undo/redo/reload and sequential
Tab-to-Cancel remain verified. Full frontend 563 passed (31.68s), lint/types/API/default build
passed. Narrow screenshot inspected; other helpers and human screen-reader acceptance remain.

Waterfall/analytical-template/Excel reflow increment (2026-10-12): 12 passed (1.4m),
.backups/r6-remaining-form-reflow-20261012. Desktop/420px/1280px-with-32px-root-text variants
cover erroneous waterfall order, restored/editable settings and balances 10.10/10.30/8.00/8.00;
histogram/treemap template capture/retry and explicit renamed-field mapping (count 4/total
100.00); Excel multi-row headers/ranges, skipped rows, reload, simulated conflict, oversized
replacement rejection and relocated-column mapping. Enlarged Excel screenshot inspected.
No runtime changes; lint/types/API/default build passed. These close the named form batches,
not the remaining preparation-dialog/overview/dashboard A3 state audit or human acceptance.

Alignment and six-family reflow increment (2026-10-12): final 22 cases passed (1.4m),
.backups/r6-analytics-form-final-20261012. Three layouts cover alignment wizard, heatmap,
analytical table, Pareto, funnel, treemap and sunburst; desktop graph alignment retained.
Narrow/enlarged variants retain their layout through save retry and dashboard reload.
Validated whole-input unmatched counts, upstream graph preservation, missing-vs-zero cells,
30.00/10.000000/1.000000 table totals, hierarchy drilling and exact retry without duplicate
artifacts. Initial 22 passes predate the retained-viewport strengthening. No runtime changes;
lint/types/API/default build passed. Inspected enlarged alignment/heatmap screenshots.
Remaining named form families and preparation dialogs remain A3 work, not inferred covered.

Template reflow acceptance (2026-10-12): catalog management and combo/radar reuse each run
at desktop, 420px and 1280px/32px root text. Final nine cases passed (46.4s),
.backups/r6-template-reflow-final-20261012. Mapping renamed fields preserves exact
6.00/10.00/0.6000 results and the original graph. Catalog lost-response replay, competing
revision rejection and archive/restore remain covered. Initial eight passes/one failure
exposed 390px/32px RU pagination right overflow and global preference-bar left clipping.
Wrapping preference controls, rename actions and pagination fixes the layout without state
changes; regression explicitly rejects left and right overflowing elements. Full frontend
563 passed (30.49s); final dark narrow screenshot inspected. No backend changes.

Statistical wizard reflow (ADR-202 follow-up, 2026-10-12): histogram/box-plot forms now have
desktop/420px/1280px-with-32px-root-text coverage. Initial seven controls-only tests passed;
visual inspection found a cramped preview. Two stronger geometry tests failed before adding
the text-relative settings/preview container layout. Final 10 passed (52.8s),
.backups/r6-statistics-preview-final-20261012, including ordinary report formulas, prepared
result reuse, histogram range/missing counts, 150-outlier pagination and lost-save-response
replay without duplicate graphs. Full frontend 563 passed (30.43s), lint/types/API/default
build passed. Final enlarged preview inspected. Other statistical forms remain separate A3 work.

Release form/frozen isolation acceptance (2026-10-12): report-cycle.spec.ts expands the complete
legacy Excel update/check/recovery/period/freeze/restore journey across desktop, 420px and
1280px/32px root text. Filled controls fit without page overflow at checked states. After an
All-time release, an explicit current-revision graph edit reduces working rows from five to
four; all five frozen rows remain identical after reload and in the restored project's table.
Final 4 passed (49.7s), .backups/r6-release-reflow-final-20261012, including two-book mapping
repair; existing RU/TT/theme/390px checks retained. Initial three failures were a test mutation
sending read attributes without the correct save format, not release corruption. Corrected
WorkflowSave payload and final assertions pass. No runtime changes; lint/types/API/default
build passed. Applied-date draft behavior is checked, but this run freezes All time, so it does
not newly certify filtered-release calculations or complete A3/accessibility acceptance.

CSV import/history expanded-form acceptance (2026-10-12): evolution.spec.ts now exercises
desktop, 420px and 1280px/32px root text through upload, expanded field metadata, draft
restoration, report creation/reload, graph access, reordered-file update and rollback.
Currency RUB and string-code row key survive explicit draft save/resume. Visible form controls
fit the viewport after scrolling and the page does not overflow at checked import/review/update
states. Exact report totals follow 0.30 -> 0.70 -> 0.30. Final 3 passed (39.6s),
.backups/r6-import-history-details-20261012; initial collapsed-details matrix 3 passed (33.1s).
Inspected narrow update and enlarged-root-text import screenshots. This does not certify
Excel-only controls, populated release forms, all browser zoom modes or sequential focus.
No runtime/backend changes; lint, types and API consistency pass.

ADR-202 report-wizard reflow: populated row/summary formulas reproduced page overflow at
1280px with doubled root text. A text-relative container query now stacks the existing panels
when three columns do not fit. Final desktop/420px/doubled-text creation and edit matrix:
3 passed (36.5s), .backups/r6-report-form-reflow-final-20261012. Independent 2.0000 average
of ratios, 2.5000 ratio of totals and edited 6.0000 difference persist. Full frontend 563 passed
(36.10s). Initial corrected-API run had two passes and the reproduced layout failure; the first
run was stopped for a test-build API URL mistake. Neither is counted as final acceptance.

Populated classic settings increment (2026-10-12): transforms.spec.ts covers filter, formula,
grouping and decimal parameters at desktop, 420px and 1280px with 32px root text. Control
bounds must fit the viewport and inspector after scrolling; page overflow is rejected.
Real Tab traversal is checked within the filter. Exact default 9007199254740993.11 persists;
preview-only parameter changes leave full saved graph JSON unchanged. Three full journeys
passed in 43.3s (.backups/r6-populated-parameters-20261012), including reload and independent
500 total. Downstream chart/dashboard gestures deliberately return to desktop width.
This advances A3, not full browser-zoom, all-form or sequential-keyboard certification.

Test Excel/CSV equivalent inputs, nulls, locale/date/decimal/large-ID conversion, field reorder,
schema drift, full input statistics versus short previews, conflicts/idempotency and master/graph
parity. Keep existing project, publication, navigation, frozen-release and restart regressions.
Exercise 100,000-row and wide fixtures, recording cold/warm duration and memory. No unsupported
speed or accessibility certification claims. Five economists independently create/change/repair/
update reports: >=4 successes and no unnoticed data errors. Human evidence is a separate gate.

### Remaining acceptance packages — 2026-10-12

Completed A2 functional inventory (not full sequential-navigation/accessibility certification):

Final evidence: `.backups/r6-nondrag-authoring-final-20261012`, 10 production cases passed
(1.6 min); frontend 563 passed / 114 files, lint/types/API/build pass. Both pointer-drag and
selector-only field calculations produce independent total 1121 from the fixed Excel fixture;
the latter also runs at 420px. Button/drop operation creation, workbook detach/return, panel
click/End and eight widget controls preserve computation, saved state and existing conflict rules.
Handler inventory includes React Flow movement/connections, workbook drag sources, operation
drop targets and dashboard drag/resize callbacks. Derived classic group proxies are not draggable.

| Action | Existing or added non-drag path | Remaining verification |
| --- | --- | --- |
| Individual graph placement | ADR-199 direction buttons for visible nodes; field books, blocks and prepared results use the same saved position paths | Larger populated graphs and complete sequential navigation remain separate |
| Graph connections | Classic input selectors and field-editor input selectors | Existing classic transform journeys plus selector-only table/field/scalar path pass; complete sequential traversal remains A1 |
| Add operations/sheets | Catalog/next-step buttons, named workbook sheet opening; detach/return buttons | Button/drop creation and workbook open/detach/return journeys pass |
| Group membership | Classic Shift-click and searchable native checkboxes (ADR-200); composite composer checkboxes | Classic same-calculation grouping/rename/undo/dissolve tested through both selection paths. Broader sequential journeys remain separate |
| Panel width | Classic range controls/reset; narrow layout ignores desktop widths | Pointer click and keyboard End verified with unchanged saved graph |
| Dashboard layout | Existing directional movement and size buttons in WidgetPlacement | All eight controls, bounds, saved geometry and unchanged table rows/workflow verified; collisions/minimum sizes covered at component level. Full sequential focus remains A1 |
| Canvas navigation | Fit/zoom, named-node search and ADR-201 directional viewport buttons; repeated choice captions disambiguated without visible technical IDs | Both-editor distant-node/pan/search matrix passes with unchanged full saved graph; full human/keyboard journeys still separate |

ADR-198 closes the reproduced graph shell reflow defects, not all of A3. The same mounted
panels stack below 64rem; toolbar wraps, library/settings have named keyboard scroll regions,
and paired previews stack. Desktop field row minima prevent enlarged-text canvas overlap.
Final isolated production run: 15 passed (1.2 min), `.backups/r6-graph-reflow-final-20261012`.
Coverage: v1/v3 at 320/420/1600 px and 1280 px with doubled root text, keyboard insertion,
resize/edit/save/reload identity, drawing containment, existing field wiring/pins/undo/conflicts.
The final enlarged-text screenshot was inspected after the containment correction. This does
not verify all populated node configuration forms or substitute for browser zoom/human trials.

Fresh consolidated browser evidence: 170 passed / 2 private-data opt-ins skipped, zero failed
(13.1 min), `.backups/r6-public-reconciled-20261012`. This includes ADR-197 parser hardening,
both 100k-row fixtures and the five-journey variants. A subsequent translation-only change
passed four EN/RU/TT heatmap component regressions and a rebuilt executive/heatmap browser
pair (15.0s, `.backups/r6-heatmap-copy-20261012`). Final frontend: 558 tests / 109 files;
lint, types, API consistency and production build pass. Separate PostgreSQL/restart results
remain historical evidence, not part of this run.

R2–R5 functional delivery is complete; R1 and R6 are not. The five-journey automated
matrix below is implemented, not a pending requirement to invent more journeys.
Earlier checkpoints are historical: PostgreSQL, process restart and HTTP/browser load
evidence later in this document supersede their earlier missing-evidence notes.
Recovery delivered through ADR-197 supersedes generic unavailable-storage placeholders;
bounded document memory still cannot survive a full reload when browser storage is denied.

| ID | Bounded remaining work | Exit evidence |
| --- | --- | --- |
| A1 | Sequential keyboard/focus audit of overview, import, preparation dialogs, report workbench, both graph editors, dashboard and update/release history | Complete create/change/repair/update paths using Tab/Shift+Tab and keyboard activation; dialog return, errors and recovery remain reachable. Programmatic focus alone is not proof of sequential navigation. |
| A2 | Inventory drag actions: node placement, connection creation, field insertion, group selection, panel resizing and dashboard layout | Record a button/single-pointer alternative for each applicable action, plus keyboard coverage. Existing dashboard placement buttons and graph connection selectors count as implementation, not proof for every drag action. |
| A3 | Reflow/text enlargement of these screens plus template catalog and their dialogs | No lost form controls at narrow width and enlarged text; separately inspect graph canvas and surrounding controls. First reproduction target: fixed multi-column layouts in FieldWorkflowEditor and WorkflowEditor. Existing 420 px/root-font tests are partial evidence, not a whole-app zoom audit. |
| A4 | Rendered contrast, focus, target sizes and non-colour meaning across both themes and the 21 visualization families | Inspect actual rendered states, tooltips and table alternatives. Existing opaque-token checks do not cover transparent layers or all chart marks. Record defects and explicit exceptions rather than treating every canvas as exempt. |
| A5 | Copy/state audit of the same named screen families in Russian, English and Tatar | Loading/empty/incomplete/error/stale states remain distinct; recovery limits are truthful; user-facing operation labels are localized. Heatmap capitalized aggregation keys are now translated, with four EN/RU/TT component regressions; the wider inventory remains open. |
| A6 | Final candidate regression | Record one uninterrupted public browser run, applicable unit/lint/type/build checks, and the revision scope of separate PostgreSQL/restart/performance evidence. Do not merge partial runs or relabel earlier evidence as fresh. |
| H1 | Five-economist trial | At least four independent successful create/change/repair/update journeys and no unnoticed data errors; actual participant observations required. |
| H2 | Screen-reader acceptance | Record environment and observed labels, navigation, errors and chart/table alternatives on the five journeys. Automated assertions do not replace this trial. |

These packages refine the approved acceptance scope, not new product features. R1/R6 stay
open until applicable evidence exists; fixing one item does not certify WCAG conformance.

### A4 finite visualization inventory — 2026-10-12 (historical checkpoint)

The authoritative `ChartType` in `backend/app/domain/visualizations.py` contains 21 types.
The following inventory covers all of them; an existing test file is a locator, not evidence
that all A4 checks pass. Do not add another family as an acceptance prerequisite.

| Families | Evidence / test locator | Remaining A4 checks |
| --- | --- | --- |
| bar, line, area, pie, donut, scatter, KPI, table (8) | `chart-readability.spec.ts`, `rendered-contrast.spec.ts`: bar exact table, computed text contrast, keyboard switch and numeric-label geometry. `basic-series.spec.ts`: eight bar/line series, settled both-theme views, legend hide/restore, exact tables and reload; 2026-10-13 light palette base-fill contrast fixed. Six-family opaque label/source-tooltip regressions described above. | Remaining pie/donut/scatter mark distinctions and shared tooltip contrast; muted/crowded-state limits must not be inferred from normal opaque-fill checks. |
| box plot, radar (2) | `box-plot-visualization.spec.ts`, `radar.spec.ts`: 4-case statistical/hierarchy run includes summary/outlier pagination and profile/scales keyboard alternatives. | Rendered chart/tooltip/text contrast, target geometry and empty/error presentation. |
| heatmap, histogram (2) | `heatmap-visualization.spec.ts`, `histogram.spec.ts`: 2 cases passed (10.4s), `.backups/r6-cell-interval-keyboard-20261012`. Missing cells, missing measures and measured zero are distinguishable; interval boundaries and population accounting retained; real keyboard switching. | Colour-scale/mark/tooltip contrast and empty/error presentation; table semantics alone do not close these. |
| treemap, sunburst (2) | `hierarchy.spec.ts`: sequential group exploration/return, zero leaf and exact share in light/dark narrow views. | Mark boundaries, text/tooltip contrast, focus/target geometry and empty/error presentation. |
| waterfall, combo, bubble, Pareto, bullet, funnel (6) | Corresponding `*-visualization.spec.ts` / `combo.spec.ts`, `bubble.spec.ts`, `pareto.spec.ts`, `bullet.spec.ts`, `funnel.spec.ts` locate existing functional coverage. Not rerun by this inventory. | Check rendered states and keyboard alternatives against A4; do not infer accessibility from successful authoring. |
| analytical table (1) | `analytical-table.spec.ts`: existing totals, conditional labels and pinned-column/reflow assertions. Not rerun by this inventory. | Computed conditional-format contrast, focus/targets and empty/error states. |

For each row, inspect light/dark normal rendering and table alternatives, focus/targets,
non-colour distinctions and hover/tooltip if present. Empty/incomplete/loading/error/stale
copy belongs to the shared A5 state audit, with family-specific exceptions recorded here.
The remaining-work column is open, not a waiver. Next batch: the six comparison/contribution
families and analytical-table controls have now passed 13 focused cases (1.1m),
`.backups/r6-comparison-keyboard-20261012`, using sequential Tab/Enter for viewer controls.
Existing exact totals, large decimal, missing/zero cases, pagination and geometry checks remain.
Setup and programmatic scrolling probes are not keyboard evidence. The retained-data defect
identified at this checkpoint has since been corrected and regression-tested; it is not a
new task. Later scoped evidence above supersedes the historical remaining-work column.

### Current finite acceptance reconciliation — 2026-10-13

Checked against current renderer/view code, tests and the recorded production-browser results.
Previously completed category cues, source-value preservation, zero-sum pie correction,
opaque labels and 12-family tooltip contrast must not be reopened without a regression.
Passing test filenames alone do not close the following remaining obligations.

| ID | Exact remaining obligation | Evidence or concrete gap / exit |
| --- | --- | --- |
| A4-L1 | Keyboard operation of interactive canvas legends | Implemented: shared native disclosure/buttons mirror generated renderer legend identities/formatters and public selection events. Real Tab/Space bar/line and pie/donut hide/restore, pointer synchronization and Escape focus return preserve table values/graphs. Full 647 frontend tests and 20 scoped browser cases pass; H2 human observations remain separate. Hidden/non-interactive explanatory keys do not expose visibility controls. |
| A4-M1 | Mark/background and boundary contrast | Current evidence covers basic multi-series opaque base fills and heatmap label/fill scales, not all mark families. Audit representative normal/highlighted fixtures for the existing 21-type registry, record actual compositing and intentional deemphasis separately. No new chart family or unlimited density permutation is required. |
| A4-T1 | Six remaining tooltip renderers | Completed direct pointer-hover sampling in both themes for line, area, scatter, pie, donut and Pareto: seven browser cases pass (42.1s), including existing Pareto regressions. This complements earlier twelve-family evidence. Table/KPI/analytical-table have no chart tooltip obligation. Separate short-card Pareto axis crowding remains P2. |
| A1/A3-R | Residual authoring interaction/reflow | Preserve completed sequential create/change/repair/update paths. Remaining explicitly recorded exceptions include release date entry/warning checkbox/focus return and native zoom versus root-font enlargement. Verify these named gaps rather than repeating entire already-tested workflows. |
| A5-S1 | Final seven-family state/locale ledger | Overview, import, preparation dialogs, report workbench, graph editors, dashboard, update/release history must each map loading/empty/incomplete/error/stale states to actual coverage in EN/RU/TT, marking genuinely inapplicable states. Existing overview/import/report/recovery/history tests are evidence locators, not a completed matrix. Chart-render recovery defect discovered during this reconciliation is handled below. |
| A6 | One fresh final-candidate regression | Earlier 253-case public checkpoint predates these fixes. Run the current public suite uninterrupted after implementation gaps, plus current applicable lint/type/unit/build checks. Keep PostgreSQL/restart/load evidence dates and scopes separate. |
| H1/H2 | Economist and screen-reader trials | Still require observed human participation. Automation and the passing executive demo do not establish these gates. |

A5 renderer recovery finding: current Chart had a sticky error string and removed its canvas
container after failure; a new result therefore could not reinitialize it. Two regressions
reproduced the stale error and absent local retry. Recovery now scopes failures to the render
inputs, disposes failed instances, retries locally and restores keyboard focus once after an
explicit successful retry. Exact data tables remain available; no graph/save/request changes.
This correction does not close the entire seven-family state audit.
Verification: full frontend 643/115 passes (35.51s); three browser cases pass (10.4s),
`.backups/r6-chart-render-recovery-fixed-20261013`. A real one-time Canvas fillText exception
is injected without modifying API data; actual Tab/Enter retry in both themes restores canvas
and focus, preserves exact 10/20 table values and unchanged saved graph. Initial browser
selector also matched Next's route announcer; scoping to the widget corrected the harness.
Lint/types/API/default build pass. Backend unchanged/not rerun; isolated projects and own
services cleaned. A4-L1 was subsequently implemented (ADR-206) and A4-T1 sampled directly.
The subsequently confirmed short-card Pareto axis crowding is also corrected above.
Next is A4-M1 representative mark/boundary contrast, followed by remaining finite obligations.

### Historical consolidated audit checkpoint — 2026-10-12 (superseded in part above)

| Gate | Current evidence | Remaining work |
| --- | --- | --- |
| Import and report-first journey | Isolated production CSV import/report/refresh plus light/compact-dark keyboard wizard scenarios pass. Focused backend ingestion/update tests include equivalent Excel/CSV normalization. | Complete the broader five-journey matrix; do not infer complete keyboard or human acceptance. |
| Financial/statistical correctness and restart | `tests/test_process_restart.py` creates the eight-widget executive demo through HTTP, checks independent financial/statistical expectations, freezes a release, replaces the API process, compares persisted metadata/frozen results and restores/recalculates a fresh project. Focused backend matrix: 24 passed. | This uses private SQLite files, not a PostgreSQL daemon restart. |
| PostgreSQL integrity | `pytest -q -k 'postgresql and (concurrent or migration)'` with the configured test database: 31 passed, 1 SQLite-only variant skipped, 1989 deselected. | Not a complete PostgreSQL suite or database-process restart claim. |
| Browser compatibility | Final uninterrupted 146-selection run: **144 passed, 2 private-data opt-ins skipped, zero failed (11.3 min)**. Evidence: `.backups/r6-public-verified-20261012`, passed `.last-run.json`. Earlier failures/partial runs are recorded in STATUS.md, not merged to manufacture this result. | Private retained-project scenarios were not run. Broad browser success does not close performance, accessibility or human gates. |
| Performance | Fresh-process engine baseline below covers 100000 rows × 3/100 columns, including native resident memory and exact result checks. ADR-186 reduces the same clean wide normalization from ~38.5 s to ~0.5 s, retaining scalar fallback semantics. | Mixed/invalid columns retain scalar cost. API/file ingestion/browser latency and broader analytics remain separate gates. Older `benchmark_ingestion` defaults still use a smaller wide fixture. |
| Accessibility and people | Scripted focus/theme/narrow-layout checks are evidence for their specific assertions only. | Sequential tab order, screen readers, contrast and five economists with at least four independent successes remain open. |

Browser tests must point **both** `NODEBI_E2E_API` and `NODEBI_EVOLUTION_API` to the disposable API;
build the isolated frontend with that same `NEXT_PUBLIC_API_URL` and set `NODEBI_E2E_URL` to its URL.
Use `scripts.serve_acceptance` for private temporary SQLite/storage; do not use the author's database.
Legacy calculation journeys explicitly choose v1 when exact v2/v3 also exist; their historical
numeric expectations must not be changed just to use the newer menu entry. Preview headers now
include logical types. Chart placement settings live in the visualization dialog. Canvas gestures
must use canvas-relative coordinates, not positions that may now land on workspace navigation.
These test adaptations do not authorize changing saved projects or reviving superseded authoring UI.

Final targeted follow-ups verified 16 editor/formula/field/preparation/table-authoring/combine/legacy
transformation scenarios across reruns. The last 14-scenario run produced 12 passes; its two remaining
failures then passed separately after field-port encoding and legacy workflow setup corrections.
This is not an uninterrupted full-suite pass. `transforms.spec.ts` explicitly starts with an empty
v1 workflow created by API: supported legacy chart-node editing remains covered without pretending
the new v3 creation UI should expose chart nodes. Current creation remains publication/report-first.
The legacy test retains the 500 revenue expectation, graph equality, chart/KPI, drag/resize,
save/reload and isolated error checks. Frontend unit/component regression: 431 tests/97 files passed.

Reproduce the process-replacement gate from `backend` with
`.venv/Scripts/python -m pytest -q tests/test_process_restart.py` (use `.venv/bin/python` on POSIX).
The test owns its subprocesses and temporary artifacts and never stops an existing application.

### Dashboard acceptance follow-up — ADR-185

The final isolated production run passed seven scenarios together: modern workspace authoring,
legacy independent-copy/lost-response recovery, v2 bound charts, dashboard navigation, view/layout
templates, four-book P&L and three-book sales/gross profit. The audit found and fixed three actual
P2 issues: layout undo overwrote independent metadata, empty navigation destinations hid parameter
inputs, and reverted clean drafts could hide a committed copy after reload. Geometry, titles,
navigation, redo after metadata edits, revisions, URL history and saved source references are checked.
The old chart-node authoring cases explicitly seed compatible v1/v2 graphs; this does not replace
the separate v3 publication/report-first authoring check. Fresh screenshots wait for canvas entrance
animation and were visually reviewed. Evidence is in .backups/r6-dashboard-verified-20261012.
This verifies those seven scenarios, not the entire 146-scenario audit, performance
or human/accessibility acceptance. See STATUS.md for the final unit/build gate results.

### Five report-first journeys — automated evidence map

The following production-browser scenarios passed together in the final 2026-10-12 run. They prove
their scripted assertions, not independent completion by an economist or full WCAG conformance.

| Journey | Reproducible browser evidence | What is actually verified |
| --- | --- | --- |
| Import and correct data | `wizard-focus.spec.ts`, `wizard-feedback.spec.ts`, `evolution.spec.ts` | CSV field typing, visible conversion failure, correction, leading-zero text, exact decimal report results, keyboard focus and retained retry state in light/compact-dark layouts. |
| Prepare a table | `preparation-table.spec.ts`, `table-authoring.spec.ts`, `combine.spec.ts` | Explicit conversion/missing-value policy, large integer preservation, single/composite Join, calculated fields and persisted ordinary graph nodes. |
| Create a report | `evolution.spec.ts`, `analytical-reports.spec.ts`, `statistical-reports.spec.ts`, `combo-report.spec.ts`, `radar-report.spec.ts`, `waterfall-report.spec.ts` | Guided preview/apply, required bindings/scales/order, real saved calculations and reload; no manual graph wires required in these wizards. |
| Change a calculation | `report-editing.spec.ts`, `statistical-editing.spec.ts`, `alignment-editing.spec.ts`, `summary-formulas.spec.ts` | Manual/shared preparation preserved, exact financial formulas, conflict detection, compatible suffix editing and recoverable drafts/requests. |
| Update and retain history | `report-cycle.spec.ts`, `executive-demo.spec.ts` | Source replacement, explicit renamed-field mapping, full-data checks, frozen release/restoration, recalculated financial/statistical values and unchanged dashboard layout. API process replacement is tested separately in `test_process_restart.py`. |

The audit also exposed eight missing RU/TT operation descriptions in the live catalog. Their
translations are now present, with a unit regression and the existing full-catalog browser check.
Five historical test failures concerned superseded control locations, ambiguous Filter matching
or the old green theme color; fixes preserve numeric, conflict, recovery and URL-type assertions.
No calculation, storage, API or saved-project contract changed for these corrections.

### Fresh-process engine baseline — 2026-10-12

Reproduce from backend: `.venv/Scripts/python -m scripts.benchmark_process`.
Windows 11 build 26200, Python 3.13.14, Polars 1.44.2, 12 logical CPUs. Four sequential child
processes; no concurrent heavy test/build run. Each case checks full results after both computations.

| Workload | Rows × columns | Cold / repeat seconds | Peak resident MiB | Peak commit MiB |
| --- | --- | --- | --- | --- |
| Strict text-to-decimal normalization | 100000 × 3 | 1.096 / 1.118 | 113.04 | 125.62 |
| Strict text-to-decimal normalization | 100000 × 100 | 38.603 / 38.366 | 583.12 | 600.84 |
| Conditional exact formula | 100000 × 3 | 1.751 / 1.748 | 103.34 | 111.29 |
| Conditional exact formula | 100000 × 100 | 1.740 / 1.771 | 187.98 | 188.90 |

Normalization converts every field from repeated `1234.56` strings to decimal and verifies every
value/type; the 100-column case is ten million conversions. Formula inputs include a decimal above
the binary64 exact-integer limit and zero/nonzero branches; all computed values are checked against
independent literal expectations. Extra columns remain present but are not formula operands.
These synthetic fixtures do not represent every real-world distribution or cardinality.

Timings exclude source construction and correctness assertions; repeat is uncached computation.
Memory includes imports, source construction, both computations and assertions over the child
lifetime. Python tracing is disabled, so it does not inflate the native-memory baseline. Peaks are
not incremental operation allocations and include the runtime. Windows values come from
[GetProcessMemoryInfo counters](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters);
resident and committed memory are different metrics. The Linux branch uses
[resource.getrusage](https://docs.python.org/3/library/resource.html), but was not executed here.

The pre-optimization bottleneck was wide normalization, whose scalar conversion path repeats
decimal parsing/context/precision checks per value. Optimize only with parity for locale separators,
nullable fields, exact precision/scale, error/null policy and row-numbered diagnostics. No ingestion
limit has been relaxed. This baseline excludes file parsing, Parquet/storage, HTTP, browser latency,
cache effectiveness and other statistical operators; it does not close the whole R6 performance gate.

### Normalization optimization — ADR-186

The same fresh-process command/environment after full-column representability checks and native
conversion of clean decimal strings produced:

| Workload | Rows × columns | Cold / repeat seconds | Peak resident MiB | Peak commit MiB |
| --- | --- | --- | --- | --- |
| Strict text-to-decimal normalization | 100000 × 3 | 0.017 / 0.016 | 86.43 | 77.46 |
| Strict text-to-decimal normalization | 100000 × 100 | 0.501 / 0.506 | 541.64 | 561.10 |
| Conditional exact formula (unchanged) | 100000 × 3 | 1.604 / 1.592 | 109.04 | 110.09 |
| Conditional exact formula (unchanged) | 100000 × 100 | 1.617 / 1.634 | 186.62 | 191.56 |

Approximately 76× faster wide normalization applies to this identical clean-string fixture, not
all imports. It uses no repeated-value cache. Seeded distinct-value parity tests cover both separators
and precision/scale boundaries up to 38 digits. Strings outside the proven-safe grammar or any
invalid value return the whole column to the scalar path. Error policy, row numbering, diagnostics
cap, keys, missing values, schema/lineage and exact transport retain their original behavior.
Native casting alone is insufficient: excess nonzero fractional digits must be rejected, not
truncated. A dedicated regression places 105 such errors beyond a two-row preview.
The original baseline remains above for comparison. End-to-end import and mixed-column performance
are still separate measurements; this change does not alter file/cell/resource limits.
Validation: 21 new parity/dispatch regressions; full backend 1500 passed/31 PostgreSQL-only skips;
seven isolated production-browser import/correction/report/update/release journeys passed together.
Ruff/format, strict app mypy and the restored default-API production build passed. Frontend source
and API contracts did not change. This verifies the optimization, not overall R6 completion.
# R6 HTTP performance evidence — 2026-10-12

Follow-up: `benchmark_http` now also starts a third owned API process and reads public graph-preview
metadata, independently of the visualization timing requests. On both 100000 x 3 and x 20:

| State | Cache hits / planned nodes | Exact totals |
| --- | --- | --- |
| Fresh process | 0 / 2 | Original |
| Repeated preview | 2 / 2 | Original |
| Updated file checked but not applied | 2 / 2 | Original |
| Applied first-row +0.01 | 0 / 2 | Only Group 0 increases by 0.01 |
| Repeated updated preview | 2 / 2 | Updated |
| Applied rollback | 2 / 2 | Original |

The API metadata key `executed_nodes` counts planned/visited nodes including cache hits, not only
freshly computed nodes. Rollback may safely reuse the earlier snapshot's cache; zero hits are not
required for rollback. Actual visualization results are also checked after refresh and rollback.
Storage bytes below are measured before update staging, so retain their original scope.
Refresh checks use normal async jobs with bounded polling; no cache-clear/debug endpoint added.
Latest targeted regression: 20 benchmark, process-restart and dataset-update tests passed;
Ruff/format and script mypy passed. Full suite/browser were not rerun for this script-only change.

Reproduce from backend: `.venv/Scripts/python -m scripts.benchmark_http`.
Each width uses a new private temporary SQLite database/storage and owned loopback API process.
The script sends actual CSV bytes, inspects fields, explicitly selects decimal(38,2), normalizes
to Parquet, previews/applies a grouped report, then replaces the server process and reads twice.
Ten category totals are checked against an independent Decimal oracle before/after restart.
Values vary by row and include negative amounts; source codes contain leading zeros.
The 20-column case reaches the existing 2-million-cell limit without changing it.

| 100000 rows | 3 columns | 20 columns |
| --- | ---: | ---: |
| CSV bytes | 2940378 | 15526573 |
| Stored artifact bytes (source plus normalized) | 3191524 | 19213405 |
| Upload seconds | 0.2287 | 0.7132 |
| Inspect seconds | 0.2382 | 1.9613 |
| Normalize/Parquet seconds | 0.2568 | 0.7829 |
| Report preview seconds | 0.1191 | 0.1612 |
| Report apply seconds | 0.0850 | 0.1277 |
| Result after process replacement seconds | 0.1747 | 0.2157 |
| Repeated result seconds | 0.0097 | 0.0094 |

Single sequential local run; timings include HTTP and serialization, exclude fixture creation,
API startup and correctness assertions. Restart clears application caches, not filesystem/OS caches.
These are not PostgreSQL, browser, memory-peak or statistically repeated performance results.
Repeated request speed alone is not a cache-hit assertion; the follow-up counters above provide
separate explicit evidence. No arbitrary service is stopped;
only the benchmark's process handles are terminated and its temporary directory is cleaned.
Shared process lifecycle is also used by the existing executive restart acceptance test.
Targeted regression: 7 tests passed (6 benchmark cases and executive restart), Ruff/format and
script mypy passed. No production API/domain/frontend behavior changed.
# R6 browser load evidence — 2026-10-12

`frontend/e2e/large-report.spec.ts` runs real UI import, field inspection, all-row validation,
snapshot application, report authoring, dashboard opening and reload on 100000 x 3/20 CSV.
Production frontend points at an isolated disposable SQLite API; no mocks or application limits
changed. It verifies a string code with leading zeros, inferred decimal, <=200 returned preview
rows, <500KB preview response, <=200 table rows in the DOM, and all ten exact totals of 100.00.
Reports aggregate the whole population, not the preview. Browser exceptions fail the test.

Final run `.backups/r6-large-final-20261012`: 2 passed, 11.5 s. Millisecond timings:

| UI stage | 3 columns | 20 columns |
| --- | ---: | ---: |
| Navigate/select/upload | 672 | 1199 |
| Inspect fields/name dataset | 384 | 2483 |
| Check full dataset | 253 | 725 |
| Apply import | 389 | 1158 |
| Author/preview/save report | 809 | 1040 |
| Open dashboard | 349 | 238 |
| Reload dashboard | 162 | 195 |

No long-task entries were observed in the final local Chromium run. The regression budget rejects
main-thread tasks >=1000ms; this is not a field INP, WCAG, cross-device or statistical percentile
claim. Measurements include automation actions and assertion waits, not human think time.
Per-stage metrics are emitted to stdout and attached as JSON; observers are drained after each
stage rather than counting previous stages repeatedly. Single local run, not a general SLA.

Investigation found that `setInputFiles({buffer})` caused ~873–914ms tasks for the wide fixture
while native file-path selection eliminated them. The permanent test creates a disk fixture and
selects it as a user would, then removes that generated file. This corrects test methodology;
no product runtime behavior was changed to hide a measurement. Projects are also cleaned.
Frontend lint/typecheck and production build passed. Broader keyboard, screen-reader, contrast,
PostgreSQL and economist acceptance remain separate unfinished gates.
# R6 import field accessibility — 2026-10-12

Repeated import editors previously exposed generic labels without a named field group; a new
component regression reproduced this gap. Each editor now uses a native fieldset and visually
hidden legend (`Field: {name}`), preserving its stable field-ID React key, inner responsive grid,
existing individual labels and inherited busy-state disabling. Empty edited names use an ordinal
instead of a technical ID. The existing translation key provides English, Russian and Tatar.

Tests verify distinct groups, preserved DOM identity after rename, unchanged neighbouring fields
and all three fallback translations. `wizard-focus.spec.ts` now traverses real sequential Tab /
Shift+Tab from dataset name through grain, field name/type/nullability, native details disclosure,
unit/currency/error policy and into the next field. It does not substitute `.focus()` for this
sequence. Remaining parts of that broader journey still use explicit focus where documented.

18 component tests, lint/types and production build passed. Two final production-browser keyboard
journeys passed in desktop-light and compact-dark; screenshot review confirmed visible focus and
intact layout. Both 100k-row browser cases also passed with the new markup. Initial keyboard test
selectors used exact implicit label text including select options; they were corrected to assert
the accessible combobox name and actual focus, not by removing assertions or increasing timeouts.
This is semantic grouping and limited keyboard evidence, not a real NVDA/JAWS/VoiceOver trial,
full sequential coverage, complete contrast audit or WCAG certification.
# R6 opaque palette contrast — 2026-10-12

`frontend/tests/theme-contrast.test.ts` reads actual CSS variables and computes unrounded sRGB
relative-luminance contrast. Known black/white, equal-color and near-threshold gray pairs verify
the helper. Each theme checks 30 semantic text/base-surface pairs, primary/hover button text,
error text/surface, and 10 reusable border/focus/base-surface pairs: 86 pair assertions total.
Text threshold is 4.5:1; reusable border and external focus threshold is 3:1.
References: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Dark `outline` against `raised` was 2.8448976; the regression reproduced this before modification.
Changing only dark outline from #62728e to #6b7c98 yields 3.2698089. This is a reusable-token
design guarantee, deliberately stricter than requiring contrast for every decorative border;
it does not assert that every previous raised border was a WCAG failure. Disabled exceptions,
rendered opacity/compositing, canvas/chart colors and external screen readers are not covered.

23 affected tests, full frontend lint/types and production build passed. Both light/dark
production keyboard journeys passed (r6-contrast-20261012); projects cleaned, owned servers stopped.
PostgreSQL remains a separate open gate: Docker Linux-engine pipe unavailable and service stopped,
no PostgreSQL service or command-line binaries on PATH during this read-only check. No installed
service was started and no user database was changed.
# R6 graph search focus evidence — 2026-10-12

`graph-focus.spec.ts` tests the actual production CSS rather than inferring behavior from an
`outline-none` utility name. Both themes show a solid 2px semantic-accent outline with 3px offset
on keyboard-focused search. The suspected missing indicator was not reproduced; no runtime
change was needed. The regression starts at the theme selector, traverses Tab to search, types
Select Columns, tabs to its operation button and activates Enter. A public GET confirms exactly
the created select_columns node was persisted, beyond checking the visible Saved message.

Two final cases passed in 5.5s; targeted ESLint, full TypeScript and production build passed.
Focused search and resulting graph screenshots are retained under
`.backups/r6-graph-focus-final-20261012`. This proves a bounded keyboard path, not all graph
connections, node configuration, screen-reader navigation or WCAG conformance. Test projects
were cleaned and only owned acceptance processes stopped.
# R6 graph storage-denial reliability — 2026-10-12

Audit of open authoring/recovery requirements reproduced a route-level failure in classic v1 and
field v2 when the browser's sessionStorage getter itself throws SecurityError. Both editors had
read that property while constructing WorkflowAutosave, before its storage error catches.
The lazy storage adapter now defers that access into guarded operations. Recovery failure remains
visible, and server autosave works independently with unchanged revision/namespace semantics.

Both discard actions now call a guarded writer method. Failed removal preserves pending state and
does not reload; successful removal cancels queued debounce and prevents disposal from rewriting
the discarded draft. Existing in-flight HTTP saves are not undone. Feedback is localized EN/RU/TT.
No memory fallback or whole-document recovery guarantee is implied.

Regression: 16 autosave/localization tests, targeted ESLint, TypeScript and production build passed.
15 production cases passed in one run: classic slow save/navigation/conflict/reload/source,
field creation/workbook/wires/slow-save conflicts, formula references, both focus themes and both
storage-denied editors. The denied-storage cases validate safe failed discard and actual server
node persistence with no page errors. Before evidence is in r6-graph-storage-repro-20261012;
final evidence in r6-graph-storage-final-20261012. Initial test fixture was corrected to assert the
API's `version` response and explicitly select `mode=fields`; field-editor feedback is asserted
inside its alert rather than by exact parent text containing action buttons.

Broader denied/quota storage Back/Forward recovery, dashboard/helper authoring and external human
acceptance remain open. This is a fixed startup/reliability defect, not completion of R1/R6.
# R6 graph history recovery — 2026-10-12

ADR-188 connects the lazy graph storage adapter to the existing document draft store. It keeps
the newest small graph settings when writes are denied/quota-limited, preserves the original
revision for conflict checks, and restores them on same-document route remount. Confirmed server
saves retire stale recovery even when removeItem fails; explicit discard remains fail-closed.
A separate localized notice remains visible while a volatile copy exists, including during
network failures. No dataset or alternate calculation engine is stored in the browser.

Memory cap is 1000000 characters per draft. Large workflow disk writes retain old behavior via an
explicit opt-in storage-only path; failed oversized writes mask older memory/disk recovery in this
document but cannot keep the oversized newest copy. Existing report size rejection is unchanged.
Reload/close loses memory copies. No claim of cross-document or durable/server draft recovery.

37 affected autosave/document/report/visualization/localization tests passed. Nine final production
browser cases passed in 21.6s: both denied-storage startup paths, classic/field x quota/getter-denial
history, and existing report/visualization history cases. Tests first create an older disk draft,
then fail storage/network, add a second operation, traverse Back/Forward, check both operations
survive, restore connectivity, verify server persistence, and return without a stale recovered copy.
The final evidence directory is `.backups/r6-graph-history-final-20261012`. Initial failures were
test races with remount autosave and unsettled route history; assertions now await actual network
failure and destination URL rather than adding delays or relaxing correctness checks.
Targeted lint, full TypeScript and production build passed. Dashboard/helper recovery and broader
human/environment acceptance remain open; this does not complete R1/R6.
# R6 dashboard recovery — 2026-10-12

Before implementation, browser tests reproduced quota failures restoring an older disk name and
getter denial restoring the server name instead of the latest unsaved dashboard. ADR-189 uses the
common document draft store, preserving newest settings and the original revision. Volatile-copy
feedback states its limits. Confirmed saves, legacy copy/navigation saves and pristine reverts
retire stale recovery even on failed cleanup; explicit discard preserves work if removal fails.
Successful server deletion now finishes navigation despite local cleanup failure.

Layout undo/redo now changes only widget geometry through restoreDashboardLayout, retaining the
recovered document revision instead of substituting a newer server revision. This avoids silently
rebasing a stale draft onto another tab's save. A dedicated unit regression protects the boundary.
No API/schema or calculation change. Memory cap/reload limits remain those of ADR-188.

27 affected layout/document/workspace/visualization tests passed. Three production scenarios passed
in 18.5s: quota recovery, getter-denial recovery and full dashboard author/preview/copy/arrange journey.
The recovery tests check latest-name preservation, persisted save, no stale draft resurrection,
competing revision rejection (409 with the other tab untouched), failed discard feedback under
denial, and confirmed deletion returning to Create dashboard with API 404. Targeted lint, typecheck
and production build passed. Before/final traces live under r6-dashboard-recovery-before-20261012
and r6-dashboard-recovery-final-20261012. Temporary projects were removed, not user projects.
Helper dialogs, full-document recovery and the broader human/environment gates remain open.
# R6 cross-statistic decimal audit — 2026-10-12

`backend/tests/test_statistical_decimal_parity.py` adds nine deterministic cases (three seeds x
three monetary offsets: zero, +/-9007199254740993). Each has 259 monetary observations, including
large outliers, plus two nulls. Integer-cent and Fraction oracles remain independent of Polars;
quartiles use stdlib statistics.quantiles with inclusive linear interpolation on rational values.
Node execution runs under Decimal precision 6 to expose unintended ambient-context dependence.

Checks cover all seven boxplot statistics, exact outlier membership and counts, seven histogram
interval bounds (including repeating rational boundaries), independent interval membership counts,
missing population and exact heatmap sum/counts. Large signed offsets preserve distinctions that
Float64 would lose. All nine passed. Existing implementations already have exact branches;
inspected float conversions belong to Float64 paths or validation and were not blindly replaced.
This audit does not prove every analytical operation, renderer rounding or input schema boundary.

Consolidated regression after recovery/UI changes: backend 1506 passed, 31 PostgreSQL-only skips,
two upstream deprecation warnings, 155.06s; frontend 449 passed in 99 files, 63.51s. The full backend
collection preceded the new parity file; its nine final cases passed separately (0.61s), not as
part of the 1506. Full backend Ruff/format and mypy (175 source files), full frontend lint/typecheck
and generated API agreement passed. No new runtime code or dependencies in this increment.
PostgreSQL migrations/locks, real screen-reader/economist trials and remaining authoring gaps stay
open. Previously passed browser journeys were not claimed as rerun in this numeric audit.
