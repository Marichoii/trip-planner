import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seed, mockMochi } from '../fixtures/state.js';

// WCAG 2.2 A/AA automatizado. Revisão manual continua necessária para foco, leitura e ordem.
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const pages = [
  'home',
  'planner/1',
  'planner/3',
  'planner/4',
  'planner/5',
  'recommendations',
  'itinerary',
  'budget',
  'destinations',
  'months',
];

async function audit(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(tags)
    // Os blocos de imagem do OpenStreetMap são de terceiros e não fazem parte da interface.
    .exclude('.leaflet-tile-pane')
    // Marcadores próximos se sobrepõem pela geografia; a lista de destinos ao lado oferece
    // as mesmas ações com alvos de 44 px (exceção "controle equivalente" do WCAG 2.5.8).
    .exclude('.leaflet-marker-pane')
    .analyze();
  const issues = result.violations.map(
    (v) =>
      `${label} · ${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`,
  );
  return issues;
}

for (const theme of ['light', 'dark'])
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ])
    test(`axe: páginas principais sem violações · ${theme} · ${viewport.width}px`, async ({
      page,
      context,
    }) => {
      test.setTimeout(90000);
      await seed(context, theme);
      await page.setViewportSize(viewport);
      const issues = [];
      for (const hash of pages) {
        await page.goto('/#' + hash);
        await expect(page.locator('main h1').first()).toBeVisible();
        // Mede o estado final, depois das animações de entrada (até 380 ms).
        await page.waitForTimeout(500);
        issues.push(...(await audit(page, hash)));
      }
      expect(issues).toEqual([]);
    });

test('axe: Mochi (conversa, proposta e revisão) sem violações', async ({ page, context }) => {
  await seed(context);
  await mockMochi(context);
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = [];
  await page.goto('/#itinerary');
  await page.getByRole('button', { name: 'Conversar com Mochi', exact: true }).click();
  await expect(page.locator('.mochi-panel #mochi-request-form')).toBeVisible();
  issues.push(...(await audit(page, 'mochi-chat')));
  await page.keyboard.press('Escape');
  await page.locator('[data-mochi="analyze"]').first().click();
  await page.locator('.mochi-panel [name=consent]').check();
  await page.getByRole('button', { name: 'Revisar com Mochi', exact: true }).click();
  await expect(page.locator('.mochi-review')).toBeVisible();
  issues.push(...(await audit(page, 'mochi-review')));
  await page.goto('/#recommendations');
  await page.locator('[data-mochi="itinerary"]').first().click();
  await page.locator('.mochi-panel [name=consent]').check();
  await page.getByRole('button', { name: 'Gerar proposta', exact: true }).click();
  await expect(page.locator('.mochi-proposal')).toBeVisible();
  issues.push(...(await audit(page, 'mochi-proposal')));
  expect(issues).toEqual([]);
});
