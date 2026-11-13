import { createAIClient } from './ai-client.js';
import {
  sharedProfile,
  sharedRoute,
  sharedBudget,
  planningFingerprint,
  applyMochiProposal,
} from './mochi-state.js';
import { restorePlannerArchive } from './planner-actions.js';
import { deterministicReview } from './mochi-contracts.js';
import { esc, icon, localDate, uid } from './utils.js';
import {
  avatar,
  mochiButton,
  mochiLoading,
  mochiError,
  mochiProposal,
  mochiProposalActions,
  mochiReview,
  mochiChat,
} from './mochi-components.js';

const titles = {
  chat: 'Uma conversa sobre o nosso Japão.',
  itinerary: 'Uma viagem com a nossa cara.',
  refine: 'Vamos ajustar esse caminho?',
  analyze: 'Um olhar para os nossos dias.',
};
const intros = {
  itinerary:
    'A Mochi cria uma versão alternativa a partir das escolhas de vocês. Nada muda no roteiro até vocês aprovarem.',
  refine:
    'Conte o que gostariam de mudar. A Mochi mostra uma comparação com o roteiro atual antes de qualquer alteração.',
  analyze:
    'Primeiro o aplicativo confere noites, dias e pausas. Depois a Mochi sugere melhorias opcionais.',
};
export function connectMochi(ctx, client = createAIClient()) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mochi-panel';
  dialog.setAttribute('aria-labelledby', 'mochi-title');
  document.body.append(dialog);
  // Um consentimento obrigatório dentro de um bloco recolhido é reaberto antes da validação.
  dialog.addEventListener(
    'invalid',
    (event) => event.target.closest('details')?.setAttribute('open', ''),
    true,
  );
  let mode = 'chat',
    ready = false,
    loading = false,
    controller,
    run = 0,
    error = null,
    proposal = null,
    review = null,
    messages = [],
    consent = false,
    shareMoney = false,
    notes = '',
    message = '',
    pending = null,
    archiveId = null,
    applied = false,
    fingerprint = '',
    snapshot;
  function privacy() {
    const p = snapshot?.profile,
      withRoute = mode !== 'itinerary',
      granted = consent && mode === 'chat' && messages.length;
    return `<details class="mochi-privacy ${granted ? 'is-granted' : ''}" ${granted ? '' : 'open'}><summary>${icon(granted ? 'shield-check' : 'lock')}<span><strong>Privacidade da conversa</strong>${granted ? '<small>Preferências autorizadas para esta conversa · rever</small>' : ''}</span>${icon('chevron-down')}</summary><div class="mochi-privacy-body"><p>Você decide se a Mochi pode usar as preferências da viagem${withRoute ? ' e o roteiro' : ''} para personalizar ${mode === 'chat' ? 'as respostas' : 'a sugestão'}. Ao autorizar, esses dados são enviados ao <strong>Google Gemini</strong>.</p><label class="mochi-check"><input name="consent" type="checkbox" required ${consent ? 'checked' : ''}><span>Autorizo compartilhar estas preferências${withRoute ? ' e este roteiro' : ''}.</span></label><label class="mochi-check"><input name="budget" type="checkbox" ${shareMoney ? 'checked' : ''}><span>Incluir resumo de orçamento <small>(total e meta mensal por pessoa · opcional)</small></span></label><details class="mochi-privacy-details"><summary>Ver detalhes dos dados compartilhados</summary><ul><li>${p ? `${p.travelers} viajantes · ${p.days} dias · ${p.nights} noites · ${p.year}. ` : ''}Ano, época, datas, origem, ritmo, interesses, prioridades e cidades.</li>${withRoute ? '<li>Bases e títulos das atividades do roteiro.</li>' : ''}${mode === 'chat' ? '<li>Conversa: até seis mensagens anteriores.</li>' : ''}<li>Não inclua nomes, documentos, e-mails ou dados bancários.</li><li>O uso e a retenção dependem do plano da API Google. Você pode planejar sem IA.</li></ul></details></div></details>`;
  }
  function form() {
    if (mode === 'chat')
      return `<form id="mochi-request-form" class="mochi-form is-chat"><div class="mochi-scroll">${privacy()}${mochiChat(messages)}${!messages.length ? `<div class="mochi-questions" role="group" aria-label="Sugestões de perguntas">${['Maio ou novembro?', 'Como organizar seis malas grandes?', 'Qual cidade combina com anime?'].map((q) => `<button type="button" data-mochi="question" data-question="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}<p class="mochi-tagline">Você sonha. A Mochi sugere. Você decide.</p></div><div class="mochi-composer"><label class="sr-only" for="mochi-message">O que vamos descobrir?</label><div class="mochi-composer-field"><textarea id="mochi-message" name="message" rows="1" maxlength="1200" required placeholder="Pergunte à Mochi…" enterkeyhint="send">${esc(message)}</textarea><button class="mochi-send" type="submit">${icon('send-horizontal')}<span class="sr-only">Perguntar à Mochi</span></button></div><div class="mochi-composer-aux">${messages.length ? mochiButton(`${icon('rotate-ccw')} Limpar conversa`, 'clear', 'small subtle') : ''}${mochiButton('Continuar sem IA', 'close', 'small subtle')}${ready ? mochiButton('Sair do grupo', 'logout', 'small subtle') : ''}</div></div></form>`;
    return `<form id="mochi-request-form" class="mochi-form"><div class="mochi-scroll"><p class="mochi-intro">${intros[mode]}</p>${privacy()}${mode === 'refine' ? `<label class="mochi-input-label" for="mochi-message">O que você quer mudar?</label><textarea id="mochi-message" name="message" rows="3" maxlength="1200" required placeholder="Mais tempo em Osaka, uma pausa depois da Universal…">${esc(message)}</textarea>` : ''}<label class="mochi-input-label" for="mochi-notes">Preferências adicionais <span>(opcional)</span></label><textarea id="mochi-notes" name="notes" rows="2" maxlength="1000" placeholder="Só o que for relevante para esta sugestão">${esc(notes)}</textarea><p class="mochi-tagline">Você sonha. A Mochi sugere. Você decide.</p></div><div class="mochi-action-bar"><button class="btn" type="submit">${icon(mode === 'analyze' ? 'list-checks' : 'wand-sparkles')} ${mode === 'analyze' ? 'Revisar com Mochi' : 'Gerar proposta'}</button>${mochiButton('Continuar sem IA', 'close', 'subtle')}${ready ? mochiButton('Sair do grupo', 'logout', 'small subtle mochi-logout') : ''}</div></form>`;
  }
  function view() {
    if (loading) return 'loading';
    if (applied) return 'success';
    if (proposal) return 'proposal';
    if (review) return 'review';
    if (ready) return mode === 'chat' ? 'chat' : 'form';
    return error ? 'error' : 'login';
  }
  function body(current) {
    const errorBox = error ? mochiError(error) : '';
    // Áreas roláveis sem controles internos precisam receber foco pelo teclado.
    const scroll = `<div class="mochi-scroll" tabindex="0" role="region" aria-label="Conteúdo da Mochi">`;
    if (current === 'loading')
      return `${scroll}${mochiLoading()}</div><div class="mochi-action-bar">${mochiButton('Cancelar pedido', 'cancel')}</div>`;
    if (current === 'success')
      return `${scroll}${errorBox}<div class="mochi-success" role="status"><span class="mochi-success-icon">${icon('circle-check')}</span><h3>Um novo capítulo está no roteiro. ♡</h3><p>${ctx.ui.plannerSaved === false ? 'Não foi possível salvar neste navegador. Exporte um backup antes de sair.' : 'A versão anterior está guardada para quando você precisar.'}</p></div></div><div class="mochi-action-bar">${mochiButton('Ver nosso roteiro', 'close', '')}${mochiButton(`${icon('rotate-ccw')} Desfazer alteração`, 'undo')}</div>`;
    if (current === 'proposal')
      return `${scroll}${errorBox}${mochiProposal(proposal, snapshot.route || sharedRoute(ctx.getState().routes[ctx.getState().selectedRoute]))}</div>${mochiProposalActions()}`;
    if (current === 'review')
      return `${scroll}${errorBox}${mochiReview(review.data, review.meta.checks)}</div><div class="mochi-action-bar">${mochiButton('Fechar revisão', 'close', '')}</div>`;
    if (current === 'chat' || current === 'form')
      return errorBox
        ? form().replace('<div class="mochi-scroll">', `<div class="mochi-scroll">${errorBox}`)
        : form();
    if (current === 'error')
      return `${scroll}${errorBox}</div><div class="mochi-action-bar">${mochiButton(`${icon('refresh-cw')} Tentar novamente`, 'retry')}${mochiButton('Continuar sem IA', 'close', 'subtle')}</div>`;
    return `<form id="mochi-login-form" class="mochi-form"><div class="mochi-scroll"><div class="mochi-login">${avatar()}<p class="mochi-login-intro">A Mochi é um cantinho do nosso grupo. Use o acesso compartilhado pela pessoa que administra a viagem.</p><label for="mochi-code">Acesso do grupo</label><input id="mochi-code" name="code" type="password" minlength="12" maxlength="128" autocomplete="current-password" required><p class="mochi-login-note">${icon('lock')} O código fica somente nesta sessão segura do servidor.</p></div></div><div class="mochi-action-bar"><button type="submit" class="btn">Entrar no grupo</button>${mochiButton('Continuar sem IA', 'close', 'subtle')}</div></form>`;
  }
  function draw() {
    const hadFocus = dialog.contains(document.activeElement),
      current = view();
    dialog.dataset.view = current;
    dialog.dataset.mode = mode;
    dialog.innerHTML = `<header class="mochi-panel-header">${avatar()}<div class="mochi-identity"><p class="mochi-name">Mochi <span aria-hidden="true">♡</span> <small>assistente de viagem</small></p><h2 id="mochi-title">${titles[mode]}</h2></div><button class="icon-button mochi-close" type="button" data-mochi="close" aria-label="Fechar Mochi">${icon('x')}</button></header><div class="mochi-panel-body">${body(current)}</div>`;
    ctx.icons?.();
    const scroller = dialog.querySelector('.mochi-scroll');
    if (current === 'chat' && scroller) scroller.scrollTop = scroller.scrollHeight;
    if (dialog.open && (hadFocus || document.activeElement === document.body)) {
      const focusTarget = loading
        ? dialog.querySelector('[data-mochi=cancel]')
        : proposal
          ? dialog.querySelector('.mochi-proposal h3')
          : review
            ? dialog.querySelector('.mochi-review h3')
            : dialog.querySelector(
                '[name=consent]:not(.is-granted [name=consent]), #mochi-message, #mochi-code, [data-mochi=undo], [data-mochi=retry]',
              );
      if (focusTarget) {
        if (focusTarget.tagName === 'H3') focusTarget.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
      }
    }
  }
  function cancel() {
    run++;
    controller?.abort();
    loading = false;
  }
  function close() {
    cancel();
    dialog.close();
  }
  async function status() {
    const token = ++run;
    controller = new AbortController();
    loading = true;
    draw();
    try {
      const result = await client.status(controller.signal);
      if (token !== run) return;
      ready = result.enabled && result.authenticated;
      error = null;
    } catch (e) {
      if (token !== run) return;
      error = e.code || 'unavailable';
    } finally {
      if (token === run) {
        loading = false;
        draw();
      }
    }
  }
  async function open(operation) {
    cancel();
    mode = operation;
    proposal = null;
    review = null;
    applied = false;
    error = null;
    pending = null;
    consent = false;
    shareMoney = false;
    message = '';
    notes = '';
    const s = ctx.getState();
    fingerprint = planningFingerprint(s);
    try {
      snapshot = {
        profile: sharedProfile(s, mode),
        ...(mode !== 'itinerary' ? { route: sharedRoute(s.routes[s.selectedRoute]) } : {}),
      };
    } catch {
      snapshot = null;
      error = 'invalid_input';
    }
    draw();
    if (!dialog.open) dialog.showModal();
    if (snapshot) await status();
  }
  async function submit(formElement) {
    if (loading) return;
    const values = new FormData(formElement);
    if (formElement.id === 'mochi-login-form') {
      const token = ++run;
      controller = new AbortController();
      loading = true;
      error = null;
      draw();
      try {
        await client.login(values.get('code'), controller.signal);
        if (token === run) ready = true;
      } catch (e) {
        if (token === run) error = e.code || 'unavailable';
      } finally {
        if (token === run) {
          loading = false;
          draw();
        }
      }
      return;
    }
    consent = values.has('consent');
    shareMoney = values.has('budget');
    notes = String(values.get('notes') || '');
    message = String(values.get('message') || '').trim();
    if (!consent) return;
    if (planningFingerprint(ctx.getState()) !== fingerprint) {
      error = 'invalid_input';
      draw();
      return;
    }
    const input = {
      ...snapshot,
      budget: shareMoney ? sharedBudget(ctx.getState(), snapshot.profile, mode) : null,
      additionalPreferences: notes,
      ...(['chat', 'refine'].includes(mode) ? { message } : {}),
      ...(mode === 'chat'
        ? {
            route: snapshot.route || null,
            history: messages
              .filter((m) => shareMoney || !m.budgetShared)
              .slice(-6)
              .map((m) => ({ role: m.role, text: m.text })),
          }
        : {}),
    };
    // The deterministic check runs before any optional AI analysis.
    if (mode === 'analyze') deterministicReview(input.route, input.profile);
    const token = ++run;
    controller = new AbortController();
    loading = true;
    error = null;
    draw();
    const timer = setTimeout(() => controller.abort(), 27000);
    try {
      const response = await client.request(mode, input, controller.signal);
      if (token !== run) return;
      if (mode === 'chat') {
        messages = [
          ...messages,
          { role: 'user', text: message, budgetShared: shareMoney },
          {
            role: 'model',
            text: response.data.answer,
            pending: response.data.pendingVerification,
            sourceIds: response.data.sourceIds,
            budgetShared: shareMoney,
          },
        ].slice(-20);
        message = '';
      } else if (mode === 'analyze') review = response;
      else {
        proposal = response.data;
        pending = input;
      }
    } catch (e) {
      if (token === run) {
        error = e.code || 'unavailable';
        if (error === 'access_required') ready = false;
      }
    } finally {
      clearTimeout(timer);
      if (token === run) {
        loading = false;
        draw();
        if (mode === 'chat') dialog.querySelector('#mochi-message')?.focus();
        else dialog.querySelector('.mochi-scroll')?.scrollTo(0, 0);
      }
    }
  }
  dialog.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(event.target);
  });
  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-mochi]');
    if (!target) return;
    const action = target.dataset.mochi;
    if (['chat', 'itinerary', 'refine', 'analyze'].includes(action)) {
      open(action);
      return;
    }
    if (action === 'close' || action === 'classic') {
      close();
      return;
    }
    if (action === 'cancel') {
      cancel();
      error = 'cancelled';
      draw();
      return;
    }
    if (action === 'retry') {
      status();
      return;
    }
    if (action === 'clear') {
      messages = [];
      message = '';
      draw();
      return;
    }
    if (action === 'question') {
      dialog.querySelector('#mochi-message').value = target.dataset.question;
      dialog.querySelector('#mochi-message').focus();
      return;
    }
    if (action === 'adjust') {
      proposal = null;
      pending = null;
      draw();
      dialog.querySelector('#mochi-message')?.focus();
      return;
    }
    if (action === 'logout') {
      cancel();
      try {
        await client.logout();
        ready = false;
        messages = [];
        error = null;
      } catch (e) {
        error = e.code || 'unavailable';
      }
      draw();
      return;
    }
    if (action === 'apply') {
      try {
        if (!proposal || !pending || planningFingerprint(ctx.getState()) !== fingerprint)
          throw Error();
        const result = applyMochiProposal(
          ctx.getState(),
          proposal,
          pending,
          true,
          localDate(),
          uid(),
        );
        ctx.setState(result.state);
        archiveId = result.archiveId;
        ctx.persist();
        applied = true;
        proposal = null;
        pending = null;
        history.replaceState(null, '', '#itinerary');
        await ctx.render();
        draw();
      } catch {
        error = 'invalid_input';
        draw();
      }
      return;
    }
    if (action === 'undo') {
      try {
        ctx.setState(restorePlannerArchive(ctx.getState(), archiveId, localDate()));
        ctx.persist();
        await ctx.render();
        close();
      } catch {
        error = 'invalid_input';
        draw();
      }
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  window.addEventListener('hashchange', close);
  // Enter envia; Shift+Enter quebra a linha no campo da conversa.
  dialog.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing &&
      event.target.id === 'mochi-message' &&
      mode === 'chat'
    ) {
      event.preventDefault();
      event.target.form?.requestSubmit();
    }
  });
  dialog.addEventListener('input', (event) => {
    if (event.target.id !== 'mochi-message' || mode !== 'chat') return;
    const field = event.target;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  });
  return { open, close };
}
