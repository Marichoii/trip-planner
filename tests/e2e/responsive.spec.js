import { test, expect } from '@playwright/test';
import { seed, mockMochi } from '../fixtures/state.js';

const phone = { width: 390, height: 844 };

async function open(page, hash, viewport = phone) {
  await page.setViewportSize(viewport);
  await page.goto('/#' + hash);
  await expect(page.locator('main h1').first()).toBeVisible();
}
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.beforeEach(async ({ context }) => {
  await seed(context);
  await mockMochi(context);
});

test('celular: cabeçalho prioriza menu, página, busca e configurações', async ({ page }) => {
  await open(page, 'home');
  await expect(page.locator('#global-search')).toBeHidden();
  await expect(page.locator('#current-page')).toHaveText('Início');
  await expect(page.getByRole('button', { name: 'Configurações da viagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar no diário' }).click();
  const sheet = page.locator('#search-dialog');
  await expect(sheet).toBeVisible();
  await expect(page.locator('#sheet-search')).toBeFocused();
  const box = await sheet.boundingBox();
  expect(box.width).toBe(phone.width);
  await page.locator('#sheet-search').fill('kyo');
  await expect(page.locator('#sheet-search-results a').first()).toContainText('Kyoto');
  await page.locator('#sheet-search-results a').first().click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('#modal')).toContainText('Kyoto');
});

test('busca em painel fecha com Escape e devolve o foco', async ({ page }) => {
  await open(page, 'home', { width: 820, height: 1180 });
  const trigger = page.getByRole('button', { name: 'Buscar no diário' });
  await trigger.click();
  await expect(page.locator('#search-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('wizard no celular: progresso compacto, barra própria e sem navegação inferior', async ({
  page,
}) => {
  await open(page, 'planner/3');
  await expect(page.locator('.wizard-progress-status')).toHaveText(/Etapa 3 de 6\s*O que amamos/);
  // Os nomes das etapas ficam só para leitores de tela no celular.
  const label = await page.locator('.wizard-progress small').first().boundingBox();
  expect(label.width).toBeLessThanOrEqual(1);
  await expect(page.locator('.mobile-primary-nav')).toBeHidden();
  await expect(page.locator('.mochi-launcher')).toBeHidden();
  const footer = await page.locator('.wizard-footer').boundingBox();
  expect(footer.y + footer.height).toBeLessThanOrEqual(phone.height + 1);
  await page.getByRole('button', { name: 'Etapa 1 de 6: Quando ir, concluída' }).click();
  await expect(page.locator('.wizard-heading h1')).toContainText('Quando começa');
});

test('tablet e desktop mostram as seis etapas com nomes legíveis', async ({ page }) => {
  for (const viewport of [
    { width: 820, height: 1180 },
    { width: 1440, height: 900 },
  ]) {
    await open(page, 'planner/2', viewport);
    await expect(page.locator('.wizard-progress small')).toHaveCount(6);
    for (const label of await page.locator('.wizard-progress small').all())
      await expect(label).toBeVisible();
    await expect(page.locator('.wizard-progress-status')).toBeHidden();
  }
});

test('alvos de toque têm pelo menos 44 px nas telas principais do celular', async ({ page }) => {
  for (const hash of [
    'home',
    'planner/1',
    'planner/3',
    'planner/4',
    'recommendations',
    'itinerary',
    'budget',
  ]) {
    await open(page, hash);
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'main a[href], main button, main summary, nav a, header button',
        ),
      ]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (!r.width || !r.height || style.visibility === 'hidden') return false;
          // Links dentro de frases são exceção do WCAG 2.5.8 (alvos em linha de texto).
          if (el.closest('p, li, .notice, .source, .leaflet-container, .sr-only, [inert]'))
            return false;
          return Math.min(r.width, r.height) < 44;
        })
        .map((el) => `${el.tagName}.${el.className}:${el.textContent.trim().slice(0, 30)}`),
    );
    expect(small, hash).toEqual([]);
  }
});

test('botão da Mochi nunca cobre a navegação inferior nem a barra do wizard', async ({ page }) => {
  for (const hash of ['home', 'recommendations', 'itinerary', 'budget']) {
    await open(page, hash);
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('.mochi-launcher').getBoundingClientRect(),
        b = document.querySelector('.mobile-primary-nav').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    expect(overlap, hash).toBe(false);
  }
});

test('Mochi no celular: tela cheia, campo de mensagem visível e consentimento compacto', async ({
  page,
}) => {
  await open(page, 'itinerary');
  await page.getByRole('button', { name: 'Conversar com Mochi', exact: true }).click();
  const panel = page.locator('.mochi-panel');
  await expect(panel.locator('#mochi-request-form')).toBeVisible();
  const box = await panel.boundingBox();
  expect(box.width).toBe(phone.width);
  expect(box.height).toBeGreaterThanOrEqual(phone.height - 1);
  const composer = await panel.locator('#mochi-message').boundingBox();
  expect(composer.y + composer.height).toBeLessThanOrEqual(phone.height);
  await expect(panel.locator('[name=consent]')).not.toBeChecked();
  await expect(panel.locator('.mochi-privacy')).toContainText('Google Gemini');
  await panel.locator('[name=consent]').check();
  await panel.locator('#mochi-message').fill('Como organizar seis malas?');
  await panel.getByRole('button', { name: 'Perguntar à Mochi', exact: true }).click();
  await expect(panel.locator('.from-user')).toHaveCount(1);
  await expect(panel.locator('.mochi-privacy')).not.toHaveAttribute('open', '');
  await expect(panel.locator('.mochi-privacy > summary')).toContainText('autorizadas');
});

test('proposta compara bases com rótulos de mudança, não só cores', async ({ page }) => {
  await open(page, 'recommendations', { width: 1440, height: 900 });
  await page.locator('[data-mochi="itinerary"]').first().click();
  const panel = page.locator('.mochi-panel');
  await panel.locator('[name=consent]').check();
  await panel.getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(panel.locator('.mochi-diff-summary')).toContainText('cidade removida');
  await expect(panel.locator('.mochi-compare-rows .is-removed')).toContainText('Removida');
  await expect(panel.locator('.mochi-compare-rows .is-changed').first()).toContainText(
    'Noites alteradas',
  );
  const width = (await panel.boundingBox()).width;
  expect(width).toBeGreaterThan(700);
});

test('celular na horizontal mantém o conteúdo visível', async ({ page }) => {
  await open(page, 'planner/3', { width: 844, height: 390 });
  const position = await page
    .locator('.wizard-footer')
    .evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe('static');
  await expect(page.locator('.wizard-heading h1')).toBeInViewport();
});

test('mapa ampliado tem botão próprio para fechar no toque', async ({ page }) => {
  await open(page, 'destinations');
  const toggle = page.locator('.map-frame [data-action="expand-map"]');
  await toggle.click();
  await expect(page.locator('.map-frame')).toHaveClass(/map-full/);
  await expect(page.locator('.mobile-primary-nav')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(page.locator('.map-frame')).not.toHaveClass(/map-full/);
});

test('nenhuma tela principal cria rolagem horizontal nas larguras extremas', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ])
    for (const hash of [
      'home',
      'planner/4',
      'recommendations',
      'itinerary',
      'budget',
      'hotels',
      'months',
    ]) {
      await open(page, hash, viewport);
      expect(await overflow(page), `${hash} @ ${viewport.width}`).toBeLessThanOrEqual(0);
    }
});
