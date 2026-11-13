import { test, expect } from '@playwright/test';
import { initialState, STORAGE_KEY, LEGACY_STORAGE_KEY } from '../../src/js/storage.js';
import { mkdir } from 'node:fs/promises';
const action = (page, name) => page.locator(`#planner-page [data-planner-action="${name}"]`);
const next = async (page) => action(page, 'next').click();
async function toReview(page) {
  while (await action(page, 'next').count()) await next(page);
  await expect(action(page, 'generate')).toBeVisible();
}
async function imageReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('main img')].map((image) => {
        image.loading = 'eager';
        return image.decode().catch(() => {});
      }),
    );
  });
}
async function stored(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
}
test('Home inicia um wizard visual, opcional e sem uma rota já decidida', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.welcome-hero h1')).toHaveText('O Japão nos espera.♡');
  await expect(page.locator('.welcome-hero')).not.toContainText('R$');
  await expect(page.getByRole('link', { name: /Continuar nosso planejamento/ })).toHaveCount(0);
  expect((await stored(page)).routeChosen).toBe(false);
  await page.getByRole('link', { name: 'Vamos planejar nossa viagem', exact: true }).click();
  await expect(page).toHaveURL(/#planner/);
  await expect(page.locator('.wizard-heading h1')).toContainText('Quando começa');
  await action(page, 'skip').click();
  await expect(page.locator('[data-profile=travelers]')).toHaveValue('6');
  await next(page);
  await action(page, 'skip').click();
  await action(page, 'skip').click();
  await action(page, 'skip').click();
  await action(page, 'generate').click();
  await expect(page).toHaveURL(/#recommendations/);
  await expect(page.locator('main h1')).toContainText('O nosso Japão ideal');
  await expect(page.locator('.recommendation-pills')).toContainText('Estação em aberto');
  await expect(page.locator('.result-budget-note')).toContainText('O orçamento pode vir depois');
  expect((await stored(page)).routeChosen).toBe(false);
});
test('verão, praias e parques geram Okinawa e um roteiro que pode ser editado', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#planner');
  await page.locator('[data-planner-action=season][data-id=summer]').click();
  await page.locator('[data-profile=month]').selectOption('7');
  await next(page);
  await expect(page.locator('[data-profile=travelers]')).toHaveValue('6');
  await next(page);
  for (const id of ['beach', 'shopping', 'parks'])
    await page.locator(`[data-planner-action=interest][data-id=${id}]`).click();
  for (const id of ['beach', 'parks', 'shopping'])
    await page.locator(`[data-planner-action=priority][data-id=${id}]`).click();
  await next(page);
  await expect(page.locator('.planner-city')).toContainText(['Naha']);
  await next(page);
  await page.locator('[data-planner-action=budget-choice][data-id=balanced]').click();
  await next(page);
  await action(page, 'generate').click();
  await expect(page.locator('.recommendation-city-grid')).toContainText('Naha');
  await expect(page.locator('.result-care')).toContainText('Não há Shinkansen');
  const before = await stored(page);
  expect(before.selectedRoute).toBe('winter');
  expect(before.routeChosen).toBe(false);
  await page.locator('.recommendation-hero [data-planner-action=accept]').click();
  await expect(page).toHaveURL(/#itinerary/);
  await expect(page.locator('.day-card')).toHaveCount(25);
  const saved = await stored(page);
  expect(saved.selectedRoute).toBe('personalized');
  expect(saved.trip.selectedSeason).toBe('summer');
  expect(saved.routes.personalized.bases.reduce((n, b) => n + b.nights, 0)).toBe(24);
  await page.locator('.day-card[data-day="2"] [data-action=activity-edit]').first().click();
  await page.locator('#activity-form [name=title]').fill('Nosso passeio de verão');
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await page.reload();
  await expect(page.locator('.day-card[data-day="2"]')).toContainText('Nosso passeio de verão');
  await page.goto('/#budget');
  await page.locator('[name=flight]').fill('12000');
  await page.locator('[name=flight]').fill('13000');
  const synced = await stored(page);
  expect(synced.planner.draft.budget.flight).toBe(13000);
  expect(synced.planner.draft.budgetChoice).toBe('custom');
  expect(synced.planner.dirty).toBe(true);
  expect(errors).toEqual([]);
});
test('avançar, voltar e recuperar progresso preserva seis viajantes e preferências', async ({
  page,
}) => {
  await page.goto('/#planner');
  await page.locator('[data-planner-action=season][data-id=winter]').click();
  await next(page);
  await page.getByRole('button', { name: 'Diminuir viajantes' }).click();
  await page.getByRole('button', { name: 'Aumentar viajantes' }).click();
  await expect(page.locator('[data-profile=travelers]')).toHaveValue('6');
  await page.locator('[data-profile=days]').fill('18');
  await expect(page.locator('[data-profile=nights]')).toHaveValue('17');
  await page.locator('[data-profile=departureCity]').fill('Goiânia');
  await page.locator('[data-planner-action=pace][data-id=calm]').click();
  await next(page);
  await page.locator('[data-planner-action=interest][data-id=snow]').click();
  await page.reload();
  await expect(page.locator('.wizard-heading h1')).toContainText('coração');
  await expect(page.locator('[data-planner-action=interest][data-id=snow]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await action(page, 'previous').click();
  await expect(page.locator('[data-profile=travelers]')).toHaveValue('6');
  await expect(page.locator('[data-profile=days]')).toHaveValue('18');
  await expect(page.locator('[data-profile=departureCity]')).toHaveValue('Goiânia');
  await page.goto('/#home');
  await expect(page.getByRole('link', { name: /Continuar nosso planejamento/ })).toBeVisible();
  await page.getByRole('link', { name: /Continuar nosso planejamento/ }).click();
  await expect(page.locator('.wizard-heading h1')).toContainText('Quantas memórias');
});
test('dias e noites inconsistentes impedem continuar com uma explicação', async ({ page }) => {
  await page.goto('/#planner');
  await next(page);
  await page.locator('[data-profile=nights]').fill('10');
  await next(page);
  await expect(page.locator('#wizard-errors')).toContainText('24 noites');
  await expect(page.locator('.wizard-heading h1')).toContainText('Quantas memórias');
  await page.locator('[data-profile=nights]').fill('24');
  await next(page);
  await expect(page.locator('.wizard-heading h1')).toContainText('coração');
});
test('inverno e neve recebem opções coerentes, e a sugestão pode ser rejeitada', async ({
  page,
}) => {
  await page.goto('/#planner');
  await page.locator('[data-planner-action=season][data-id=winter]').click();
  await next(page);
  await next(page);
  await page.locator('[data-planner-action=interest][data-id=snow]').click();
  await page.locator('[data-planner-action=interest][data-id=pop]').click();
  await next(page);
  await expect(page.locator('.planner-city-grid')).toContainText('Nagano');
  await toReview(page);
  await action(page, 'generate').click();
  await expect(page.locator('.recommendation-city-grid')).toContainText('Nagano');
  await page.locator('.recommendation-hero [data-planner-action=reject]').click();
  await expect(page.locator('main')).toContainText('Essa sugestão não foi aplicada');
  expect((await stored(page)).routeChosen).toBe(false);
  await page.locator('.recommendation-hero [data-planner-action=refine]').click();
  await expect(page).toHaveURL(/#planner/);
  await expect(page.locator('.wizard-heading h1')).toContainText('primeiro esboço');
});
test('backup v1, roteiro personalizado e finanças sobrevivem ao novo fluxo', async ({ page }) => {
  const old = initialState();
  old.version = 1;
  delete old.planner;
  delete old.routeChosen;
  old.routes.winter.days[0].activities[0].title = 'Memória do roteiro anterior';
  old.notes = 'Preservar nossas notas';
  old.budget.shopping = 5432;
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: LEGACY_STORAGE_KEY,
    value: JSON.stringify(old),
  });
  await page.goto('/#planner');
  await toReview(page);
  await action(page, 'generate').click();
  await page.locator('.recommendation-hero [data-planner-action=accept]').click();
  await expect(page.locator('.suggestion-confirm')).toBeVisible();
  expect((await stored(page)).routes.winter.days[0].activities[0].title).toBe(
    'Memória do roteiro anterior',
  );
  await page.locator('[data-planner-action=confirm-accept]').click();
  await expect(page).toHaveURL(/#itinerary/);
  let saved = await stored(page);
  expect(saved.notes).toBe('Preservar nossas notas');
  expect(saved.budget.shopping).toBe(5432);
  expect(saved.planner.history).toHaveLength(1);
  expect(saved.routes.winter).toEqual(old.routes.winter);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LEGACY_STORAGE_KEY),
  ).toEqual(old);
  await page.locator('.planner-history summary').click();
  await page.getByRole('button', { name: 'Restaurar esta versão' }).click();
  await page.getByRole('button', { name: 'Guardar atual e restaurar' }).click();
  await expect(page.locator('.day-card[data-day="1"]')).toContainText(
    'Memória do roteiro anterior',
  );
  await page.reload();
  await expect(page.locator('.day-card[data-day="1"]')).toContainText(
    'Memória do roteiro anterior',
  );
});
for (const width of [1440, 768, 390]) {
  test(`fluxo visual completo e navegação em ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await mkdir('docs/screenshots', { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await imageReady(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/welcome-${width}.png`, fullPage: false });
    await page.getByRole('link', { name: 'Vamos planejar nossa viagem', exact: true }).click();
    for (let step = 1; step <= 6; step++) {
      await expect(page.locator('.wizard-progress [aria-current=step]')).toContainText(
        String(step).padStart(2, '0'),
      );
      if (step === 1) await page.locator('[data-planner-action=season][data-id=summer]').click();
      if (step === 3) {
        await page.locator('[data-planner-action=interest][data-id=beach]').click();
        await page.locator('[data-planner-action=priority][data-id=beach]').click();
      }
      if (step === 5)
        await page.locator('[data-planner-action=budget-choice][data-id=unknown]').click();
      await imageReady(page);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `docs/screenshots/wizard-${step}-${width}.png`,
        fullPage: false,
      });
      if (step < 6) await next(page);
    }
    await action(page, 'generate').click();
    await expect(page.locator('#recommendation-map .leaflet-marker-icon')).toHaveCount(3);
    await imageReady(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/result-${width}.png`, fullPage: false });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (width < 1025) {
      await expect(page.locator('.mobile-primary-nav a')).toHaveCount(5);
      await page.locator('.mobile-primary-nav a[href="#explore"]').click();
      await expect(page.locator('main h1')).toContainText('muito para contar');
      await page.getByRole('button', { name: 'Abrir navegação' }).click();
      await page.locator('[data-nav-group=organize] summary').click();
      await page.locator('[data-nav=transport]').click();
      await expect(page.locator('main h1')).toContainText('caminho também');
    }
  });
}
test('valores personalizados e datas são salvos sem afetar o orçamento atual antes de aceitar', async ({
  page,
}) => {
  await page.goto('/#planner');
  await page.locator('[data-profile=month]').selectOption('10');
  await expect(page.locator('[data-planner-action=season][data-id=autumn]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-profile=departureDate]').fill('2029-11-13');
  await expect(page.locator('[data-planner-action=season][data-id=autumn]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-profile=month]')).toHaveValue('11');
  await next(page);
  await next(page);
  await next(page);
  await next(page);
  await page.locator('[data-planner-action=budget-choice][data-id=custom]').click();
  await page.locator('[data-planner-budget=lodgingNight]').fill('600');
  await page.locator('[data-planner-budget=flight]').fill('8000');
  await page.reload();
  await expect(page.locator('[data-planner-budget=lodgingNight]')).toHaveValue('600');
  expect((await stored(page)).budget.flight).toBe(9000);
  await page.locator('.planner-custom-budget details summary').click();
  await page.locator('[data-planner-budget=shinkansen]').fill('-10');
  await page.locator('.planner-custom-budget details summary').click();
  await next(page);
  await expect(page.locator('.planner-custom-budget details')).toHaveAttribute('open', '');
  await expect(page.locator('[data-planner-budget=shinkansen]')).toBeFocused();
  await page.locator('[data-planner-budget=shinkansen]').fill('1100');
  await next(page);
  await action(page, 'generate').click();
  await expect(page.locator('.result-budget-note')).toContainText('30.900,00');
  expect((await stored(page)).trip.departureDate).toBe(null);
});
test('escolhas por teclado mantêm foco e mostram erros junto do campo', async ({ page }) => {
  await page.goto('/#planner');
  const winter = page.locator('[data-planner-action=season][data-id=winter]');
  await winter.focus();
  await page.keyboard.press('Space');
  await expect(winter).toHaveAttribute('aria-pressed', 'true');
  await expect(winter).toBeFocused();
  await next(page);
  await page.locator('[data-profile=nights]').fill('20');
  await next(page);
  await expect(page.locator('[data-profile=nights]')).toBeFocused();
  await expect(page.locator('[data-profile=nights]')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-profile=nights]').fill('24');
  await expect(page.locator('[data-profile=nights]')).not.toHaveAttribute('aria-invalid', 'true');
  await next(page);
  await expect(page.locator('.wizard-heading h1')).toContainText('coração');
});
test('quando o navegador não permite salvar, o wizard informa a falha', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
  });
  await page.goto('/#planner');
  await expect(page.locator('[data-planner-save]')).toContainText('Não foi possível salvar');
  await page.locator('[data-planner-action=season][data-id=summer]').click();
  await expect(page.locator('[data-planner-save]')).toContainText('Não foi possível salvar');
  await expect(page.locator('[data-planner-action=season][data-id=summer]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
