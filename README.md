# Node BI

В XLSX доступно **оформление ячеек**: полужирный/курсив, размер шрифта, цвет текста и заливки,
выравнивание и перенос. Выделите диапазон и используйте панель «Главная»; **Ctrl+B / Ctrl+I**
работают вне ввода текста. Оформление участвует в отмене/повторе и сохраняется в исходном XLSX
через обычную кнопку сохранения. Значения, формулы и числовые форматы при этом сохраняются.
Для защищённых ячеек включите редактирование расчётов. В CSV панель оформления не показывается.

В трёх бизнес-демо доступны исходные CSV/XLSX для редактирования. Если файлов несколько,
нажмите **Открыть и редактировать** у нужного файла; панели таблицы появятся после открытия.
**Выбрать другой файл** возвращает к списку. Можно исправить ячейки, сохранить и увидеть
изменения на дашборде. В простых таблицах удалённые строки можно восстановить до сохранения
в текущем окне. Парето продаж использует тот же расчёт, что и остальные представления продаж.

Редактирование теперь открывается **в отдельном окне электронной таблицы** на базе Univer OSS:
сетка, вкладки листов, строка значения/формулы и адреса, выделение диапазонов, копирование/вставка,
поиск, отмена/повтор, масштаб и закрепление областей. **Ctrl+S** проверяет и сохраняет изменения,
сервер пересчитывает формулы и обновляет отчёты. Окно остаётся открытым для следующих правок.
Изменения появляются и в исходной вкладке отчёта. Для отмены черновика есть «Отбросить изменения».
Стили и структура исходной книги сохраняются; ширина колонок/масштаб — настройки вида редактора.
Локальная открытая библиотека [Univer](https://github.com/dream-num/univer), Apache-2.0,
не отправляет книгу во внешний сервис. **«Редактировать расчёты»** разрешает менять формулы
и защищённые значения. Строка формул следует за выделением мышью и клавиатурой. F2 или двойной
щелчок открывает родной редактор: ссылки подсвечиваются разными цветами, диапазоны можно выбирать
мышью. Ctrl+C/Ctrl+V внутри книги переносит формулы с относительными ссылками в режиме расчётов;
Ctrl+Shift+V и «Вставить значения» вставляют только значения. Поддерживаются `SUM`, `СУММ`,
`ЕСЛИ` и другие распространённые функции. Объединённые области редактируются через верхнюю
левую ячейку. Ошибочный расчёт остаётся черновиком. [Подробный сценарий](docs/REPORT_CYCLE.md).

Числовые и календарные форматы, цвета и границы берутся из книги. При редактировании доступны
исходные значения без потери точных кодов; пустые ячейки не подменяются нулями или NaN.

Быстрое исправление: **Изменить данные → исправить таблицу → Сохранить изменения**.
Проверка и применение выполняются автоматически; ошибки и подтверждение предупреждений —
в том же окне. Excel-книги с формулами, включая `data_example`, открываются как листы прямо
в браузере: выберите лист, измените исходные ячейки и сохраните. Формулы пересчитаются на сервере.
Старые инструкции с отдельной подготовкой относятся к расширенному режиму.

Доступны CSV и простые XLSX: правки ячеек, вставка из Excel, добавление/удаление строк и
сохраняемый черновик. В сложных XLSX структура сохраняется; формулы и защищённые значения
доступны в режиме редактирования расчётов. Скачивать файл для этого не нужно.
Внешние связанные файлы не обновляются: используются сохранённые в книге значения с явным
предупреждением. Макросы, изменение структуры, массивные формулы и таблицы подстановки
не редактируются. Общие формулы Excel поддерживаются с сохранением ссылок остальных ячеек.
Docker уже содержит проверенную LibreOffice26.2.6 для серверного пересчёта (образ amd64).
При запуске backend через Python установите LibreOffice>=26.2.5; при нестандартном пути задайте
`NODEBI_SPREADSHEET_BINARY`. Без движка таблица откроется, сохранённый черновик останется,
а попытка пересчёта покажет ошибку сервиса. Первая сборка образа загружает дополнительный runtime.
[Сценарий и ограничения](docs/REPORT_CYCLE.md).

Редактор дашборда сохраняет исходную компоновку и дополнительные именованные шаблоны.
Перетаскивание не выталкивает соседей; уплотнение и подбор размеров запускаются отдельно.
Порядок действий описан в [руководстве редактора](docs/DASHBOARD_WORKSPACE.md).
## Безопасное обновление приложения

Из корня репозитория, после получения нужной версии кода без потери локальных изменений:

```powershell
powershell -NoProfile -File scripts/Update-NodeBI.ps1 -CheckOnly
powershell -NoProfile -File scripts/Update-NodeBI.ps1
```

По умолчанию обновляется корпоративный стенд **3030/8030**, основной стенд **3000/8000**
выбирается только явно: `-Stack Main`. Скрипту нужен Docker Compose v2 и уже работающий стенд;
он не выполняет `git pull`, не удаляет тома и не пересоздаёт демонстрационные проекты.
Для новой установки используйте обычный Compose startup из раздела установки ниже.

Сначала собираются образы: при ошибке сборки работающий стенд не останавливается. Затем API/UI
ненадолго приостанавливаются для согласованной копии PostgreSQL и всех исходных/Parquet-файлов.
В `.backups/update-...` сохраняются `database.dump`, каталог `sources` и `manifest.json` с SHA-256
и идентификаторами образов. После этого применяются миграции и проверяется доступность API/UI.
`-WhatIf` показывает действие без изменения стенда; `-SkipBuild` предназначен только для заранее
проверенных локальных образов. Один стенд нельзя обновлять двумя экземплярами скрипта одновременно.
Изменение тома/пути хранения или подключение внешней БД требует отдельной миграции и блокируется.

При ошибке **до** развёртывания возвращаются исходные контейнеры. При ошибке **после** начала
развёртывания API/UI останавливаются, копия остаётся на месте. Автоматического отката схемы или
данных нет: это может уничтожить изменения. Сначала восстановите `database.dump` через
`pg_restore --no-owner --no-privileges` в **отдельную пустую PostgreSQL 17 БД**, скопируйте `sources`
в отдельное хранилище, сверьте SHA-256 из манифеста и проверьте проекты. Только затем согласуйте
переключение рабочего стенда. Старые образы указаны в манифесте; не запускайте их на новой схеме
без проверки совместимости и безопасности: прежний образ может содержать уже исправленные
уязвимости. Полный цикл копирования/восстановления проверен на отдельной БД.
Копии содержат частные данные, включая Excel ОПиОП: не публикуйте `.backups` и храните внешнюю
резервную копию отдельно от диска приложения. Скрипт обновляет API/UI, не версию PostgreSQL.

Проверки перед будущими изменениями описаны в `.github/workflows/quality.yml`: типы, линтеры,
SQLite/PostgreSQL, frontend-тесты, согласованность API, аудит npm-зависимостей и production build.
Workflow подготовлен для запуска после push/PR; сам по себе он не выполняет развёртывание.
[Аудит и оставшиеся ограничения от 26 октября 2026](docs/AUDIT_2026_10_26.md).

Интерфейс использует корпоративный [Alabuga Framework](https://github.com/vldsmelov/alabugaframeworkconstructor):
оригинальные Alabuga Sans/Heading, логотип, цвета, кнопки и оформление форм, таблиц и карточек.
Версия исходников закреплена на `b048bc2546a3e05131f4451a1115f7282b13523b` (`@alabuga/framework` 0.6.0).
CSS и шрифты находятся в `frontend/vendor/alabuga`, логотипы — в `frontend/public/brand`;
приложение не загружает их с GitHub или Google Fonts во время работы.
Происхождение файлов описано в `frontend/vendor/alabuga/NOTICE.txt`.
Адаптация Node BI находится в `app/globals.css` и `app/corporate.css`: сюда вносятся изменения,
оригинальные файлы фреймворка сохраняются неизменёнными. Тёмная тема адаптирована в Node BI.
Оформление применяется к сохранённым проектам, включая ОПиОП; пересоздавать демо-данные не нужно.
После изменения frontend обновите только его контейнер:

```powershell
docker compose -f docker-compose.demo.yml up -d --build --no-deps frontend
```

## Демонстрация для руководителей · 13 октября 2026

Откройте **http://localhost:3030**. Подготовлены четыре постоянных проекта: три синтетических
демо (22 виджета, 17 типов представления) и копия ОПиОП (6 экранов, 55 размещений,
53 самостоятельные визуализации). Данные проектов 01–03 синтетические; проект 04 содержит
копию исходной частной Excel-книги ОПиОП. Не показывайте его внешней аудитории без согласования.
Демонстрация не означает завершение приёмки R6.

| Проект | Бизнес-вопрос | Что показать |
| --- | --- | --- |
| 01 · Совет директоров | Выполняем ли план и что влияет на прибыль? | KPI выручки, прибыли и рентабельности; план-факт; heatmap; итоги по регионам; отдельный бюджетный waterfall |
| 02 · Коммерческий директор | Какие продукты развивать и где теряем клиентов? | Столбцы, donut, bubble-портфель, Парето, treemap, sunburst, воронка одной когорты |
| 03 · Операционный директор | Насколько стабильна доставка и кто не выполняет SLA? | Box-plot, гистограмма, heatmap, radar с общей шкалой 0–100, bullet с целью 95%, динамика среднего срока |
| 04 · ОПиОП | Из чего складывается калькуляция услуг и где неэффективность? | Общая сводка, класс, услуга, вид затрат, затраты класса и затраты услуги; переходы с передачей выбранной строки |

Прямые ссылки на созданные дашборды:

- [Финансы и план-факт](http://localhost:3030/projects/7a53bce9-2b75-4e9f-9608-cb07b9d93c2d/dashboard?dashboard=f5b3f38f-4175-54ed-8238-783d36c18d4a&mode=view).
- [Ассортимент и воронка](http://localhost:3030/projects/678d5b16-3d79-4cd6-bdd8-abb121985ae6/dashboard?dashboard=e6def933-6192-5ee9-940d-f3a63fcf7813&mode=view).
- [Качество доставки](http://localhost:3030/projects/f5b6aeb3-0b56-4278-be65-944171f5eb4d/dashboard?dashboard=320f96cc-5443-58bb-be49-ca4c6aa0ec49&mode=view).
- [ОПиОП — общая сводка затрат](http://localhost:3030/projects/747800d4-8804-4429-b2cd-8e5d760688d6/dashboard?dashboard=565bc8d3-b7ca-434e-81ae-ea253ce65edb&mode=view).

ОПиОП показывайте начиная с общей сводки. Нажатие строки «Детализация по классам»
открывает выбранный класс; строка «Топ услуг» — конкретную услугу. Переходы и фильтры
сохранены внутри копии. Детальные экраны требуют выбора класса, услуги или вида затрат;
не начинайте показ с экрана без заданного отбора. На сводке доступны 4 класса и 36 услуг.
Суммы здесь относятся к калькуляции исходной книги, не к продажам синтетических проектов.

Перенесена опубликованная версия проекта «Финансовая аналитика — полевые ноды»;
исходный проект, его книга и база не изменены. История обновлений/замороженные выпуски
не переносились: это отдельная демонстрационная копия текущих расчётов и дашбордов.
Скрипт `backend/scripts/opiop_showcase.py` предназначен для однократного локального переноса,
не для обычного запуска; требует исходные Docker-контейнеры и не содержит частную книгу.
Повторное создание блокируется. После частичной ошибки можно явно продолжить через
`--resume-project ID`. Для старых KPI, требующих выбранной услуги, восстановление использует
сервис сохранения приложения без предварительного вычисления с пустым контекстом;
исходные формулы и привязки не заменяются. Не является универсальным импортом архивов.

### Сценарий показа на 12–15 минут

1. **Финансы, 4 минуты.** Выручка 1 455 960,32 ₽, прибыль 437 617,41 ₽,
   рентабельность 30,06% — отношение итогов, не средняя рентабельность заказов.
   Сопоставьте план с фактом; покажите, что отсутствующая ячейка heatmap отличается от нуля.
   Waterfall — **отдельный сценарий бюджета следующего полугодия**: 440 + 180 − 45 − 85 + 35 − 25 = 500 тыс. ₽,
   не расшифровка прибыли по исходным заказам.
2. **Продажи, 4 минуты.** 3 195 000 ₽ выручки в 24 сочетаниях региона и продукта.
   Парето показывает концентрацию; bubble связывает выручку, прибыль и число сделок.
   В treemap/sunburst нажмите сегмент для детализации, затем «Вся иерархия».
   Воронка — отдельная когорта: 1200 лидов → 144 оплаты, итоговая конверсия 12%.
   Её нельзя интерпретировать как конверсию 24 строк таблицы продаж.
3. **Операции, 4 минуты.** В 160 доставках есть выброс 19 дней у «Магистрали».
   Покажите медиану и разброс, затем таблицу выбросов. В bullet цель 95%:
   «Экспресс» 97%, «Регион» 93%, «Магистраль» 84%, «Партнёр» 90%.
   Radar — отдельная экспертная оценка в баллах 0–100, выше лучше;
   оценки SLA и экспертные баллы не вычисляются из 160 доставок.
4. **Доверие к данным, 2–3 минуты.** Переключите диаграмму на точную таблицу,
   откройте «Расчёты» и «Данные»: источники Excel/CSV, типы полей, сохранённый граф.
   Покажите светлую/тёмную тему. Обновление финансового CSV описано ниже;
   выполняйте его после показа исходных значений, так как оно сохраняется.

### Запуск и сохранность демонстрации

Из корня репозитория, с работающим Docker Desktop:

```powershell
docker compose -f docker-compose.demo.yml up -d
```

Для пересборки после изменений добавьте `--build`. Отдельный Compose-проект `nodebi-demo`
использует PostgreSQL с обычными миграциями, API на 8030 и интерфейс на 3030.
Порты доступны только локально. База и исходные файлы сохраняются в отдельных Docker volumes
`nodebi-demo_demo_database` и `nodebi-demo_demo_sources`. Пользовательские проекты и другие
контейнеры не заменяются. Остановка без удаления данных:

```powershell
docker compose -f docker-compose.demo.yml stop
```

**Не выполняйте `down -v`: это удалит демо-данные.** Для создания ещё одного комплекта
из `backend/` можно выполнить `.venv\Scripts\python -m scripts.showcase`.
Это не команда запуска: каждый вызов создаёт новые проекты, а не обновляет старые.
Параметр `--scenario finance|sales|logistics` создаёт только выбранный сценарий;
ID печатается сразу, чтобы частично созданный проект не потерялся при ошибке.
Скрипт работает через публичные API; источники и расчёты доступны в приложении.
Первичное наполнение уже выполнено, повторять его перед показом не нужно.

Автотесты по просьбе владельца отложены. Выполнены production-сборка, создание и вычисление
демо-отчётов, просмотр трёх дашбордов в браузере; это не заменяет оставшуюся приёмку.

Open **Reports → Template catalog** to find saved calculations by name/row meaning, filter report
or analytical templates and view required fields. Rename explicitly, archive with confirmation or
restore an archived template; existing reports and captured formulas remain unchanged. Archives
still count toward the 200-template project limit. If a response is lost, **Retry catalog change**
reuses the original request, including after same-tab reload when local storage is available.
Use **Create report**, select data and load a template with explicit field/row-meaning mapping.

Plan-fact reports can be built through **Create report**: select a table, add actual/plan measures,
choose one grouping dimension, then choose **Combination chart** and **Check presentation fields**.
Assign bars/lines and opt into a second axis only when needed. Preview shows the complete grouped
chart and an exact-value table before saving. Compatible reports reopen via **Edit in report wizard**;
aggregation changes retain existing series, while rebinding fields requires explicit opt-in.

For **Radar**, select one profile dimension and at least three measures, check presentation fields,
then choose shared or per-axis normalization and enter bounds explicitly. No scale is guessed from
the data. Preview rejects values outside bounds and more than 20 profiles; use filters or adjust
the scales. Saved reports preserve axes/scales until **Update visualization field bindings** is enabled.

## Reproducible executive demo

With the documented local backend/frontend running and backend development dependencies installed,
run from `backend/` (Windows):

```powershell
.venv\Scripts\python -m scripts.executive_demo --api-url http://localhost:8000
```

Use `.venv/bin/python` on Unix. The API URL must be loopback. Every run creates a **new** synthetic
project named `Демо · Финансы и операции`; it never replaces a user project. Open the returned JSON
`dashboard_path` on your local frontend. The project persists normally. If a request fails, the new
project ID is printed to stderr; inspect or delete that partial demo through the normal application.

The eight widgets show revenue, profit, margin, monthly revenue/plan, region/month heatmap,
delivery box plot, delivery histogram and region/product totals. The CSV has 136 synthetic orders
over six months; plan means expected revenue per order. Money uses explicit decimal fields,
profit is revenue minus cost, and margin is the ratio of totals (not an average of row margins).
Leading-zero order codes remain text. One region/month is absent, one has real zero revenue,
one delivery is missing and one takes 24 days. These are intentional analytical checks.

In **History → Update data**, replace `executive-orders` with
`backend/fixtures/executive/updated.csv`, save the draft, check and apply. Its reordered columns
must map to the same fields; June revenue/cost and delivery observations change. Reload the report:

| Check | Initial | Updated |
| --- | ---: | ---: |
| Revenue, RUB | 1,455,960.32 | 1,485,960.32 |
| Profit, RUB | 437,617.41 | 456,817.41 |
| Margin (display) | 30.06% | 30.74% |
| Plan, RUB | 1,609,160.00 | 1,609,160.00 |

Backend `tests/test_executive_demo.py` independently checks all eight results before/after update.
Production browser `e2e/executive-demo.spec.ts` checks presentation, reload, light/compact-dark,
update and unchanged layout; screenshots are test artifacts. This is a technical showcase, not
completed human/accessibility or full product acceptance. Exact KPI currency/percent formatting
preserves digits beyond JavaScript's safe integer range; raw data tables stay unrounded.

Alignment reports support exact derived formulas (ADR-158). After choosing prepared results and keys,
use **Check formula fields**, then **Add aligned formula** to calculate differences, achievement
ratios or other expressions without wiring nodes. Check again before referencing an earlier formula.
Each formula has explicit precision/decimal places. Missing values stay empty; use `nullif` or
`safe_divide` for zero denominators. Confirm the business meaning of units; no automatic currency
conversion or reaggregation occurs. Preview validates all rows before saving. Formula drafts and
pending saves recover in the same tab when session storage is available. For a saved alignment report,
choose **Edit in report wizard**, then **Edit aligned calculation** (ADR-159). Change keys, measures
or formulas; enable **Update visualization field bindings** when adding/removing fields. Both input
branches and appearance/layout are preserved. Source connections and shared/manual terminal chains
remain in the graph. Multiple widgets require acknowledgement; conflicts require a deliberate reload.

## Report-first evolution (in progress)

When local browser storage fails, report and visualization drafts now retain a temporary copy in
the open page's memory. Client-side Back/Forward can recover the latest settings or the identical
pending save request. This is not durable storage: reload or closing the tab can lose it. Keep draft
and continue still requires a successful storage write. After confirmed server saving, failed local
cleanup is reported separately; it does not mean the save failed. Other legacy editors still have
their own draft behavior and are not covered by this guarantee.

Analytical grouping/measure controls, filters and Join/alignment keys retain keyboard context after
adding/removing rows; grouping/measure Move buttons focus the moved field at its new position.
Analytical previews and alignment field/preview failures focus a localized message without clearing
settings. New attempts replace earlier action errors. These focused fixes do not certify complete
keyboard or screen-reader accessibility; unavailable-storage history navigation remains under audit.

Import and basic report wizard steps now focus their heading after Next/Back or asynchronous
continuation. Tab enters the new step; normal editing does not reset focus. Standard report tables
use 14 px text, right-aligned numeric columns and tabular digits; text codes retain left alignment.
The scripted import/correction/report/edit/refresh journey is in `frontend/e2e/wizard-focus.spec.ts`.
Its scope and remaining human/accessibility checks are recorded in `docs/USABILITY_REVIEW.md`.

Join and Union now preserve decimal digits beyond six places; Join's unmatched/duplicate lists
use the same exact key comparison. Mixed decimal scales widen without rounding. Conflicting known
currencies/units or Decimal128 overflow require explicit upstream correction (ADR-166). For Union
of independent normalized sources, align field names with Rename Columns first. Saved frozen
releases are unchanged; rerun affected live reports and review Join diagnostics before a new release.
Field-wire copying and `coalesce`/`if_else`/`nullif` now retain decimal scale through Append Field,
preview and downstream exact aggregation (ADR-167). Conflicting known currencies/units or overflow
fail explicitly. Legacy field arithmetic, field sum and scalar outputs are not decimal-enabled;
use Exact Calculated Column and exact table aggregation rather than converting money to Float64.

Reuse an analytical calculation with **Edit in report wizard -> Save calculation template**.
Give it a name and describe one expected input row. Only the saved analytical settings and filters
are captured, not unsaved edits, upstream manual preparation, source rows or appearance. In
**Create analytical report**, select data, open **Use analytical template**, map each required field,
confirm grain/units, then **Load template settings**. Review filters, preview and save normally.
Known types/units/currency must match; normalize data explicitly instead of relying on name matching.
Templates are immutable, project-local and included in frozen project restoration (maximum 200).
There is no automatic synchronization of reports with templates. Rename/archive/cross-project
management is not yet provided. A failed capture offers **Retry template save**; after same-tab reload,
open **Save calculation template** to recover its exact pending request, even if source metadata fails.
Keep the page open if local recovery is unavailable. Reload the saved report before further edits
after capturing a template because its project revision has changed.

Project **Data -> Connect data** opens a five-step Excel/CSV import wizard. Map fields, check all
rows and save a normalized dataset; **Create report** on its card opens the report wizard.
The wizard creates regular editable graph nodes, a visualization and a dashboard. Decimal sums
stay exact; existing Float64 workflows retain their behavior. UI languages and saved theme
preferences are preserved, with a neutral light theme now the default.

**Create analytical report** also offers Pareto, Funnel, Treemap and Sunburst. Pareto requires one
prepared row per category; Funnel requires one row per stage with an explicit integer order and
non-increasing values. Duplicate categories/stages fail instead of silently aggregating. For a
hierarchy, choose ordered grouping levels and one sum/count measure; all totals are retained.
Preview, save, same-tab draft recovery and uncertain-save retry reuse the existing report lifecycle.
Compatible Pareto/funnel calculations can be edited through widget actions without changing manual
preparation or appearance. Compatible single-measure hierarchies also support wizard editing;
confirm **Update hierarchy fields after changing grouping or measures** when altering levels or
measure identities. Fix dangling formatting references explicitly. Advanced/shared/multi-measure
rollups remain graph steps and are never silently simplified.

**Overview** now lists saved reports, prepared tables, unfinished imports and project checks.
Search reports by name; **Open report** enters viewing mode and **Edit** opens authoring. Reports
with elements come before empty layouts. Saved layouts are not a guarantee of current data quality:
use **Review checks and updates** for the server's current validation state. An unavailable section
offers Retry without hiding the rest of the project. **Resume import** keeps the original uploaded
file; restored report links keep their saved selections. Rename the project inline with Enter to
save or Escape to cancel. Detailed formulas/joins remain under **Open calculations**.

The report editor now separates **Report fields** at left, the preview in the center and settings
at right. Search schema fields and use role buttons without dragging; appearance and detailed
bindings share the same draft. Narrow screens stack the sections with keyboard-accessible anchors.
Advanced chart preparation still belongs to the graph. Workspace links now offer apply/discard/keep
draft/continue editing. Unsaved visualization settings are recoverable in the same browser tab after
reload or back/forward: reopen settings, or **Resume new visualization draft**, then explicitly restore.
Restoring retains the original revision, so another tab's saved changes cause a conflict. This is not
a server save or a guarantee after closing the tab/denying storage: use Apply for durable saving.

Standard charts now offer **Data table** with full names and unrounded returned numeric values.
Their Cartesian labels adapt to widget size; large/tiny tick labels can use compact/scientific
notation without changing report calculations. Table pages browse the same returned result and
explain any server-side truncation. Keyboard row selection preserves navigation field identities.

Unfinished uploads appear under **Data -> Resume import**. **Save import draft** keeps table,
reading options and field settings; inspection/check also save them. Unsaved keystrokes are not
autosaved. Resuming requires a fresh full-data check. Conflicting tabs retain their local form;
reload explicitly accepts the saved version. Reopening a completed import shows its receipt.

Apply database migration `20261008_0011` (`alembic upgrade head` from backend, with the configured
database and a backup of existing data). Normalized Parquet and original files both belong in
storage backups. See [scope, implementation and remaining milestones](docs/PRODUCT_EVOLUTION.md)
and [current checks and limitations](STATUS.md). **Update data and history** on a prepared dataset
opens file replacement, mapping, saved drafts, checks and rollback. Current reports keep old data
until the complete update passes checks and is applied. See the [operator guide](docs/REPORT_CYCLE.md).
In dashboard edit mode, **Widget actions -> Edit in report wizard** edits recognized Group By v2/v3,
simple filters and wizard-authored formulas directly in the saved graph. Upstream advanced steps and layout are
preserved. Shared/contextual or unsupported calculations open an explanation and graph link.
Existing chart field bindings and appearance remain unchanged unless field rebinding is explicitly
selected. Conflicts retain the local form. New complex charts and general graph restructuring
through the wizard are not delivered yet. See [editing limits](docs/PRODUCT_EVOLUTION.md).

For monetary row formulas, **Calculations -> All operations -> Exact Calculated Column · v2**
provides opt-in decimal/integer arithmetic with explicit precision and decimal places. Rounding
happens once at the node output (ties to even), never through Float64. Existing v1 formulas stay
unchanged. Connect an upstream table and insert fields; arithmetic errors block the full result.
Use `if_else(condition, amount, otherwise)` for exact conditional calculations (ADR-160), for example
`if_else(not is_null(plan) and plan != 0, actual / plan, None)`. Only the selected branch is evaluated.
Text, boolean and date fields can be used in conditions; the result remains decimal. Missing
comparisons are unknown, not zero; false/unknown conditions select the otherwise branch.
See [supported functions, rounding and limits](docs/PRODUCT_EVOLUTION.md).
**Calculations -> All operations -> Exact Window · v3** provides decimal/integer partition sums,
running sums/maxima, previous-row values and row numbers. Choose partition fields and, except for
partition sums, a unique sort order. It preserves decimal places; Float64 and overflow fail explicitly.
Use the existing Window v1/v2 for legacy approximate behavior. Previous row is not previous period.
The selected node's **Share and rank** helper also accepts decimal fields. Integer fields have an
**Exact calculation** option; exact shares expose **Share decimal places** (default 6). It creates
ordinary exact graph nodes without manual wiring. Optional row selection follows the calculation;
it does not reduce the denominator. Exact row ranks require a unique value/tie-break order per group.
Decimal Unpivot now preserves source precision instead of truncating to six decimal places. If an
older frozen report used that operation, recalculate its live graph from the retained original data;
the frozen artifact itself remains unchanged.
**Exact Pivot · v2** creates cross-tab sums, averages and extrema without Float64 conversion; choose
**Average decimal places** when averaging. Count excludes empty observations; missing numeric cells
stay empty. Legacy Pivot v1 is unchanged. When a changed category removes a field used by a report,
reselect its fields explicitly. Convert Types now rejects fractional decimal-to-integer truncation;
use the explicit error/null policy rather than relying on discarded decimal places.
The wizard's **Measures** step also offers **Formulas for each row** and **Formulas after totals**.
Use **Check formula fields** to refresh server-validated field choices, then choose aggregations
and formulas over their totals. A ratio of totals is not an average of row ratios. New reports keep
measure identities when renamed/reordered. Legacy v2 reports allow row formulas, but do not silently
upgrade to v3 for after-total formulas. Float64 inputs must be mapped explicitly to decimal at import
for exact arithmetic; integer sums/averages retain their existing Float64 behavior.

To build a chain such as **Profit -> Margin % -> Target gap**, use **Check after-total fields**,
add the first formula using the named aggregate fields, then check again before adding its consumer.
The next formula's field selector includes the validated previous result. Changing an upstream
formula or aggregation requires another check; each formula uses its configured decimal places.
Field checks do not execute or save the report. Preview the full calculation before saving.
Adding a row/after-total/alignment formula focuses its name; removing it focuses a surviving formula
or Add without rewriting any surviving expressions or field identities.

On the wizard's **Data** step, **Report data source -> Prepared calculation results** selects a
published table from an existing calculation. The report adds a branch to the same graph, without
copying preparation. Shared steps/source updates affect dependent reports; the wizard shows a link
to the original calculation. Existing reports and layout are preserved. Workflow parameter defaults
apply, not another dashboard's selections. Context-filtered results require graph configuration.
If the input changes while authoring, **Reload input fields** keeps your measures but requires a
new preview before Save. See [reuse boundaries](docs/PRODUCT_EVOLUTION.md).

**Data -> Reusable measures -> Define reusable measure** registers a numeric field from a prepared
result, a business name/description and the fields identifying one row (grain). The server checks
all rows. Leave grain empty only for a single total. **Create report from measure** reuses the
prepared values directly, without summing ratios or averages again or copying any calculations.
Tables display all grain fields; Bar/Line require one grain field; KPI requires a single total.
To show several measures side by side, select **Additional reusable measures** in that builder.
Choose up to seven more fields from the same prepared result with identical grain. This produces
a table without joins or reaggregation; all selected measures must stay visible. Different results
or different grain require explicit preparation in the graph, not automatic alignment.
The report keeps checking grain after source/graph changes. Removing a definition from the catalog
does not remove existing reports. To change a definition's field/grain, create another definition.

For separate prepared branches in one graph, add **Align measures** under **All operations**.
Connect both datasets, select one numeric measure on each side and 1–8 key pairs. Each side must
have one row per key; aggregate or correct repeated keys upstream. All keys from both sides remain
in the result. Missing values stay empty, and the two presence columns identify missing rows.
**Empty alignment keys** defaults to rejection; matching empty keys requires explicit selection.
Preview shows match/unmatched counts over the entire input, not just the displayed sample. Publish
the resulting dataset to build a table or add further graph calculations.

For the guided route, use **Create alignment report** from Create report or Data -> Reusable measures.

To reuse an ordinary grouped/formula report, open **Edit in report wizard -> Save calculation
template**. Give it a name and describe what one input row means. In **Create report**, select a new
table or prepared result, then **Use report template**. Map each field, confirm the row meaning/units
and load settings. Measures, formulas, comparisons and combo/radar bindings transfer; source data,
manual upstream steps and dashboard layout do not. Review settings and preview before saving.
Templates are immutable and project-local (200 across both families). Capturing saved settings does
not save unsaved edits. A lost capture response can be retried after reload; reload the saved report
before further edits after capturing. Closed/denied session storage limits local recovery.

Choose a calculation graph, left/right prepared results, keys and numeric fields. **Preview calculation**
shows full match counts and the first 50 exact rows; **Save report** creates a table and dashboard.
No manual wires or repeated aggregation are needed. Input changes require **Reload input fields** and
a new preview. Both inputs use workflow parameter defaults; context-filtered publications are excluded.
The saved calculation remains editable in the graph. Cross-workflow connections and guided alignment
round-trip/derived formulas are not yet provided.

Open **Create report -> Create analytical report** (ADR-146/147).
Choose an imported table or prepared result and Histogram, Box plot, Heatmap or Analytical table.
Heatmap requires two dimensions, a numeric value and an explicit aggregation. Analytical table offers
ordered grouping levels, named measures (including ratio-of-sums) and optional intermediate/grand
totals. All totals use the complete selected input, not the currently visible page or child averages.
After saving, visualization settings offer colour scales, pinned columns and conditional formatting.
Optional filters run before preparation; preview includes the chart and exact tables. Histogram starts
with 20 intervals, with editable count/bounds; box plot supports an optional grouping field. Preview
does not save. **Save report** creates the ordinary calculation, visualization and dashboard atomically.
Draft restoration requires a fresh preview; uncertain saves retry the original request without duplicates.
After saving, widget actions -> **Edit in report wizard** opens supported analytical calculations
(ADR-148). Manual upstream steps and appearance/layout are preserved. Shared/advanced bindings show
an explanation and graph access. Confirm updating table fields when changing grouping/measures;
remove or revise rules referencing deleted fields in visualization settings first. A different
analysis type requires a separate report. **How it is calculated** opens the full graph. Prepared inputs
reuse the original branch; choose observations at the intended grain rather than an unintended total.
Run `npx playwright test e2e/statistical-reports.spec.ts e2e/analytical-reports.spec.ts e2e/statistical-editing.spec.ts` against the
acceptance servers below for imported/prepared creation, exact totals, missing-vs-zero cells,
full-data preview, outlier paging, recovery and lost-response verification.

For manual graph authoring, add **Box-plot statistics** under the field graph's **All operations**.
Choose a numeric field and optionally a grouping field. **Distribution summary** provides quartiles,
median, observed whiskers, min/max and observation/missing/outlier counts; **Outliers** is a separate
table output. Click an output to preview or publish that table. All non-null rows participate in
statistics regardless of preview limits. Null values are counted separately, never replaced by zero.
Integer/decimal outputs stay exact; unsupported Decimal128 precision requires explicit upstream
rescaling. Float inputs remain approximate.

To display it, publish **Distribution summary**, then create/edit an independent visualization and
choose **Box plot**. The paired outliers are bound automatically from the same statistical execution.
Use **Appearance -> Orientation** for vertical/horizontal boxes. **Distribution summary** and
**Outliers** buttons expose exact tables; outliers are paged and a notice shows how many are displayed.
All statistics still use the full population. Frozen releases retain every outlier, even beyond
1000 rows, and support paging after restoration/viewing. Apply contextual filters upstream of the
statistics node, never just to its summary. The analytical wizard creates and edits compatible steps.

For a **Histogram**, add **Histogram statistics** in the graph and select a numeric field. It starts
with 20 equal-width intervals; **Interval count** accepts 1–200. **Set histogram range** enables
explicit decimal bounds. Publish **Histogram intervals**, then select **Histogram** in the independent
visualization editor. Chart/table views show complete counts plus missing/below/above-range totals.
The last interval includes its upper bound; the others exclude it. Constant automatic data uses one
interval. Exact boundary text may use a fraction (for example `1/3`) rather than silently rounding.
These boundary fields are text; statistical counts are integer fields. Money/large integer assignment
stays exact; Float64 data remains approximate. Frozen releases preserve both interval and summary data.

For **Radar**, publish a table with one row per profile (for example a grouped/ aligned report), then
choose **Radar** in the independent visualization editor. Select the profile field, 3–8 numeric axes,
and explicit scales. **Same units, one common scale** requires matching declared units/currency;
**Normalize each axis by its bounds** allows different units and ranges. Missing unit metadata is
not inferred: confirm common units yourself. Bounds are entered as exact decimal text. Use the axis
up/down buttons to reorder without dragging. Up to 20 profiles are supported; aggregate/filter
larger populations in the graph. Duplicate identifiers or out-of-range values prevent saving.
Incomplete profiles remain in **Profile table**, never become zero-filled polygons. **Axis scales**
shows configured bounds/units. Exact values and every bounded profile survive frozen releases.

For guided waterfall reports, choose **Create analytical report -> Waterfall**, select the dataset,
label/value fields and optional row-type field. Explicitly select input order or an ascending
integer/decimal/date/datetime field; order keys must be unique and nonempty. Preview the chart and
**Step table**, then save. Widget actions -> **Edit in report wizard** reopens compatible calculations.
Drafts and analytical templates retain these roles; filters run before total reconciliation.
For manual preparation, add **Waterfall steps** under **All operations** in the graph. Select the
label and numeric value fields. Existing nodes without an order field retain input order.
Each label must be unique and nonempty. By default every row is a signed contribution. An optional
**Waterfall row type** field maps exact source text to initial/change/subtotal/total; edit the four
marker values for your source language. Initial balance is first, subtotal displays but does not add
the running balance, final total is last. Leave total values blank to calculate them or provide an
expected total for exact reconciliation. Blank contributions and mismatched expected totals fail.
**Append a final total** adds one when absent; do not enable it if the input already has a final total.
Maximum 2000 output steps, including the generated total. Empty input remains empty. Publish the
output as a table to audit value/start/end/balance or freeze a release. Integer/decimal values remain
exact within Decimal128 limits; Float64 is approximate.

To display it, publish **Waterfall steps**, create/edit an independent visualization and choose
**Waterfall**. Bindings are suggested from the prepared output. **Appearance -> Orientation** selects
vertical or horizontal bars. **Step table** exposes exact amounts/endpoints/balances; navigation is
available by keyboard. For longer sequences use the zoom slider or **Show 20 steps / Previous steps /
Next steps / Show all steps**. View changes never recalculate balances or their full-data scale.
Totals start at zero; zero contributions are strokes and sub-pixel nonzero values are dots, with
their exact values available in tooltips/table. Dense layouts may omit labels, never steps. Apply
view filters before the preparation node. Frozen releases preserve all steps, including beyond 1000.

For **Combination chart**, publish a table with one row per category, then select its category and
2–8 distinct numeric series. Choose **Bars** or **Line** per series (at least one of each). All start
on the **Left axis**. **Enable secondary axis** explicitly, then assign a series to **Right axis**
when needed; both axes must be used and declared units/currencies must match within each axis.
**Series and scales** explains assignments and full-data bounds; **Data table** keeps exact values.
Missing points leave line gaps. Group, align and sort upstream; chart settings never do these
calculations. Both axes include zero, but their scales are independent: equal height need not mean
equal value. Up to 2000 categories are supported; keyboard category windows and slider zoom preserve
the full scale. Releases retain the complete result, not a preview page.

For hierarchical preparation, add **Analytical table totals** under **All operations**. Add/reorder
grouping levels and named measures; choose every operation explicitly. **Average** uses all nonempty
observations, not child averages. **Ratio of sums** divides independently accumulated numerator and
denominator; zero/missing denominator stays empty. Select exact decimal places for averages/ratios.
Do not feed precomputed averages or percentages when you need population totals: use original
amounts/counts. **Include intermediate totals** and **Include grand total** control output levels.
With no dimensions, enable the grand total. Sort upstream for business group order; totals follow
their children. Null category values are legitimate groups, distinguished from totals by row kind.
Publish the result, then select **Analytical table** in the visualization editor. **Appearance**
offers measure visibility/order, **Pinned data columns**, **Table density**, and **Add formatting
rule**. Enter thresholds as exact decimal text with a dot, not localized comma notation. Rules
apply in order; the first match wins. Scope them to all/detail/total rows and supply a meaningful
label (shown together with colour). Empty-value rules never treat missing as zero. The table hides
technical roles and distinguishes actual empty categories from subtotal placeholders. **Last page**
reaches the final total; paging does not recalculate totals. Complete rows and rules survive frozen
releases/restoration. Apply population filters upstream of the totals node. A regular Table remains
available for auditing all technical fields. Guided wizard creation of rollups is not yet delivered.

Optional isolated performance check: from backend, run
`.venv/Scripts/python.exe -m scripts.benchmark_table_rollup`. It verifies 100000-row narrow/wide
synthetic totals, reports first/repeated execution and traced Python memory, and never writes
project data. Source construction/native allocations are excluded; repeated execution is not cached.

The R5 bubble-chart backend foundation has a separate optional check:
`.venv/Scripts/python.exe -m scripts.benchmark_bubble` (from backend). It validates/scales 100000
synthetic rows at widths 4 and 100, transports only 1000 rows / 4 selected columns and reports
first/repeated timings and traced Python memory. It writes no files or project data. This is a
preparation benchmark, not end-to-end latency.

For a **Pareto chart**, prepare one row per category, connect **Pareto contributions** in the graph,
and choose its category and nonnegative contribution fields. Publish the **Ranked contributions**
output and choose **Pareto chart** in visualization settings. Repeated categories must be grouped
upstream; missing/negative contributions must be corrected or explicitly filtered. Ties use ascending
category order. **Data table** exposes exact amounts, cumulative values and exact shares; rounded
percentages use 12 decimal places. A zero total makes shares undefined. **Pareto population** explains
the total and zero count. The Appearance reference defaults to 80%; it does not classify categories.
Paging never changes the denominator, and frozen releases retain all ranks. Configure view restrictions
before the Pareto node. Alternatively choose Pareto in **Create analytical report** to generate
the same graph, publication and dashboard without manual connections.
Optional `.venv/Scripts/python.exe -m scripts.benchmark_pareto` (from backend) checks exact 100000-row
results at widths 2 and 100 and reports cold/repeated timings and traced Python memory. It writes
no files or projects, excludes source construction/native allocations, and does not measure browser latency.

For a **Treemap** or **Sunburst**, choose that type directly in **Create analytical report**, set
grouping levels and one sum/count measure. Or create an analytical-table report with grouping levels, subtotals
and grand total. In visualization settings choose the chart and its **Hierarchy area measure** under
Data. Only sums and counts are available; averages and ratios are not additive areas. Turn on labels
under Appearance when useful. Prepared values must be finite/nonnegative/nonempty. The entire tree
is limited to 5000 nodes; group/filter upstream if exceeded. Null categories remain separate groups.
Use **Data table → Open group**, **Parent group** and **Entire hierarchy** to explore without a mouse
gesture. Shares always refer to the complete root, even inside a group. Zero-area and very small
contributions remain in the exact table. Frozen releases contain the whole tree, not a preview page.
Optional `.venv/Scripts/python.exe -m scripts.benchmark_hierarchy` validates a 100000-row narrow/wide
rollup and its 1011-node tree without files/database writes. Reports cold/repeated execution and Python
memory; source construction, native allocations and browser rendering are excluded.

For a **Bullet chart**, prepare one row per category with numeric actual and target (aggregate or
align in the graph when needed). Choose the three fields under Data, set scale minimum/maximum
including zero, and name 1–5 ordered ranges. Actual, target and ranges must share a unit/currency.
Assign range colours explicitly: higher costs, for example, need not be positive. Bounds accept
plain exact decimal text. Values outside the scale fail validation rather than being clipped.
Bars show actual; tall markers show target; short zero markers distinguish actual zero from missing
values. **Data table** shows exact values and range membership. **Bullet scale and ranges** explains
full counts and boundary rules. Keyboard indicator windows adapt to card height; API pages retain
the same scale and full counts. Frozen releases keep all rows, not just the displayed page.
Optional `.venv/Scripts/python.exe -m scripts.benchmark_bullet` checks 100000 rows at widths 3/100,
transporting 100 rows/3 fields without file/database writes. Timings exclude source construction,
native-memory tracking and browser rendering; repeated execution is not cached.

For a **Funnel**, select Funnel in **Create analytical report** and bind stage/order/value fields.
Prepare one row per stage for the same population/unit. For advanced setup, add **Funnel stages** in
the graph, and select stage, unique integer order and value. Values must be finite, nonnegative,
nonempty and non-increasing in that order. The node never sorts by value or infers individual cohort
membership. Publish **Ordered stages**, then select **Funnel** in visualization settings. The **Funnel
population** output provides initial/final values and overall retention. **Data table** exposes
previous/initial percentages, exact fractions and losses; division by zero remains undefined.
The chart uses width (not area), a dashed zero marker and no fictional drop after the last stage.
Up to 50 complete prepared stages are retained, with keyboard scrolling in compact cards. Put view
restrictions before the node. Complete releases/restore preserve all stages, not a preview slice.
Optional `.venv/Scripts/python.exe -m scripts.benchmark_funnel` groups 100000 synthetic rows with the
ordinary exact Group By node and computes 50 stages. Widths 3/100, cold/repeated times and Python peak
memory are reported. No persistent writes; construction/native memory/browser latency are excluded.

For a **Bubble chart**, open a prepared-table visualization's settings, choose Bubble chart, then
select **Observation key**, **X measure**, **Y measure** and **Bubble area**. The key must be unique
and nonempty across the entire selected dataset; size must be nonnegative. Prepare aggregation or
filtering in the graph first. Optional **Observation label** and **Colour group** are categorical.
Area (not radius) is proportional to the size measure. **Data table** retains exact numbers and
labels missing/zero-area observations; they are not invented as positive circles. The page notice
and Previous/Next buttons distinguish a bounded view from the whole population. Open **Bubble scales
and population** for full counts/extents. Relative labels explicitly show the base-value equation.
Saving, draft recovery, complete frozen releases and restoration use the existing report lifecycle.

For a new **calendar comparison** report, add a date field in Dimensions, then on Filters use
**Check formula fields -> Compare calendar periods**. Select month/quarter/year, a measure (including
an after-total formula), and previous period or same period last year. Preview includes previous
value, difference, change % and whether a baseline row exists. Missing months are not replaced by
earlier available rows; zero/null baselines have no percentage. Filters affect both periods and
partial periods are not extrapolated. On Presentation choose Table, Bar or Line. Charts require only
the date dimension and display the compared measure and its baseline; difference and change % remain
in the table preview. Several grouping dimensions require a table. Saved comparisons reopen in the report wizard when their
steps are not shared or manually contained. Adding/removing a comparison requires **Update visualization
field bindings** on Presentation. Removing comparison also restores grouping by original dates.
Advanced/shared steps remain editable through **Calendar Period** and **Period Comparison** in the
graph. Changing the chart's compared measure requires updating field bindings as well. Charts retain
prepared ordering; use an explicit upstream Sort for a different row order. Missing baselines are gaps.

For manual backend startup, after migrations and before serving requests, run
`python -m app.services.file_cleanup` to recover unfinished artifact writes. Compose already does
this. Do not run staging recovery alongside live writes; deployment remains single-worker.

Isolated browser acceptance, without touching existing projects:

1. From backend, run `.venv/Scripts/python -m scripts.serve_acceptance` (temporary SQLite, port 8010).
   Optional `--port 8020 --frontend-port 3020` isolates another acceptance instance; build with
   `NEXT_PUBLIC_API_URL=http://localhost:8020`, start Next on 3020 and set `NODEBI_E2E_URL` /
   both `NODEBI_E2E_API` and `NODEBI_EVOLUTION_API` to that disposable API URL. The script allows
   only loopback frontend CORS origins. Never point a broad acceptance run at the author's database.
2. From frontend in PowerShell, run `$env:NEXT_PUBLIC_API_URL='http://localhost:8010'; npm run build`, then `npm run start -- --port 3010`.
3. In another frontend terminal set all three test URLs (both API variable names are used by the suite):

   ```powershell
   $env:NODEBI_E2E_URL='http://localhost:3010'
   $env:NODEBI_E2E_API='http://localhost:8010'
   $env:NODEBI_EVOLUTION_API='http://localhost:8010'
   npx playwright test evolution.spec.ts report-editing.spec.ts exact-formula.spec.ts report-formulas.spec.ts report-inputs.spec.ts measures.spec.ts report-comparison.spec.ts
   ```

   Pass test filenames or forward-slash paths; Windows backslashes are interpreted as regular
   expression escapes by Playwright. With alternative ports, change all three URLs together.
   After stopping the isolated frontend, rebuild without the temporary `NEXT_PUBLIC_API_URL`
   before returning to the ordinary application.

PostgreSQL migrations/concurrency remain separate: set `NODEBI_TEST_POSTGRES_URL` to the local
PostgreSQL URL with host `127.0.0.1` and run `python -m pytest -q`; tests use isolated UUID schemas.
`python -m scripts.benchmark_ingestion` measures normalization separately from import and rendering.
`python -m scripts.benchmark_process` runs normalization and conditional exact formulas at 100000
rows and widths 3/100, each in a fresh process. JSON lines report cold/repeat time, correctness
checks, environment and lifetime peak resident memory (Windows/Linux), including native allocations.
Windows also reports peak commit. Source creation and imports are included in memory but excluded
from the operation timings; repeat recomputes rather than reading a cache. Python allocation tracing
is disabled for this run. Use `--rows 12` for a quick harness check or `--workload exact_formula`
to select one workload. This is an in-memory engine benchmark, not file import, HTTP/browser latency
or permission to bypass existing ingestion limits. Run it without concurrent heavy tests.
Normalization accelerates clean, explicitly mapped decimal string columns only after validating
every value against the selected precision/scale and separator. Other syntax or conversion errors
retain the scalar path and its exact row diagnostics; no silent fractional truncation is allowed.
Before/after measurements and limitations are in `docs/PRODUCT_EVOLUTION.md` (ADR-186).
`python -m scripts.benchmark_exact_formulas` measures exact arithmetic on 100k-row narrow/wide
in-memory tables, with separate Python allocation tracking. It does not relax ingestion limits.

In Calculations, **All operations** includes **Exact Constant**, **Exact Field arithmetic**,
**Exact Sum field** and **Exact Single value** (v2). Use decimal/integer field wires or exact
constants; convert Float64 explicitly. Constants are entered as decimal text. Arithmetic exposes
precision/scale and rounds half-even at each node; chain order therefore matters. Exact Sum keeps
input scale, ignores nulls and returns zero for an empty table. Single value requires exactly one
row, preserving null. Connect a scalar result to KPI or publish it for an independent KPI.
**Exact Field expression** (v2) accepts a/b/c connections and the same safe numeric language as
Exact Calculated Column, including conditions and `safe_divide`. For example `a / 3 * 3 + b`
rounds only once after the entire expression at the configured scale. Text/date/boolean inputs can
be used in conditions. Scalar-only expressions produce a scalar; field expressions keep their
table population, including an empty table. Existing v1 nodes are not upgraded.
Workflow parameters and advanced dashboard settings now offer **decimal** with explicit precision
and scale. Enter values as text (API example: `"9007199254740993.12345678"`), not numeric JSON.
Extra nonzero fractional digits and overflow are rejected, never rounded. Use a Parameter node
to feed an exact expression, or bind a dashboard parameter to the workflow parameter. Explicit
bindings expose **Apply selections** on published-report dashboards too. Saved defaults, view
URLs, choices and fixed releases preserve exact strings; view selections do not rewrite defaults.
Destination parameters must have enough integer and fractional capacity for their source.
`python -m scripts.benchmark_exact_fields` checks arithmetic -> sum on 100k rows/2 and 100 columns;
add `--formula` to measure exact expression -> sum instead.
Repeat runs are uncached, and Python peak memory excludes native allocations/source construction.
Browser coverage: `npx playwright test e2e/exact-fields.spec.ts` with the isolated setup above.

Start with the public business example: [sales and gross profit, step-by-step guide](docs/BUSINESS_SALES_GUIDE.md).
Three synthetic workbooks and independent expected totals are in `fixtures/excel/business-*`.
Generate them with `backend/.venv/Scripts/python.exe fixtures/build_business_demo.py`.
Run `npx playwright test e2e/business-sales.spec.ts` from `frontend` to follow the guide through
the UI; set `NODEBI_KEEP_BUSINESS_DEMO=1` to retain the resulting editable project.
The test provisions the project/uploads through the public API; all graph calculations,
publications, visualization settings and dashboard placement are authored through the UI.

Regular workbook updates, report checks and frozen releases:
[operator guide](docs/REPORT_CYCLE.md). The report-cycle worker currently requires a single
backend process. Back up both PostgreSQL and source storage before applying migrations.

Dashboard editing: [fields, contextual settings, central preview, placement and shared copies](docs/DASHBOARD_WORKSPACE.md).
Independent visualization saves retain an exact pending request when the response is lost. Restore
the local draft and retry Save/Apply to recover the same object; do not manually create another copy.
This includes edits and copies, but does not save the dashboard layout automatically. Local storage
limits still apply. Check `npx playwright test e2e/visualization-save-recovery.spec.ts` for real
commit-then-disconnect/reload coverage; backend `tests/test_visualization_save_receipts.py` covers
transaction rollback, revision drift, deletion and PostgreSQL concurrent retries.
The creation/edit/alignment and named-measure report forms restore tab-local settings and pending saves.
After restoring ordinary settings, preview again; after a lost save response, use Retry report save.
Do not create another report to work around an uncertain save. Local drafts preserve original CAS
tokens until explicit refresh, and cannot replace server saving or survive cleared/closed storage.
Run `npx playwright test e2e/report-recovery.spec.ts` for reload/history and lost-response acceptance.
`e2e/measures.spec.ts` additionally covers retained compatible measures, exact lost-response retry
with unavailable metadata, unchanged calculations and catalog-independent saved report rendering.
Usability review: [findings and limits](docs/USABILITY_REVIEW.md); focused check: `npx playwright test usability.spec.ts`.
Browser acceptance: `npm run test:e2e -- e2e/dashboard-workspace.spec.ts` in `frontend`.

Simple multi-book dashboard: [four-book P&L, rules and operator walkthrough](docs/ALMA_SIMPLE_DASHBOARD.md).
Recreate public fixtures with `backend/.venv/Scripts/python.exe fixtures/build_alma_demo.py`.
Browser authoring acceptance: `npm run test:e2e -- e2e/alma-dashboard.spec.ts` in `frontend`.
Set `NODEBI_KEEP_ALMA_DEMO=1` to retain its editable project in the local database.

New authoring walkthrough: [two Excel books, Join, calculated field and visible result cards](docs/TABLE_AUTHORING.md).

Primary dashboard workflow: [published results, independent visualizations and shared period](docs/PUBLISHED_DASHBOARDS.md).
The current financial project uses 28 publications and 53 independent visualizations; its
calculation graph contains no chart nodes. ADR-106 supersedes the historical bound-chart workflow below.

Field-node authoring: [operator guide](docs/FIELD_EDITOR_GUIDE.md).
The local six-screen financial project has been assembled with field expressions, explicit scalars,
bound charts and composite blocks: [results and impartial UX review](docs/FIELD_FINANCIAL_REVIEW.md).
It uses private workbook data and is stored in the local database, not bundled as a public fixture.

Editable reference overview and reproduction instructions: [constructor overview](docs/REFERENCE_OVERVIEW.md).

Workflow parameters can be declared in the editor and selected as Filter values. Defaults
are saved with the graph; temporary preview values do not create a revision. Preview and
POST visualization-result requests accept a typed `parameters` object. Existing GET results
use defaults. Migration 0005 adds declarations while preserving existing graphs. Dashboard
parameter controls, data choices and navigation are described in [dashboard navigation](docs/DASHBOARD_NAVIGATION.md).

## Constructor extensions for dashboard parity

The approved six-screen migration is tracked in `docs/OPOP_CONSTRUCTOR_PLAN.md`;
its new field-node project passes the 164-slice numerical comparison. General preparation controls are available in the workflow
editor: Excel Source header row/count and source row number, Convert Types,
Unpivot and Window. For the supplied reference workbook select header row **3**,
header count **2**, and enable source row number. Formatting-only tails are ignored.

Convert Types defaults to strict errors. Choose loss-to-null explicitly when desired;
use `coalesce([field_id], 0)` to replace missing numbers. String ISO date conversion
accepts `YYYY-MM-DD`, datetime accepts `YYYY-MM-DDTHH:MM:SS`.
Safe expressions include `trim`, `lower`, `coalesce`, `nullif` and
`safe_divide(numerator, denominator, fallback)`; for example
`coalesce(nullif(trim([class_id]), ""), "Unclassified")`.
Unpivot produces field ID, field name and value columns. Window supports partition
sums and ordered row numbers; supply an extra stable sort key to resolve ties.

Светлая и тёмная темы переключаются вверху страницы: **Тема → Светлая / Тёмная**.
Выбор сохраняется в браузере; по умолчанию используется светлая тема. Смена темы применяется
к формам, схеме обработки и диаграммам и сохраняет текущие правки.

## Языки интерфейса / Interface languages

Русский используется по умолчанию. Переключатель в верхней части каждой страницы позволяет
выбрать **Русский**, **English** или **Татарча**. Выбор сохраняется в браузере на год и применяется
при следующем открытии. Смена языка сохраняет текущие правки схемы и дашборда.
Названия проектов, листов, столбцов, диаграмм и строковые данные не переводятся.

The interface supports Russian (default), English and Tatar (Cyrillic). Use the language selector
at the top of any page; a browser cookie restores the choice on later visits. User data and
formula/API identifiers are unchanged. See [localization notes](docs/LOCALIZATION.md).

Node BI is a web-based Business Intelligence platform for building analytical workflows and dashboards from Excel data using a visual node-based interface.

The MVP allows a user to:

* create a BI project;
* upload an Excel workbook;
* inspect worksheets and columns;
* build a visual transformation workflow;
* preview intermediate datasets;
* create charts and KPI visualizations;
* assemble a dashboard;
* save the project;
* reopen the project after application restart.

---

# 1. Product Concept

The core interaction model is:

```text
Excel
  ↓
Transformation Nodes
  ↓
Prepared Dataset
  ↓
Visualization
  ↓
Dashboard
```

Example workflow:

```text
Excel Source
      ↓
Filter
      ↓
Calculated Column
      ↓
Group By
      ↓
Bar Chart
```

Example calculated column:

```text
revenue = quantity * price
```

Example aggregation:

```text
Group by:
category

Aggregation:
SUM(revenue)
```

---

# 2. MVP Scope

## Data Sources

MVP:

* Excel `.xlsx`
* Excel `.xlsm` where practical

Post-MVP candidates:

* CSV
* PostgreSQL
* MySQL
* REST API
* Google Sheets

---

## Transformation Nodes

MVP nodes:

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

---

## Visualization Nodes

MVP visualizations:

* Table
* KPI
* Bar Chart
* Line Chart
* Area Chart
* Pie / Donut Chart
* Scatter Chart

---

## Dashboard

The MVP dashboard supports:

* adding visualizations;
* removing widgets;
* dragging widgets;
* resizing widgets;
* persisting layout.

---

# 3. Architecture Overview

Node BI is implemented as a modular monolith.

```text
┌──────────────────────────────────────┐
│              Frontend                │
│                                      │
│ Next.js                              │
│ React                                │
│ TypeScript                           │
│ React Flow                           │
│ ECharts                              │
└──────────────────┬───────────────────┘
                   │
                   │ REST / JSON
                   ▼
┌──────────────────────────────────────┐
│               Backend                │
│                                      │
│ FastAPI                              │
│                                      │
│ Project Service                      │
│ Source Service                       │
│ Workflow Service                     │
│ Execution Service                    │
│ Dashboard Service                    │
│                                      │
│ Workflow DAG                         │
│ Node Registry                        │
│ Node Executors                       │
│ Dataset / Schema                     │
│ Formula Engine                       │
└───────────────┬───────────┬──────────┘
                │           │
                ▼           ▼
          PostgreSQL    File Storage
                │
                ▼
         Uploaded Excel
```

The frontend does not perform authoritative analytical transformations.

The execution path is:

```text
Node Editor
    ↓
Workflow JSON
    ↓
Backend Validation
    ↓
Execution Planner
    ↓
Node Executors
    ↓
Polars / DuckDB
    ↓
Dataset Result
```

---

# 4. Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* React Flow
* TanStack Query
* Zustand
* Apache ECharts
* Tailwind CSS
* shadcn/ui

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic
* Polars
* DuckDB where useful
* openpyxl

## Persistence

* PostgreSQL

## File Storage

MVP:

* local filesystem through `StorageProvider`

Future:

* S3
* MinIO
* Azure Blob Storage

## Infrastructure

* Docker
* Docker Compose

---

# 5. Repository Documentation

Before making significant changes, read the project documentation.

## `AGENTS.md`

Defines how autonomous coding agents must work inside the repository.

Includes:

* development lifecycle;
* testing requirements;
* scope rules;
* architecture discipline;
* QA requirements;
* completion rules.

---

## `PRODUCT_SPEC.md`

Defines what the product must do.

Includes:

* target users;
* MVP behavior;
* user journeys;
* node requirements;
* dashboard behavior;
* explicit non-goals;
* product acceptance criteria.

---

## `ARCHITECTURE.md`

Defines how the product is technically structured.

Includes:

* frontend/backend boundaries;
* domain model;
* workflow format;
* NodeDefinition;
* NodeExecutor;
* schema propagation;
* persistence;
* APIs;
* execution model;
* storage;
* testing architecture.

---

## `TASKS.md`

Contains the autonomous implementation roadmap.

Current roadmap:

```text
M0  Product and Architecture Baseline
M1  Repository Bootstrap
M2  Persistence Foundation
M3  Project Management
M4  Excel Data Sources
M5  Dataset and Schema Domain
M6  Workflow Persistence and Node Registry
M7  Workflow Editor
M8  Validation and Schema Propagation
M9  Execution Engine
M10 Core Transformation Nodes
M11 Advanced Transformation Nodes
M12 Visualization System
M13 Dashboard System
M14 Persistence and Recovery Hardening
M15 QA / Security / Performance / UX
M16 MVP Release Gate
```

---

## `STATUS.md`

Contains the current development snapshot.

Use it to determine:

* current milestone;
* current task;
* blockers;
* test status;
* next task.

A fresh development session should read `STATUS.md` before starting work.

---

## `DECISIONS.md`

Contains architecture decision records.

Examples:

* why the backend is a modular monolith;
* why Polars is the primary dataframe engine;
* how workflow execution works;
* how formulas are secured;
* how visualization configuration is stored.

---

# 6. Repository Structure

Target repository structure:

```text
/
├── AGENTS.md
├── PRODUCT_SPEC.md
├── ARCHITECTURE.md
├── TASKS.md
├── STATUS.md
├── DECISIONS.md
├── README.md
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   └── tests/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── main.py
│   │
│   ├── migrations/
│   └── tests/
│
├── fixtures/
│   └── excel/
│
├── tests/
│   └── e2e/
│
├── docker/
├── docker-compose.yml
└── .env.example
```

The exact structure may evolve during implementation.

Architectural boundaries defined in `ARCHITECTURE.md` must remain intact.

---

# 7. Development Status

Current phase: **MVP complete (0.1.0), 2026-09-11**. Required M0-M16 behavior passes
the automated acceptance gates. See docs/QA_REPORT.md for evidence and supported limits.

Always inspect:

```text
STATUS.md
```

for the current authoritative development state.

---

# 8. Local Development

## Astra revision checks (2026-09-10)

The prior implementation and the architecture review are recorded in
`docs/ASTRA_HANDOFF.md` and `docs/ARCHITECTURE_REVIEW.md`.

Additional checks from `frontend/`:

```powershell
npm run api:generate
npm run api:check
npm run test
npx playwright install chromium
npm run test:e2e
```

Browser tests expect the documented Compose stack on localhost ports 3000/8000.
They create and remove their own projects. Override `NODEBI_E2E_URL` and
`NODEBI_E2E_API` for other test endpoints. For the combined product-evolution suite, also set
`NODEBI_EVOLUTION_API` to the same disposable API and build with the matching `NEXT_PUBLIC_API_URL`.
Use an isolated acceptance database, never the author's working projects. On constrained machines,
run browser acceptance and unit/component regression sequentially; `npm test -- --maxWorkers=2`
limits frontend test concurrency without increasing timeouts or changing assertions.

Run backend checks with real PostgreSQL in addition to SQLite:

```powershell
cd backend
$env:NODEBI_TEST_POSTGRES_URL = 'postgresql+psycopg://nodebi:nodebi_dev@127.0.0.1:5432/nodebi?connect_timeout=5'
.\.venv\Scripts\python -m pytest
```

Tests migrate private UUID schemas and remove only those schemas. They cover
concurrent writers, graph ownership, migration roundtrips and ORM drift. The
PostgreSQL-only cases skip on the SQLite half of the matrix.

Use `python -m pytest -q -k postgresql` with the same environment variable to run
only PostgreSQL-selected cases. This selection does not replace the full unit/SQLite
suite or verify a database-process restart. Prefer a disposable local test database;
do not run against the author's working database.

For the executive-report API/database restart check, start Docker Desktop and ensure
`postgres:17-alpine` is already available locally, then run from `backend`:

```powershell
$env:NODEBI_TEST_DOCKER_RESTART = '1'
.\.venv\Scripts\python -m pytest tests/test_process_restart.py -q
Remove-Item Env:NODEBI_TEST_DOCKER_RESTART
```

This opt-in creates its own uniquely named, loopback-only PostgreSQL container; it
does not use DATABASE_URL or NODEBI_TEST_POSTGRES_URL to choose a database to restart.
The test applies migrations, creates eight demo widgets and a frozen release, replaces
the API process, restarts its database, then verifies saved data, financial/statistical
results and release restoration. Its anonymous data volume survives restart and is
removed with the owned container afterward. No image is pulled automatically. Without
the opt-in, only the SQLite process-replacement variant runs. This is a graceful restart
test, not crash/power-loss recovery or a backup disaster-recovery certificate.

Workflow saves now require `expected_revision`. HTTP 409 preserves the local draft;
retry does not force an overwrite. Draft recovery is scoped to the browser tab and
survives page reload/navigation. Closing the tab ends its session draft storage.
Workflow format `version` is independent of the returned edit `revision`.

Uploaded files are immutable. Workbook materialization is bounded to 250,000 rows,
1,024 columns and 2,000,000 cells; expanded archive size is limited to 256 MiB and
10,000 entries. Oversized inputs produce an error, not a truncated analytical result.
Data preview type inference describes the returned sample; execution schema uses the
whole permitted sheet. The execution cache retains at most 32 entries and 256 MiB
of estimated dataframe storage; Python/engine overhead is additional.

Source/project deletions queue file cleanup atomically. Failed cleanup is retried
at startup and can be retried manually from the backend environment:

```powershell
python -m app.services.file_cleanup
```

The frontend public API URL is a Docker build argument because Next.js embeds it
during compilation. Rebuild the frontend after changing `NEXT_PUBLIC_API_URL`.

Vitest is updated to 4.1.11. The js-yaml 4.3.2 override fixes a transitive development
dependency advisory; current npm audit is clean. API types use openapi-typescript
and browser tests use Playwright; these are development dependencies.

Copy `.env.example` to `.env` only when you need to override the safe development defaults, then run:

```bash
docker compose up --build --wait
```

This starts:

* frontend;
* backend;
* PostgreSQL.

Open `http://localhost:3000`. The API documentation is at `http://localhost:8000/docs`.

Local quality checks:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-runtime.txt -c constraints-dev.txt -e ".[dev]"
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\ruff check .
.\.venv\Scripts\ruff format --check .
.\.venv\Scripts\mypy app

cd ..\frontend
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
```

---

# 9. Environment Configuration

The repository should contain:

```text
.env.example
```

Expected configuration includes values similar to:

```text
DATABASE_URL=
STORAGE_ROOT=
MAX_UPLOAD_BYTES=
MAX_PREVIEW_ROWS=
LOG_LEVEL=
```

Additional configuration may be introduced during implementation.

Never commit production secrets.

---

# 10. Database Setup

Database schema changes are managed using Alembic.

The expected fresh-environment lifecycle is:

```text
Create PostgreSQL database
        ↓
Run Alembic migrations
        ↓
Start backend
```

A fresh environment must not require manually creating database tables.

Exact migration commands must be documented after backend bootstrap.

Expected shape:

```bash
alembic upgrade head
```

Run the command from the backend environment as configured by the implementation.

---

# 11. Backend Development

Target backend location:

```text
backend/
```

Main application:

```text
backend/app/main.py
```

Expected development responsibilities include:

* FastAPI startup;
* application configuration;
* database connection;
* repository layer;
* workflow domain;
* execution engine;
* node registry;
* dataset engine.

Exact environment setup commands must be added during M1.

---

# 12. Frontend Development

Target frontend location:

```text
frontend/
```

The frontend provides:

* project management;
* source upload;
* workflow editor;
* node configuration;
* data preview;
* visualizations;
* dashboard editor.

Exact package manager and commands must be documented after frontend bootstrap.

Expected capabilities include commands for:

```text
development
lint
typecheck
tests
production build
```

Do not assume package-manager-specific commands until the repository bootstrap establishes them.

---

# 13. Health Checks

The backend should expose:

```text
GET /health
```

Purpose:

Confirms that the application process is running.

And:

```text
GET /ready
```

Purpose:

Confirms that critical dependencies are available.

At minimum, readiness should consider PostgreSQL connectivity.

---

# 14. API

Primary API prefix:

```text
/api/v1
```

Examples:

```text
GET    /api/v1/projects
POST   /api/v1/projects

POST   /api/v1/projects/{project_id}/sources/excel

GET    /api/v1/workflows/{workflow_id}

POST   /api/v1/workflows/{workflow_id}/validate

POST   /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

See `ARCHITECTURE.md` for the expected API model.

---

# 15. Workflow Model

A workflow is a directed acyclic graph.

Conceptually:

```json
{
  "nodes": [],
  "edges": []
}
```

Each node contains:

```text
id
type
version
position
config
```

Each edge contains:

```text
source node
source port
target node
target port
```

The backend is authoritative for graph validation.

---

# 16. Node Architecture

Node behavior must follow the common architecture:

```text
NodeDefinition
      +
NodeExecutor
      +
NodeRegistry
```

Conceptually:

```text
NodeDefinition
 ├── type
 ├── version
 ├── input ports
 ├── output ports
 ├── config schema
 └── schema inference behavior
```

Execution:

```text
NodeInstance
      ↓
NodeRegistry
      ↓
NodeExecutor
      ↓
Dataset Result
```

Do not implement generic execution using large node-type conditional chains.

---

# 17. Dataset Model

Excel is a source adapter.

It is not the analytical data model.

The execution engine operates on:

```text
Dataset
+
DatasetSchema
+
ColumnSchema
```

Logical data types include:

```text
STRING
INTEGER
FLOAT
BOOLEAN
DATE
DATETIME
UNKNOWN
```

---

# 18. Schema Propagation

Schema propagation is part of the MVP.

Example:

```text
Excel Source

quantity : INTEGER
price    : FLOAT

        ↓

Calculated Column

revenue = quantity * price

        ↓

Output

quantity : INTEGER
price    : FLOAT
revenue  : FLOAT
```

Downstream node configuration should use these resolved schemas.

---

# 19. Excel Handling

Uploaded Excel files are treated as immutable source artifacts.

The system should:

* inspect worksheets;
* infer schema;
* preview rows;
* load selected worksheets into Dataset representation.

The application must never execute workbook macros.

User filenames are metadata only.

Backend-generated storage keys are used for actual storage.

---

# 20. Formula Security

Calculated Column expressions must never use:

```python
eval(...)
```

or:

```python
exec(...)
```

User expressions must be parsed using a controlled allowlisted expression system.

Initial supported syntax should include:

```text
+
-
*
/
()
column references
numeric constants
```

Example:

```text
quantity * price
```

---

# 21. Preview Behavior

Node previews are bounded.

The browser must not receive entire datasets by default.

Preview responses should include:

* schema;
* limited rows;
* execution status;
* execution duration;
* row count when practical.

Server-side limits are authoritative.

---

# 22. Visualization Model

The application persists semantic visualization configuration.

Example:

```text
type: bar

X:
category

Y:
sum_revenue

title:
Revenue by Category
```

The frontend converts semantic configuration into Apache ECharts options.

Generated ECharts internals are not the primary persistent product model.

---

# 23. Dashboard Model

Dashboards contain visualization widgets.

Widget layout uses logical grid coordinates:

```text
x
y
width
height
```

The dashboard must support:

* drag;
* resize;
* save;
* reload.

A failed widget should not prevent unrelated widgets from rendering.

---

# 24. Persistence

Persistent product state includes:

```text
Projects
Data Source Metadata
Workflows
Nodes
Edges
Node Configuration
Visualizations
Dashboards
Widget Layouts
```

Transient execution state includes:

```text
DataFrames
Preview Results
Execution Cache
Generated Chart Options
```

Transient state may be deleted without losing the user's project.

---

# 25. Testing

Testing is part of feature implementation.

Required test categories include:

* domain unit tests;
* executor tests;
* Excel integration tests;
* database integration tests;
* API integration tests;
* frontend behavior tests;
* end-to-end tests.

---

# 26. Acceptance Fixtures

The repository should contain deterministic workbook fixtures.

Primary fixture:

```text
fixtures/excel/sales.xlsx
```

Suggested columns:

```text
order_id
order_date
country
category
product
quantity
price
```

Canonical calculation:

```text
revenue = quantity * price
```

The fixture should include:

* multiple countries;
* multiple categories;
* multiple dates;
* null values;
* representative numeric data.

---

# 27. Canonical MVP Acceptance Journey

The MVP is not complete until this flow succeeds.

## Step 1 — Project

Create:

```text
Sales Analysis
```

---

## Step 2 — Excel

Upload:

```text
sales.xlsx
```

Select:

```text
Sales
```

Preview the data.

---

## Step 3 — Workflow

Create:

```text
Excel Source
      ↓
Filter
      ↓
Calculated Column
      ↓
Group By
      ↓
Bar Chart
```

Configure Filter:

```text
country = Korea
```

Configure Calculated Column:

```text
revenue = quantity * price
```

Configure Group By:

```text
Dimension:
category

Aggregation:
SUM(revenue)
```

Configure Bar Chart:

```text
X:
category

Y:
sum_revenue
```

---

## Step 4 — KPI

Create a KPI representing:

```text
Total Revenue
```

---

## Step 5 — Dashboard

Add:

* Revenue by Category Bar Chart;
* Total Revenue KPI.

Then:

* move widgets;
* resize widgets;
* save layout.

---

## Step 6 — Recovery

Reload the browser.

Verify:

* source still exists;
* workflow still exists;
* nodes retain positions;
* edges remain;
* configuration remains;
* visualizations remain;
* dashboard remains;
* widget layout remains.

---

## Step 7 — Restart

Restart the normal application stack.

Verify:

* project remains;
* workbook remains available;
* workflow executes again;
* dashboard renders.

---

# 28. Quality Gate

Before declaring MVP complete:

Backend:

```text
tests pass
lint passes
database migrations pass
```

Frontend:

```text
tests pass
lint passes
TypeScript typecheck passes
production build passes
```

E2E:

```text
canonical MVP journey passes
```

Defects:

```text
P0 = 0
P1 = 0
```

---

# 29. Development Workflow for Codex

Autonomous coding agents must use:

```text
READ
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
FIX
 ↓
TEST AGAIN
 ↓
REVIEW
 ↓
DOCUMENT
 ↓
UPDATE STATUS
 ↓
CONTINUE
```

Do not stop after every normal task asking for permission.

See:

```text
AGENTS.md
```

for complete agent rules.

---

# 30. Starting a New Coding Session

A new Codex session should begin by reading:

```text
AGENTS.md
STATUS.md
TASKS.md
PRODUCT_SPEC.md
ARCHITECTURE.md
DECISIONS.md
```

Then inspect:

```text
repository
git status
git diff
existing tests
```

After that, resume from the first unfinished actionable task.

---

# 31. Resume Prompt

A minimal resume instruction for Codex is:

```text
Read AGENTS.md, STATUS.md, TASKS.md,
PRODUCT_SPEC.md, ARCHITECTURE.md and DECISIONS.md.

Inspect the current repository state and git diff.

Resume autonomous development from the first
unfinished actionable task.

Do not repeat completed work.

Follow the development protocol in AGENTS.md.

Continue through TASKS.md until the MVP Definition
of Done is satisfied or a genuine blocker prevents
all meaningful progress.
```

---

# 32. Current MVP Non-Goals

Do not expand MVP into:

* authentication;
* multi-user collaboration;
* organizations;
* enterprise permissions;
* row-level security;
* scheduled refresh;
* SQL connectors;
* Google Sheets;
* REST connectors;
* realtime streaming;
* mobile workflow editor;
* PDF export;
* PowerPoint export;
* plugin marketplace;
* distributed execution;
* AI workflow generation;
* natural-language analytics.

These may be addressed after the core product is validated.

---

# 33. Security Baseline

Even in single-user MVP mode:

* validate API input;
* validate uploaded files;
* enforce upload limits;
* prevent path traversal;
* never execute workbook macros;
* never evaluate arbitrary formula code;
* do not commit secrets;
* use backend-generated storage keys;
* avoid exposing stack traces as normal user errors.

---

# 34. Performance Baseline

The MVP targets workbook-scale analytical workloads.

Important rules:

* transformations run server-side;
* previews are bounded;
* chart point counts are bounded;
* avoid unnecessary workbook reloads;
* avoid Python row-by-row loops where vectorized operations exist;
* cache repeated execution when justified.

Do not introduce distributed infrastructure without demonstrated need.

---

# 35. Architecture Change Process

When a significant architectural change is required:

1. identify the concrete problem;
2. evaluate alternatives;
3. create or update an ADR in `DECISIONS.md`;
4. update `ARCHITECTURE.md`;
5. update affected tasks;
6. implement the change;
7. test the migration or changed behavior.

Do not silently diverge from documented architecture.

---

# 36. Product Scope Change Process

When MVP scope changes intentionally:

1. update `PRODUCT_SPEC.md`;
2. update `TASKS.md`;
3. record significant reasoning in `DECISIONS.md`;
4. update `STATUS.md`;
5. update this README if user-facing behavior changes.

Do not allow implementation convenience to silently redefine product requirements.

---

# 37. Project State Files

The following documents together form the persistent memory of the project:

```text
AGENTS.md
PRODUCT_SPEC.md
ARCHITECTURE.md
TASKS.md
STATUS.md
DECISIONS.md
README.md
```

Conversation history must not be required to continue development.

---

# 38. Current Status

Required MVP implementation and release validation are complete.
The maintained release snapshot is in STATUS.md and docs/QA_REPORT.md.

Always verify the current state in:

```text
STATUS.md
```

before beginning implementation.

---

# 39. MVP Goal

The MVP succeeds when a user can take an ordinary Excel workbook and, without writing code:

```text
Import
  ↓
Transform
  ↓
Inspect
  ↓
Visualize
  ↓
Build Dashboard
  ↓
Save
  ↓
Return Later
  ↓
Continue Working
```

The goal is not to reproduce the entire functionality of mature enterprise BI platforms.

The goal is to prove a reliable, understandable, extensible node-based BI workflow.

### Early visualization/dashboard acceptance

Build a prepared aggregate and connect Bar Chart; use a separate global Group By for KPI.
Chart configuration is stored only on the workflow node. The dashboard page lists these
saved visualizations; add widgets, drag their header, resize the lower-right corner and
click Save dashboard. Conflicting saves retain the local draft and return 409.

`npm run test:e2e` exercises the full Excel/filter/revenue/group/bar/KPI/dashboard flow.
For local Docker restart acceptance in PowerShell:

```powershell
$env:NODEBI_E2E_RESTART='1'
npm run test:e2e
```

This opt-in restarts the development frontend, backend and PostgreSQL containers, preserving volumes.
Bar charts reject more than 2000 points rather than silently truncating analytical data.
KPI requires exactly one upstream row; missing values display as No value.
Migration 0004 adds dashboard revisions. M11, all required chart types, dashboard management
and release QA are complete. The optional backlog remains in TASKS.md.

### Reproducible backend dependencies

Runtime versions are pinned in backend/requirements-runtime.txt, including platform markers
for Linux uvloop and Windows support packages. Development tool versions are constrained in
backend/constraints-dev.txt. Install with `pip install -r requirements-runtime.txt -c constraints-dev.txt -e ".[dev]"`.
Update these files deliberately and rerun PostgreSQL and browser acceptance. Docker installs
runtime dependencies in a separate cached layer before copying application code.

## Chart and recovery checkpoint (2026-09-11)

All required transforms and Table/KPI/Bar/Line/Area/Pie/Donut/Scatter are implemented.
Chart semantics are edited in workflow nodes; dashboards hold references and presentation overrides.
Use Group By upstream for totals; charts reject more than 2000 points rather than silently sampling.
Tables page through backend results. Dashboard names, titles, title visibility and grid layout persist.

Startup waits for database availability before migrations, including simultaneous stack restarts.
Excel XML entity protection is installed through pinned defusedxml.
Run the repeatable 50000-row smoke benchmark with
`backend/.venv/Scripts/python backend/scripts/benchmark_mvp.py`.
Do not run PostgreSQL tests while restart acceptance restarts the same database.
Current release evidence and limitations: [QA report](docs/QA_REPORT.md), [status](STATUS.md).

## MVP 0.1.0 operational limits

Compose binds all published ports to 127.0.0.1. This release is a local single-user application.
Configured Excel source IDs must belong to the workflow project; missing source IDs are rejected
on save, while unconfigured nodes remain valid drafts. Project/source deletion and graph saves
serialize reference changes. Cold workbook loads are shared between concurrent widget requests.

Known non-blocking limits: Float64 arithmetic loses integer precision above 2^53; Join supports
one key pair and inner/left only; Pivot is limited to 128 categories. Optional OR, multi-series
charts, advanced formulas and undo/redo are deferred. Cache bytes exclude Python/engine overhead.
An abrupt process/database failure before upload compensation is journaled can leave an orphaned
file; inspect storage against source metadata before manual cleanup. No automatic orphan purge runs.
The tab-scoped draft survives navigation/reload, but closing the browser tab ends that storage.

Release checks: 208 backend tests, 20 frontend tests and 8 browser scenarios; three PostgreSQL-only
cases skip on SQLite and pass on PostgreSQL. Production Docker builds and OpenAPI drift checks pass.
The release was also installed into a separate stack with fresh database/storage volumes; no existing
project data was reset. See docs/QA_REPORT.md for reproducing the acceptance run.

## Six-screen constructor project (2026-09-15)

Graph authoring improvements: [node labels, dependency view and connected next steps](docs/GRAPH_AUTHORING.md).

The approved opop_bi transfer is complete as ordinary editable Node BI configuration:
168 nodes, six dashboards, 55 widget placements. See the [final acceptance report](docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md)
for the local project link, reference comparison, restart evidence and repeat commands.
Final checks: 247 backend tests, 37 frontend tests and 18 browser scenarios pass.
# Isolated HTTP performance check

From `backend`, run `.venv/Scripts/python -m scripts.benchmark_http` for 100000-row CSV
imports with 3 and 20 columns, Parquet normalization and exact grouped report reads after
server replacement. A separate fresh process verifies graph cache-hit counters, staged updates,
an exact one-cent change and rollback through public APIs. Use `--rows 30 --widths 3` for a smoke check.
This creates and cleans its
own temporary SQLite database/storage and API processes; no running application is needed.
It does not measure browser responsiveness or certify PostgreSQL/migration performance.
See `docs/PRODUCT_EVOLUTION.md` for timing scope and recorded evidence.
