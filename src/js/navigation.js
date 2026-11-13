import { icon } from './utils.js';
export const navigationItems = [
  ['home', 'Início', 'home'],
  ['planner', 'Criar viagem', 'heart'],
  ['itinerary', 'Meu roteiro', 'route'],
  ['explore', 'Explorar Japão', 'compass'],
  ['budget', 'Orçamento', 'wallet'],
  ['seasons', 'Estações e clima', 'flower-2'],
  ['months', 'Comparar os 12 meses', 'calendar-days'],
  ['destinations', 'Destinos e mapa', 'map'],
  ['events', 'Eventos e festivais', 'sparkles'],
  ['food', 'Comidas e compras', 'utensils'],
  ['hotels', 'Hospedagem', 'bed-double'],
  ['transport', 'Transporte', 'train-front'],
  ['packing', 'Malas', 'backpack'],
  ['checklist', 'Checklist e notas', 'notebook-pen'],
  ['rules', 'Regras e documentos', 'shield-check'],
  ['sources', 'Fontes e sobre', 'book-open'],
  ['recommendations', 'Nossa sugestão', 'sparkles'],
];
// A partir desta largura a barra lateral fica fixa; abaixo dela vira gaveta.
export const DRAWER_QUERY = '(max-width: 1279px)';
export const primary = ['home', 'planner', 'itinerary', 'explore', 'budget'];
const shortLabels = {
  home: 'Início',
  planner: 'Criar',
  itinerary: 'Roteiro',
  explore: 'Explorar',
  budget: 'Orçamento',
};
const groups = [
  ['discover', 'Descubra o Japão', ['seasons', 'months', 'destinations', 'events', 'food']],
  ['organize', 'Organização', ['hotels', 'transport', 'packing', 'checklist', 'rules', 'sources']],
];
const item = (id) => navigationItems.find((n) => n[0] === id);
const navLink = ([id, label, i]) =>
  `<a class="nav-link" href="#${id}" data-nav="${id}">${icon(i)}<span>${label}</span></a>`;
export const searchSuggestions = [
  ['#destinations/kyoto', 'Kyoto'],
  ['#destinations/tokyo', 'Tóquio'],
  ['#destinations/naha', 'Okinawa'],
  ['#events', 'Festivais'],
  ['#months', 'Clima por mês'],
  ['#hotels', 'Hospedagem'],
];
export function shellMarkup(state) {
  const base = import.meta.env.BASE_URL;
  return `<aside class="sidebar" id="app-sidebar" aria-label="Navegação principal"><div class="sidebar-head"><a href="#home" class="brand"><img src="${base}icons/sakura.svg" alt="" width="34" height="34" /><span><strong>Japan Diary</strong><small>the 2029 adventure</small></span></a><button type="button" class="icon-button sidebar-close" data-action="menu" aria-label="Fechar menu">${icon('x')}</button></div><nav class="sidebar-nav"><p class="nav-group">O nosso começo</p><div class="primary-links">${primary.map((id) => navLink(item(id))).join('')}</div>${groups.map(([id, label, ids]) => `<details class="nav-disclosure" data-nav-group="${id}"><summary>${label} ${icon('chevron-down')}</summary><div>${ids.map((id) => navLink(item(id))).join('')}</div></details>`).join('')}</nav><div class="sidebar-tools"><button type="button" class="sidebar-theme" data-action="theme">${icon(state.theme === 'dark' ? 'sun' : 'moon')}<span>${state.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}</span></button></div><div class="side-bottom" id="sidebar-progress"></div></aside><div class="menu-backdrop" data-action="menu" aria-hidden="true"></div><div class="workspace"><header class="topbar"><button type="button" class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegação" aria-expanded="false" aria-controls="app-sidebar">${icon('menu')}</button><a href="#home" class="topbar-brand" aria-label="Japan Diary · início"><img src="${base}icons/sakura.svg" alt="" width="28" height="28" /><span>Japan Diary</span></a><div class="breadcrumb"><span class="crumb-root">Um capítulo de cada vez</span><span class="crumb-divider" aria-hidden="true">/</span><strong id="current-page">Início</strong></div><nav class="topbar-tabs" aria-label="Seções principais">${primary.map((id) => `<a href="#${id}" data-tab-nav="${id}">${icon(item(id)[2])}<span>${item(id)[1]}</span></a>`).join('')}</nav><div class="top-actions"><div class="search-wrap" role="search"><label class="search-box">${icon('search')}<input id="global-search" name="diary-search" type="search" placeholder="Buscar no nosso diário…" aria-label="Buscar cidades, atrações e assuntos" aria-controls="search-results" autocomplete="off" enterkeyhint="search" /></label><div id="search-results" class="search-results" aria-live="polite" hidden></div></div><button type="button" class="icon-button search-toggle" data-action="search-open" aria-label="Buscar no diário" aria-haspopup="dialog">${icon('search')}</button><div class="japan-time"><span lang="ja">日本</span> <time id="japan-clock"></time> <span class="muted">JST</span></div><span id="save-status" class="save-status" role="status"></span><button type="button" class="icon-button theme-toggle" data-action="theme" aria-label="Alternar tema claro e escuro">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button><button type="button" class="icon-button" data-action="settings" aria-label="Configurações da viagem">${icon('sliders-horizontal')}</button></div></header><main id="main" tabindex="-1"></main></div><nav class="mobile-primary-nav" aria-label="Ações principais">${primary
    .map(
      (id) =>
        `<a href="#${id}" data-mobile-nav="${id}">${icon(item(id)[2])}<span>${shortLabels[id]}</span></a>`,
    )
    .join(
      '',
    )}</nav><dialog id="search-dialog" class="search-sheet" aria-labelledby="search-sheet-title"><div class="search-sheet-bar" role="search"><h2 id="search-sheet-title" class="sr-only">Buscar no diário</h2><label class="search-field">${icon('search')}<input id="sheet-search" type="search" placeholder="Cidades, atrações ou seções…" aria-label="Buscar cidades, atrações e assuntos" aria-controls="sheet-search-results" autocomplete="off" enterkeyhint="search" /></label><button type="button" class="btn subtle small" data-action="search-close">Fechar</button></div><div id="sheet-search-results" class="search-sheet-results" aria-live="polite">${searchHints()}</div></dialog>`;
}
export function searchHints() {
  return `<p class="search-hint">Digite pelo menos duas letras. Algumas ideias para começar:</p><div class="chip-row">${searchSuggestions.map(([href, label]) => `<a class="chip" href="${href}">${label}</a>`).join('')}</div>`;
}
export function updateNavigation(state, route) {
  const alias = route === 'recommendations' ? 'planner' : route;
  document.querySelectorAll('[data-nav],[data-mobile-nav],[data-tab-nav]').forEach((el) => {
    const current = (el.dataset.nav || el.dataset.mobileNav || el.dataset.tabNav) === alias;
    el.classList.toggle('active', current);
    if (current) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  for (const [id, , ids] of groups)
    if (ids.includes(route)) document.querySelector(`[data-nav-group="${id}"]`).open = true;
  const w = state.planner,
    foot = document.getElementById('sidebar-progress');
  foot.innerHTML = w.started
    ? `<span class="sidebar-note-icon">${icon('bookmark')}</span><p>Nosso próximo capítulo está tomando forma.</p><a href="${w.status === 'accepted' ? '#itinerary' : w.result && !w.dirty ? '#recommendations' : '#planner'}" class="sidebar-continue">${w.status === 'accepted' ? 'Continuar no roteiro' : w.result && !w.dirty ? 'Rever nossa sugestão' : `Continuar · etapa ${w.step} de 6`} ${icon('arrow-right')}</a>`
    : `<span class="sidebar-note-icon">${icon('flower-2')}</span><p>A little guide to our big adventure. ♡</p><a href="#planner" class="sidebar-continue">Escrever nosso começo ${icon('arrow-right')}</a>`;
}
