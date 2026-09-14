# Interface localization

Requested 2026-09-11; completed and deployed 2026-09-14.

## User behavior

* Russian (`ru`) is the default, independent of browser language.
* A separate light/dark theme selector sits next to the language control; its labels are translated
  in all three languages. Changing either preference preserves the other.
* English (`en`) and Tatar in Cyrillic (`tt`, «Татарча») are available on every page.
* `nodebi-language` is a one-year, path-wide SameSite=Lax preference cookie. It contains only
  the locale identifier. Missing or unsupported values select Russian.
* The server renders the selected language immediately, including `<html lang>` and metadata.
  The client changes language in place, preserving form values, selected nodes, graph drafts,
  dashboard layout and in-flight saves. Language changes do not write project data.
* Cookie storage failure shows localized feedback; the current page can still switch language.
* Number/date presentation follows the selected locale. Dates display in UTC; timezone-free
  Excel timestamps retain their wall-clock value. Numeric chart values remain numeric.
* Project/workflow/dashboard names, workbook/sheet/column names, chart titles and string cells
  remain user content. Existing English names are therefore retained when switching language.
* Formula operators, field identifiers, enum values, HTTP routes and database records are unchanged.
  Native browser controls and browser-owned unload dialogs follow the browser's own language.

## Implementation and maintenance

`frontend/lib/translations.ts` stores English source keys and Russian/Tatar pairs.
`locale.ts` provides locale validation, interpolation, node labels and Intl formatting.
`i18n.tsx` provides the React context and selector; the root layout supplies the cookie locale.
No new runtime dependency, API change or database migration is needed.

Translate only application messages, never arbitrary DOM text or user data. Interpolation inserts
parameters once and React escapes rendered strings. Use complete messages for sentences and
count summaries (for example, “Sheets: {0}”), not fragments with English plural endings.
New catalog entries must provide both translations and preserve their placeholders.
The catalog test checks literal translation calls and placeholder parity; browser tests also
check every backend catalog label, description and port. Dynamic labels require explicit review.

Errors are localized at render time, including existing errors when language changes. Known domain
messages retain actionable details; application codes provide fallbacks. Field paths, node IDs,
error codes, nested issues and diagnostic IDs survive translation. Unexpected English server prose
is replaced by a localized fallback; backend logs and network responses retain technical details.
Autosave retains the Error object so conflict codes and diagnostics reach this presentation layer.

## Terminology

| English | Russian | Tatar |
|---|---|---|
| Workflow | Схема обработки | Эшкәртү схемасы |
| Dashboard | Дашборд | Күзәтү тактасы |
| Node | Узел | Төен |
| Dataset | Набор данных | Мәгълүмат җыелмасы |
| Field | Поле | Кыр |
| Column | Столбец | Багана |
| Filter | Фильтр | Сөзгеч |
| Group By | Группировка | Төркемләү |
| Preview | Предпросмотр | Алдан карау |
| Saved | Сохранено | Сакланды |

## Verification

Run frontend `npm run test`, `npm run lint`, `npm run typecheck`, `npm run api:check`, and
`npm run build`. Against the running Compose stack, run `npm run test:e2e`.
Existing product scenarios explicitly choose English; localization scenarios start with no cookie.
They cover Russian server rendering, Tatar/English navigation and reload, a new browser context,
localized upload errors, preservation of names/data, dashboard drafts, and changing locale both
before the autosave debounce and while a save request is pending.

Screenshots of the Tatar workflow/dashboard are emitted into Playwright's ignored test-results
directory for visual review. Tests create and delete only their own temporary projects.

Final result: 26 frontend tests and 11 browser scenarios pass, including the complete Sales Analysis
journey after frontend/backend/PostgreSQL restart. ESLint, TypeScript, OpenAPI drift and Docker
production build pass. Tatar editor/dashboard screenshots were visually reviewed.
