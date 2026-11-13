import { mochiEditorTools } from './mochi-components.js';
import {
  seasons,
  monthly,
  criteria,
  qualitativeScores,
  checklist,
  packing,
  food,
  stores,
  shoppingCategories,
} from '../data/planning.js';
import destinations from '../data/destinations.js';
import climate from '../data/climate.json';
import tourism from '../data/tourism.json';
import events from '../data/events.json';
import legal from '../data/legal.json';
import images from '../data/images.json';
import {
  esc,
  icon,
  link,
  money,
  number,
  monthNames,
  monthShort,
  dateLabel,
  tripDayDate,
} from './utils.js';
import { calculateBudget, scenarios, lodgingCost, transportCost, wishlistCost } from './budget.js';
import { routeNames, routeName, cityForDay, validateRoute } from './itinerary.js';
export {
  seasons,
  destinations,
  climate,
  tourism,
  events,
  legal,
  images,
  food,
  checklist,
  packing,
  criteria,
  qualitativeScores,
};
import {
  img,
  btn,
  go,
  observed,
  source,
  notice,
  empty,
  field,
  opt,
  heading,
  checkItem,
} from './components.js';
export {
  img,
  btn,
  go,
  observed,
  source,
  notice,
  empty,
  field,
  opt,
  heading,
  checkItem,
} from './components.js';
import { welcomeView, exploreView } from './welcome.js';
import { plannerView, recommendationView, plannerHistoryView } from './planner-views.js';
export function home(s) {
  return welcomeView(s);
}
export function seasonsView(s, ui) {
  const v = seasons.find((v) => v.id === ui.season) || seasons[0];
  return (
    heading(
      'the seasons collection',
      'Qual Japão é o nosso?',
      'Explore as diferenças entre regiões, experiências e épocas. A favorita pode mudar quantas vezes você quiser.',
    ) +
    `<div class="tab-bar">${seasons.map((a) => `<button class="tab ${a.id === v.id ? 'active' : ''}" data-action="season-tab" data-id="${a.id}" aria-pressed="${a.id === v.id}">${icon(a.icon)} ${a.name} <span lang="ja">${a.jp}</span></button>`).join('')}</div><section class="paper season-hero"><div><p class="eyebrow">${v.months} · ${v.tag}</p><h2>${v.title}</h2><p>${v.description}</p><div class="chip-row">${v.highlights.map((t) => `<span class="badge neutral">${t}</span>`).join('')}</div><div class="button-row spaced">${btn(`${icon('heart')} ${s.trip.selectedSeason === v.id ? 'Estação favorita' : 'Escolher como favorita'}`, 'favorite-season', `data-id="${v.id}"`)}${btn(`${icon('route')} Usar este roteiro`, 'choose-route', `data-id="${v.route}"`, 'secondary')}</div></div>${img(v.id)}</section>
 ${notice('Custos e movimento abaixo são <strong>tendências qualitativas</strong>, sem índices medidos ou tarifas de 2029. Médias climáticas não são previsão.', 'info')}
 <div class="detail-grid"><section class="paper"><h3>${icon('thermometer')} Clima e regiões</h3><p>${v.weather}</p><p><strong>Neve:</strong> ${v.snow}</p><p><strong>Tufões:</strong> ${v.typhoon}</p></section><section class="paper"><h3>${icon('wallet')} Custo e movimento</h3><p>${v.cost}</p><p>${v.crowds}</p><span class="badge gold">Tendência qualitativa</span></section><section class="paper"><h3>${icon('sparkles')} O que a gente ganha</h3><ul>${v.advantages.map((a) => `<li>${a}</li>`).join('')}</ul></section><section class="paper"><h3>${icon('umbrella')} Para ter em mente</h3><ul>${v.cautions.map((a) => `<li>${a}</li>`).join('')}</ul></section><section class="paper"><h3>${icon('footprints')} Nosso jeito de viajar</h3><p><strong>A pé:</strong> ${v.walk}</p><p><strong>Parques:</strong> ${v.parks}</p><p><strong>Praias:</strong> ${v.beach}</p></section><section class="paper"><h3>${icon('backpack')} Dentro da mala</h3><p>${v.clothes}</p>${go('packing', 'Montar minha mala', 'small secondary')}<p class="small spaced">Sensação térmica e probabilidade de chuva: sem série recuperada. Consulte previsão perto da viagem.</p></section></div>
 <div class="section-top"><h2>Um clima, várias realidades</h2><a href="#months" class="text-button">Ver os 12 meses ${icon('arrow-right')}</a></div><div class="table-wrap"><table><thead><tr><th>Cidade / estação meteorológica</th>${v.monthIds.map((m) => `<th>${monthNames[m - 1]}</th>`).join('')}</tr></thead><tbody>${climate.cities.map((c) => `<tr><td>${c.name}</td>${v.monthIds.map((m) => `<td>${observed(c.temperature[m - 1], ' °C')} · ${observed(c.rainfall[m - 1], ' mm')}<br><small>${c.humidity?.[m - 1] ?? '—'}% umidade média</small></td>`).join('')}</tr>`).join('')}</tbody></table></div>${source('JMA', climate.source, climate.period)}
 <div class="section-top"><h2>Lugares para esse capítulo</h2></div><div class="chip-row">${v.destinations
   .map((id) => {
     const d = destinations.find((d) => d.id === id);
     return btn(
       `${icon('map-pin')} ${d.name}`,
       'destination-detail',
       `data-id="${id}"`,
       'secondary small',
     );
   })
   .join(
     '',
   )}</div><div class="section-top"><h2>No calendário dos sonhos</h2>${go('events', 'Ver todos os eventos', 'small secondary')}</div><div class="three-columns">${events
   .filter((e) => e.season === v.id)
   .slice(0, 3)
   .map(
     (e) =>
       `<section class="paper"><span class="badge">${e.months.map((m) => monthShort[m - 1]).join(' / ')}</span><h3 class="serif spaced">${e.name}</h3><p class="small muted">${e.description}</p><span class="small muted">Data de 2029 pendente</span></section>`,
   )
   .join('')}</div>`
  );
}
export function monthsView(s, ui) {
  const city = climate.cities.find((c) => c.id === ui.city) || climate.cities[0],
    m = Number(ui.month) || 0,
    variable = ui.variable || 'temperature';
  return (
    heading(
      'a year of possibilities',
      'Quando a gente vai?',
      'Compare os meses com dados históricos, sem transformar médias em promessas para 2029.',
    ) +
    `<div class="filters"><label>Cidade<select data-ui="city">${climate.cities.map((c) => opt(c.id, c.name, city.id)).join('')}</select></label><label>Mês em destaque<select data-ui="month">${monthNames.map((v, i) => opt(i, v, m)).join('')}</select></label><label>Variável em destaque<select data-ui="variable">${opt('temperature', 'Temperatura média (°C)', variable)}${opt('rainfall', 'Precipitação (mm)', variable)}${opt('humidity', 'Umidade relativa (%)', variable)}</select></label></div>
 <div class="stats"><div class="stat"><span class="stat-icon">${icon('thermometer')}</span><div><strong>${observed(city.temperature[m], ' °C')}</strong><small>${monthNames[m]} · ${city.name}</small></div></div><div class="stat"><span class="stat-icon">${icon('cloud-rain')}</span><div><strong>${observed(city.rainfall[m], ' mm')}</strong><small>Volume médio, não dias de chuva</small></div></div><div class="stat"><span class="stat-icon">${icon('droplets')}</span><div><strong>${city.humidity?.[m] ?? '—'}%</strong><small>Umidade relativa média</small></div></div><div class="stat"><span class="stat-icon">${icon('users')}</span><div><strong>${(tourism.arrivals[m] / 1e6).toFixed(2).replace('.', ',')} milhões</strong><small>Chegadas no Japão · ${tourism.year}</small></div></div></div>
 <div class="two-columns"><section class="paper chart-card"><h2>Temperaturas, lado a lado</h2><p>Normais climatológicas por estação meteorológica · °C</p><div class="chart-box"><canvas id="temperature-chart" role="img" aria-label="Temperatura média mensal das seis cidades; valores também disponíveis na tabela abaixo"></canvas></div>${source('JMA', climate.source, climate.period)}</section><section class="paper chart-card"><h2>Guarda-chuva na mala?</h2><p>Precipitação média em ${city.name} · mm</p><div class="chart-box"><canvas id="rainfall-chart" role="img" aria-label="Precipitação mensal da cidade selecionada; valores na tabela abaixo"></canvas></div>${source('JMA', city.source, climate.period)}</section><section class="paper chart-card"><h2>Quem chegou ao Japão</h2><p>Chegadas de visitantes estrangeiros · ${tourism.year} · pessoas</p><div class="chart-box"><canvas id="tourism-chart" role="img" aria-label="Chegadas internacionais por mês em 2025; dados na tabela abaixo"></canvas></div>${source('JNTO', tourism.source, String(tourism.year))}</section><section class="paper chart-card"><h2>O mês em números</h2><p>${city.name} · ${variable === 'rainfall' ? 'precipitação (mm)' : variable === 'humidity' ? 'umidade (%)' : 'temperatura (°C)'}</p><div class="chart-box"><canvas id="variable-chart" role="img" aria-label="Variável selecionada por mês; dados na tabela abaixo"></canvas></div>${source('JMA', city.source, climate.period)}</section></div>
 ${notice(`${climate.methodology}<br><br>${tourism.note}`, 'info')}
 <div class="section-top"><h2>Os 12 meses, sem complicar</h2><span class="badge gold">Heatmap editorial · tendências qualitativas</span></div><p class="small muted">As cores de chuva mostram volume: verde &lt;80 mm, amarelo 80–149,9 mm e azul ≥150 mm (faixas editoriais, sem probabilidade de chover). Custo, demanda e conforto são qualitativos. Clima em números: estação ${city.name}.</p><div class="table-wrap"><table><thead><tr><th>Mês</th><th>Experiência</th><th>Hotel / custo relativo</th><th>Movimento / demanda</th><th>Conforto térmico</th><th>Temperatura</th><th>Chuva</th><th>Chegadas ${tourism.year}</th><th>Atenção</th></tr></thead><tbody>${monthly.map((r, i) => `<tr ${i === m ? 'style="background:var(--rose-light)"' : ''}><td><strong>${monthNames[i]}</strong></td><td>${r[0]}</td><td><span class="heat ${/Menor/.test(r[1]) ? 'green' : /Alta/.test(r[1]) ? '' : 'gold'}">${r[1]}</span></td><td><span class="heat ${/Alta/.test(r[2]) ? '' : 'gold'}">${r[2]}</span></td><td><span class="heat ${/Frio/.test(r[3]) ? 'blue' : /Ameno/.test(r[3]) ? 'green' : 'gold'}">${r[3]}</span></td><td>${observed(city.temperature[i], ' °C')}</td><td><span class="heat ${city.rainfall[i] >= 150 ? 'blue' : city.rainfall[i] >= 80 ? 'gold' : 'green'}">${observed(city.rainfall[i], ' mm')}</span></td><td>${number(tourism.arrivals[i])}</td><td style="white-space:normal;min-width:220px">${r[4]}</td></tr>`).join('')}</tbody></table></div><p class="small muted spaced">*Economia urbana não vale automaticamente para resorts de neve. Hospedagem, voo Brasil–Japão, turismo doméstico e filas são variáveis diferentes. Risco de chuva em dias: série não recuperada; use o volume histórico e alertas oficiais, sem inferir probabilidades.</p>${source('JNTO · guia por mês', 'https://www.japan.travel/en/guide/seasons/', 'Sazonalidade · avaliação editorial')}
 <div class="section-top"><div><h2>O que importa para a gente?</h2><p>Dê um peso de 0 a 5 a cada interesse.</p></div><span class="badge gold">Modelo editorial</span></div><div class="two-columns"><section class="paper">${criteria.map((c, i) => `<label class="weight-row">${c}<input type="range" min="0" max="5" step="1" value="${s.weights[i]}" data-weight="${i}" /><output>${s.weights[i]}</output></label>`).join('')}<p class="small muted">Nota final = soma(nota × peso) ÷ soma dos pesos. Escala 1–5, avaliação qualitativa. Peso zero exclui o critério.</p><details><summary class="small">Ver notas e critérios</summary><div class="table-wrap spaced"><table><thead><tr><th>Estação</th>${criteria.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${seasons.map((v) => `<tr><td>${v.name}</td>${qualitativeScores[v.id].map((n) => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">5 = maior afinidade editorial. Economia considera cidades fora de feriados; parques incluem cultura e lazer. Notas não medem clima nem custos.</p></details></section><section class="paper chart-card"><h2>Estações que combinam conosco</h2><div class="chart-box"><canvas id="season-chart" role="img" aria-label="Pontuação editorial ponderada das estações"></canvas></div><p id="season-score-text" class="small muted"></p></section></div>`
  );
}
export function filteredDestinations(s, ui) {
  return destinations.filter(
    (d) =>
      (!ui.destSeason || d.seasons.includes(ui.destSeason)) &&
      (!ui.region || d.region === ui.region) &&
      (!ui.type || d.types.includes(ui.type)) &&
      (!ui.destSearch ||
        `${d.name} ${d.attractions}`
          .toLocaleLowerCase('pt-BR')
          .includes(ui.destSearch.toLocaleLowerCase('pt-BR'))) &&
      (!ui.onlyFavorites || s.favorites.destinations.includes(d.id)),
  );
}
export function destinationsView(s, ui) {
  const list = filteredDestinations(s, ui);
  return (
    heading(
      'places to fall in love with',
      'Um Japão de possibilidades',
      'Salve lugares, descubra regiões e leve os seus favoritos para o roteiro.',
    ) +
    `<div class="filters"><label>Buscar cidade ou atração<input type="search" data-search-filter="destSearch" value="${esc(ui.destSearch || '')}" placeholder="Nara, anime, praias…" /></label><label>Estação<select data-ui="destSeason">${opt('', 'Todas', ui.destSeason)}${seasons.map((v) => opt(v.id, v.name, ui.destSeason)).join('')}</select></label><label>Região<select data-ui="region">${opt('', 'Todas', ui.region)}${[...new Set(destinations.map((d) => d.region))].map((r) => opt(r, r, ui.region)).join('')}</select></label><label>Interesse / atração<select data-ui="type">${opt('', 'Todos', ui.type)}${[
      ...new Set(destinations.flatMap((d) => d.types)),
    ]
      .sort()
      .map((r) => opt(r, r, ui.type))
      .join(
        '',
      )}</select></label><label class="checkbox-label"><input type="checkbox" data-ui="onlyFavorites" ${ui.onlyFavorites ? 'checked' : ''} /> Só meus favoritos</label></div><p class="small muted">${list.length} de ${destinations.length} destinos · Faixa de orçamento indisponível sem cotações. Fotografias ilustram a região ou estação; veja créditos.</p>
 <div class="destination-layout"><section class="map-panel"><div id="destination-map" class="map" role="region" aria-label="Mapa interativo dos destinos filtrados"></div><div class="map-toolbar"><span class="small muted">Pontos aproximados · sem rotas calculadas</span>${btn(`${icon('maximize')} Ampliar`, 'expand-map', 'data-id="destination-map"', 'small secondary')}</div>${notice('Okinawa exige <strong>voo doméstico</strong> e, para algumas ilhas, ferry. Não há Shinkansen. Custos e tempos precisam ser cotados.', 'info')}</section><div class="destination-list">${list.length ? list.map((d) => destinationCard(d, s)).join('') : empty('Nenhum destino com esses filtros. Tente outra combinação.')}</div></div>`
  );
}
export function destinationCard(d, s) {
  return `<article class="paper destination-card">${img(d.image)}<div class="body"><span class="eyebrow">${d.region}</span><h3>${d.name}</h3><p>${d.attractions}</p><div class="card-buttons">${btn('Explorar', 'destination-detail', `data-id="${d.id}"`, 'small secondary')}<div><button class="icon-button ${s.favorites.destinations.includes(d.id) ? 'favorited' : ''}" data-action="favorite" data-kind="destinations" data-id="${d.id}" aria-label="Favoritar ${d.name}" aria-pressed="${s.favorites.destinations.includes(d.id)}">${icon('heart')}</button><button class="icon-button" data-action="add-destination" data-id="${d.id}" aria-label="Adicionar ${d.name} ao roteiro">${icon('plus')}</button></div></div></div></article>`;
}
export function destinationDetail(d, s) {
  return `${img(d.image)}<p class="eyebrow">${d.region} · ${d.lat}, ${d.lng}</p><h2 id="modal-title">${d.name}</h2><p>${d.attractions}</p><p><strong>Onde pesquisar hospedagem:</strong> ${d.stay}</p><p><strong>Como chegar:</strong> ${d.transport}</p><p><strong>Custo:</strong> a cotar. Tempos e tarifas de viagem não recuperados; consulte a rota real.</p><div class="chip-row">${d.seasons.map((id) => `<span class="badge neutral">${seasons.find((v) => v.id === id).name}</span>`).join('')}</div><p class="small muted spaced">${d.note} Coordenadas aproximadas de referência.</p><div class="button-row">${link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + ' Japan')}`, 'Google Maps', 'btn secondary')}${link(`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}&travelmode=transit`, 'Consultar acesso', 'btn secondary')}${btn(`${icon('plus')} Adicionar ao roteiro`, 'add-destination', `data-id="${d.id}"`)}</div>${source('JNTO', d.source, 'Guia de destinos')}`;
}
export function eventsView(s, ui) {
  const list = events.filter(
    (e) =>
      (!ui.eventSeason || e.season === ui.eventSeason) &&
      (!ui.eventMonth || e.months.includes(Number(ui.eventMonth))) &&
      (!ui.eventFav || s.favorites.events.includes(e.id)),
  );
  return (
    heading(
      'the calendar of dreams',
      'Encontros que viram histórias',
      'Festivais, flores, neve e tradições para considerar na escolha do mês.',
    ) +
    `<div class="filters"><label>Estação<select data-ui="eventSeason">${opt('', 'Todas', ui.eventSeason)}${seasons.map((v) => opt(v.id, v.name, ui.eventSeason)).join('')}</select></label><label>Mês habitual<select data-ui="eventMonth">${opt('', 'Todos', ui.eventMonth)}${monthNames.map((v, i) => opt(i + 1, v, ui.eventMonth)).join('')}</select></label><label class="checkbox-label"><input type="checkbox" data-ui="eventFav" ${ui.eventFav ? 'checked' : ''} /> Só eventos favoritos</label></div>${notice('Mês habitual — <strong>datas e ingressos de 2029 pendentes</strong>. Fenômenos naturais dependem do clima; confirme o programa no site oficial. Fotos de referência da estação.')}<div class="event-grid">${list.length ? list.map((e) => `<article class="paper event-card">${img(e.season)}<div class="body"><div class="chip-row"><span class="badge neutral">${e.months.map((m) => monthShort[m - 1]).join(' / ')}</span><span class="badge gold">2029 pendente</span></div><h3>${e.name}</h3><p class="small">${icon('map-pin')} ${e.city}</p><p>${e.description}</p><p class="small">${e.interest}</p><p class="small muted">Tarifa: não confirmada.</p><div class="foot">${link(e.url, 'Site oficial', 'text-button')}<button class="icon-button ${s.favorites.events.includes(e.id) ? 'favorited' : ''}" data-action="favorite" data-kind="events" data-id="${e.id}" aria-label="Favoritar ${e.name}" aria-pressed="${s.favorites.events.includes(e.id)}">${icon('heart')}</button></div></div></article>`).join('') : empty('Nenhum evento nessa combinação de filtros.')}</div>`
  );
}
export function itineraryView(s, ui) {
  const r = s.routes[s.selectedRoute],
    validation = validateRoute(r, s.trip),
    days = Array.from(
      { length: Math.max(s.trip.days, ...r.days.map((d) => d.day)) },
      (_, i) => r.days.find((d) => d.day === i + 1) || { day: i + 1, activities: [] },
    );
  return (
    heading(
      'our days, our way',
      `${s.trip.days} dias, muitas histórias.`,
      'Um roteiro vivo: edite as bases, deixe espaço para descansar e organize cada descoberta.',
      btn(`${icon('download')} Exportar JSON`, 'export-itinerary', '', 'secondary') +
        btn(`${icon('printer')} Imprimir`, 'print', '', 'secondary'),
    ) +
    `${mochiEditorTools()}<div class="itinerary-context">${!s.routeChosen ? notice(`Este é um modelo disponível para explorar, não uma decisão sua. <a href="#planner">Criar minha viagem</a> ajuda a encontrar um caminho com a nossa cara.`) : '<p class="saved-pill">Nosso roteiro escolhido · alterações salvas neste navegador.</p>'}</div><div class="filters"><label>${s.routeChosen ? 'Roteiro escolhido' : 'Modelo disponível para explorar'}<select data-route-select>${Object.entries(
      {
        ...routeNames,
        ...(s.routes.personalized ? { personalized: 'Nosso roteiro personalizado' } : {}),
      },
    )
      .map(([id, name]) => opt(id, name, s.selectedRoute))
      .join(
        '',
      )}</select></label><label>Visualização<select data-ui="itineraryView">${opt('calendar', 'Calendário', ui.itineraryView || 'calendar')}${opt('map', 'Mapa das bases', ui.itineraryView)}</select></label>${btn(`${icon('rotate-ccw')} Restaurar esta rota`, 'restore-route', '', 'secondary')}</div>
 <div class="two-columns"><section class="paper"><h2>Nossas bases</h2><p class="small muted">Poucas trocas de hotel, mais tempo para aproveitar.</p><div id="base-list">${r.bases.map((b, i) => `<div class="base-row">${field('Cidade / base', `base-city-${i}`, b.city, `data-base="${i}" data-field="city" maxlength="150" required`)}${field('Noites', `base-nights-${i}`, b.nights, `type="number" min="0" max="89" step="1" data-base="${i}" data-field="nights" required`)}<button class="icon-button" data-action="remove-base" data-id="${i}" aria-label="Remover base ${esc(b.city)}">${icon('trash-2')}</button></div>`).join('')}</div><div class="button-row">${btn(`${icon('plus')} Nova base`, 'add-base', '', 'small secondary')}${btn(`${icon('sliders-horizontal')} Duração e datas`, 'settings', '', 'small subtle')}</div><div class="source"><span>${validation.nights} noites distribuídas / ${s.trip.nights} planejadas</span><span>${s.trip.days} dias · início: ${dateLabel(s.trip.departureDate)}</span></div></section><section class="paper"><h2>Um roteiro que respira</h2><p class="small muted">Arraste uma atividade para outro dia ou use o botão de mover. Custos em reais por pessoa; sugestões de ingressos não representam disponibilidade.</p>${validation.messages.length ? validation.messages.map((m) => notice(esc(m))).join('') : notice('As bases somam o total configurado e há pausas no roteiro.', 'success')}<p class="small muted">Para Okinawa/Hokkaido, cote voos internos, bagagem, transfers e dias de margem. As atividades têm custo inicial zero até você preencher uma estimativa.</p><div class="summary-row"><span>Atividades estimadas</span><strong>${money(r.days.flatMap((d) => d.activities).reduce((n, a) => n + a.cost, 0))} / pessoa</strong></div></section></div>
 ${ui.itineraryView === 'map' ? `<section class="paper spaced"><h2>As bases no mapa</h2><div id="itinerary-map" class="map compact"></div><p class="small muted">Marcadores das bases reconhecidas. Sem linhas ou tempos de trajeto. Bases personalizadas podem ser consultadas no Google Maps.</p><div class="chip-row">${r.bases.map((b) => link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.city + ' Japan')}`, b.city, 'btn small secondary')).join('')}</div></section>` : `<div class="calendar">${days.map((d) => `<section class="day-card" data-day="${d.day}" aria-label="Dia ${d.day}"><header><span>DIA ${String(d.day).padStart(2, '0')}</span><span>${s.trip.departureDate ? dateLabel(tripDayDate(s.trip.departureDate, d.day)).replace(' de 2029', '') : ''}</span></header><h3>${esc(cityForDay(r, d.day))}</h3>${d.activities.map((a) => `<article class="activity ${a.free ? 'free' : ''}" draggable="true" data-activity="${esc(a.id)}"><p>${esc(a.title)}</p><div class="activity-actions"><small class="muted">${a.cost ? money(a.cost) : 'A estimar'}</small><div><button data-action="activity-favorite" data-id="${esc(a.id)}" class="${a.favorite ? 'favorited' : ''}" aria-label="Favoritar atividade">${icon('heart')}</button><button data-action="activity-edit" data-id="${esc(a.id)}" aria-label="Editar atividade">${icon('pencil')}</button><button data-action="activity-move" data-id="${esc(a.id)}" aria-label="Mover atividade para outro dia">${icon('move')}</button><button data-action="activity-remove" data-id="${esc(a.id)}" aria-label="Remover atividade">${icon('x')}</button></div></div></article>`).join('')}<button class="day-add" data-action="activity-add" data-day="${d.day}">+ Adicionar atividade</button></section>`).join('')}</div>`}` +
    plannerHistoryView(s)
  );
}
export const budgetFields = [
  ['flight', 'Passagem internacional', 'Total por pessoa'],
  ['lodgingNight', 'Hospedagem / noite', 'Total do grupo por noite'],
  ['foodDay', 'Alimentação / dia', 'Por pessoa por dia'],
  ['localTransport', 'Transporte local', 'Total por pessoa'],
  ['shinkansen', 'Shinkansen', 'Total por pessoa'],
  ['domesticFlight', 'Voos domésticos', 'Total por pessoa'],
  ['ferry', 'Ferries', 'Total por pessoa'],
  ['parks', 'Parques', 'Total por pessoa'],
  ['tickets', 'Outros ingressos', 'Total por pessoa'],
  ['insurance', 'Seguro', 'Total por pessoa'],
  ['internet', 'Internet', 'Total por pessoa'],
  ['taxes', 'Taxas e impostos', 'Total por pessoa'],
  ['shopping', 'Compras', 'Total por pessoa'],
  ['emergency', 'Reserva de imprevistos', 'Total por pessoa'],
];
export function budgetSummary(s) {
  const b = calculateBudget(s.trip, s.budget);
  return `<p class="eyebrow">our big adventure, in numbers</p><span class="small muted">Estimativa por pessoa</span><div class="summary-amount">${money(b.person)}</div><span class="badge neutral">${s.trip.travelers} viajantes · ${s.trip.nights} noites</span><div class="summary-row spaced"><span>Total do grupo</span><strong>${money(b.group)}</strong></div><div class="summary-row"><span>Hospedagem / grupo</span><strong>${money(b.lodgingGroup)}</strong></div><div class="summary-row"><span>Hospedagem / pessoa</span><strong>${money(b.lodgingPerson)}</strong></div><div class="summary-row"><span>Já guardado / pessoa</span><strong>${money(b.saved)}</strong></div><div class="summary-row"><span>Falta / pessoa</span><strong>${money(b.remaining)}</strong></div><div class="progress" role="progressbar" aria-label="Progresso da poupança" aria-valuenow="${Math.round(b.progress)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${b.progress}%"></span></div><p class="small muted">${b.progress.toFixed(1).replace('.', ',')}% da meta alcançada</p><div class="summary-row"><span>Depósitos antes do embarque</span><strong>${b.deposits ?? 'Escolha a data'}</strong></div><div class="summary-row"><span>Guardar por mês / pessoa</span><strong>${b.monthly !== null ? money(b.monthly) : b.deposits === 0 ? 'Sem meses disponíveis' : 'Defina o embarque'}</strong></div>${b.deposits === 0 ? notice('A poupança começa no mês do embarque ou depois dele. Antecipe o início para calcular depósitos.') : ''}<p class="small muted spaced">Conta do mês inicial até o mês anterior ao embarque, sem rendimento. Saldo informado é individual. O rateio pode ter diferença de centavos entre pessoas.</p><details><summary class="small">Distribuição por categoria · grupo</summary>${Object.entries(
    b.categories,
  )
    .map(([k, v]) => `<div class="summary-row"><span>${k}</span><strong>${money(v)}</strong></div>`)
    .join('')}</details>`;
}
export function budgetView(s, ui) {
  return (
    heading(
      'saving for the memories',
      'O sonho, no papel.',
      'Ajuste as estimativas às cotações reais. Todos os valores editáveis estão em reais.',
      btn(`${icon('download')} CSV`, 'export-budget-csv', '', 'secondary') +
        btn(`${icon('download')} JSON`, 'export-budget-json', '', 'secondary'),
    ) +
    `<div class="tab-bar">${Object.entries(scenarios)
      .map(
        ([key, v]) =>
          `<button class="tab ${s.budget.scenario === key ? 'active' : ''}" data-action="scenario" data-id="${key}">${v.name} · ${money(
            Object.entries(v)
              .filter(([k]) => !['name', 'monthly'].includes(k))
              .reduce((n, [, v]) => n + v, 0),
          )}</button>`,
      )
      .join(
        '',
      )}</div>${notice('Referências de <strong>novembro de 2026</strong>, para 25 dias/24 noites: não são tarifas de 2029. Escolher um cenário substitui as estimativas de despesas; saldo e datas da poupança são preservados. Nenhuma estação aplica multiplicadores de preço.', 'info')}
 <div class="budget-layout"><section class="paper"><form id="budget-form"><div class="form-section"><h3>${icon('users')} A nossa viagem</h3><div class="form-grid">${field('Viajantes', 'travelers', s.trip.travelers, 'type="number" min="1" max="50" step="1" required data-budget-trip')}${field('Dias', 'days', s.trip.days, 'type="number" min="1" max="90" step="1" required data-budget-trip')}${field('Noites', 'nights', s.trip.nights, 'type="number" min="0" max="89" step="1" required data-budget-trip')}${field(`Embarque · ${s.trip.year}`, 'departureDate', s.trip.departureDate, `type="date" min="${s.trip.year}-01-01" max="${s.trip.year}-12-31" data-budget-trip`)}</div></div><div class="form-section"><h3>${icon('wallet')} Quanto vamos precisar?</h3><div class="form-grid">${budgetFields.map(([key, label, hint]) => field(`${label} <span class="muted">${hint} · R$</span>`, key, s.budget[key], 'type="number" min="0" max="10000000" step="0.01" required data-budget')).join('')}</div></div><div class="form-section"><h3>${icon('piggy-bank')} Um pouco a cada mês</h3><div class="form-grid">${field('Primeiro mês de depósito', 'savingsStart', s.budget.savingsStart, 'type="month" required data-budget')}${field('Saldo já guardado / pessoa · R$', 'saved', s.budget.saved, 'type="number" min="0" max="10000000" step="0.01" required data-budget')}</div><p class="small muted spaced">Exemplo do PDF: dezembro/2026 a janeiro/2029 = 26 depósitos para embarque em fevereiro/2029. A data da nossa viagem continua em aberto.</p></div></form></section><aside class="budget-summary"><section class="paper results-live" id="budget-summary" aria-live="polite">${budgetSummary(s)}</section><section class="paper chart-card spaced"><h2>Para onde vai o orçamento</h2><div class="chart-box small"><canvas id="budget-chart" role="img" aria-label="Distribuição dos gastos por categoria; valores no resumo financeiro"></canvas></div></section></aside></div>
 <div class="section-top"><h2>Três jeitos de planejar</h2><span class="badge neutral">Valores de referência / pessoa</span></div><div class="table-wrap"><table><thead><tr><th>Cenário</th><th>Total / pessoa</th><th>Total / ${s.trip.travelers} viajantes</th><th>Meta mensal · 26 depósitos</th><th>Acumulado</th><th>Diferença para o atual</th></tr></thead><tbody>${Object.values(
   scenarios,
 )
   .map((v) => {
     const total = Object.entries(v)
       .filter(([k]) => !['name', 'monthly'].includes(k))
       .reduce((n, [, v]) => n + v, 0);
     return `<tr><td>${v.name}</td><td>${money(total)}</td><td>${money(total * s.trip.travelers)}</td><td>${money(v.monthly)}</td><td>${money(v.monthly * 26)}</td><td>${money(total - calculateBudget(s.trip, s.budget).person)}</td></tr>`;
   })
   .join('')}</tbody></table></div>
 <div class="section-top"><div><h2>E se a estação mudar?</h2><p>Salve os valores preenchidos para comparar as nossas opções.</p></div></div><div class="filters"><label>Estação desta estimativa<select data-ui="quoteSeason">${seasons.map((v) => opt(v.id, v.name, ui.quoteSeason || s.trip.selectedSeason || 'winter')).join('')}</select></label>${btn(`${icon('bookmark')} Salvar valores atuais`, 'save-season-quote', '', 'secondary')}</div><p class="small muted">As cópias ficam independentes dos campos acima. Sem multiplicadores de preço: para Okinawa, preencha voos/ferries antes de salvar a estimativa de verão.</p><div class="four-season-costs season-grid">${seasons
   .map((v) => {
     const q = s.seasonQuotes?.[v.id],
       b = q ? calculateBudget(q.trip, q.budget) : null;
     return `<section class="paper"><h3>${icon(v.icon)} ${v.name}</h3>${q ? `<strong class="serif" style="font-size:23px">${money(b.person)}</strong><p class="small muted">por pessoa · ${q.trip.travelers} viajantes<br>${q.trip.days} dias / ${q.trip.nights} noites<br>Salvo em ${dateLabel(q.updatedAt)}</p><p class="small muted">Grupo: ${money(b.group)}</p>` : `<p class="small muted">Sem estimativa salva para esta estação.</p>`}<span class="badge gold">Estimativa de planejamento</span><p class="small muted spaced">${v.cost}</p></section>`;
   })
   .join(
     '',
   )}</div><section class="paper chart-card spaced"><h2>Estimativas salvas por estação</h2><p class="small muted">Reais por pessoa. Compare durações e número de viajantes antes de decidir. Estações sem valores salvos ficam sem barra.</p><div class="chart-box small"><canvas id="budget-season-chart" role="img" aria-label="Comparação de estimativas salvas para as estações; valores nos cartões acima"></canvas></div></section>`
  );
}
export function hotelsView(s) {
  const neighborhoods = [
    ['Tóquio', 'Ueno · Asakusabashi · Asakusa · Ikebukuro · Otsuka · Shinjuku'],
    ['Osaka', 'Namba · Daikokucho · Tennoji'],
    ['Nagano', 'Proximidades da estação'],
    ['Okinawa', 'Naha para logística urbana · Onna para praias'],
    ['Hokkaido', 'Sapporo Station, conforme roteiro'],
  ];
  return (
    heading(
      'a place to call home',
      'Um cantinho para os seis',
      'Compare o custo completo, camas de verdade e espaço para todas as malas.',
      btn(`${icon('plus')} Cadastrar hospedagem`, 'lodging-add'),
    ) +
    `${notice('Exemplos abaixo são pontos de pesquisa. Não há reservas, disponibilidade ou avaliações verificadas para 2029. Cadastre valores reais para comparar.', 'info')}<div class="three-columns">${neighborhoods.map(([city, where]) => `<section class="paper"><h3 class="serif">${city}</h3><p class="small muted">${where}</p>${link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('hotels ' + city + ' Japan')}`, 'Explorar a região', 'text-button')}</section>`).join('')}</div>
 <div class="section-top"><h2>Nossas opções, lado a lado</h2><span class="small muted">${s.lodgings.length} hospedagens cadastradas</span></div>${
   s.lodgings.length
     ? `<div class="table-wrap"><table class="hotel-compare"><thead><tr><th>Comparação / BRL</th>${s.lodgings.map((l) => `<th>${esc(l.name)}<span class="small muted" style="display:block">${esc(l.city)}</span></th>`).join('')}</tr></thead><tbody>${[
         ['Tipo', (l) => esc(l.type)],
         ['Diária total do grupo', (l) => money(l.nightly)],
         ['Noites', (l) => l.nights],
         ['Limpeza + impostos', (l) => `${money(l.cleaning)} + ${money(l.taxes)}`],
         [
           'Total da estadia',
           (l) => `<strong>${money(lodgingCost(l, s.trip.travelers).total)}</strong>`,
         ],
         [
           'Total por pessoa',
           (l) => `<strong>${money(lodgingCost(l, s.trip.travelers).person)}</strong>`,
         ],
         [
           'Hóspedes / camas / banheiros',
           (l) =>
             `${l.capacity} / ${l.beds} / ${l.bathrooms}${l.capacity < s.trip.travelers || l.beds < s.trip.travelers ? '<span class="error-text">Confira capacidade e camas para o grupo!</span>' : ''}`,
         ],
         ['Até a estação', (l) => esc(l.distance || 'Não informado')],
         [
           'Comodidades',
           (l) =>
             esc(
               [
                 l.laundry ? 'Lavanderia' : '',
                 l.kitchen ? 'Cozinha' : '',
                 l.ac ? 'Ar-condicionado' : '',
                 l.heating ? 'Aquecimento' : '',
               ]
                 .filter(Boolean)
                 .join(' · ') || 'Não informado',
             ),
         ],
         [
           'Cancelamento / licença',
           (l) =>
             `${esc(l.cancellation || 'Consultar')}<span>${esc(l.license || 'Licença / registro a verificar')}</span>`,
         ],
         [
           'Cotação',
           (l) =>
             `<span>${esc(l.quotedAt || 'Data não informada')}</span>${link(l.url, 'Link da hospedagem')}`,
         ],
         [
           'Ações',
           (l) =>
             `<div class="button-row">${btn(icon('pencil'), 'lodging-edit', `data-id="${esc(l.id)}" aria-label="Editar hospedagem"`, 'small secondary')}${btn(icon('trash-2'), 'lodging-remove', `data-id="${esc(l.id)}" aria-label="Excluir hospedagem"`, 'small secondary')}</div>`,
         ],
       ]
         .map(
           ([label, fn]) =>
             `<tr><th>${label}</th>${s.lodgings.map((l) => `<td>${fn(l)}</td>`).join('')}</tr>`,
         )
         .join(
           '',
         )}</tbody></table></div>${s.lodgings.length < 2 ? notice('Cadastre uma segunda opção para comparar lado a lado.') : ''}`
     : empty(
         'Cadastre duas ou mais hospedagens e compare diárias, taxas, capacidade e custo por pessoa.',
       )
 }
 <div class="section-top"><h2>O que vale comparar</h2></div><div class="three-columns">${[
   [
     'Apartamento / Airbnb',
     'Cozinha e lavanderia; confira licença minpaku, limpeza e camas autorizadas.',
   ],
   [
     'Hostel privativo',
     'Camas individuais e custo compartilhado; confira banheiro e espaço para malas.',
   ],
   ['Apart-hotel', 'Praticidade em estadias longas; confirme capacidade para seis.'],
   ['Business hotel', 'Compare três quartos duplos, cancelamento e localização.'],
   ['Ryokan / onsen', 'Refeições e banhos têm horários e regras de tatuagens.'],
   [
     'Resort / hotel de esqui',
     'Não use tarifas urbanas como referência para praia e resorts de neve.',
   ],
 ]
   .map(([t, d]) => `<section class="paper"><h3>${t}</h3><p class="small muted">${d}</p></section>`)
   .join(
     '',
   )}</div><div class="section-top"><h2>Começar a pesquisa</h2></div><div class="chip-row">${[
   ['Sakura Hostel Asakusa', 'https://www.sakura-hotel.co.jp/asakusa/'],
   ['MIMARU', 'https://mimaruhotels.com/en/'],
   ['MONday Apart', 'https://hotel-monday.com/apartment/'],
   ['Booking.com', 'https://www.booking.com/'],
   ['Airbnb', 'https://www.airbnb.com/'],
 ]
   .map(([t, url]) => link(url, t, 'btn secondary'))
   .join(
     '',
   )}</div><p class="small muted spaced">Checklist do grupo: capacidade legal, camas, dois banheiros se possível, elevador, lavanderia, aquecimento/AC, estação próxima, malas e cancelamento. Valores cadastrados aqui não substituem automaticamente o orçamento.</p>`
  );
}
export function transportView(s, ui) {
  const t = transportCost(s.legs, s.trip.travelers),
    covered = transportCost(
      s.legs.filter((l) => l.covered),
      s.trip.travelers,
    ).person,
    pass = Number(ui.passQuote) || 0;
  return (
    heading(
      'the way between places',
      'O caminho também faz parte.',
      'Compare custo, tempo e bagagem. Cadastre cada trecho com o preço que você cotou.',
      btn(`${icon('plus')} Adicionar trecho`, 'leg-add'),
    ) +
    `<div class="three-columns">${[
      [
        'train-front',
        'Shinkansen e trens',
        'Compare bilhetes e operadores. IC cards não substituem todas as reservas ou passagens de longa distância.',
      ],
      [
        'bus',
        'Metrô e ônibus',
        'Suica, PASMO e ICOCA facilitam pagamentos em redes participantes; verifique aceitação e cobertura.',
      ],
      [
        'plane',
        'Voos e ferries',
        'Okinawa exige voo; ilhas podem exigir outro voo ou ferry. Some bagagem, transfers e margem para clima.',
      ],
      [
        'luggage',
        'Malas e envio',
        'Certos Shinkansen exigem reserva adequada para bagagem com soma de dimensões >160 até 250 cm. Consulte a regra da linha.',
      ],
      [
        'car',
        'Táxi e carro',
        'Divida tarifas apenas se a capacidade permitir. Carro depende de documentação aceita no Japão.',
      ],
      [
        'route',
        'JR Pass ou avulsos?',
        'Só compare trechos efetivamente cobertos e dentro da validade do passe. Não há recomendação automática.',
      ],
    ]
      .map(
        ([i, t, d]) =>
          `<section class="paper"><h3>${icon(i)} ${t}</h3><p class="small muted">${d}</p></section>`,
      )
      .join(
        '',
      )}</div>${source('JNTO · transporte', 'https://www.japan.travel/en/plan/getting-around/', 'Orientações de viagem')}
 <div class="section-top"><h2>Nossos trechos cotados</h2></div>${s.legs.length ? `<div class="table-wrap"><table><thead><tr><th>Trecho</th><th>Meio</th><th>Cotação / pessoa (R$)</th><th>Data / tempo informado</th><th>Coberto pelo passe?</th><th>Consulta</th><th>Ações</th></tr></thead><tbody>${s.legs.map((l) => `<tr><td>${esc(l.from)} → ${esc(l.to)}</td><td>${esc(l.mode)}</td><td>${money(l.price)}</td><td>${esc(l.quotedAt)}<br>${esc(l.duration || 'Duração a consultar')}</td><td>${l.covered ? 'Sim, informado por você' : 'Não confirmado'}</td><td>${link(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(l.from + ' Japan')}&destination=${encodeURIComponent(l.to + ' Japan')}&travelmode=transit`, 'Consultar rota')}</td><td><div class="button-row">${btn(icon('pencil'), 'leg-edit', `data-id="${esc(l.id)}" aria-label="Editar trecho"`, 'small secondary')}${btn(icon('trash-2'), 'leg-remove', `data-id="${esc(l.id)}" aria-label="Remover trecho"`, 'small secondary')}</div></td></tr>`).join('')}</tbody></table></div>` : empty('Adicione Osaka → Kyoto, Osaka → Nagano ou qualquer trecho do grupo. Sem tarifas inventadas.')}<div class="two-columns spaced"><section class="paper"><h2>O total do caminho</h2><div class="summary-row"><span>Por pessoa</span><strong>${money(t.person)}</strong></div><div class="summary-row"><span>Grupo · ${s.trip.travelers} viajantes</span><strong>${money(t.group)}</strong></div>${btn('Levar total para o orçamento', 'apply-transport', '', 'small secondary spaced')}<p class="small muted spaced">Ao aplicar, o total substitui transporte local e zera os campos Shinkansen/voos/ferry para evitar duplicação. Valores precisam estar todos em reais.</p></section><section class="paper"><h2>Simular o passe</h2>${field('Preço cotado do passe / pessoa · R$', 'passQuote', ui.passQuote, 'type="number" min="0" step="0.01" data-ui="passQuote"')}<div class="summary-row spaced"><span>Avulsos marcados como cobertos</span><strong>${money(covered)}</strong></div><p class="small muted">${pass > 0 ? `Diferença avulsos − passe: ${money(covered - pass)}. Confira dias de validade, serviços e reservas antes de decidir.` : 'Informe a cotação do passe e marque trechos cobertos para comparar.'}</p>${link('https://japanrailpass.net/en/', 'Regras oficiais do JR Pass', 'text-button')}</section></div><div class="section-top"><h2>Consultar antes de embarcar</h2></div><div class="chip-row">${link('https://smart-ex.jp/en/entraining/oversized-baggage/', 'Bagagem no Shinkansen', 'btn secondary')}${link('https://www.jreast.co.jp/multi/en/pass/suica.html', 'Suica', 'btn secondary')}${link('https://www.pasmo.co.jp/visitors/en/', 'PASMO', 'btn secondary')}${link('https://www.westjr.co.jp/global/en/howto/icoca/', 'ICOCA', 'btn secondary')}${link('https://www.kuronekoyamato.co.jp/ytc/en/send/services/takkyubin/', 'Envio de malas · Yamato', 'btn secondary')}</div>`
  );
}
export function foodView(s, ui) {
  const list = food.filter(
      (f) =>
        (!ui.foodCategory || f.category === ui.foodCategory) &&
        (!ui.foodCity || f.city === ui.foodCity || f.city === 'Todas') &&
        (!ui.foodPrice || f.price === ui.foodPrice) &&
        (!ui.foodFav || s.favorites.food.includes(f.id)),
    ),
    total = wishlistCost(s.wishlist, s.exchangeRate);
  return (
    heading(
      'little bites & lovely finds',
      'Comer bem. Garimpar melhor.',
      'Uma lista de sabores, lojas e pequenas coisas que queremos trazer na mala.',
    ) +
    `<section class="paper food-banner"><div><p class="eyebrow">a taste of japan</p><h2>Uma descoberta a cada refeição.</h2><p class="small muted">De um onigiri no konbini a uma noite de yakiniku. As faixas abaixo são avaliações qualitativas, sem preços confirmados. Confira ingredientes e alergênicos diretamente com o restaurante.</p></div>${img('food')}</section><div class="filters"><label>Categoria<select data-ui="foodCategory">${opt('', 'Todas', ui.foodCategory)}${[...new Set(food.map((f) => f.category))].map((v) => opt(v, v, ui.foodCategory)).join('')}</select></label><label>Cidade de referência<select data-ui="foodCity">${opt('', 'Todas', ui.foodCity)}${['Tóquio', 'Osaka', 'Kyoto', 'Nagano'].map((v) => opt(v, v, ui.foodCity)).join('')}</select></label><label>Faixa qualitativa<select data-ui="foodPrice">${opt('', 'Todas', ui.foodPrice)}${opt('Simples', 'Simples / casual', ui.foodPrice)}${opt('Variável', 'Variável / experiência', ui.foodPrice)}</select></label><label class="checkbox-label"><input type="checkbox" data-ui="foodFav" ${ui.foodFav ? 'checked' : ''} /> Só favoritos</label></div><div class="food-grid">${list.length ? list.map((f) => `<article class="paper food-card"><span class="badge neutral">${f.category}</span><h3>${f.name}</h3><p>${f.description}</p><span class="small muted">${f.city} · ${f.price}</span><button class="icon-button ${s.favorites.food.includes(f.id) ? 'favorited' : ''}" data-action="favorite" data-kind="food" data-id="${f.id}" aria-label="Favoritar ${f.name}" aria-pressed="${s.favorites.food.includes(f.id)}">${icon('heart')}</button></article>`).join('') : empty('Nenhuma opção com esses filtros.')}</div>${source('JNTO · Food & Drink', 'https://www.japan.travel/en/things-to-do/eat-and-drink/', 'Guia gastronômico; seleção editorial')}
 <div class="section-top"><h2>Um mapa de garimpos</h2><span class="badge neutral">Pontos de pesquisa</span></div><div class="food-grid">${stores.map(([name, desc, url]) => `<section class="paper"><h3>${name}</h3><p class="small muted">${desc}</p>${link(url, 'Pesquisar', 'text-button')}</section>`).join('')}</div><div class="section-top"><h2>Nossa wishlist</h2>${btn(`${icon('plus')} Adicionar produto`, 'wishlist-add', '', 'small')}</div><div class="two-columns"><section class="paper">${field('Cotação manual: 1 iene = quantos reais?', 'exchangeRate', s.exchangeRate, 'type="number" min="0.000001" max="100" step="0.000001" data-exchange placeholder="Preencha a cotação consultada"')}<p class="small muted spaced">Sem cotação automática. Registre o valor efetivo da sua compra de moeda, incluindo custos se desejar. A conversão só aparece após preencher esta taxa.</p></section><section class="paper"><h3>Total estimado da wishlist</h3><div class="summary-row"><span>Ienes</span><strong>${money(total.yen, 'JPY')}</strong></div><div class="summary-row"><span>Reais</span><strong>${total.brl === null ? 'Preencha a cotação' : money(total.brl)}</strong></div><span class="small muted">${s.exchangeRate ? `Cotação usada: ¥1 = R$ ${s.exchangeRate.toFixed(6).replace('.', ',')} (manual).` : 'Cotação não informada.'}</span></section></div><div class="spaced">${s.wishlist.length ? `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço unitário · JPY</th><th>Qtd.</th><th>Total · JPY</th><th>Ações</th></tr></thead><tbody>${s.wishlist.map((w) => `<tr><td>${esc(w.name)}</td><td>${esc(w.category)}</td><td>${money(w.price, 'JPY')}</td><td>${w.quantity}</td><td>${money(w.price * w.quantity, 'JPY')}</td><td><div class="button-row">${btn(icon('pencil'), 'wishlist-edit', `data-id="${esc(w.id)}" aria-label="Editar produto"`, 'small secondary')}${btn(icon('trash-2'), 'wishlist-remove', `data-id="${esc(w.id)}" aria-label="Remover produto"`, 'small secondary')}</div></td></tr>`).join('')}</tbody></table></div>` : empty('Adicione skincare, papelaria, games e tudo o que faz parte dos nossos pequenos sonhos.')}</div>`
  );
}
export function packingView(s, ui) {
  const season = ui.packingSeason || s.trip.selectedSeason || 'winter',
    selected = seasons.find((v) => v.id === season),
    all = [
      ...packing.common.map((v, i) => [`common-${i}`, v]),
      ...packing[season].map((v, i) => [`${season}-${i}`, v]),
    ],
    done = all.filter(([id]) => s.packed[id]).length;
  return (
    heading(
      'pack light, dream big',
      'Uma mala para cada estação',
      'Essenciais compartilhados entre as listas e peças específicas para o clima escolhido.',
    ) +
    `<div class="tab-bar">${seasons.map((v) => `<button class="tab ${v.id === season ? 'active' : ''}" data-action="packing-season" data-id="${v.id}">${icon(v.icon)} ${v.name}</button>`).join('')}</div><section class="paper"><div class="summary-row"><strong>${done} de ${all.length} itens preparados</strong><span class="muted">${Math.round((done / all.length) * 100)}%</span></div><div class="progress"><span style="width:${(done / all.length) * 100}%"></span></div></section><div class="two-columns spaced"><section class="paper"><h2>Os essenciais</h2><div class="check-list">${packing.common.map((v, i) => checkItem(`common-${i}`, v, s.packed[`common-${i}`], 'packed')).join('')}</div></section><section class="paper"><h2>${icon(selected.icon)} Para o ${selected.name.toLowerCase()}</h2><div class="check-list">${packing[season].map((v, i) => checkItem(`${season}-${i}`, v, s.packed[`${season}-${i}`], 'packed')).join('')}</div>${notice('Franquias, power banks, líquidos e bagagem de cabine variam por companhia e tarifa. Reconfira cada voo internacional e doméstico.', 'info')}</section></div>`
  );
}
export function rulesView() {
  return (
    heading(
      'travel well, travel informed',
      'Antes de fazer as malas.',
      'Regras, mudanças e verificações para uma viagem sem surpresas.',
    ) +
    notice(esc(legal.notice)) +
    `<div class="chip-row"><span class="badge green">Em vigor</span><span class="badge blue">Mudança aprovada / futura</span><span class="badge gold">Regulamentação ou revalidação pendente</span></div><p class="small muted spaced">A linha do tempo usa a vigência conhecida; prazo legal não significa início operacional confirmado. Propostas não são tratadas como regras vigentes.</p><div class="timeline">${[
      ...legal.items,
    ]
      .sort((a, b) => (a.effectiveDate || '9999').localeCompare(b.effectiveDate || '9999'))
      .map(
        (l) =>
          `<article class="paper law-card"><div class="chip-row"><span class="badge ${l.status === 'Em vigor' ? 'green' : l.status === 'Mudança anunciada' ? 'blue' : 'gold'}">${esc(l.status)}</span><span class="badge neutral">${l.effectiveDate ? dateLabel(l.effectiveDate) : l.status === 'Em vigor' ? 'Vigência inicial não recuperada' : 'Sem data de início confirmada'}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.summary)}</p><div class="action">${esc(l.action)}</div>${l.expiresAt ? `<p class="small error-text spaced">Validade informada até ${dateLabel(l.expiresAt)}. Revalidar para a data escolhida.</p>` : ''}${l.deadline ? `<p class="small muted spaced">Prazo legal: ${dateLabel(l.deadline)} · não equivale a data exata de operação.</p>` : ''}${source(l.source.name, l.source.url, 'Regra consultada', l.verifiedAt)}${l.additionalSources?.length ? `<div class="small spaced">${l.additionalSources.map((a) => link(a.url, a.name)).join('<br>')}</div>` : ''}<p class="small muted spaced">Precisa ser revalidado em 2029.</p></article>`,
      )
      .join('')}</div>`
  );
}
export function checklistView(s) {
  const all = [...checklist.map((t, i) => ({ id: `main-${i}`, title: t })), ...s.tasks],
    done = all.filter((t) => s.checks[t.id]).length;
  return (
    heading(
      'one step at a time',
      'Planos, listas e ideias soltas.',
      'Nosso espaço para organizar decisões e guardar o que não queremos esquecer.',
      btn(`${icon('download')} Exportar planejamento`, 'export-backup', '', 'secondary'),
    ) +
    `<div class="two-columns"><section class="paper"><h2>Da ideia ao embarque</h2><div class="summary-row"><span>${done} de ${all.length} passos</span><span>${all.length ? Math.round((done / all.length) * 100) : 0}%</span></div><div class="progress"><span style="width:${all.length ? (done / all.length) * 100 : 0}%"></span></div><div class="check-list">${checklist.map((v, i) => checkItem(`main-${i}`, v, s.checks[`main-${i}`], 'checks')).join('')}${s.tasks.map((t) => `<div style="display:flex;gap:10px;align-items:center">${checkItem(t.id, t.title, s.checks[t.id], 'checks')}<button class="icon-button" data-action="task-remove" data-id="${esc(t.id)}" aria-label="Remover tarefa">${icon('x')}</button></div>`).join('')}</div><form id="task-form" class="inline-form spaced"><label>Mais um passo<input name="title" required maxlength="300" placeholder="O que precisamos lembrar?" /></label><button class="btn secondary" type="submit">Adicionar</button></form></section><div><section class="paper"><h2>Notas do nosso diário</h2><p class="small muted">Links, ideias, combinados e lugares que alguém indicou.</p><label>Notas livres<textarea id="notes" rows="16" maxlength="100000" placeholder="Uma boa ideia começa com uma anotação…">${esc(s.notes)}</textarea></label><p id="notes-status" class="small muted spaced">Salvamento automático neste navegador.</p></section><section class="paper spaced"><h2>Uma cópia para guardar</h2><p class="small muted">O arquivo JSON leva suas configurações, favoritos, roteiro, listas e valores. Compartilhar o arquivo cria uma cópia; os navegadores não sincronizam alterações.</p><div class="button-row">${btn(`${icon('download')} Fazer backup`, 'export-backup', '', 'secondary')}${btn(`${icon('upload')} Importar cópia`, 'import-backup', '', 'secondary')}</div><p class="small muted spaced">Não registre nomes completos, números de passaporte ou dados bancários. Tudo fica neste navegador; o arquivo de backup contém os valores que você preencheu.</p></section></div></div>`
  );
}
export function sourcesView() {
  return (
    heading(
      'the notes behind the diary',
      'Fontes, créditos e cuidado.',
      'Um planejamento útil mostra de onde vêm os dados e até onde eles podem nos ajudar.',
    ) +
    `<div class="three-columns"><section class="paper"><span class="badge blue">Dado histórico</span><h3 class="serif spaced">O que foi observado</h3><p class="small muted">Normais JMA 1991–2020 e chegadas JNTO de 2025. Não são previsões meteorológicas ou turísticas de 2029.</p></section><section class="paper"><span class="badge gold">Estimativa editorial</span><h3 class="serif spaced">O que estamos planejando</h3><p class="small muted">Orçamento de novembro de 2026, roteiros, notas e tendências de custo. Sem disponibilidade ou tarifas futuras garantidas.</p></section><section class="paper"><span class="badge neutral">Verificação futura</span><h3 class="serif spaced">O que vamos confirmar</h3><p class="small muted">Datas, ingressos, passagens, hotéis, regras de entrada e tributos perto do embarque.</p></section></div><div class="section-top"><h2>Dados abertos, contexto claro</h2></div><div class="source-list"><section class="paper"><h3>Japan Meteorological Agency</h3><p>${esc(climate.methodology)}</p>${source('JMA', climate.source, climate.period)}<div class="chip-row spaced">${climate.cities.map((c) => link(c.source, c.name, 'btn small secondary')).join('')}</div></section><section class="paper"><h3>Japan National Tourism Organization</h3><p>${esc(tourism.note)} Total anual: ${number(tourism.annualTotal)} chegadas.</p>${source('JNTO · tabela oficial, página 2', tourism.source, String(tourism.year))}</section><section class="paper"><h3>Japan Diary 2029 · quatro estações</h3><p>PDF fornecido no diretório Contexto, versão novembro/2026. Base para identidade, roteiros e cenários de R$ 26.600, R$ 34.750 e R$ 45.900 por pessoa. Não é uma cotação de viagem.</p></section><section class="paper"><h3>Regras e calendário</h3><p>Fontes primárias estão em cada regra e evento. Última verificação: ${dateLabel(legal.lastVerified)}. O aplicativo sinaliza revisão após 180 dias e deve ser revalidado antes de comprar e embarcar.</p><div class="button-row spaced">${go('rules', 'Abrir regras', 'small secondary')}${go('events', 'Abrir eventos', 'small secondary')}</div></section></div><div class="section-top"><h2>Um olhar sobre o Japão</h2><span class="small muted">Fotografias reais · arquivos locais</span></div><p class="small muted">${esc(images.note)}</p><div class="credits">${images.images.map((i) => `<article>${img(i.id)}<p>${esc(i.author)}</p><span class="small">${link(i.source, 'Foto original')} · ${link(i.licenseUrl, i.license)}</span></article>`).join('')}</div><div class="section-top"><h2>Sobre este cantinho</h2></div><section class="paper"><p class="small muted">Japan Travel Planner 2029 · feito para seis amigos que saem de Brasília. HTML, CSS e JavaScript modular com Vite, Chart.js, Leaflet e Lucide. Mapa © OpenStreetMap contributors; consulte a atribuição no mapa. Fontes Google Fonts: DM Sans, Playfair Display e Noto Sans JP.</p><p class="small muted">Os dados do planejamento ficam no localStorage deste navegador, com versionamento. Fotos e conteúdo são distribuídos com o site. Google Fonts e os mapas fazem requisições externas; valores financeiros não são enviados a servidores. Sem backend, login ou sincronização.</p><div class="button-row">${btn(`${icon('download')} Exportar backup`, 'export-backup', '', 'secondary')}${btn(`${icon('upload')} Importar planejamento`, 'import-backup', '', 'secondary')}${btn(`${icon('moon')} Alternar tema`, 'theme', '', 'secondary')}</div></section>`
  );
}
export const views = {
  home,
  planner: plannerView,
  recommendations: recommendationView,
  explore: exploreView,
  seasons: seasonsView,
  months: monthsView,
  destinations: destinationsView,
  events: eventsView,
  itinerary: itineraryView,
  budget: budgetView,
  hotels: hotelsView,
  transport: transportView,
  food: foodView,
  packing: packingView,
  rules: rulesView,
  checklist: checklistView,
  sources: sourcesView,
};
export { shoppingCategories };
