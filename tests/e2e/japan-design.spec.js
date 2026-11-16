import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STORAGE_KEY } from '../../src/js/storage.js';

test('bilhete abre os ajustes do rascunho e mantém o roteiro ativo intacto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editar viajantes e duração da viagem' }).click();
  await expect(page).toHaveURL(/#planner\/2$/);
  await page.locator('[data-profile="travelers"]').fill('3');
  await page.locator('[data-profile="travelers"]').blur();
  await page.goto('/#home');
  await expect(page.locator('.home-ticket')).toContainText('3 viajantes');
  await page.reload();
  await expect(page.locator('.home-ticket')).toContainText('3 viajantes');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(saved.trip.travelers).toBe(6);
  expect(saved.routeChosen).toBe(false);
});

test('Home simples abre uma ferramenta por vez sem chamar IA', async ({ page }) => {
  const aiCalls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/ai/')) aiCalls.push(req.url());
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Início · planner');
  await expect(page.locator('.brand strong')).toHaveText('planner.');
  await expect(page.getByRole('tab', { name: 'Estações', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.locator('canvas, .leaflet-container')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Meu plano', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('tab', { name: 'Mapa', exact: true }).click();
  await expect(page.locator('#home-map .leaflet-marker-icon')).toHaveCount(5);
  await page.getByRole('tab', { name: 'Clima', exact: true }).click();
  await expect(page.locator('#home-map')).toHaveCount(0);
  await page.locator('#home-climate-city').selectOption('naha');
  await expect(page.locator('#home-climate-chart')).toHaveAttribute('aria-label', /Naha/);
  await expect(page.locator('#home-climate-city')).toBeFocused();
  await page.locator('.home-climate-data summary').click();
  await expect(page.locator('.home-climate-data dd').first()).toHaveText('17,3 °C');
  await page.getByRole('tab', { name: 'Mapa', exact: true }).click();
  await page.locator('.home-map-destinations a').first().click();
  await expect(page.locator('#modal')).toContainText('Tóquio');
  expect(aiCalls).toEqual([]);
});

test('abas funcionam pelo teclado e mantêm foco após carregar a ferramenta', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Estações', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Mapa', exact: true })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Mapa', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Meu plano', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Estações', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
});

test('gráfico carregado com atraso não rouba o foco de quem já está escolhendo a cidade', async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/src/js/charts.js*', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Clima', exact: true }).click();
    await page.locator('#home-climate-city').selectOption('naha');
    await expect(page.locator('#home-climate-city')).toBeFocused();
    release();
    await expect
      .poll(() => page.locator('#home-climate-chart').getAttribute('width'))
      .not.toBeNull();
    await expect(page.locator('#home-climate-city')).toBeFocused();
    await expect(page.locator('#home-climate-city')).toHaveValue('naha');
  } finally {
    release();
  }
});

test('movimento pode ser pausado, persiste e respeita a preferência do sistema', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  await expect
    .poll(() => page.locator('.postcard-seal').evaluate((el) => getComputedStyle(el).animationName))
    .toBe('seal-sway');
  await page.getByRole('button', { name: 'Pausar animações', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length),
    )
    .toBe(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ativar animações', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Vamos planejar nossa viagem', exact: true }).click();
  await expect(page.locator('.wizard-heading h1')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.goto('/');
  await page.getByRole('button', { name: 'Ativar animações', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('[data-motion-toggle]')).toBeDisabled();
  await expect
    .poll(() => page.locator('.postcard-seal').evaluate((el) => getComputedStyle(el).animationName))
    .toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pausar animações', exact: true })).toBeEnabled();
});

test('painéis abertos mantêm contraste, alvos e semântica em celular e desktop', async ({
  page,
}) => {
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
        if (width < 1280) {
          await page.getByRole('button', { name: 'Abrir navegação' }).click();
          await page.locator('.sidebar-theme').click();
        } else await page.locator('.theme-toggle').click();
      }
      for (const name of ['Mapa', 'Clima', 'Meu plano']) {
        await page.getByRole('tab', { name, exact: true }).click();
        await page.waitForTimeout(500);
        const audit = await new AxeBuilder({ page })
          .include('#home-hub')
          .exclude('.leaflet-tile-pane')
          .exclude('.leaflet-marker-pane')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          audit.violations.map((v) => v.id),
          `${theme} ${width} ${name}`,
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
          0,
        );
      }
    }
  }
});
