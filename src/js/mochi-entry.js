// Parte leve da Mochi: botão flutuante, convites e carregamento sob demanda.
// O controlador, os contratos (zod) e o cliente da API só são baixados
// quando alguém abre a Mochi.
import { icon } from './utils.js';

export const avatar = () =>
  '<span class="mochi-avatar" aria-hidden="true"><span>• ᴗ •</span></span>';
export const mochiButton = (label, action, style = 'secondary', extra = '') =>
  `<button type="button" class="btn ${style}" data-mochi="${action}" ${extra}>${label}</button>`;
export function mochiInvitation() {
  return `<section class="mochi-invitation" aria-labelledby="mochi-invitation-title">${avatar()}<div><p class="eyebrow">A LITTLE MAGIC, YOUR WAY</p><h2 id="mochi-invitation-title">Uma ideia a mais, com a Mochi ♡</h2><p>A nossa assistente pode criar outra versão, respeitando as escolhas de vocês. Você revisa e decide.</p><div class="button-row">${mochiButton(`${icon('wand-sparkles')} Criar uma versão personalizada com Mochi`, 'itinerary')}</div><small>Opcional · o planejamento clássico continua disponível e nada é enviado sem a sua autorização.</small></div></section>`;
}
export function mochiEditorTools() {
  return `<section class="mochi-editor-tools" aria-label="Ajuda da Mochi">${avatar()}<div><strong>Um olhar carinhoso para o nosso roteiro.</strong><span>Peça um ajuste ou uma revisão. Você aprova antes de qualquer mudança.</span></div><div class="button-row">${mochiButton(`${icon('pencil')} Pedir uma alteração`, 'refine', 'small secondary')}${mochiButton(`${icon('list-checks')} Revisar nosso roteiro`, 'analyze', 'small secondary')}</div></section>`;
}

const OPERATIONS = ['chat', 'itinerary', 'refine', 'analyze'];

export function connectMochiEntry(ctx, load = () => import('./mochi-controller.js')) {
  const launcher = document.createElement('button');
  launcher.className = 'mochi-launcher';
  launcher.type = 'button';
  launcher.dataset.mochi = 'chat';
  launcher.innerHTML =
    avatar() + '<span class="mochi-launcher-label">Mochi ♡<small>Vamos conversar?</small></span>';
  launcher.setAttribute('aria-label', 'Conversar com Mochi');
  document.body.append(launcher);
  let controller = null,
    loading = null;
  async function ensure() {
    if (controller) return controller;
    loading ??= load().then((module) => {
      controller = module.connectMochi(ctx);
      return controller;
    });
    try {
      return await loading;
    } catch (error) {
      loading = null;
      throw error;
    }
  }
  // Antes do carregamento, este ouvinte encaminha o primeiro clique.
  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-mochi]');
    if (!target || controller) return;
    const operation = target.dataset.mochi;
    if (!OPERATIONS.includes(operation)) return;
    event.preventDefault();
    launcher.setAttribute('aria-busy', 'true');
    try {
      (await ensure()).open(operation);
    } catch (error) {
      console.error(error);
      ctx.toast?.(
        'Não foi possível abrir a Mochi agora. O planejamento clássico continua disponível.',
      );
    } finally {
      launcher.removeAttribute('aria-busy');
    }
  });
  // No celular, o botão se recolhe enquanto a pessoa rola para baixo e volta ao subir.
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 12) return;
      launcher.classList.toggle('is-tucked', y > lastY && y > 160);
      lastY = y;
    },
    { passive: true },
  );
  return {
    onRender(route) {
      launcher.hidden = route === 'planner';
      launcher.classList.remove('is-tucked');
    },
    close() {
      controller?.close();
    },
  };
}
