"use strict";

const colors = {
  plum: "#4c102a",
  blue: "#2b2dba",
  lime: "#20ff6a",
  teal: "#0a6c50",
  yellow: "#eedb4b",
  orchid: "#b85fd5",
  orange: "#ff7931",
  coral: "#ec221f",
  red: "#ff0000",
  green: "#1faf29",
  gray: "#808080",
  brown: "#8a5006",
  black: "#000000",
  clear: "transparent",
};

// Each group follows the order of the design legend.
const groups = [
  ["Ежедневная забота", [
    ["Расходы на содержание", "plum", "clear"],
    ["Содержание приюта", "plum", "plum", "coral", "horizontal"],
    ["Корм", "plum", "plum", "coral", "vertical"],
    ["Лечение", "plum", "plum", "coral", "grid"],
    ["Наполнитель и уход", "plum"],
  ]],
  ["Новый дом", [
    ["Нашли дом", "blue"],
    ["Переданы под опеку", "blue", "blue", "orange", "vertical"],
    ["На передержке", "blue", "blue", "orange", "horizontal"],
    ["Встречи с семьями", "blue", "blue", "plum", "horizontal"],
  ]],
  ["Ветеринарная помощь", [
    ["Ветеринарные процедуры", "lime"],
    ["Осмотры", "lime", "teal"],
    ["Прививки", "lime", "lime", "teal", "vertical"],
    ["Обработки", "lime", "lime", "teal", "grid"],
    ["Стерилизация", "lime", "plum"],
    ["Анализы", "lime", "yellow"],
    ["Чипирование", "lime", "orchid"],
    ["Стоматология", "lime", "orange"],
    ["Срочные осмотры", "coral", "coral", "black", "vertical"],
    ["Срочные операции", "coral", "coral", "black", "horizontal"],
  ]],
  ["Помещения и инвентарь", [
    ["Обустройство приюта", "orange"],
    ["Ремонт вольеров", "orange", "orange", "green", "vertical"],
    ["Переноски", "red"],
    ["Оборудование клиники", "red", "plum"],
    ["Когтеточки", "teal", "teal", "orchid", "vertical"],
    ["Лежанки", "orchid", "orchid", "teal", "vertical"],
    ["Услуги подрядчиков", "yellow"],
    ["Износ инвентаря", "gray"],
    ["Резерв на ремонт", "brown"],
  ]],
  ["Поступления", [
    ["Частные пожертвования", "green"],
    ["Ярмарки", "teal"],
    ["Резерв приюта", "orchid", "teal"],
    ["Опека на месяц", "orchid"],
    ["Помощь партнёров", "orange", "green"],
    ["Целевые сборы", "orange", "orchid"],
    ["Регулярные взносы", "yellow", "green"],
  ]],
];

function texture(color, layout, patterned) {
  const vertical = `linear-gradient(90deg, transparent 27.976%, ${color} 27.976% 38.69%, transparent 38.69% 61.31%, ${color} 61.31% 72.024%, transparent 72.024%)`;
  const horizontal = `linear-gradient(180deg, transparent 25%, ${color} 25% 41.667%, transparent 41.667% 58.333%, ${color} 58.333% 75%, transparent 75%)`;
  const repeat = (angle) => `repeating-linear-gradient(${angle}, transparent 0 var(--pattern-line), ${color} var(--pattern-line) calc(2 * var(--pattern-line)), transparent calc(2 * var(--pattern-line)) calc(3 * var(--pattern-line)))`;
  const horizontalFill = patterned ? repeat("180deg") : horizontal;
  const verticalFill = patterned && layout === "grid" ? repeat("90deg") : vertical;
  return { vertical, horizontal: horizontalFill, grid: `${verticalFill}, ${horizontalFill}` }[layout] ?? "none";
}

const palette = groups.flatMap(([group, definitions]) =>
  definitions.map(([label, edge, fill = edge, stripe, layout]) => ({
    group,
    label,
    edge: colors[edge],
    fill: colors[fill],
    innerEdge: fill !== edge && fill !== "clear" ? colors[fill] : "transparent",
    plain: texture(colors[stripe], layout, false),
    pattern: texture(colors[stripe], layout, true),
  }))
);
