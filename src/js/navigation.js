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
const primary = ['home', 'planner', 'itinerary', 'explore', 'budget'];
const groups = [
  ['discover', 'Descubra o Japão', ['seasons', 'months', 'destinations', 'events', 'food']],
  ['organize', 'Organização', ['hotels', 'transport', 'packing', 'checklist', 'rules', 'sources']],
];
const navLink = ([id, label, i]) =>
  `<a class="nav-link" href="#${id}" data-nav="${id}">${icon(i)} ${label}</a>`;
export function shellMarkup(state) {
  return `<aside class="sidebar" aria-label="Navegação principal"><a href="#home" class="brand"><img src="${import.meta.env.BASE_URL}icons/sakura.svg" alt="" /><div><strong>Japan Diary</strong><small>the 2029 adventure</small></div></a><nav><div class="nav-group">O NOSSO COMEÇO</div><div class="primary-links">${primary.map((id) => navLink(navigationItems.find((n) => n[0] === id))).join('')}</div>${groups.map(([id, label, ids]) => `<details class="nav-disclosure" data-nav-group="${id}"><summary>${label} ${icon('chevron-down')}</summary><div>${ids.map((id) => navLink(navigationItems.find((n) => n[0] === id))).join('')}</div></details>`).join('')}</nav><div class="side-bottom" id="sidebar-progress"></div></aside><button class="menu-backdrop" data-action="menu" aria-label="Fechar menu"></button><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegação" aria-expanded="false">${icon('menu')}</button><div class="breadcrumb"><span class="crumb-root">Um capítulo de cada vez</span><span class="crumb-divider">/</span><strong id="current-page">Início</strong></div><div class="top-actions"><div class="search-wrap"><label class="search-box">${icon('search')}<input id="global-search" name="diary-search" type="search" placeholder="Buscar no nosso diário…" aria-label="Buscar cidades, atrações e assuntos" aria-controls="search-results" aria-expanded="false" autocomplete="off" /></label><div id="search-results" class="search-results" hidden></div></div><div class="japan-time"><span>日本</span> <time id="japan-clock"></time> <span class="muted">JST</span></div><span id="save-status" class="save-status"></span><button class="icon-button" data-action="theme" aria-label="Alternar tema claro e escuro">${icon('moon')}</button><button class="icon-button" data-action="settings" aria-label="Configurações da viagem">${icon('sliders-horizontal')}</button></div></header><main id="main" tabindex="-1"></main></div><nav class="mobile-primary-nav" aria-label="Ações principais">${primary
    .map((id) => {
      const item = navigationItems.find((n) => n[0] === id);
      return `<a href="#${id}" data-mobile-nav="${id}">${icon(item[2])}<span>${{ home: 'Início', planner: 'Criar', itinerary: 'Roteiro', explore: 'Explorar', budget: 'Orçamento' }[id]}</span></a>`;
    })
    .join('')}</nav>`;
}
export function updateNavigation(state, route) {
  const alias = route === 'recommendations' ? 'planner' : route;
  document.querySelectorAll('[data-nav],[data-mobile-nav]').forEach((el) => {
    const current = (el.dataset.nav || el.dataset.mobileNav) === alias;
    el.classList.toggle('active', current);
    if (current) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  for (const [id, , ids] of groups)
    if (ids.includes(route)) document.querySelector(`[data-nav-group="${id}"]`).open = true;
  const w = state.planner,
    foot = document.getElementById('sidebar-progress');
  foot.innerHTML = w.started
    ? `<span class="sidebar-note-icon">${icon('bookmark')}</span><p>Nosso próximo<br>capítulo está tomando forma.</p><a href="${w.status === 'accepted' ? '#itinerary' : w.result && !w.dirty ? '#recommendations' : '#planner'}" class="sidebar-continue">${w.status === 'accepted' ? 'Continuar no roteiro' : w.result && !w.dirty ? 'Rever nossa sugestão' : `Continuar · etapa ${w.step} de 6`} ${icon('arrow-right')}</a>`
    : `<span class="sidebar-note-icon">${icon('flower-2')}</span><p>A little guide to<br>our big adventure. ♡</p><a href="#planner" class="sidebar-continue">Escrever nosso começo ${icon('arrow-right')}</a>`;
}
