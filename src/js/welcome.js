import { seasons } from '../data/planning.js';
import climate from '../data/climate.json';
import { img, go } from './components.js';
import { icon, esc, monthShort } from './utils.js';
import { dashboardState } from './dashboard.js';

export const homeTabs = [
  ['seasons', 'Estações', 'flower-2'],
  ['map', 'Mapa', 'map'],
  ['climate', 'Clima', 'cloud-sun'],
  ['progress', 'Meu plano', 'route'],
];
const selectedTab = (ui) => (homeTabs.some(([id]) => id === ui.homeTab) ? ui.homeTab : 'seasons');

function seasonPanel(s) {
  const moods = {
    spring: 'Cerejeiras & novos começos',
    summer: 'Ilhas, festivais & dias longos',
    autumn: 'Folhas douradas & caminhos',
    winter: 'Neve, onsen & dias tranquilos',
  };
  return `<div class="home-season-grid">${seasons.map((v, i) => `<article class="home-season" data-season="${v.id}"><a href="#seasons/${v.id}"><span class="home-season-image">${img(v.id, '', false, '(min-width:1280px) 20vw, (min-width:768px) 22vw, 45vw')}<span lang="ja" aria-hidden="true">${v.jp}</span><span class="season-index" aria-hidden="true">0${i + 1}</span></span><span class="home-season-copy"><small>${v.months}</small><strong>${v.name} ${icon('arrow-up-right')}</strong><span>${moods[v.id]}</span></span></a><button class="home-season-save ${s.trip.selectedSeason === v.id ? 'favorited' : ''}" data-action="favorite-season" data-id="${v.id}" aria-label="${s.trip.selectedSeason === v.id ? 'Desmarcar' : 'Favoritar'} ${v.name}" aria-pressed="${s.trip.selectedSeason === v.id}">${icon('heart')}</button></article>`).join('')}</div>`;
}
function mapPanel(s) {
  const { points, personalMap } = dashboardState(s);
  return `<section class="home-map-panel" aria-labelledby="home-map-title"><div class="home-panel-intro"><div><h3 id="home-map-title">${personalMap ? 'Os lugares de vocês' : 'Um lugar pode ser o começo.'}</h3><p>${personalMap ? 'Destinos do seu planejamento.' : 'Cinco ideias para explorar. O roteiro continua em aberto.'}</p></div><a class="home-text-link" href="#destinations">Todos os destinos ${icon('arrow-up-right')}</a></div><div class="map-frame" data-map="home-map"><div id="home-map" class="map" role="region" aria-label="Mapa interativo de destinos do Japão" tabindex="0"></div><button class="icon-button map-frame-toggle" type="button" data-action="expand-map" data-id="home-map" aria-label="Ampliar mapa" aria-expanded="false">${icon('expand')}</button></div><div class="home-map-destinations">${points.map((d, i) => `<a href="#destinations/${d.id}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(d.name)}</a>`).join('')}</div><p class="home-data-note">Pontos de referência, sem cálculo de trajetos.</p></section>`;
}
function climatePanel(s, ui) {
  const city = climate.cities.find((c) => c.id === ui.city) || climate.cities[0];
  const { profile } = dashboardState(s);
  return `<section class="home-climate-panel home-climate-card" aria-labelledby="home-climate-title"><div class="home-panel-intro"><div><h3 id="home-climate-title">Encontre a sua época.</h3><p>Temperatura média por mês · °C</p></div><label class="home-city-label" for="home-climate-city"><span class="sr-only">Cidade do gráfico de clima</span><select id="home-climate-city" data-ui="city">${climate.cities.map((c) => `<option value="${c.id}" ${c.id === city.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div><div class="home-chart"><canvas id="home-climate-chart" role="img" aria-label="Temperaturas médias mensais de ${esc(city.name)}. Valores na tabela abaixo."></canvas></div><p class="home-data-note">JMA · médias históricas de ${climate.period}, não previsão para ${profile.year}.</p><details class="home-climate-data"><summary>Ver valores por mês ${icon('chevron-down')}</summary><dl>${city.temperature.map((v, i) => `<div><dt>${monthShort[i]}</dt><dd>${v.toLocaleString('pt-BR')} °C</dd></div>`).join('')}</dl></details><a href="#months" class="home-text-link">Comparar clima e chuva ${icon('arrow-right')}</a></section>`;
}
function progressPanel(s) {
  const { profile, completed } = dashboardState(s);
  const steps = [
    ['Escolha a época', '#planner/1', !!profile.season],
    ['Conte o que vocês amam', '#planner/3', profile.interests.length > 0],
    [
      'Revise e escolha seu roteiro',
      s.planner.result ? '#recommendations' : '#planner',
      s.routeChosen,
    ],
  ];
  return `<section class="home-progress-panel" aria-labelledby="home-progress-title"><div class="home-panel-intro"><div><h3 id="home-progress-title">Um passo de cada vez.</h3><p>Você pode voltar e mudar qualquer escolha.</p></div><span class="home-step-count">${completed}<small> / 6 etapas percorridas</small></span></div><div class="home-progress-track" role="progressbar" aria-label="Etapas percorridas no planejamento" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${completed}">${Array.from({ length: 6 }, (_, i) => `<span class="${i < completed ? 'is-done' : ''}"></span>`).join('')}</div><ol class="home-quests">${steps.map(([title, href, done], i) => `<li><span class="home-quest-number ${done ? 'is-done' : ''}" aria-hidden="true">${done ? icon('check') : String(i + 1).padStart(2, '0')}</span><a href="${href}">${title}<span class="sr-only">${done ? ', concluída' : ''}</span>${icon('arrow-up-right')}</a></li>`).join('')}</ol></section>`;
}
export function homeHub(s, ui = {}) {
  const active = selectedTab(ui);
  const panels = {
    seasons: () => seasonPanel(s),
    map: () => mapPanel(s),
    climate: () => climatePanel(s, ui),
    progress: () => progressPanel(s),
  };
  return `<section id="home-hub" class="home-hub" aria-labelledby="home-hub-title"><div class="home-hub-heading"><div><p class="eyebrow">UM PAÍS, MUITAS POSSIBILIDADES</p><h2 id="home-hub-title">Qual é o seu Japão?</h2></div><div class="home-tabs" role="tablist" aria-label="Explorar e acompanhar a viagem">${homeTabs.map(([id, label, glyph]) => `<button type="button" id="home-tab-${id}" role="tab" data-home-tab="${id}" aria-selected="${active === id}" aria-controls="home-panel-${id}" tabindex="${active === id ? '0' : '-1'}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div></div><div class="home-panels">${homeTabs.map(([id]) => `<div id="home-panel-${id}" role="tabpanel" aria-labelledby="home-tab-${id}" tabindex="0" ${active === id ? '' : 'hidden'}>${active === id ? panels[id]() : ''}</div>`).join('')}</div></section>`;
}
export function welcomeView(s, ui = {}) {
  const { profile, continueUrl } = dashboardState(s);
  const started = s.planner.started || s.routeChosen;
  return `<div class="home-journal"><section class="welcome-hero home-hero" aria-labelledby="welcome-title"><div class="home-hero-copy"><p class="eyebrow"><span class="japan-dot" aria-hidden="true"></span> NOSSA VIAGEM · ${profile.year}</p><h1 id="welcome-title" tabindex="-1">Próxima parada:<br><span>Japão.</span><svg class="hero-spark" viewBox="0 0 60 60" aria-hidden="true"><path d="m30 3 4 19 17-10-11 17 18 5-20 3 8 17-16-12-8 15-1-19-18 2 17-11L9 14l18 9Z" fill="currentColor"/></svg></h1><p class="home-intro">Entre um ramen e uma nova descoberta,<br>uma viagem com a nossa cara.</p><div class="home-hero-actions">${go(started ? continueUrl.slice(1) : 'planner', `${started ? 'Continuar nosso planejamento' : 'Vamos planejar nossa viagem'} ${icon('arrow-up-right')}`, 'home-start')}</div><p class="home-friendly-note">${icon('check')} Sem pressa. O primeiro passo já é parte da viagem.</p></div><div class="home-postcards"><span class="postcard-orbit" aria-hidden="true"></span><svg class="postcard-path" viewBox="0 0 540 480" fill="none" aria-hidden="true"><path d="M20 160C-30 30 160 5 210 140S500 380 500 225 420 430 70 430" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 7"/></svg><figure class="home-postcard"><div class="postcard-photo">${img('hero', '', true, '(min-width:1280px) 32vw, (min-width:768px) 42vw, 85vw')}<span class="postcard-jp" lang="ja" aria-hidden="true">京都</span></div><figcaption><span>${icon('map-pin')} Um encontro com Kyoto.</span><span aria-hidden="true">♡</span></figcaption></figure><div class="postcard-mini" aria-hidden="true">${img('spring', '', false, '160px')}<span>Um dia, a gente aqui.</span></div><div class="postcard-seal" aria-hidden="true"><span lang="ja">日本</span><small>nos vemos lá!</small></div><div class="postcard-controls"><span>Cartões de uma viagem que vem aí.</span><button type="button" class="icon-button motion-toggle" data-motion-toggle aria-label="Pausar animações" title="Pausar animações" aria-pressed="false"><svg class="motion-pause" aria-hidden="true" viewBox="0 0 20 20"><path d="M6 5v10M14 5v10" stroke="currentColor" stroke-width="2"/></svg><svg class="motion-play" aria-hidden="true" viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" fill="currentColor"/></svg></button></div></div></section><section class="home-ticket" aria-label="Resumo da viagem"><div class="ticket-destination"><span class="ticket-plane">${icon('plane')}</span><div><small>PASSAPORTE PARA NOVAS HISTÓRIAS</small><strong>Brasil <span aria-hidden="true">→</span> Japão <span lang="ja" aria-hidden="true">日本</span></strong></div></div><div class="ticket-detail"><small>QUEM VAI</small><strong>${profile.travelers} ${profile.travelers === 1 ? 'viajante' : 'viajantes'}</strong></div><div class="ticket-detail"><small>TEMPO PARA EXPLORAR</small><strong>${profile.days} dias <span> / ${profile.nights} noites</span></strong></div><button type="button" class="ticket-edit" data-action="edit-trip-profile" aria-label="Editar viajantes e duração da viagem">${icon('sliders-horizontal')}<span>Ajustar viagem</span></button></section>${homeHub(s, ui)}<div class="home-note"><span class="home-note-mark" aria-hidden="true">✳</span><span>O melhor da viagem começa na vontade de ir.</span><time id="home-clock"></time></div></div>`;
}
export function exploreView() {
  const topics = [
    [
      'seasons',
      'flower-2',
      'O Japão em quatro estações',
      'Clima, paisagens e jeitos diferentes de viajar.',
      'spring',
    ],
    [
      'destinations',
      'map',
      'Lugares para se apaixonar',
      'Explore regiões e guarde seus destinos favoritos.',
      'hero',
    ],
    [
      'events',
      'sparkles',
      'O calendário dos sonhos',
      'Festivais, flores, neve e tradições.',
      'autumn',
    ],
    [
      'food',
      'utensils',
      'Sabores & pequenos garimpos',
      'Comidas, lojas e desejos para a mala.',
      'food',
    ],
  ];
  return `<div class="explore-page"><header class="editorial-heading"><p class="eyebrow">UM POUCO DE CURIOSIDADE LEVA LONGE</p><h1 tabindex="-1">O Japão tem<br>muito para contar.</h1><p>Explore sem compromisso. Uma descoberta pode virar o começo da nossa viagem.</p>${go('planner', `${icon('heart')} Levar essas ideias para a viagem`, 'secondary')}</header><div class="explore-grid">${topics.map(([id, i, title, description, image]) => `<a class="explore-story" href="#${id}"><span class="explore-story-photo">${img(image, '', false, '(min-width: 768px) 45vw, 92vw')}</span><div class="explore-story-body"><span class="explore-story-icon">${icon(i)}</span><h2>${title}</h2><p>${description}</p><span class="text-button">Descobrir ${icon('arrow-right')}</span></div></a>`).join('')}</div><section class="explore-tools"><p class="eyebrow">PARA QUANDO CHEGAR A HORA DOS DETALHES</p><h2>Os detalhes também têm seu lugar.</h2><p>Hospedagem, transporte, malas e documentos podem esperar o momento certo.</p><div class="chip-row">${[
    ['months', 'Comparar os 12 meses'],
    ['hotels', 'Onde ficar'],
    ['transport', 'Como se deslocar'],
    ['packing', 'Preparar as malas'],
    ['rules', 'Regras e documentos'],
  ]
    .map(([id, t]) => go(id, esc(t), 'secondary small'))
    .join('')}</div></section></div>`;
}
