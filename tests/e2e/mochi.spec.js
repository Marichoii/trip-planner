import { test, expect } from '@playwright/test';
import { initialState, STORAGE_KEY } from '../../src/js/storage.js';
import { buildRecommendation } from '../../src/js/recommendations.js';
import { proposal, chat, review } from '../fixtures/mochi.js';
import { mkdir } from 'node:fs/promises';

const panel = (page) => page.locator('.mochi-panel');
const button = (page, action) => page.locator(`[data-mochi="${action}"]`);
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
async function setup(page, { login = false, fail = false, delay = false } = {}) {
  const state = initialState();
  state.planner.result = buildRecommendation(state.planner.draft, 'classic', '2026-11-13');
  state.planner.status = 'ready';
  state.notes = 'Private note must stay local';
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    },
    { key: STORAGE_KEY, state },
  );
  const requests = [];
  let authenticated = !login;
  await page.route('**/api/ai/*', async (route) => {
    const operation = new URL(route.request().url()).pathname.split('/').at(-1),
      method = route.request().method();
    if (operation === 'session') {
      if (fail) return route.fulfill({ status: 503, json: { error: { code: 'disabled' } } });
      if (method === 'POST') {
        expect(route.request().postDataJSON()).toEqual({ code: 'test-only-group-access' });
        authenticated = true;
      }
      if (method === 'DELETE') authenticated = false;
      return route.fulfill({
        json: { enabled: true, authenticated, csrf: authenticated ? 'test-only-csrf' : null },
      });
    }
    const data = route.request().postDataJSON();
    requests.push({ operation, data });
    if (delay) await new Promise((resolve) => setTimeout(resolve, 800));
    const result =
      operation === 'chat' ? chat : operation === 'analyze' ? review : proposal(data.profile);
    await route
      .fulfill({
        json: {
          data: result,
          meta: { mode: 'gemini', checks: ['As noites conferem no aplicativo.'] },
        },
      })
      .catch(() => {});
  });
  return { state, requests };
}
async function consent(page) {
  await panel(page).locator('[name=consent]').check();
}
test('Mochi só chama o modelo por ação explícita; gera, confirma, arquiva e desfaz', async ({
  page,
}) => {
  const { state, requests } = await setup(page);
  await page.goto('/#recommendations');
  await expect(page.locator('.mochi-invitation')).toBeVisible();
  expect(requests).toHaveLength(0);
  await button(page, 'itinerary').click();
  await expect(panel(page).locator('#mochi-request-form')).toBeVisible();
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  expect(requests).toHaveLength(0);
  await consent(page);
  await panel(page).locator('[name=notes]').fill('Quero mais pausas.');
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(panel(page).locator('.mochi-proposal')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].data.budget).toBeNull();
  expect(requests[0].data.profile).not.toHaveProperty('budget');
  expect(JSON.stringify(requests[0])).not.toContain(state.notes);
  expect((await saved(page)).routeChosen).toBe(false);
  await button(page, 'apply').click();
  await expect(panel(page)).toContainText('Um novo capítulo');
  const next = await saved(page);
  expect(next.routes.personalized.bases.reduce((n, b) => n + b.nights, 0)).toBe(24);
  expect(next.planner.history).toHaveLength(1);
  expect(next.budget).toEqual(state.budget);
  await button(page, 'undo').click();
  await expect(panel(page)).not.toBeVisible();
  expect((await saved(page)).routes.personalized).toEqual(state.routes.winter);
});
test('refinar compara cada dia, permite ajustar pedido e só aplica ao confirmar', async ({
  page,
}) => {
  const { state, requests } = await setup(page);
  await page.goto('/#itinerary');
  await button(page, 'refine').click();
  await consent(page);
  await panel(page).locator('[name=message]').fill('Quero mais tempo em Tóquio.');
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(panel(page).locator('.mochi-comparison')).toContainText('Roteiro atual');
  await panel(page).getByText('Comparar todos os dias e atividades').click();
  await expect(panel(page).locator('.mochi-day')).toHaveCount(25);
  expect((await saved(page)).routes.winter).toEqual(state.routes.winter);
  await button(page, 'adjust').click();
  await expect(panel(page).locator('[name=message]')).toHaveValue('Quero mais tempo em Tóquio.');
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(button(page, 'apply')).toBeVisible();
  await button(page, 'apply').click();
  await button(page, 'close').first().click();
  await page.reload();
  await expect(page.locator('.planner-history')).toContainText('Versões anteriores');
  expect(requests.map((r) => r.operation)).toEqual(['refine', 'refine']);
});
test('chat exige acesso, limita contexto, limpa conversa e revisão separa certezas', async ({
  page,
}) => {
  const { requests } = await setup(page, { login: true });
  await page.goto('/#itinerary');
  await page.getByRole('button', { name: 'Conversar com Mochi', exact: true }).click();
  await panel(page).locator('[name=code]').fill('test-only-group-access');
  await panel(page).getByRole('button', { name: 'Entrar no grupo', exact: true }).click();
  await consent(page);
  await panel(page)
    .getByRole('button', { name: 'Como organizar seis malas grandes?', exact: true })
    .click();
  await panel(page).getByRole('button', { name: 'Perguntar à Mochi', exact: true }).click();
  await expect(panel(page).locator('.from-user')).toContainText('seis malas');
  await expect(panel(page)).toContainText(chat.answer);
  await panel(page).locator('[name=message]').fill('Mais alguma sugestão?');
  await panel(page).getByRole('button', { name: 'Perguntar à Mochi', exact: true }).click();
  await expect(panel(page).locator('.from-user')).toHaveCount(2);
  expect(requests[1].data.history).toHaveLength(2);
  await button(page, 'clear').click();
  await expect(panel(page).locator('.from-user')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await button(page, 'analyze').click();
  await consent(page);
  await panel(page).getByRole('button', { name: 'Revisar com Mochi', exact: true }).click();
  await expect(panel(page)).toContainText('Verificações do aplicativo');
  await expect(panel(page)).toContainText('O que está funcionando bem');
  await expect(panel(page)).toContainText('Possibilidade a avaliar');
});
test('API ausente oferece fallback sem impedir recomendação clássica', async ({ page }) => {
  const { requests } = await setup(page, { fail: true });
  await page.goto('/#recommendations');
  await button(page, 'itinerary').click();
  await expect(panel(page)).toContainText(
    'A Mochi está descansando um pouquinho. ♡ Você ainda pode continuar planejando normalmente.',
  );
  await button(page, 'classic').click();
  await page.locator('.recommendation-hero [data-planner-action=accept]').click();
  await expect(page).toHaveURL(/#itinerary/);
  expect(requests).toHaveLength(0);
});
test('pedido em andamento bloqueia duplicados e cancelamento preserva roteiro', async ({
  page,
}) => {
  const { requests, state } = await setup(page, { delay: true });
  await page.goto('/#itinerary');
  await button(page, 'refine').click();
  await consent(page);
  await panel(page).locator('[name=message]').fill('Mais pausas para o grupo.');
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(panel(page).locator('.mochi-loading')).toBeVisible();
  await expect(
    panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }),
  ).toHaveCount(0);
  await button(page, 'cancel').click();
  await expect(panel(page)).toContainText('Pedido cancelado');
  await expect(panel(page).locator('.mochi-proposal')).toHaveCount(0);
  expect(requests).toHaveLength(1);
  expect((await saved(page)).routes.winter).toEqual(state.routes.winter);
});
test('texto malicioso simulado é rejeitado e nunca vira DOM executável', async ({ page }) => {
  await setup(page);
  await page.route('**/api/ai/itinerary', (route) =>
    route.fulfill({
      json: {
        data: { ...proposal(), title: '<img src=x onerror="window.mochiXss=true">' },
        meta: { mode: 'gemini' },
      },
    }),
  );
  await page.goto('/#recommendations');
  await button(page, 'itinerary').click();
  await consent(page);
  await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(panel(page)).toContainText('não passou pelas verificações');
  expect(await page.evaluate(() => window.mochiXss)).toBeUndefined();
  await expect(panel(page).locator('img')).toHaveCount(0);
});
for (const width of [1440, 768, 390]) {
  test(`Mochi visual e painel acessível em ${width}px`, async ({ page }) => {
    await mkdir('docs/screenshots/mochi', { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page);
    await page.goto('/#recommendations');
    await page.locator('.mochi-invitation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/screenshots/mochi/invitation-${width}.png` });
    await button(page, 'itinerary').click();
    await consent(page);
    await panel(page).getByRole('button', { name: 'Gerar proposta', exact: true }).click();
    await expect(panel(page).locator('.mochi-proposal')).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/mochi/proposal-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const bounds = await panel(page).boundingBox();
    expect(bounds.width).toBeLessThanOrEqual(width);
    if (width === 390) expect(bounds.width).toBe(width);
    await page.keyboard.press('Tab');
    expect(await panel(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await page.goto('/#itinerary');
    await button(page, 'analyze').click();
    await consent(page);
    await panel(page).getByRole('button', { name: 'Revisar com Mochi', exact: true }).click();
    await expect(panel(page).locator('.mochi-review')).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/mochi/review-${width}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Conversar com Mochi', exact: true }).click();
    await expect(panel(page).locator('#mochi-request-form')).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/mochi/chat-${width}.png` });
    await page.keyboard.press('Escape');
    await page.goto('/#planner');
    await expect(page.locator('.mochi-launcher')).toBeHidden();
  });
}
