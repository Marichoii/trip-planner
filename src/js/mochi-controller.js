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
import { esc, localDate, uid } from './utils.js';
import {
  avatar,
  mochiButton,
  mochiLoading,
  mochiError,
  mochiProposal,
  mochiReview,
  mochiChat,
} from './mochi-components.js';

const titles = {
  chat: 'Uma conversa sobre o nosso Japão.',
  itinerary: 'Uma viagem com a nossa cara.',
  refine: 'Vamos ajustar esse caminho?',
  analyze: 'Um olhar para os nossos dias.',
};
export function connectMochi(ctx, client = createAIClient()) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mochi-panel';
  dialog.setAttribute('aria-labelledby', 'mochi-title');
  document.body.append(dialog);
  const launcher = document.createElement('button');
  launcher.className = 'mochi-launcher';
  launcher.type = 'button';
  launcher.dataset.mochi = 'chat';
  launcher.innerHTML = avatar() + '<span>Mochi ♡<small>Vamos conversar?</small></span>';
  launcher.setAttribute('aria-label', 'Conversar com Mochi');
  document.body.append(launcher);
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
  function form() {
    const p = snapshot?.profile;
    return `<form id="mochi-request-form"><fieldset class="mochi-consent"><legend>Você escolhe o que compartilhar</legend><p class="small">${p ? `${p.travelers} viajantes · ${p.days} dias · ${p.nights} noites · ${p.year}. ` : ''}Ano, época, datas, origem, ritmo, interesses, prioridades e cidades.${mode !== 'itinerary' ? ' Inclui bases e títulos das atividades do roteiro.' : ''} Conversa: até seis mensagens anteriores.</p><label><input name="consent" type="checkbox" required ${consent ? 'checked' : ''}> Autorizo compartilhar estas preferências${mode !== 'itinerary' ? ' e este roteiro' : ''}.</label><label><input name="budget" type="checkbox" ${shareMoney ? 'checked' : ''}> Incluir resumo de orçamento (total e meta mensal por pessoa).</label><p class="small">Para gerar sugestões com IA, as preferências selecionadas serão enviadas ao Google Gemini.</p><small>Não inclua nomes, documentos, e-mails ou dados bancários. O uso e a retenção dependem do plano da API Google. Você pode planejar sem IA.</small></fieldset>${mode === 'chat' ? mochiChat(messages) : ''}${mode === 'chat' && !messages.length ? `<div class="mochi-questions">${['Maio ou novembro?', 'Como organizar seis malas grandes?', 'Qual cidade combina com anime?'].map((q) => `<button type="button" data-mochi="question" data-question="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}${mode === 'refine' || mode === 'chat' ? `<label class="mochi-input-label" for="mochi-message">${mode === 'chat' ? 'O que vamos descobrir?' : 'O que você quer mudar?'}</label><textarea id="mochi-message" name="message" rows="3" maxlength="1200" required placeholder="${mode === 'chat' ? 'Me conta a sua dúvida…' : 'Mais tempo em Osaka, uma pausa depois da Universal…'}">${esc(message)}</textarea>` : ''}${mode !== 'chat' ? `<label class="mochi-input-label" for="mochi-notes">Preferências adicionais (opcional)</label><textarea id="mochi-notes" name="notes" rows="2" maxlength="1000" placeholder="Só o que for relevante para esta sugestão">${esc(notes)}</textarea>` : ''}<div class="button-row mochi-form-actions"><button class="btn" type="submit">${mode === 'chat' ? 'Perguntar à Mochi' : mode === 'analyze' ? 'Revisar com Mochi' : 'Gerar proposta'}</button>${mode === 'chat' ? mochiButton('Limpar conversa', 'clear', 'small subtle') : ''}${mochiButton('Continuar sem IA', 'close', 'small subtle')}</div></form>`;
  }
  function draw() {
    const hadFocus = dialog.contains(document.activeElement);
    dialog.innerHTML = `<header class="mochi-panel-header">${avatar()}<div><span class="eyebrow">MOCHI ♡ · UM POUQUINHO DE AJUDA</span><h2 id="mochi-title">${titles[mode]}</h2></div><button class="icon-button" type="button" data-mochi="close" aria-label="Fechar Mochi">×</button></header><div class="mochi-panel-body">${error ? mochiError(error) : ''}${loading ? mochiLoading() + mochiButton('Cancelar pedido', 'cancel') : applied ? `<div class="mochi-success" role="status"><h3>Um novo capítulo está no roteiro. ♡</h3><p>${ctx.ui.plannerSaved === false ? 'Não foi possível salvar neste navegador. Exporte um backup antes de sair.' : 'A versão anterior está guardada para quando você precisar.'}</p><div class="button-row">${mochiButton('Desfazer alteração', 'undo')}${mochiButton('Ver nosso roteiro', 'close', '')}</div></div>` : proposal ? mochiProposal(proposal, snapshot.route || sharedRoute(ctx.getState().routes[ctx.getState().selectedRoute])) : review ? mochiReview(review.data, review.meta.checks) + mochiButton('Fechar revisão', 'close') : ready ? form() : error ? mochiButton('Tentar novamente', 'retry') : `<form id="mochi-login-form"><p class="mochi-login-intro">A Mochi é um cantinho do nosso grupo. Use o acesso compartilhado pela pessoa que administra a viagem.</p><label for="mochi-code">Acesso do grupo</label><input id="mochi-code" name="code" type="password" minlength="12" maxlength="128" autocomplete="current-password" required><div class="button-row"><button type="submit" class="btn">Entrar no grupo</button>${mochiButton('Continuar sem IA', 'close')}</div><p class="small muted">O código fica somente nesta sessão segura do servidor.</p></form>`}</div><footer class="mochi-panel-footer"><span>Você sonha. A Mochi sugere. Você decide.</span>${ready ? mochiButton('Sair do grupo', 'logout', 'small subtle') : ''}</footer>`;
    if (dialog.open && (hadFocus || document.activeElement === document.body)) {
      const focusTarget = loading
        ? dialog.querySelector('[data-mochi=cancel]')
        : proposal
          ? dialog.querySelector('.mochi-proposal h3')
          : review
            ? dialog.querySelector('.mochi-review h3')
            : dialog.querySelector(
                '#mochi-message, #mochi-code, [name=consent], [data-mochi=undo], [data-mochi=retry]',
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
        else dialog.querySelector('.mochi-panel-body')?.scrollTo(0, 0);
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
  return {
    onRender(route) {
      launcher.hidden = route === 'planner';
    },
    close,
  };
}
