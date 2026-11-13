import { esc } from './utils.js';
import destinations from '../data/destinations.js';
import { RESTING } from './mochi-contracts.js';
export const mochiButton = (label, action, style = 'secondary') =>
  `<button type="button" class="btn ${style}" data-mochi="${action}">${label}</button>`;
export const avatar = () =>
  '<span class="mochi-avatar" aria-hidden="true"><span>• ᴗ •</span></span>';
export function mochiInvitation() {
  return `<section class="mochi-invitation">${avatar()}<div><p class="eyebrow">A LITTLE MAGIC, YOUR WAY</p><h2>Uma ideia a mais, com a Mochi ♡</h2><p>A nossa assistente pode criar outra versão, respeitando as escolhas de vocês. Você revisa e decide.</p>${mochiButton('✨ Criar uma versão personalizada com Mochi', 'itinerary')}<small>Opcional · o planejamento clássico continua disponível.</small></div></section>`;
}
export function mochiEditorTools() {
  return `<section class="mochi-editor-tools" aria-label="Ajuda da Mochi">${avatar()}<div><strong>Um olhar carinhoso para o nosso roteiro.</strong><div class="button-row">${mochiButton('✨ Pedir uma alteração à Mochi', 'refine', 'small secondary')}${mochiButton('✨ Mochi, revise nosso roteiro', 'analyze', 'small secondary')}</div></div></section>`;
}
export const mochiLoading = (message = 'A Mochi está organizando as ideias…') =>
  `<div class="mochi-loading" role="status">${avatar()}<p>${esc(message)} <span aria-hidden="true">♡</span></p></div>`;
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
  return `<div class="mochi-error" role="alert"><p>${esc(code === 'cancelled' ? detail : RESTING)}</p>${detail && code !== 'cancelled' ? `<small>${esc(detail)}</small>` : ''}<a class="text-button" href="#recommendations" data-mochi="classic">Continuar com a sugestão clássica →</a></div>`;
}
const list = (items) =>
  items.length
    ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : '<p class="muted small">Nenhum ponto adicional.</p>';
export function mochiReview(data, checks) {
  return `<section class="mochi-review"><p class="eyebrow">UM SEGUNDO OLHAR</p><h3>Nosso roteiro, com espaço para respirar.</h3><h4>Verificações do aplicativo</h4>${list(checks)}${[
    ['O que está funcionando bem', data.positives],
    ['O que podemos melhorar', data.improvements],
    ['Sugestões opcionais', data.optional],
  ]
    .map(
      ([title, items]) =>
        `<h4>${title}</h4>${list(items.map((i) => `${i.certainty === 'inference' ? 'Possibilidade a avaliar' : 'Sugestão'}: ${i.text}`))}`,
    )
    .join(
      '',
    )}<p class="small muted">Interpretações da Mochi não confirmam clima, acessos, regras ou disponibilidade.</p></section>`;
}
const city = (id) => destinations.find((d) => d.id === id)?.name || 'A definir';
export function mochiProposal(data, current) {
  return `<section class="mochi-proposal"><p class="eyebrow">UMA PROPOSTA PARA REVISAR</p><h3>${esc(data.title)}</h3><p>${esc(data.introduction)}</p><div class="mochi-comparison"><div><h4>Roteiro atual</h4>${list(current.bases.map((b) => `${b.city} · ${b.nights} noites`))}</div><div><h4>Alteração sugerida</h4>${list(data.bases.map((b) => `${city(b.destinationId)} · ${b.nights} noites`))}</div></div><h4>Por que essas bases?</h4>${list(data.bases.map((b) => `${city(b.destinationId)}: ${b.reason}`))}<details><summary>Comparar todos os dias e atividades</summary>${data.days
    .map(
      (d) =>
        `<article class="mochi-day"><strong>Dia ${d.day} · ${esc(city(d.destinationId))}</strong><small>Atual: ${esc(
          current.days
            .find((day) => day.day === d.day)
            ?.activities.map((a) => a.title)
            .join(' · ') || 'Sem atividades',
        )}</small><p>Proposta: ${d.activities.map((a) => esc(a.title)).join(' · ')}</p></article>`,
    )
    .join('')}</details>${[
    ['Experiências para o grupo', data.experiences],
    ['Se chover', data.rainAlternatives],
    ['Cuidados da estação', data.seasonalCare],
    ['Logística a avaliar', data.logistics],
    ['Ideias para economizar', data.economy],
    ['Hipóteses usadas', data.assumptions],
    [
      'Lugares a reconsiderar',
      data.omittedDestinations.map((d) => `${city(d.destinationId)}: ${d.reason}`),
    ],
    ['Antes de decidir, confirmar', data.pendingVerification],
  ]
    .map(([title, items]) => `<h4>${title}</h4>${list(items)}`)
    .join(
      '',
    )}<p class="mochi-apply-note">Ao aplicar, a versão atual ficará em “Versões anteriores”. Atividades mantidas preservam estimativas e favoritos; novas atividades ficam a estimar. O orçamento salvo é preservado.</p><div class="button-row">${mochiButton('Aplicar alteração', 'apply', '')}${mochiButton('Ajustar pedido', 'adjust')}${mochiButton('Cancelar', 'close')}</div></section>`;
}
export function mochiChat(messages) {
  return `<div class="mochi-messages" role="log" aria-label="Conversa com Mochi">${messages.length ? messages.map((m) => `<article class="mochi-message ${m.role === 'user' ? 'from-user' : ''}"><small>${m.role === 'user' ? 'Você' : 'Mochi ♡'}</small><p>${esc(m.text)}</p>${m.pending?.length ? list(m.pending) : ''}${m.sourceIds?.length ? `<small>Referências gerais do planner: ${m.sourceIds.map((id) => (id === 'jma' ? '<a href="https://www.data.jma.go.jp/stats/etrn/index.php" target="_blank" rel="noopener noreferrer">JMA · normais 1991–2020</a>' : '<a href="https://www.japan.travel/pt/" target="_blank" rel="noopener noreferrer">JNTO · guia de destinos</a>')).join(' · ')}. Sem consulta em tempo real.</small>` : ''}</article>`).join('') : `<article class="mochi-message"><p>Oi! Eu sou a Mochi ♡ Me conta: vocês sonham com cerejeiras, praias ou neve? Vamos transformar essas ideias em um roteiro! (˶ᵔ ᵕ ᵔ˶)</p></article>`}</div>`;
}
