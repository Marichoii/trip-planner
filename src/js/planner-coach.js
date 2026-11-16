import { avatar } from './mochi-entry.js';
import { esc, icon } from './utils.js';
import { profileErrors } from './planner-state.js';
import { coachChangeLabel, hasCoachChange } from './planner-profile.js';

const guides = [
  'Escolha uma época ou deixe em aberto. Posso cruzar seus interesses com as estações.',
  'Dias e noites ficam ligados. Considere também tempo de chegada, malas e pausas.',
  'Selecione seus interesses e até três prioridades. Conte também o que não pode faltar.',
  'Os lugares escolhidos têm prioridade. Uma lista grande pode pedir mais dias ou menos bases.',
  'Os valores são estimativas. O resumo usa o tamanho e a duração do seu grupo.',
  'Confira as escolhas. Você pode gerar uma sugestão clássica ou pedir uma proposta à Mochi.',
];
const statuses = {
  off: 'Sua parceira nas escolhas',
  waiting: 'Acompanhando suas escolhas…',
  loading: 'Pensando na sua viagem…',
  ready: 'Ideias para esta etapa',
  paused: 'Dicas ao vivo pausadas',
  invalid: 'Revise os campos para continuar',
  error: 'Não consegui atualizar agora',
};
const errors = {
  disabled:
    'A Mochi não está disponível neste endereço. Você pode continuar com as sugestões do planejador.',
  rate_limited:
    'O limite de uso foi atingido. As dicas foram pausadas; tente novamente mais tarde.',
  busy: 'Outro pedido está em andamento. Aguarde terminar e tente novamente.',
  provider_limited: 'O serviço está ocupado. Pausei as dicas para você tentar novamente depois.',
  provider_busy:
    'O Google Gemini está temporariamente indisponível. Pausei as dicas; aguarde um pouco antes de tentar novamente.',
  provider_rejected:
    'O serviço de IA recusou o pedido. Suas escolhas continuam salvas; se persistir, a integração precisa de um ajuste.',
  invalid_response: 'A resposta não pôde ser validada. Suas escolhas continuam como estavam.',
  timeout: 'A resposta demorou mais que o esperado. Tente novamente quando quiser.',
};
const initial = () => ({
  enabled: false,
  open: false,
  withBudget: false,
  phase: 'off',
  advice: null,
  question: '',
  asked: '',
  error: null,
});
export function coachMarkup(state, ui) {
  const c = ui.coach || initial(),
    p = state.planner.draft;
  return `<details id="planner-coach" class="planner-coach" ${c.open ? 'open' : ''}><summary data-coach-summary>${avatar()}<span><strong>Mochi <span class="coach-live-dot ${c.enabled ? 'is-live' : ''}" aria-hidden="true"></span></strong><small role="status">${statuses[c.phase]}</small></span>${icon('chevron-down')}</summary><div class="coach-body">
    ${!c.enabled ? `<p class="coach-guide">${guides[state.planner.step - 1]}</p>` : ''}
    ${!c.enabled ? `<p class="coach-consent">Ao ativar, suas escolhas e os pedidos escritos serão enviados ao Google Gemini quando você mudar o plano. Pode pausar a qualquer momento. Não inclua documentos ou dados pessoais.</p>` : `<p class="coach-consent">Dicas ao vivo ativas nesta sessão · escolhas e pedidos compartilhados com Google Gemini.</p>`}
    <label class="coach-budget"><input id="coach-budget" type="checkbox" data-coach-budget ${c.withBudget ? 'checked' : ''}> Incluir valores do orçamento</label>
    <div class="coach-controls"><button type="button" class="btn small ${c.enabled ? 'subtle' : ''}" data-coach="${c.enabled ? 'pause' : 'enable'}">${icon(c.enabled ? 'circle-minus' : 'sparkles')}${c.enabled ? 'Pausar dicas' : c.phase === 'error' ? 'Tentar novamente' : c.phase === 'paused' ? 'Retomar dicas ao vivo' : 'Ativar dicas ao vivo'}</button>${c.enabled && c.phase === 'ready' ? `<button type="button" class="icon-button" data-coach="refresh" aria-label="Pedir novas ideias à Mochi">${icon('refresh-cw')}</button>` : ''}</div>
    ${c.phase === 'error' ? `<p class="coach-error" role="alert">${errors[c.error] || 'Não consegui conectar agora. Você pode seguir planejando e tentar novamente depois.'}</p>` : ''}
    ${c.phase === 'invalid' ? '<p class="coach-error">Termine de preencher os campos desta etapa. Nenhum pedido será enviado enquanto houver dados inconsistentes.</p>' : ''}
    ${['waiting', 'loading'].includes(c.phase) ? '<div class="coach-thinking" role="status"><span aria-hidden="true">✦</span> Preparando recomendações para as escolhas atuais.</div>' : ''}
    ${c.advice ? `<div class="coach-answer"><p class="eyebrow">SUGESTÃO DA MOCHI · IA</p>${c.asked ? `<p class="coach-asked">${esc(c.asked)}</p>` : ''}<p>${esc(c.advice.summary)}</p><div class="coach-suggestions">${c.advice.suggestions.map((suggestion, i) => `<article><p>${esc(suggestion.reason)}</p><button type="button" class="btn secondary small" data-coach="apply" data-index="${i}" ${hasCoachChange(p, suggestion.change) ? 'disabled' : ''}>${icon(hasCoachChange(p, suggestion.change) ? 'check' : 'plus')}${hasCoachChange(p, suggestion.change) ? 'Já está no plano' : esc(coachChangeLabel(suggestion.change))}</button></article>`).join('')}</div>${c.advice.cautions.length ? `<details class="coach-cautions"><summary>Pontos para conferir ${icon('chevron-down')}</summary><ul>${c.advice.cautions.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>` : ''}<small class="coach-disclaimer">Ideias para o rascunho, sem consulta de preços ou disponibilidade em tempo real.</small></div>` : ''}
    ${c.enabled ? `<form id="coach-question-form"><label for="coach-question">Quer ajuda com alguma escolha?</label><textarea id="coach-question" rows="2" maxlength="400" required placeholder="Ex.: vale incluir Okinawa nesta viagem?">${esc(c.question)}</textarea><button class="text-button" type="submit">Perguntar à Mochi ${icon('arrow-up-right')}</button></form>` : ''}
  </div></details>`;
}
export function connectPlannerCoach(ctx, load = () => import('./planner-coach-client.js')) {
  const c = (ctx.ui.coach = initial());
  c.open = matchMedia('(min-width: 1024px)').matches;
  let route = '',
    key = '',
    shownKey = '',
    timer,
    controller,
    run = 0,
    client,
    lastStarted = 0;
  const cache = new Map();
  function fingerprint() {
    const p = ctx.getState().planner.draft;
    return JSON.stringify([
      ctx.getState().planner.step,
      Object.fromEntries(
        [
          'year',
          'season',
          'month',
          'departureDate',
          'travelers',
          'days',
          'nights',
          'departureCity',
          'pace',
          'interests',
          'priorities',
          'destinations',
          'travelNotes',
          'avoid',
          'budgetChoice',
        ].map((k) => [k, p[k] ?? null]),
      ),
      c.withBudget,
      c.withBudget ? p.budget : null,
    ]);
  }
  function valid() {
    return (
      !profileErrors(ctx.getState().planner.draft).length &&
      !document.querySelector(
        '#planner-page [data-profile]:invalid, #planner-page [data-planner-budget]:invalid',
      )
    );
  }
  function stop() {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    run++;
  }
  function paint() {
    const root = document.getElementById('wizard-coach-root');
    if (!root) return;
    const focus = document.activeElement;
    const owned = root.contains(focus);
    const id = owned ? focus.id : null;
    const action = owned ? focus.dataset.coach : null;
    const selection = id === 'coach-question' ? [focus.selectionStart, focus.selectionEnd] : null;
    root.innerHTML = coachMarkup(ctx.getState(), ctx.ui);
    ctx.icons();
    if (owned) {
      const target = id
        ? document.getElementById(id)
        : root.querySelector(`[data-coach="${action}"]`);
      (target && !target.disabled ? target : root.querySelector('summary'))?.focus({
        preventScroll: true,
      });
      if (selection && target) target.setSelectionRange(...selection);
    }
  }
  async function request(question = '') {
    if (!c.enabled || route !== 'planner' || document.hidden || !valid()) return;
    stop();
    const token = run,
      expected = (key = fingerprint());
    const snapshot = { planner: { draft: structuredClone(ctx.getState().planner.draft) } };
    const step = ctx.getState().planner.step;
    const requestController = (controller = new AbortController());
    const signal = requestController.signal;
    c.phase = 'loading';
    c.error = null;
    c.advice = null;
    c.asked = question;
    lastStarted = Date.now();
    paint();
    const timeout = setTimeout(() => requestController.abort(), 27000);
    try {
      client ||= (await load()).createCoachClient();
      if (token !== run || signal.aborted) return;
      const response = await client.request(snapshot, step, question, c.withBudget, signal);
      if (token !== run || expected !== fingerprint() || route !== 'planner' || !c.enabled) return;
      c.advice = response.data;
      shownKey = expected;
      c.phase = 'ready';
      if (!question) {
        cache.set(expected, response.data);
        if (cache.size > 20) cache.delete(cache.keys().next().value);
      }
    } catch (e) {
      if (token !== run) return;
      c.enabled = false;
      c.phase = 'error';
      c.error = signal.aborted ? 'timeout' : e.code;
      client = null;
    } finally {
      clearTimeout(timeout);
      if (token === run) {
        controller = null;
        paint();
      }
    }
  }
  function update(nextRoute = route) {
    route = nextRoute;
    if (route !== 'planner' || document.hidden) {
      stop();
      key = '';
      return;
    }
    const next = fingerprint();
    if (next === key && c.phase !== 'invalid' && valid()) return;
    stop();
    key = next;
    c.advice = null;
    c.asked = '';
    shownKey = '';
    if (!c.enabled) {
      paint();
      return;
    }
    if (!valid()) {
      c.phase = 'invalid';
      paint();
      return;
    }
    if (cache.has(next)) {
      c.advice = cache.get(next);
      shownKey = next;
      c.phase = 'ready';
      paint();
      return;
    }
    c.phase = 'waiting';
    paint();
    timer = setTimeout(() => request(), Math.max(1200, 6000 - (Date.now() - lastStarted)));
  }
  document.addEventListener(
    'toggle',
    (event) => {
      if (event.target.id === 'planner-coach') c.open = event.target.open;
    },
    true,
  );
  document.addEventListener('input', (event) => {
    if (event.target.id === 'coach-question') c.question = event.target.value;
    if (event.target.matches('[data-profile], [data-planner-budget]'))
      queueMicrotask(() => update());
  });
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-coach-budget]')) {
      c.withBudget = event.target.checked;
      cache.clear();
      key = '';
      update();
    }
  });
  document.addEventListener('click', (event) => {
    if (route === 'planner' && c.enabled && event.target.closest('[data-mochi]')) {
      stop();
      c.enabled = false;
      c.phase = 'paused';
      paint();
    }
    const button = event.target.closest('[data-coach]');
    if (!button || route !== 'planner') return;
    const action = button.dataset.coach;
    if (action === 'pause') {
      stop();
      c.enabled = false;
      c.phase = 'paused';
      paint();
    }
    if (action === 'enable') {
      c.enabled = true;
      c.error = null;
      key = '';
      update();
    }
    if (action === 'refresh') request();
    if (action === 'apply' && shownKey === fingerprint() && c.advice) {
      const suggestion = c.advice.suggestions[Number(button.dataset.index)];
      if (!suggestion) return;
      ctx.apply(suggestion.change);
    }
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'coach-question-form') return;
    event.preventDefault();
    const question = c.question.trim();
    if (!question || !c.enabled || !valid()) return;
    c.question = '';
    request(question);
  });
  document.addEventListener('visibilitychange', () => update());
  return { update };
}
