import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { seed } from '../fixtures/state.js';
import { STORAGE_KEY } from '../../src/js/storage.js';

const advice = {
  summary:
    'Seu plano combina praia e cultura. Eu deixaria uma pausa entre as bases para curtir o caminho.',
  suggestions: [
    {
      reason: 'Um ritmo leve dá espaço para explorar os bairros e descansar.',
      change: { field: 'pace', value: 'calm' },
    },
  ],
  cautions: ['Confira os horários e a disponibilidade antes de reservar.'],
};
const state = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
async function setup(context, handler) {
  await seed(context);
  const calls = [];
  await context.route('**/api/ai/*', async (route) => {
    const op = route.request().url().split('/').at(-1);
    calls.push({ op, input: op === 'session' ? null : route.request().postDataJSON() });
    if (op === 'session') return route.fulfill({ json: { enabled: true, csrf: 'test-csrf' } });
    if (handler) return handler(route, calls.at(-1).input, calls);
    return route.fulfill({ json: { data: advice, meta: { mode: 'gemini' } } });
  });
  return calls;
}
const enable = (page) => page.locator('[data-coach=enable]').click();
const ready = (page) => expect(page.locator('.coach-answer')).toBeVisible({ timeout: 12000 });
const next = (page) => page.locator('[data-planner-action=next]').click();

test('Mochi só envia após ativar, usa pedidos atuais e aplica a dica apenas no rascunho', async ({
  page,
  context,
}) => {
  const calls = await setup(context);
  await page.goto('/#planner/3');
  await page.locator('#travel-notes').fill('Cafés especiais e jardins');
  await page.locator('#travel-avoid').fill('Muitas trocas de hotel');
  const before = await state(page);
  expect(calls).toHaveLength(0);
  await enable(page);
  await ready(page);
  const input = calls.find((c) => c.op === 'coach').input;
  expect(input.step).toBe(3);
  expect(input.profile.travelNotes).toBe('Cafés especiais e jardins');
  expect(input.profile.avoid).toBe('Muitas trocas de hotel');
  expect(input.budget).toBe(null);
  expect((await state(page)).planner.draft.pace).toBe('balanced');
  await page.locator('[data-coach=apply]').click();
  await expect.poll(async () => (await state(page)).planner.draft.pace).toBe('calm');
  const after = await state(page);
  expect(after.routes).toEqual(before.routes);
  expect(after.trip).toEqual(before.trip);
  await page.reload();
  await expect(page.locator('#travel-notes')).toHaveValue('Cafés especiais e jardins');
  await expect(page.locator('[data-coach=enable]')).toBeVisible();
});

test('alterações rápidas se agrupam, perguntas usam o novo contexto, orçamento é opcional e pausa interrompe', async ({
  page,
  context,
}) => {
  const calls = await setup(context);
  await page.goto('/#planner/3');
  await enable(page);
  await ready(page);
  const notes = page.locator('#travel-notes');
  await notes.fill('Cafés');
  await notes.fill('Cafés e museus');
  await notes.fill('Cafés e museus com pausas');
  await expect.poll(() => calls.filter((c) => c.op === 'coach').length, { timeout: 12000 }).toBe(2);
  await ready(page);
  expect(calls.at(-1).input.profile.travelNotes).toBe('Cafés e museus com pausas');
  await page.locator('[data-coach-budget]').check();
  await expect(page.locator('[data-coach-budget]')).toBeFocused();
  await page.locator('#coach-question').fill('Como distribuir as pausas?');
  await page.locator('#coach-question-form button').click();
  await ready(page);
  expect(calls.at(-1).input.question).toBe('Como distribuir as pausas?');
  expect(calls.at(-1).input.budget.perPersonTotal).toBeGreaterThan(0);
  await page.locator('[data-coach=pause]').click();
  const count = calls.length;
  await notes.fill('Novo pedido enquanto pausada');
  await page.waitForTimeout(1500);
  expect(calls).toHaveLength(count);
  await expect(page.locator('[data-coach=enable]')).toHaveText(/Retomar/);
});

test('uma resposta atrasada é descartada ao editar ou sair do criador', async ({
  page,
  context,
}) => {
  let release;
  let started = false;
  await setup(context, async (route) => {
    started = true;
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: { data: advice, meta: { mode: 'gemini' } } }).catch(() => {});
  });
  await page.goto('/#planner/3');
  await enable(page);
  await expect.poll(() => started).toBe(true);
  await page.locator('#travel-notes').fill('Mudança durante a resposta');
  release();
  await expect(page.locator('.coach-answer')).toHaveCount(0);
  await page.locator('[data-coach=pause]').click();
  await page.goto('/#home');
  await expect(page.locator('[data-coach=apply]')).toHaveCount(0);
  expect((await state(page)).planner.draft.pace).toBe('balanced');
});

test('falha pausa as chamadas; tentar novamente renova a sessão e mantém o criador disponível', async ({
  page,
  context,
}) => {
  let fail = true;
  const calls = await setup(context, async (route) => {
    if (fail) return route.fulfill({ status: 429, json: { error: { code: 'rate_limited' } } });
    return route.fulfill({ json: { data: advice, meta: { mode: 'gemini' } } });
  });
  await page.goto('/#planner/3');
  await enable(page);
  await expect(page.locator('.coach-error')).toContainText('limite');
  await next(page);
  await expect(page).toHaveURL(/#planner\/4/);
  expect(calls.filter((c) => c.op === 'coach')).toHaveLength(1);
  fail = false;
  await enable(page);
  await ready(page);
  expect(calls.filter((c) => c.op === 'session')).toHaveLength(2);
});

test('revisão conserva pedidos, retorna à edição e oferece a proposta completa da Mochi', async ({
  page,
  context,
}) => {
  const calls = await setup(context);
  await page.goto('/#planner/3');
  await page.locator('#travel-notes').fill('Queremos explorar os jardins');
  await page.goto('/#planner/6');
  await expect(page.locator('.review-notes')).toContainText('Queremos explorar os jardins');
  await page.locator('.review-notes button').click();
  await page.locator('#travel-notes').fill('Jardins e cafés');
  await page.locator('[data-planner-action=return-review]').click();
  await expect(page.locator('.review-notes')).toContainText('Jardins e cafés');
  expect(calls).toHaveLength(0);
  await page.locator('.review-ai [data-mochi=itinerary]').click();
  await expect(page.locator('#mochi-request-form')).toBeVisible();
  expect(calls.filter((c) => c.op !== 'session')).toHaveLength(0);
});

for (const width of [390, 1440])
  test(`acompanhamento acessível e sem transbordamento em ${width}px`, async ({
    page,
    context,
  }) => {
    await setup(context);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#planner/3');
    if (width < 1024) {
      await expect(page.locator('#planner-coach')).not.toHaveAttribute('open');
      await page.locator('[data-coach-summary]').click();
    }
    await enable(page);
    await ready(page);
    await expect(page.locator('#coach-question')).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await mkdir('docs/screenshots/planner-coach', { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/planner-coach/interests-${width}.png`,
      fullPage: true,
    });
  });

test('um campo incompleto suspende dicas e conserva a pergunta até corrigir o perfil', async ({
  page,
  context,
}) => {
  const calls = await setup(context);
  await page.goto('/#planner/2');
  await enable(page);
  await ready(page);
  await page.locator('[data-profile=days]').fill('');
  await expect(page.locator('.coach-error')).toContainText('Termine de preencher');
  await page.locator('#coach-question').fill('Como organizar as pausas?');
  await page.locator('#coach-question-form button').click();
  expect(calls.filter((c) => c.op === 'coach')).toHaveLength(1);
  await page.locator('[data-profile=days]').fill('10');
  await expect(page.locator('#coach-question')).toHaveValue('Como organizar as pausas?');
  await page.locator('#coach-question-form button').click();
  await ready(page);
  expect(calls.at(-1).input.profile.days).toBe(10);
  expect(calls.at(-1).input.profile.nights).toBe(9);
  expect(calls.at(-1).input.question).toBe('Como organizar as pausas?');
});
