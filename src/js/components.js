import images from '../data/images.json';
import { esc, icon, link, dateLabel } from './utils.js';
export const img = (id, cls = '', eager = false) => {
  const item = images.images.find((i) => i.id === id) || images.images[0];
  const dimensions = {
    hero: [1200, 1800],
    spring: [1000, 667],
    summer: [900, 1350],
    autumn: [900, 1350],
    winter: [900, 1200],
    tokyo: [1000, 1384],
    osaka: [1000, 1500],
    food: [1000, 750],
  }[item.id] || [1000, 1000];
  return `<img width="${dimensions[0]}" height="${dimensions[1]}" src="${import.meta.env.BASE_URL}${esc(item.file)}" alt="${esc(item.alt)}" class="${cls}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
export const btn = (text, action, extra = '', cls = '') =>
  `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
export const go = (id, text, cls = '') => `<a href="#${id}" class="btn ${cls}">${text}</a>`;
export const observed = (value, unit = '') =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat('pt-BR').format(value)}${unit}`
    : 'Dado indisponível';
export const source = (name, url, period = 'Referência editorial', date = '2026-11-13') =>
  `<div class="source"><span>Fonte: ${link(url, name)}</span><span>Período: ${esc(period)}</span><span>Verificado: ${dateLabel(date)}</span></div>`;
export const notice = (text, cls = '') =>
  `<div class="notice ${cls}">${icon('info')}<div>${text}</div></div>`;
export const empty = (text) => `<div class="empty">${icon('notebook-pen')}<p>${text}</p></div>`;
export const field = (label, name, value, opts = '') => {
  const numeric = opts.includes('type="number"');
  const mode = numeric ? `inputmode="${opts.includes('step="1"') ? 'numeric' : 'decimal'}"` : '';
  return `<label>${label}<input name="${name}" value="${esc(value ?? '')}" ${opts.includes('autocomplete=') ? '' : 'autocomplete="off"'} ${mode} ${opts} /></label>`;
};
export const opt = (value, label, current) =>
  `<option value="${esc(value)}" ${String(current) === String(value) ? 'selected' : ''}>${esc(label)}</option>`;
export const heading = (eyebrow, title, description, actions = '') =>
  `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${actions ? `<div class="button-row no-print">${actions}</div>` : ''}</header>`;
export const checkItem = (id, title, checked, group) =>
  `<label class="check-item ${checked ? 'checked' : ''}"><input type="checkbox" data-check="${group}" data-id="${esc(id)}" ${checked ? 'checked' : ''} /><span>${esc(title)}</span></label>`;
