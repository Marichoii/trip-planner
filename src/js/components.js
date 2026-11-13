import images from '../data/images.json';
import { destinationArt, regionSlug } from '../data/destination-art.js';
import { esc, icon, link, dateLabel } from './utils.js';
const dimensions = {
  hero: [1200, 1800],
  spring: [1000, 667],
  summer: [900, 1350],
  autumn: [900, 1350],
  winter: [900, 1200],
  tokyo: [1000, 1384],
  osaka: [1000, 1500],
  food: [1000, 750],
};
// Cartões ocupam ~1/3 da largura no desktop, metade no tablet e quase toda a tela no celular.
export const CARD_SIZES = '(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw';
export const img = (id, cls = '', eager = false, sizes = CARD_SIZES) => {
  const item = images.images.find((i) => i.id === id) || images.images[0];
  const [width, height] = dimensions[item.id] || [1000, 1000];
  const base = import.meta.env.BASE_URL + esc(item.file.replace(/\.jpg$/, ''));
  const srcset = (item.id === 'hero' ? [480, 800, 1200] : [480, 800])
    .map((w) => `${base}-${w}.webp ${w}w`)
    .join(', ');
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}" /><img width="${width}" height="${height}" src="${import.meta.env.BASE_URL}${esc(item.file)}" alt="${esc(item.alt)}" class="${cls}" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async" /></picture>`;
};
// Capa de destino: foto própria quando existe; caso contrário, um cartão-postal tipográfico.
export function cover(d, { eager = false, sizes = CARD_SIZES } = {}) {
  const art = destinationArt[d.id] || {};
  if (art.photo)
    return `<span class="cover cover-photo">${img(art.photo, '', eager, sizes)}</span>`;
  return `<span class="cover cover-postcard" data-region="${regionSlug(d.region)}" aria-hidden="true"><span class="cover-kanji" lang="ja">${esc(art.jp || d.name)}</span><span class="cover-stamp"><small>Japan</small><span>${esc(d.region)}</span></span></span>`;
}
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
