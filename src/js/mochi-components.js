import { esc, icon } from './utils.js';
import destinations from '../data/destinations.js';
import { RESTING, REVIEW_OK } from './mochi-contracts.js';
import { avatar, mochiButton } from './mochi-entry.js';
export { avatar, mochiButton, mochiInvitation, mochiEditorTools } from './mochi-entry.js';

export const mochiLoading = (message = 'A Mochi está organizando as ideias…') =>
  `<div class="mochi-loading" role="status">${avatar()}<div><p>${esc(message)} <span aria-hidden="true">♡</span></p><span class="skeleton" style="width:88%"></span><span class="skeleton" style="width:72%"></span><span class="skeleton" style="width:80%"></span></div></div>`;
export function mochiError(code) {
  const detail = {
    rate_limited: 'O limite de uso foi atingido. Tente mais tarde.',
    busy: 'Já há uma solicitação em andamento. Aguarde um pouquinho.',
    provider_limited: 'O serviço atingiu um limite temporário. Tente mais tarde.',
    access_required: 'Entre novamente com o acesso do grupo.',
    timeout: 'A resposta demorou mais que o esperado.',
    invalid_response: 'A sugestão não passou pelas verificações de integridade.',
    cancelled: 'Pedido cancelado. Seu roteiro continua como estava.',
    invalid_input: 'Revise a duração, preferências e tamanho do roteiro antes de enviar.',
  }[code];
  return `<div class="mochi-error ${code === 'cancelled' ? 'is-soft' : ''}" role="alert">${icon(code === 'cancelled' ? 'info' : 'cloud-sun')}<div><p>${esc(code === 'cancelled' ? detail : RESTING)}</p>${detail && code !== 'cancelled' ? `<small>${esc(detail)}</small>` : ''}<a class="text-button" href="#recommendations" data-mochi="classic">Continuar com a sugestão clássica ${icon('arrow-right')}</a></div></div>`;
}
const list = (items, cls = '') =>
  items.length
    ? `<ul class="${cls}">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : '<p class="mochi-none">Nenhum ponto adicional.</p>';
const city = (id) => destinations.find((d) => d.id === id)?.name || 'A definir';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const nightsLabel = (n) => (n === null ? '—' : `${n} ${n === 1 ? 'noite' : 'noites'}`);

// Compara bases e dias do roteiro atual com a proposta, sem alterar nenhum dos dois.
export function proposalDiff(data, current) {
  const pool = current.bases.map((b, index) => ({ ...b, index, used: false }));
  const match = (id) => {
    const name = city(id).toLowerCase();
    return (
      pool.find((b) => !b.used && b.destinationId && b.destinationId === id) ||
      pool.find((b) => !b.used && !b.destinationId && b.city.trim().toLowerCase() === name)
    );
  };
  const rows = data.bases.map((b) => {
    const before = match(b.destinationId);
    if (before) before.used = true;
    return {
      name: city(b.destinationId),
      was: before ? before.nights : null,
      now: b.nights,
      status: !before ? 'added' : before.nights === b.nights ? 'same' : 'changed',
    };
  });
  for (const b of pool.filter((b) => !b.used))
    rows.push({ name: b.city, was: b.nights, now: null, status: 'removed' });
  const days = data.days.map((d) => {
    const before = current.days.find((day) => day.day === d.day)?.activities || [];
    const was = before.map((a) => a.title),
      now = d.activities.map((a) => a.title);
    return {
      ...d,
      was,
      now,
      changed: was.length !== now.length || was.some((t, i) => t !== now[i]),
    };
  });
  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    rows,
    days,
    added: count('added'),
    removed: count('removed'),
    changed: count('changed'),
    daysChanged: days.filter((d) => d.changed).length,
  };
}
const statusInfo = {
  added: ['circle-plus', 'Nova base'],
  removed: ['circle-minus', 'Removida'],
  changed: ['arrow-right-left', 'Noites alteradas'],
  same: ['check', 'Sem mudança'],
};
export function mochiProposal(data, current) {
  const diff = proposalDiff(data, current);
  const groups = [
    ['sparkles', 'Experiências para o grupo', data.experiences],
    ['umbrella', 'Se chover', data.rainAlternatives],
    ['thermometer', 'Cuidados da estação', data.seasonalCare],
    ['train-front', 'Logística a avaliar', data.logistics],
    ['piggy-bank', 'Ideias para economizar', data.economy],
    ['lightbulb', 'Hipóteses usadas', data.assumptions],
    [
      'map-pin',
      'Lugares a reconsiderar',
      data.omittedDestinations.map((d) => `${city(d.destinationId)}: ${d.reason}`),
    ],
  ].filter(([, , items]) => items.length);
  const chip = (cls, ic, n, label) =>
    `<li class="mochi-diff-chip ${cls} ${n ? '' : 'is-zero'}">${icon(ic)}<strong>${n}</strong> ${label}</li>`;
  return `<section class="mochi-proposal"><header class="mochi-section-head"><p class="eyebrow">UMA PROPOSTA PARA REVISAR</p><h3>${esc(data.title)}</h3><p>${esc(data.introduction)}</p></header><ul class="mochi-diff-summary" aria-label="Resumo das mudanças">${chip('is-added', 'circle-plus', diff.added, diff.added === 1 ? 'cidade adicionada' : 'cidades adicionadas')}${chip('is-removed', 'circle-minus', diff.removed, diff.removed === 1 ? 'cidade removida' : 'cidades removidas')}${chip('is-changed', 'arrow-right-left', diff.changed, diff.changed === 1 ? 'base com noites alteradas' : 'bases com noites alteradas')}${chip('is-days', 'calendar-days', diff.daysChanged, `de ${diff.days.length} dias com atividades diferentes`)}</ul>${data.pendingVerification.length ? `<div class="mochi-callout" role="note">${icon('triangle-alert')}<div><h4>Antes de decidir, confirmar</h4>${list(data.pendingVerification)}</div></div>` : ''}<section class="mochi-comparison" aria-labelledby="mochi-compare-title"><h4 id="mochi-compare-title">Bases: roteiro atual × sugestão</h4><div class="mochi-compare-head" aria-hidden="true"><span>Cidade</span><span>Roteiro atual</span><span>Sugerido</span></div><ul class="mochi-compare-rows">${diff.rows
    .map(
      (r) =>
        `<li class="is-${r.status}"><span class="mochi-compare-city">${icon(statusInfo[r.status][0])}<span><strong>${esc(r.name)}</strong><small>${statusInfo[r.status][1]}</small></span></span><span class="mochi-compare-was"><small>Roteiro atual</small>${nightsLabel(r.was)}</span><span class="mochi-compare-now"><small>Sugerido</small>${nightsLabel(r.now)}${r.status === 'changed' ? `<em>${r.now - r.was > 0 ? '+' : ''}${r.now - r.was}</em>` : ''}</span></li>`,
    )
    .join(
      '',
    )}</ul></section><section class="mochi-reasons"><h4>Por que essas bases?</h4><ul>${data.bases.map((b) => `<li><strong>${esc(city(b.destinationId))}</strong><span>${esc(b.reason)}</span></li>`).join('')}</ul></section><details class="mochi-days"><summary>${icon('calendar-days')} Comparar todos os dias e atividades <span class="badge neutral">${diff.daysChanged} alterados</span></summary><div class="mochi-day-list">${diff.days
    .map(
      (d) =>
        `<article class="mochi-day ${d.changed ? 'is-changed' : ''}"><header><strong>Dia ${d.day} · ${esc(city(d.destinationId))}</strong>${d.changed ? '<span class="mochi-tag">Alterado</span>' : '<span class="mochi-tag is-same">Igual</span>'}</header><p class="mochi-day-was"><small>Atual</small>${esc(d.was.join(' · ') || 'Sem atividades')}</p><p class="mochi-day-now"><small>Proposta</small>${d.now.map(esc).join(' · ')}</p></article>`,
    )
    .join(
      '',
    )}</div></details>${groups.length ? `<div class="mochi-info-grid">${groups.map(([ic, title, items]) => `<section class="mochi-info-card"><h4>${icon(ic)} ${title}</h4>${list(items)}</section>`).join('')}</div>` : ''}<p class="mochi-apply-note">${icon('shield-check')}<span>Ao aplicar, a versão atual fica em “Versões anteriores”. Atividades mantidas preservam estimativas e favoritos; novas atividades ficam a estimar. O orçamento salvo é preservado.</span></p></section>`;
}
export function mochiProposalActions() {
  return `<div class="mochi-action-bar">${mochiButton(`${icon('check')} Aplicar alteração`, 'apply', '')}${mochiButton('Ajustar pedido', 'adjust')}${mochiButton('Cancelar', 'close', 'subtle')}</div>`;
}
export function mochiReview(data, checks) {
  const ok = checks.length === 1 && checks[0] === REVIEW_OK;
  const item = (i) =>
    `<li><span class="mochi-certainty ${i.certainty === 'inference' ? 'is-inference' : ''}">${i.certainty === 'inference' ? 'Possibilidade a avaliar' : 'Sugestão'}</span><span>${esc(i.text)}</span></li>`;
  const group = (cls, ic, title, body) =>
    `<section class="mochi-review-group ${cls}"><h4>${icon(ic)} ${title}</h4>${body}</section>`;
  const items = (arr) =>
    arr.length
      ? `<ul class="mochi-review-list">${arr.map(item).join('')}</ul>`
      : '<p class="mochi-none">Nada a acrescentar aqui.</p>';
  return `<section class="mochi-review"><header class="mochi-section-head"><p class="eyebrow">UM SEGUNDO OLHAR</p><h3>Nosso roteiro, com espaço para respirar.</h3><p>${plural(data.positives.length, 'ponto forte', 'pontos fortes')} · ${ok ? 'nenhum alerta do aplicativo' : `${plural(checks.length, 'ponto', 'pontos')} para conferir`} · ${plural(data.improvements.length + data.optional.length, 'ideia', 'ideias')}</p></header><div class="mochi-review-grid">${group(
    'is-great',
    'circle-check',
    'O que está ótimo',
    `<ul class="mochi-review-list">${ok ? `<li><span class="mochi-certainty is-verified">Verificado pelo aplicativo</span><span>${esc(REVIEW_OK)}</span></li>` : ''}${data.positives.map(item).join('')}</ul>${!ok && !data.positives.length ? '<p class="mochi-none">Nada a acrescentar aqui.</p>' : ''}`,
  )}${group(
    'is-attention',
    'triangle-alert',
    'O que merece atenção',
    `<p class="mochi-group-note">Verificações do aplicativo · regras fixas, sem IA</p>${ok ? '<p class="mochi-none">Nada a sinalizar nas verificações automáticas.</p>' : `<ul class="mochi-review-list is-checks">${checks.map((c) => `<li><span>${esc(c)}</span></li>`).join('')}</ul>`}`,
  )}${group('is-improve', 'lightbulb', 'O que podemos melhorar', items(data.improvements))}${group('is-optional', 'sparkles', 'Sugestões opcionais', items(data.optional))}</div><p class="mochi-disclaimer">${icon('info')}<span>Interpretações da Mochi não confirmam clima, acessos, regras ou disponibilidade.</span></p></section>`;
}
export function mochiChat(messages) {
  return `<div class="mochi-messages" role="log" aria-label="Conversa com Mochi" aria-live="polite">${messages.length ? messages.map((m) => `<article class="mochi-message ${m.role === 'user' ? 'from-user' : 'from-mochi'}">${m.role === 'user' ? '' : avatar()}<div class="mochi-bubble"><small>${m.role === 'user' ? 'Você' : 'Mochi ♡'}</small><p>${esc(m.text)}</p>${m.pending?.length ? `<div class="mochi-pending"><span>Para confirmar</span>${list(m.pending)}</div>` : ''}${m.sourceIds?.length ? `<small class="mochi-sources">Referências gerais do planner: ${m.sourceIds.map((id) => (id === 'jma' ? '<a href="https://www.data.jma.go.jp/stats/etrn/index.php" target="_blank" rel="noopener noreferrer">JMA · normais 1991–2020</a>' : '<a href="https://www.japan.travel/pt/" target="_blank" rel="noopener noreferrer">JNTO · guia de destinos</a>')).join(' · ')}. Sem consulta em tempo real.</small>` : ''}</div></article>`).join('') : `<article class="mochi-message from-mochi">${avatar()}<div class="mochi-bubble"><small>Mochi ♡</small><p>Oi! Eu sou a Mochi ♡ Me conta: vocês sonham com cerejeiras, praias ou neve? Vamos transformar essas ideias em um roteiro! (˶ᵔ ᵕ ᵔ˶)</p></div></article>`}</div>`;
}
