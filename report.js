'use strict';

const byId = id => document.getElementById(id);
const palette = ['#3378bd', '#23816d', '#a7622a'];
const locations = { finance: 'finance-charts', cash: 'cash-charts', taxes: 'tax-charts' };

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function axes(canvas, data, kind) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 100 || height < 50) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.font = '12px system-ui, Arial, sans-serif';
  const [low, high] = data.domain;
  const horizontal = kind === 'horizontal';
  const left = horizontal ? Math.min(160, width / 3) : 78;
  const right = width - 18;
  const top = 14;
  const bottom = height - 30;
  const xValue = value => left + (value - low) * (right - left) / (high - low);
  const yValue = value => bottom - (value - low) * (bottom - top) / (high - low);
  const span = (horizontal ? bottom - top : right - left) / Math.max(1, data.labels.length);
  ctx.textBaseline = 'middle';
  for (const [tick, label] of data.ticks) {
    const position = horizontal ? xValue(tick) : yValue(tick);
    ctx.strokeStyle = tick === 0 ? '#8ba2b8' : '#e1eaf3';
    ctx.beginPath();
    if (horizontal) { ctx.moveTo(position, top); ctx.lineTo(position, bottom); }
    else { ctx.moveTo(left, position); ctx.lineTo(right, position); }
    ctx.stroke();
    ctx.fillStyle = '#465d76';
    ctx.textAlign = horizontal ? 'center' : 'right';
    ctx.fillText(label, horizontal ? position : left - 6, horizontal ? bottom + 13 : position, horizontal ? 82 : left - 8);
  }
  for (const [index, label] of data.labels.entries()) {
    const position = (horizontal ? top : left) + (index + 0.5) * span;
    ctx.textAlign = horizontal ? 'right' : 'center';
    ctx.fillStyle = '#334c68';
    const stride = !horizontal && width < 460 ? 2 : 1;
    if (index % stride === 0) ctx.fillText(label, horizontal ? left - 8 : position, horizontal ? position : bottom + 14, horizontal ? left - 12 : span + 4);
  }
  const size = Math.min(horizontal ? 17 : 24, span * 0.76 / Math.max(1, data.series.length));
  for (const [index, series] of data.series.entries()) {
    ctx.strokeStyle = ctx.fillStyle = palette[index];
    const offset = (index - (data.series.length - 1) / 2) * size;
    let previous;
    for (const [i, value] of series.values.entries()) {
      if (value === null) { previous = undefined; continue; }
      const center = (horizontal ? top : left) + (i + 0.5) * span;
      if (kind === 'line') {
        const point = [center, yValue(value)];
        if (previous) { ctx.beginPath(); ctx.moveTo(...previous); ctx.lineTo(...point); ctx.lineWidth = 2.2; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(...point, 3, 0, 2 * Math.PI); ctx.fill();
        previous = point;
      } else if (horizontal) {
        const start = xValue(0), end = xValue(value);
        ctx.fillRect(Math.min(start, end), center + offset - size / 2, Math.abs(end - start), size * 0.88);
      } else {
        const start = yValue(0), end = yValue(value);
        ctx.fillRect(center + offset - size / 2, Math.min(start, end), size * 0.88, Math.abs(end - start));
      }
    }
  }
}

function makeTable(data, open) {
  const details = element('details');
  details.open = open;
  details.append(element('summary', data.title));
  const scroll = element('div', undefined, 'table-scroll');
  scroll.tabIndex = 0;
  const table = element('table');
  const head = table.createTHead().insertRow();
  for (const header of data.headers) {
    const th = element('th', header);
    th.scope = 'col';
    head.append(th);
  }
  const body = table.createTBody();
  for (const values of data.rows) {
    const row = body.insertRow();
    for (const value of values) row.insertCell().textContent = value;
  }
  scroll.append(table);
  details.append(scroll);
  return details;
}

function show(snapshot) {
  byId('report-title').textContent = snapshot.title;
  byId('subtitle').textContent = snapshot.subtitle;
  let mask = 0;
  let multiple = false;
  let renderers = [];
  function select(button, label, action) {
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    byId('companies').append(button);
    return button;
  }
  const all = select(element('button'), 'Все компании', () => { mask = 0; render(); });
  const companies = snapshot.companies.map((name, index) => {
    const bit = 1 << index;
    return select(element('button'), name, () => {
      mask = multiple ? mask ^ bit : bit;
      render();
    });
  });
  const toggle = select(element('button'), 'Выбрать несколько', () => {
    multiple = !multiple;
    toggle.setAttribute('aria-pressed', String(multiple));
  });
  toggle.setAttribute('aria-pressed', 'false');

  function render() {
    const view = snapshot.views[String(mask)];
    if (!view) throw new Error('Missing presentation view');
    all.setAttribute('aria-pressed', String(mask === 0));
    companies.forEach((button, i) => button.setAttribute('aria-pressed', String(Boolean(mask & (1 << i)))));
    byId('scope').textContent = view.scope;
    byId('cards').replaceChildren(...view.cards.map(card => {
      const panel = element('article', undefined, 'card');
      panel.append(element('h3', card.title), element('p', card.value, 'value'), element('p', card.subtitle, 'unit'));
      return panel;
    }));
    Object.values(locations).forEach(id => byId(id).replaceChildren());
    renderers = snapshot.charts.map((spec, index) => {
      const data = view.charts[index];
      const panel = element('article', undefined, spec.wide ? 'panel wide' : 'panel');
      const canvas = element('canvas');
      const legend = element('div', undefined, 'legend');
      data.series.forEach(series => legend.append(element('span', series.label)));
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', spec.title);
      panel.append(element('h3', spec.title), legend, canvas);
      byId(locations[spec.section]).append(panel);
      return () => axes(canvas, data, spec.kind);
    });
    const previous = [...byId('tables').children].map(table => table.open);
    byId('tables').replaceChildren(...view.tables.map((table, index) => makeTable(table, previous[index] ?? index === 0)));
    renderers.forEach(draw => draw());
  }
  render();
  window.addEventListener('resize', () => renderers.forEach(draw => draw()));
}

try {
  show(JSON.parse(byId('demo-snapshot').textContent));
} catch {
  byId('error').hidden = false;
}
