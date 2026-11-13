import { seasons } from '../data/planning.js';
import destinations from '../data/destinations.js';
import events from '../data/events.json';
import { interests, paces, wizardSteps } from '../data/preferences.js';
import { recommendDestinations, recommendationDetails } from './recommendations.js';
import { scenarios, scenarioBudget, calculateBudget } from './budget.js';
import { cityForDay } from './itinerary.js';
import { img, go, notice, opt, field } from './components.js';
import { icon, esc, money, monthNames, dateLabel } from './utils.js';
const action = (text, name, extra = '', cls = '') =>
  `<button type="button" class="btn ${cls}" data-planner-action="${name}" ${extra}>${text}</button>`;
const input = (label, name, value, opts = '') =>
  field(label, name, value, `data-profile="${name}" ${opts}`);
function counter(label, key, value, min, max, help = '') {
  return `<div class="planner-counter-label"><label for="planner-${key}">${label}</label><span class="planner-counter"><button type="button" data-planner-action="counter" data-field="${key}" data-delta="-1" aria-label="Diminuir ${label.toLowerCase()}" ${value <= min ? 'disabled' : ''}>${icon('minus')}</button><input id="planner-${key}" type="number" name="${key}" inputmode="numeric" autocomplete="off" data-profile="${key}" value="${value}" min="${min}" max="${max}" step="1" required aria-label="${label}" /><button type="button" data-planner-action="counter" data-field="${key}" data-delta="1" aria-label="Aumentar ${label.toLowerCase()}" ${value >= max ? 'disabled' : ''}>${icon('plus')}</button></span>${help ? `<small>${help}</small>` : ''}</div>`;
}
function whenStep(p) {
  const season = seasons.find((v) => v.id === p.season),
    months = season ? season.monthIds : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return `<div class="wizard-season-options">${seasons.map((v) => `<button type="button" class="wizard-season-option ${p.season === v.id ? 'is-selected' : ''}" data-planner-action="season" data-id="${v.id}" aria-label="${v.name} · ${v.months}" aria-pressed="${p.season === v.id}">${img(v.id)}<span class="choice-check">${icon('check')}</span><span class="choice-jp" lang="ja">${v.jp}</span><span class="season-option-body"><strong>${v.name}</strong><small>${v.months}</small></span></button>`).join('')}</div><button type="button" class="undecided-choice ${!p.season ? 'is-selected' : ''}" data-planner-action="undecided" aria-pressed="${!p.season}">${icon('cloud-sun')} Ainda não sabemos <span>Vamos descobrir pelo caminho.</span>${!p.season ? icon('check') : ''}</button><div class="wizard-optional"><div><h2>Já tem um mês ou uma data em mente?</h2><span>É opcional. Pode deixar essa parte para depois.</span></div><div class="form-grid"><label>Mês preferido<select name="month" autocomplete="off" data-profile="month">${opt('', 'Mês em aberto', p.month || '')}${months.map((m) => opt(m, monthNames[m - 1], p.month)).join('')}</select></label>${input(`Data de ida · ${p.year}`, 'departureDate', p.departureDate, `type="date" min="${p.year}-01-01" max="${p.year}-12-31"`)}</div></div>${
    season
      ? `<section class="season-glance"><span>${icon(season.icon)}</span><div><h2>${season.tag}</h2><p>${season.weather}</p><ul><li>${season.advantages[0]}</li><li>${season.cautions[0]}</li></ul><small>Para acompanhar: ${events
          .filter((e) => e.season === p.season)
          .slice(0, 2)
          .map((e) => e.name)
          .join(
            ' · ',
          )}. Datas futuras a confirmar.</small><a href="#seasons/${p.season}" target="_blank" rel="noopener" class="text-button">Ver a estação em detalhes ${icon('arrow-up-right')}</a></div></section>`
      : ''
  }`;
}
function companyStep(p) {
  return `<div class="counter-grid">${counter('Viajantes', 'travelers', p.travelers, 1, 50, 'Para dividir descobertas e boas histórias.')}${counter('Ano', 'year', p.year, 2027, 2040, 'Nosso horizonte, com espaço para mudar.')}${counter('Dias', 'days', p.days, 1, 90, 'Ao mudar os dias, as noites acompanham.')}${counter('Noites', 'nights', p.nights, 0, 89, 'Em geral: um dia a mais que o total de noites.')}</div>${input('De onde começa a nossa aventura?', 'departureCity', p.departureCity, 'required maxlength="150" placeholder="Brasília"')}<div class="wizard-subheading"><h2>Qual é o nosso ritmo?</h2><p>Não é uma corrida para conhecer tudo.</p></div><div class="pace-options">${paces.map((v) => `<button type="button" class="pace-option ${p.pace === v.id ? 'is-selected' : ''}" data-planner-action="pace" data-id="${v.id}" aria-pressed="${p.pace === v.id}">${icon(v.icon)}<strong>${v.name}</strong><span>${v.description}</span>${p.pace === v.id ? '<span class="pace-check">' + icon('check') + '</span>' : ''}</button>`).join('')}</div><div id="duration-hint" class="duration-hint" aria-live="polite">${p.days !== p.nights + 1 ? notice(`Para ${p.days} dias, o esperado é ${p.days - 1} noites. Ajuste a distribuição antes de continuar.`) : `${icon('check')} ${p.days} dias e ${p.nights} noites. Um bom começo.`}</div>`;
}
function interestsStep(p) {
  return `<div class="interest-grid">${interests.map((v) => `<button type="button" class="interest-choice ${p.interests.includes(v.id) ? 'is-selected' : ''}" data-planner-action="interest" data-id="${v.id}" aria-label="${v.name}" aria-pressed="${p.interests.includes(v.id)}">${img(v.image)}<span class="interest-image-shade"></span><span class="interest-icon">${icon(v.icon)}</span><span class="choice-check">${icon('check')}</span><span class="interest-copy"><strong>${v.name}</strong><small>${v.description}</small></span></button>`).join('')}</div><section class="priority-picker"><div><p class="eyebrow">THE THINGS WE REALLY LOVE</p><h2>E se a gente tivesse que escolher só três?</h2><p>Marque até três prioridades, na ordem que importa para vocês.</p></div>${
    p.interests.length
      ? `<div class="priority-options">${p.interests
          .map((id) => {
            const item = interests.find((v) => v.id === id),
              index = p.priorities.indexOf(id);
            return `<button type="button" class="priority-choice ${index >= 0 ? 'is-selected' : ''}" data-planner-action="priority" data-id="${id}" aria-pressed="${index >= 0}"><span>${index >= 0 ? index + 1 : icon('plus')}</span>${item.name}</button>`;
          })
          .join('')}</div>`
      : '<p class="priority-empty">Escolha alguns interesses acima. Ou siga em frente e descubra com calma.</p>'
  }</section>`;
}
function destinationsStep(p, ui) {
  const selected = p.destinations
      .map((id) => destinations.find((d) => d.id === id))
      .filter(Boolean),
    ranked = recommendDestinations(p),
    normalize = (v) =>
      v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    q = normalize(ui.plannerSearch || ''),
    list = q
      ? ranked.filter((d) => normalize(`${d.name} ${d.region} ${d.attractions}`).includes(q))
      : ranked.slice(0, ui.plannerAllCities ? 29 : 6);
  return `<div class="planner-selected-places"><span>${selected.length ? `${selected.length} lugares na nossa lista` : 'Nada precisa estar fechado ainda.'}</span><div>${selected.map((d) => `<button type="button" data-planner-action="destination" data-id="${d.id}" class="selected-place-chip" aria-label="Remover ${d.name}">${d.name} ${icon('x')}</button>`).join('')}</div></div><label class="planner-city-search">${icon('search')}<input type="search" name="planner-destination-search" autocomplete="off" data-planner-search value="${esc(ui.plannerSearch || '')}" placeholder="Buscar outra cidade, região ou atração…" aria-label="Buscar cidades para a viagem" /></label><h2 class="sr-only">Lugares sugeridos para a viagem</h2><div class="planner-city-grid">${list.map((d) => `<article class="planner-city ${p.destinations.includes(d.id) ? 'is-selected' : ''}">${img(d.image)}<div><small>${d.region}</small><h3>${d.name}</h3><p>${d.reasons.find((r) => !r.includes('Está na lista')) || d.reasons[0]}</p><button type="button" data-planner-action="destination" data-id="${d.id}" class="city-pick-button" aria-label="${p.destinations.includes(d.id) ? 'Remover' : 'Selecionar'} ${d.name}" aria-pressed="${p.destinations.includes(d.id)}">${icon(p.destinations.includes(d.id) ? 'check' : 'plus')} ${p.destinations.includes(d.id) ? 'Na nossa lista' : 'Queremos conhecer'}</button></div></article>`).join('') || '<p class="empty">Nenhuma cidade encontrada. Tente outro nome.</p>'}</div>${!q ? action(ui.plannerAllCities ? 'Ver só as sugestões' : 'Ver todos os destinos', 'all-cities', '', 'secondary small city-more') : ''}<p class="wizard-image-note">Fotos ilustrativas da região ou estação. Alguns lugares podem virar visitas a partir de uma base próxima; os acessos precisam ser consultados.</p>`;
}
function budgetStep(p) {
  const referenceTotal = (s) =>
    Object.entries(s)
      .filter(([k]) => !['name', 'monthly'].includes(k))
      .reduce((n, [, v]) => n + v, 0);
  return `<div class="planner-budget-options">${Object.entries(scenarios)
    .map(
      ([id, v]) =>
        `<button type="button" class="planner-budget-option ${p.budgetChoice === id ? 'is-selected' : ''}" data-planner-action="budget-choice" data-id="${id}" aria-pressed="${p.budgetChoice === id}"><span class="budget-choice-icon">${icon(id === 'economic' ? 'sprout' : id === 'balanced' ? 'heart' : 'sparkles')}</span><strong>${v.name}</strong><span class="planner-reference-price">${money(referenceTotal(v))}<small>por pessoa · referência de 25 dias</small></span><span class="choice-check">${icon('check')}</span></button>`,
    )
    .join(
      '',
    )}</div><div class="planner-budget-secondary">${['custom', 'unknown'].map((id) => `<button type="button" data-planner-action="budget-choice" data-id="${id}" class="budget-secondary-option ${p.budgetChoice === id ? 'is-selected' : ''}" aria-pressed="${p.budgetChoice === id}">${icon(id === 'custom' ? 'pencil' : 'cloud-sun')}<span><strong>${id === 'custom' ? 'Do nosso jeito' : 'Ainda não sabemos'}</strong><small>${id === 'custom' ? 'Ajustar valores individuais e compartilhados.' : 'O roteiro pode começar sem um orçamento.'}</small></span>${p.budgetChoice === id ? icon('check') : icon('plus')}</button>`).join('')}</div><p class="planner-budget-note">Estimativas de planejamento de novembro de 2026, sem cotações ou disponibilidade de ${p.year}. Não aplicamos aumentos de preço por estação.</p>${
    p.budgetChoice === 'custom'
      ? `<section class="planner-custom-budget"><h2>Um primeiro esboço, em reais</h2><div class="form-grid">${field('Passagem internacional · por pessoa', 'flight', p.budget.flight, 'type="number" min="0" max="10000000" step="0.01" required data-planner-budget="flight"')}${field('Hospedagem · grupo inteiro por noite', 'lodgingNight', p.budget.lodgingNight, 'type="number" min="0" max="10000000" step="0.01" required data-planner-budget="lodgingNight"')}${field('Alimentação · por pessoa por dia', 'foodDay', p.budget.foodDay, 'type="number" min="0" max="10000000" step="0.01" required data-planner-budget="foodDay"')}${field('Compras · total por pessoa', 'shopping', p.budget.shopping, 'type="number" min="0" max="10000000" step="0.01" required data-planner-budget="shopping"')}</div><details><summary>Ajustar transporte, parques e outros detalhes</summary><div class="form-grid spaced">${[
          ['localTransport', 'Transporte local'],
          ['shinkansen', 'Shinkansen'],
          ['domesticFlight', 'Voos domésticos'],
          ['ferry', 'Ferries'],
          ['parks', 'Parques'],
          ['tickets', 'Outros ingressos'],
          ['insurance', 'Seguro'],
          ['internet', 'Internet'],
          ['taxes', 'Impostos e taxas'],
          ['emergency', 'Imprevistos'],
        ]
          .map(([id, label]) =>
            field(
              `${label} · total por pessoa`,
              id,
              p.budget[id],
              `type="number" min="0" max="10000000" step="0.01" required data-planner-budget="${id}"`,
            ),
          )
          .join(
            '',
          )}</div></details><p id="planner-budget-total" class="planner-budget-total">${money(calculateBudget(p, p.budget).person)} por pessoa · ${p.travelers} viajantes</p><p class="small muted">Os valores iniciais vêm das referências existentes. Hospedagem é dividida pelo grupo; alimentação é multiplicada pelos dias. Você pode mudar cada estimativa.</p></section>`
      : ''
  }`;
}
function reviewStep(p) {
  const selectedSeason = seasons.find((v) => v.id === p.season),
    names = p.destinations.map((id) => destinations.find((d) => d.id === id)?.name).filter(Boolean);
  return `<div class="review-intro">${icon('heart')}<p>Já dá para imaginar a gente lá.<br><span>Confere se esse primeiro esboço tem a nossa cara?</span></p></div><h2 class="sr-only">Nossas escolhas para revisar</h2><div class="review-grid">${[
    [
      'Quando',
      'calendar-days',
      selectedSeason?.name || 'Estação em aberto',
      `${p.month ? monthNames[p.month - 1] + ' · ' : ''}${p.departureDate ? dateLabel(p.departureDate) : 'Data de ida a escolher'}`,
      1,
    ],
    [
      'Quem e por quanto tempo',
      'users',
      `${p.travelers} viajantes · ${p.days} dias`,
      `${p.nights} noites · ${p.year} · saída de ${p.departureCity}`,
      2,
    ],
    [
      'O que a gente ama',
      'heart',
      p.interests.length
        ? p.interests.map((id) => interests.find((v) => v.id === id).name).join(' · ')
        : 'A descobrir',
      p.priorities.length
        ? 'Prioridades: ' +
          p.priorities
            .map((id, i) => `${i + 1}. ${interests.find((v) => v.id === id).name}`)
            .join(' · ')
        : 'Sem prioridades definidas',
      3,
    ],
    [
      'Lugares desejados',
      'map-pin',
      names.length ? names.join(' · ') : 'Vamos começar pelas sugestões',
      'Ritmo ' + paces.find((v) => v.id === p.pace).name.toLowerCase(),
      4,
    ],
    [
      'Orçamento',
      'wallet',
      p.budgetChoice && p.budgetChoice !== 'unknown'
        ? p.budgetChoice === 'custom'
          ? 'Personalizado'
          : scenarios[p.budgetChoice].name
        : 'Vamos decidir depois',
      p.budgetChoice && p.budgetChoice !== 'unknown'
        ? `${money(calculateBudget(p, ['economic', 'balanced', 'comfortable'].includes(p.budgetChoice) ? scenarioBudget(p.budgetChoice, p.travelers, p.nights, p.days) : p.budget).person)} por pessoa · estimativa`
        : 'Referência de planejamento, não cotação',
      5,
    ],
  ]
    .map(
      ([label, i, title, subtitle, step]) =>
        `<section class="review-card"><span>${icon(i)}</span><div><small>${label}</small><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><button type="button" data-planner-action="step" data-step="${step}" aria-label="Editar ${label.toLowerCase()}">${icon('pencil')}</button></section>`,
    )
    .join(
      '',
    )}</div><p class="review-promise">${icon('shield-check')} Criar a sugestão não substitui seu roteiro atual. Você poderá revisar antes de aceitar.</p>`;
}
function wizardAside(p, step, saved) {
  const season = seasons.find((v) => v.id === p.season),
    selected = interests.filter((v) => p.interests.includes(v.id));
  return `<aside class="wizard-aside"><figure>${img(season?.id || 'hero')}<figcaption>um pedacinho do nosso sonho. ♡</figcaption></figure><p class="eyebrow">OUR LITTLE TRAVEL NOTES</p><h2>O nosso Japão,<br>uma escolha de cada vez.</h2><ul><li>${icon('flower-2')}<span>${season ? season.name : 'A estação pode esperar.'}</span></li><li>${icon('users')}<span><span data-draft-summary="travelers">${p.travelers}</span> viajantes, <span data-draft-summary="days">${p.days}</span> dias.</span></li><li>${icon('heart')}<span>${
    selected.length
      ? selected
          .slice(0, 2)
          .map((v) => v.name)
          .join(' & ')
      : 'Espaço para os nossos favoritos.'
  }</span></li></ul><p class="wizard-aside-note">Pode voltar, mudar de ideia e continuar depois. Nada precisa ser perfeito para começar.</p><span class="wizard-save-note" data-planner-save>${icon(saved === false ? 'info' : 'check-check')} ${saved === false ? 'Não foi possível salvar. Exporte um backup antes de sair.' : 'Progresso salvo neste navegador.'}</span></aside>`;
}
export function plannerView(s, ui) {
  const w = s.planner,
    p = w.draft,
    step = w.step,
    titles = [
      'Quando começa nossa aventura?',
      'Quantas memórias queremos criar?',
      'O que faz nosso coração bater mais forte?',
      'Por onde queremos nos aventurar?',
      'Quanto queremos investir nessa aventura?',
      'O nosso primeiro esboço.',
    ],
    descriptions = [
      'Uma estação já pode dizer muito. A data exata vem quando fizer sentido.',
      'Um plano que acompanha o tamanho do grupo e o nosso jeito de viajar.',
      'Escolha quantos interesses quiser. A viagem tem espaço para ser a nossa cara.',
      'Estes lugares combinam com o que vocês contaram. Guardem os que derem vontade.',
      'Pode ser só uma ideia por enquanto. O sonho não precisa começar por uma planilha.',
      'As escolhas não precisam ser definitivas. Agora vamos descobrir como elas se encontram.',
    ];
  const errors = ui.plannerErrors || [];
  return `<div id="planner-page" class="planner-page"><div class="planner-page-top"><a href="#home" class="planner-back-home">${icon('arrow-left')} Nosso começo</a><span>旅のしおり <span>·</span> PLANEJADO DO NOSSO JEITO</span></div><nav class="wizard-progress" aria-label="Etapas do planejamento"><ol>${wizardSteps.map((label, i) => `<li class="${i + 1 === step ? 'current' : i + 1 < step ? 'complete' : ''}"><button type="button" data-planner-action="step" data-step="${i + 1}" ${i + 1 > w.furthestStep ? 'disabled' : ''} ${i + 1 === step ? 'aria-current="step"' : ''}><span>${i + 1 < step ? icon('check') : String(i + 1).padStart(2, '0')}</span><small>${label}</small></button></li>`).join('')}</ol><p>ETAPA ${String(step).padStart(2, '0')} <span>DE 06</span></p></nav><header class="wizard-heading"><p class="eyebrow">${['A SEASON TO REMEMBER', 'OUR FAVOURITE TRAVEL COMPANY', 'FOLLOW YOUR LITTLE JOYS', 'PLACES THAT FEEL LIKE US', 'MAKE ROOM FOR THE DREAM', 'A LITTLE LOOK BEFORE WE GO'][step - 1]}</p><h1 tabindex="-1">${titles[step - 1]} <span>♡</span></h1><p>${descriptions[step - 1]}</p></header><div class="wizard-layout ${step === 3 ? 'wizard-layout-wide' : ''}"><section class="wizard-content" aria-label="${wizardSteps[step - 1]}">${step === 1 ? whenStep(p) : step === 2 ? companyStep(p) : step === 3 ? interestsStep(p) : step === 4 ? destinationsStep(p, ui) : step === 5 ? budgetStep(p) : reviewStep(p)}</section>${step !== 3 ? wizardAside(p, step, ui.plannerSaved) : ''}</div><div id="wizard-errors" role="alert" aria-live="polite">${errors.map((e) => notice(esc(e))).join('')}</div><footer class="wizard-footer"><div>${step > 1 ? action(`${icon('arrow-left')} Anterior`, 'previous', '', 'secondary') : '<span class="wizard-footer-caption">Sem pressa. Esse capítulo é nosso.</span>'}</div><div>${[1, 3, 4, 5].includes(step) ? action('Decidir depois', 'skip', '', 'wizard-skip') : ''}${step < 6 ? action(`Próximo ${icon('arrow-right')}`, 'next') : action(`${icon('sparkles')} Criar nosso roteiro`, 'generate', '', 'wizard-generate')}</div></footer></div>`;
}
function eventAffinity(event, bases) {
  const aliases = {
    tokyo: ['Tóquio', 'Tokyo'],
    osaka: ['Osaka', 'Kyoto', 'Nara'],
    nagano: ['Nagano', 'Hakuba'],
    kanazawa: ['Kanazawa', 'Takayama'],
    sapporo: ['Sapporo', 'Hokkaido', 'Furano', 'Biei'],
    naha: ['Okinawa', 'Naha'],
  };
  return bases.some((b) =>
    (aliases[b.destinationId] || [b.city]).some((name) => event.city.includes(name)),
  )
    ? 1
    : 0;
}
export function recommendationView(s, ui) {
  const w = s.planner,
    result = w.result;
  if (!result)
    return `<div class="recommendation-empty"><p class="eyebrow">OUR STORY STARTS WITH YOU</p>${icon('flower-2')}<h1 tabindex="-1">Primeiro, um pouquinho<br>sobre a gente.</h1><p>Conte o que vocês gostam e vamos encontrar um primeiro caminho pelo Japão.</p>${go('planner', 'Criar nossa viagem')}</div>`;
  const p = result.profile,
    details = recommendationDetails(result),
    accepted = w.acceptedId === result.id,
    season = seasons.find((v) => v.id === details.season),
    visibleDays = ui.plannerAllDays ? result.route.days : result.route.days.slice(0, 5),
    relevantEvents = events
      .filter(
        (e) =>
          (!details.season || e.season === details.season) &&
          (!p.month || e.months.includes(p.month)),
      )
      .sort((a, b) => eventAffinity(b, result.route.bases) - eventAffinity(a, result.route.bases))
      .slice(0, 3),
    attractions = [
      ...new Set(
        result.route.days
          .flatMap((d) => d.activities)
          .filter((a) => !a.free && !/retorno|chegada/i.test(a.title))
          .map((a) => a.title),
      ),
    ].slice(0, 6);
  return `<div class="recommendation-page"><header class="recommendation-hero"><div><p class="eyebrow">A LITTLE MORE LIKE US</p><span class="badge ${accepted ? 'green' : 'neutral'}">${accepted ? 'Roteiro aceito por vocês' : 'Uma primeira sugestão para revisar'}</span><h1 tabindex="-1">O nosso Japão ideal.<span>♡</span></h1><p>${details.message}</p><div class="recommendation-pills"><span>${p.travelers} viajantes</span><span>${p.days} dias · ${p.nights} noites</span><span>${season?.name || 'Estação em aberto'}</span><span>Ritmo ${paces.find((v) => v.id === p.pace).name.toLowerCase()}</span></div><div class="button-row">${accepted ? go('itinerary', `${icon('route')} Abrir meu roteiro`) : w.status === 'rejected' ? '' : action(`${icon('check')} Usar e editar este roteiro`, 'accept')}${action('Refinar nossas escolhas', 'refine', '', 'secondary')}</div>${!accepted ? action('Não é isso que queremos', 'reject', '', 'recommendation-reject') : ''}</div><figure>${img(season?.id || 'hero')}<figcaption>não existe viagem perfeita.<br>existe a nossa viagem. ♡</figcaption></figure></header>
 ${w.status === 'rejected' ? notice('Tudo bem mudar de ideia. Essa sugestão não foi aplicada. Refine as preferências para experimentar outro caminho.') : ''}${w.dirty ? notice('Há preferências novas no wizard. Esta é a sugestão anterior; gere outra para incorporar as mudanças.') : ''}
 ${ui.confirmSuggestion ? `<section class="suggestion-confirm" role="region" aria-label="Revisar substituição do planejamento"><h2>Vamos guardar o capítulo anterior?</h2><p>Ao aceitar, a estação, os viajantes, a duração e ${details.budget ? 'o orçamento escolhido' : 'as preferências'} desta sugestão serão aplicados. Seu roteiro atual será guardado em <strong>Versões anteriores</strong>, e os modelos editados serão preservados.</p><div class="button-row">${action('Guardar e usar esta sugestão', 'confirm-accept')}${action('Continuar revisando', 'cancel-accept', '', 'secondary')}</div></section>` : ''}
 <section class="result-section"><div class="welcome-section-heading"><div><p class="eyebrow">PLACES THAT MAKE SENSE TOGETHER</p><h2>Por que esses lugares?</h2><p>As escolhas de vocês guiam esse primeiro caminho.</p></div></div><div class="recommendation-city-grid">${details.bases
   .map(
     (d) =>
       `<article>${img(d.image)}<div><small>${d.region}</small><h3>${d.name}</h3><ul>${d.reasons
         .filter((r) => !r.startsWith('É uma opção'))
         .slice(0, 2)
         .map((r) => `<li>${r}</li>`)
         .join(
           '',
         )}</ul><a href="#destinations/${d.id}" class="text-button" target="_blank" rel="noopener">Conhecer ${d.name} ${icon('arrow-up-right')}</a></div></article>`,
   )
   .join(
     '',
   )}</div><p class="wizard-image-note">Fotos de referência da região ou estação. <a href="#sources">Ver créditos</a>.</p></section>
 <section class="result-section result-route"><div class="result-route-notes"><p class="eyebrow">FEWER SUITCASES, MORE MEMORIES</p><h2>Um lugar para chegar.<br>Tempo para ficar.</h2><p>A distribuição soma exatamente ${p.nights} noites. Base é a cidade onde a gente dorme e explora a região, sem trocar de hotel todo dia. Os acessos ainda precisam ser consultados.</p><ol class="night-distribution">${result.route.bases.map((b, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(b.city)}</h3><small>${b.nights} ${b.nights === 1 ? 'noite' : 'noites'}</small></div><div class="night-bar"><span style="width:${p.nights ? (b.nights / p.nights) * 100 : 0}%"></span></div></li>`).join('')}</ol><p class="small muted">Mapa com pontos aproximados. Sem trajetos, horários ou tarifas calculadas.</p></div><div id="recommendation-map" class="map result-map" role="region" aria-label="Mapa com as bases sugeridas"></div></section>
 <section class="result-section"><div class="welcome-section-heading"><div><p class="eyebrow">A FIRST LOOK AT OUR DAYS</p><h2>Como nossos dias podem ser.</h2><p>Uma primeira ideia editável, com pausas. Nenhum ingresso está reservado.</p></div>${action(ui.plannerAllDays ? 'Mostrar só o começo' : `Ver os ${p.days} dias`, 'toggle-days', '', 'secondary small')}</div><div class="result-days">${visibleDays.map((d) => `<article><small>DIA ${String(d.day).padStart(2, '0')} · ${esc(cityForDay(result.route, d.day))}</small><p>${esc(d.activities[0]?.title || 'Período livre')}</p>${d.activities.some((a) => a.free) ? `<span>${icon('coffee')} Com tempo para respirar</span>` : ''}</article>`).join('')}</div></section>
 <section class="result-section result-two-columns"><div><p class="eyebrow">LITTLE HIGHLIGHTS ALONG THE WAY</p><h2>Ideias que têm a nossa cara.</h2><ul class="result-attractions">${attractions.map((t) => `<li>${icon('heart')} ${esc(t)}</li>`).join('')}</ul></div><div class="result-budget-note"><span>${icon('wallet')}</span><p class="eyebrow">A DREAM WITH ROOM TO GROW</p><h2>${details.totals ? money(details.totals.person) : 'O orçamento pode vir depois.'}</h2><p>${details.totals ? `Estimativa por pessoa · ${money(details.totals.group)} para ${p.travelers} viajantes. Referências de novembro de 2026; sem cotações futuras confirmadas.` : 'O roteiro pode começar pelas experiências. Quando fizer sentido, a calculadora ajuda a transformar cada escolha em uma estimativa.'}</p>${go('budget', 'Conhecer a calculadora', 'secondary small')}<small>A sugestão só altera os valores salvos quando você aceita um orçamento escolhido no wizard.</small></div></section>
 <section class="result-section"><div class="welcome-section-heading"><div><p class="eyebrow">MOMENTS WORTH KEEPING AN EYE ON</p><h2>No calendário dos sonhos.</h2><p>Eventos da época escolhida. Datas e condições futuras a confirmar.</p></div></div><div class="result-events">${relevantEvents.map((e) => `<article><span>${icon('sparkles')}</span><small>${e.months.map((m) => monthNames[m - 1]).join(' / ')}</small><h3>${e.name}</h3><p>${e.city}</p><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Fonte oficial ${icon('arrow-up-right')}</a></article>`).join('') || '<p class="muted">Ainda sem eventos específicos para esta combinação. Explore o calendário completo.</p>'}</div></section>
 <section class="result-section result-care"><p class="eyebrow">A LITTLE CARE BEFORE WE GO</p><h2>Alguns detalhes para guardar.</h2><div>${details.warnings.map((t) => `<p>${icon('info')}<span>${esc(t)}</span></p>`).join('')}</div><details><summary>Como essa sugestão foi montada?</summary><p>Cidades escolhidas têm precedência. Interesses e até três prioridades orientam a afinidade dos destinos e atividades; estação, duração, ritmo e perfil econômico limitam as bases. As noites são distribuídas proporcionalmente, com a soma preservada. Não há cálculo de rotas reais, preço ou disponibilidade.</p><p>Este é um modelo editorial determinístico, usando os dados e roteiros do projeto. Vocês podem aceitar, editar ou rejeitar a proposta.</p></details></section><section class="result-ending"><h2>Esse caminho parece com a gente?</h2><p>O roteiro não precisa terminar aqui. Ele só precisa de um começo.</p><div class="button-row">${accepted ? go('itinerary', 'Continuar no meu roteiro') : w.status === 'rejected' ? '' : action('Usar e editar este roteiro', 'accept')}${action('Ajustar preferências', 'refine', '', 'secondary')}</div></section></div>`;
}

export function plannerHistoryView(s) {
  if (!s.planner.history.length) return '';
  return `<details class="planner-history paper spaced"><summary>${icon('history')} Versões anteriores · ${s.planner.history.length}</summary><p>Ao aceitar uma nova sugestão, o roteiro anterior fica guardado aqui, junto das configurações e do orçamento.</p><div>${[
    ...s.planner.history,
  ]
    .reverse()
    .map(
      (copy) =>
        `<article><div><h3>${esc(copy.label || 'Nosso roteiro')}</h3><p>${copy.trip.travelers} viajantes · ${copy.trip.days} dias · ${dateLabel(copy.archivedAt)}</p><small>${esc(copy.route.bases.map((b) => `${b.city}: ${b.nights} noites`).join(' · '))}</small></div>${action('Restaurar esta versão', 'restore-archive', `data-id="${esc(copy.id)}"`, 'secondary small')}</article>`,
    )
    .join('')}</div></details>`;
}
