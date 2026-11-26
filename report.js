"use strict";

// Pairs are [fact, plan]. Money is expressed in thousands of rubles.
const months = [
  { name: "Июнь", short: "Июн", placements: [18, 16], care: [[34, 32], [17, 18], [14, 13], [11, 12]], income: [[155, 150], [74, 65], [45, 40]], expenses: [[83, 85], [77, 72], [57, 60], [24, 26]] },
  { name: "Июль", short: "Июл", placements: [21, 19], care: [[38, 34], [20, 20], [17, 14], [13, 13]], income: [[170, 155], [66, 65], [42, 42]], expenses: [[89, 88], [80, 75], [58, 60], [29, 28]] },
  { name: "Август", short: "Авг", placements: [22, 21], care: [[36, 36], [19, 22], [18, 15], [14, 14]], income: [[184, 165], [83, 75], [47, 43]], expenses: [[93, 92], [83, 80], [59, 61], [27, 30]] },
  { name: "Сентябрь", short: "Сен", placements: [28, 24], care: [[43, 38], [24, 23], [22, 17], [14, 15]], income: [[193, 175], [97, 80], [50, 44]], expenses: [[97, 96], [91, 84], [63, 65], [31, 33]] },
  { name: "Октябрь", short: "Окт", placements: [25, 25], care: [[44, 40], [22, 24], [20, 19], [16, 16]], income: [[205, 187], [88, 84], [55, 48]], expenses: [[98, 99], [96, 89], [74, 73], [34, 33]] },
  { name: "Ноябрь", short: "Ноя", placements: [30, 28], care: [[46, 42], [27, 24], [24, 20], [18, 17]], income: [[230, 200], [108, 90], [50, 50]], expenses: [[96, 104], [112, 94], [82, 86], [32, 36]] },
];
const categories = {
  care: [10, 11, 12, 14],
  income: [28, 32, 33],
  expenses: [2, 3, 1, 4],
};
const placementsStyle = 5;
const number = new Intl.NumberFormat("ru-RU");
const signed = new Intl.NumberFormat("ru-RU", { signDisplay: "exceptZero" });
const period = document.querySelector("#period");
const modes = [...document.querySelectorAll("[data-mode]")];
const byId = (id) => document.getElementById(id);

function sum(pairs) {
  return pairs.reduce(([fact, plan], [nextFact, nextPlan]) => [fact + nextFact, plan + nextPlan], [0, 0]);
}

function mark(index, plan = false, height = "") {
  const { edge, fill, innerEdge, plain, pattern } = palette[index];
  return `<span class="mark${plan ? " plan" : ""}" aria-hidden="true" style="--edge:${edge};--fill:${fill};--inner-edge:${innerEdge};--plain:${plain};--pattern:${pattern};${height}"></span>`;
}

function chartKey(index) {
  return `<span>${mark(index)} Факт</span><span>${mark(index, true)} План</span>`;
}

function kpi(label, pair, index, unit = "") {
  const [fact, plan] = pair;
  const variance = Math.round((fact / plan - 1) * 100);
  return `<article class="kpi" style="--edge:${palette[index].edge}">
    <h2>${label}</h2><p class="kpi-value">${number.format(fact)}${unit}</p>
    <p class="kpi-note">План ${number.format(plan)}${unit} <strong>${signed.format(variance)}% к плану</strong></p>
  </article>`;
}

function table(rows, firstHeader, unit = "", total = null) {
  return `<div class="table-wrap"><table>
    ${unit ? `<caption>${unit}</caption>` : ""}
    <thead><tr><th scope="col">${firstHeader}</th><th scope="col">Факт</th><th scope="col">План</th><th scope="col">Разница</th></tr></thead>
    <tbody>${rows.map(({ label, pair }) => `<tr><th scope="row">${label}</th><td>${number.format(pair[0])}</td><td>${number.format(pair[1])}</td><td>${signed.format(pair[0] - pair[1])}</td></tr>`).join("")}</tbody>
    ${total ? `<tfoot><tr><th scope="row">Всего</th><td>${number.format(total[0])}</td><td>${number.format(total[1])}</td><td>${signed.format(total[0] - total[1])}</td></tr></tfoot>` : ""}
  </table></div>`;
}

function dataDetails(rows, heading, unit, total) {
  return `<details><summary>Данные диаграммы</summary>${table(rows, heading, unit, total)}</details>`;
}

function chartScale(maximum, interval) {
  const step = Math.ceil(maximum / (4 * interval)) * interval;
  return step * 4;
}

function chart(columns, scale, content, extraClass = "") {
  return `<div class="histogram ${extraClass}" aria-hidden="true" style="--count:${columns.length}">
    <div class="scale">${[0, 1, 2, 3, 4].map((tick) =>
      `<span style="--position:${tick * 25}%">${number.format(tick * scale / 4)}</span>`
    ).join("")}</div>
    <div class="plot">${columns.map((column) => `<div class="pair">${content(column)}</div>`).join("")}</div>
    <div class="x-labels">${columns.map(({ short }) => `<span>${short}</span>`).join("")}</div>
  </div>`;
}

function comparison(rows, interval, heading, className = "") {
  const scale = chartScale(Math.max(...rows.flatMap(({ pair }) => pair)), interval);
  return chart(rows, scale, ({ pair, index }) => pair.map((value, mode) => `<div class="value-column" style="--height:${100 * value / scale}%">
    <span class="bar-value">${number.format(value)}</span>${mark(index, mode === 1)}
    </div>`).join(""), className) + dataDetails(rows, heading, "", sum(rows.map(({ pair }) => pair)));
}

function categoryTotals(selected, key) {
  return categories[key].map((index, position) => ({
    index,
    label: palette[index].label,
    pair: sum(selected.map((month) => month[key][position])),
  }));
}

function fundingChart(columns) {
  const scale = chartScale(Math.max(...columns.flatMap(({ total }) => total)), 100);
  const graphic = chart(columns, scale, ({ rows, total }) => total.map((value, mode) => `<div class="stack" style="--height:${100 * value / scale}%">
    ${rows.map(({ index, pair }) => mark(index, mode === 1, `--share:${100 * pair[mode] / value}%`)).join("")}
    <span class="bar-value">${number.format(value)}</span><span class="stack-mode">${mode === 0 ? "Факт" : "План"}</span>
  </div>`).join(""));
  const categories = columns.flatMap(({ rows }) => rows);
  return graphic + `<ul class="composition-key">${categories.map(({ index, label }) => `<li>${mark(index)} ${label}</li>`).join("")}</ul>` +
    dataDetails(columns.flatMap(({ short, rows, total }) => [...rows, { label: `${short} · всего`, pair: total }]), "Статья", "Тысячи рублей");
}

function renderLegend() {
  const groups = new Map();
  palette.forEach(({ group, label }, index) => {
    const card = `<figure class="swatch"><figcaption>${label}</figcaption>
      <div class="swatch-pair"><p>${mark(index)}Факт</p><p>${mark(index, true)}План</p></div>
    </figure>`;
    groups.set(group, (groups.get(group) ?? "") + card);
  });
  byId("legend-catalog").innerHTML = [...groups].map(([group, cards]) =>
    `<section class="legend-group"><h3>${group}</h3><div class="legend-grid">${cards}</div></section>`
  ).join("");
}

function renderReport() {
  const selected = { all: months, summer: months.slice(0, 3), autumn: months.slice(3) }[period.value];
  const placements = selected.map(({ name, short, placements }) => ({ label: name, short, pair: placements, index: placementsStyle }));
  const care = categoryTotals(selected, "care");
  const income = categoryTotals(selected, "income");
  const expenses = categoryTotals(selected, "expenses");
  const totalPlacements = sum(placements.map(({ pair }) => pair));
  const totalCare = sum(care.map(({ pair }) => pair));
  const totalIncome = sum(income.map(({ pair }) => pair));
  const totalExpenses = sum(expenses.map(({ pair }) => pair));
  const expanded = ["placements", "care", "funding"].filter((id) => byId(id).querySelector("details[open]"));
  byId("kpis").innerHTML = [
    kpi("Нашли дом", totalPlacements, placementsStyle),
    kpi("Ветеринарные процедуры", totalCare, 10),
    kpi("Поступления", totalIncome, 28, " тыс. ₽"),
  ].join("");
  byId("placements").innerHTML = comparison(placements, 10, "Месяц");
  byId("care").innerHTML = comparison(care.map((row) => ({ ...row, short: row.label })), 25, "Процедура", "care-plot");
  byId("funding").innerHTML = fundingChart([
    { short: "Поступления", rows: income, total: totalIncome },
    { short: "Расходы", rows: expenses, total: totalExpenses },
  ]);
  byId("budget").innerHTML = table(expenses.map(({ index, label, pair }) => ({
    label: `<span class="table-label">${mark(index)}${label}</span>`,
    pair,
  })), "Статья", "", totalExpenses);
  expanded.forEach((id) => { byId(id).querySelector("details").open = true; });
  byId("period-note").hidden = period.value === "summer";
  byId("report-status").textContent = `${period.selectedOptions[0].textContent}. Нашли дом ${number.format(totalPlacements[0])}.`;
}

function setMode(button) {
  document.documentElement.dataset.chartStyle = button.dataset.mode;
  modes.forEach((mode) => mode.setAttribute("aria-pressed", String(mode === button)));
  byId("report-status").textContent = `Стиль столбиков — ${button.textContent.toLowerCase()}.`;
}

period.addEventListener("change", renderReport);
modes.forEach((button) => button.addEventListener("click", () => setMode(button)));
byId("placements-key").innerHTML = chartKey(placementsStyle);
byId("care-key").innerHTML = chartKey(10);
renderReport();
renderLegend();
