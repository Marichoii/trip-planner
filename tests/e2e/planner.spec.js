import { test, expect } from '@playwright/test';
import { initialState } from '../../src/js/storage.js';
const sections = [
  'home',
  'seasons',
  'months',
  'destinations',
  'events',
  'itinerary',
  'budget',
  'hotels',
  'transport',
  'food',
  'packing',
  'rules',
  'checklist',
  'sources',
];
test('todas as seções abrem, gráficos e mapa carregam sem erros de JavaScript', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const section of sections) {
    await page.goto('/#' + section);
    await expect(page.locator('main h1')).toBeVisible();
    if (section === 'months') {
      await expect(page.locator('#temperature-chart')).toBeVisible();
      await expect(page.locator('#season-score-text')).toContainText('Primavera:');
    }
    if (section === 'destinations') {
      await expect(page.locator('.leaflet-container')).toBeVisible();
      await expect(page.locator('.leaflet-marker-icon')).toHaveCount(29);
    }
  }
  expect(errors).toEqual([]);
});
test('favoritos, filtros do mapa e uma cidade no roteiro persistem', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Favoritar Verão', exact: true }).click();
  await page.reload();
  await expect(page.locator('.stat').last()).toContainText('Verão');
  await page.goto('/#destinations');
  await page.locator('[data-ui=region]').selectOption('Okinawa');
  await expect(page.locator('.destination-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Favoritar Naha', exact: true }).click();
  await page.locator('[data-ui=onlyFavorites]').check();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Adicionar Naha ao roteiro', exact: true }).click();
  await page.locator('#destination-form select').selectOption('3');
  await page.getByRole('button', { name: 'Adicionar ao roteiro', exact: true }).click();
  await expect(page).toHaveURL(/#itinerary/);
  await expect(page.locator('.day-card[data-day="3"]')).toContainText('Visitar Naha');
  await page.reload();
  await expect(page.locator('.day-card[data-day="3"]')).toContainText('Visitar Naha');
});
test('orçamento reage a valores, datas e cenário sem mudar saldo', async ({ page }) => {
  await page.goto('/#budget');
  await expect(page.locator('#budget-summary')).toContainText('34.750,00');
  await page.locator('[name=travelers]').fill('3');
  await expect(page.locator('#budget-summary')).toContainText('40.000,00');
  await page.locator('[name=departureDate]').fill('2029-02-10');
  await page.locator('[name=saved]').fill('10000');
  await expect(page.locator('#budget-summary')).toContainText('1.153,85');
  await page.getByRole('button', { name: /Econômico ·/ }).click();
  await expect(page.locator('[name=saved]')).toHaveValue('10000');
  await expect(page.locator('#budget-summary')).toContainText('26.600,00');
  await page.reload();
  await expect(page.locator('[name=travelers]')).toHaveValue('3');
  await expect(page.locator('[name=saved]')).toHaveValue('10000');
});
test('atividades podem ser editadas, movidas por teclado e arrastadas', async ({ page }) => {
  await page.goto('/#itinerary');
  await page.locator('.day-card[data-day="1"] [data-action=activity-edit]').first().click();
  await page.locator('#activity-form [name=title]').fill('Nosso passeio especial');
  await page.locator('#activity-form [name=cost]').fill('123.45');
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await page.locator('.day-card[data-day="1"] [data-action=activity-move]').first().click();
  await page.locator('#move-form select').selectOption('2');
  await page.getByRole('button', { name: 'Mover', exact: true }).click();
  await expect(page.locator('.day-card[data-day="2"]')).toContainText('Nosso passeio especial');
  await page
    .locator('.activity')
    .filter({ hasText: 'Nosso passeio especial' })
    .dragTo(page.locator('.day-card[data-day="3"]'));
  await expect(page.locator('.day-card[data-day="3"]')).toContainText('Nosso passeio especial');
  await page.locator('[data-base="0"][data-field=nights]').fill('10');
  await page.locator('[data-base="0"][data-field=nights]').press('Tab');
  await expect(page.locator('main')).toContainText('As bases somam 23 noites');
  await page.reload();
  await expect(page.locator('.day-card[data-day="3"]')).toContainText('Nosso passeio especial');
});
test('hospedagens e transporte calculam com taxas e podem ir ao orçamento', async ({ page }) => {
  await page.goto('/#hotels');
  for (const name of ['Apartamento A', 'Hotel B']) {
    await page.getByRole('button', { name: 'Cadastrar hospedagem' }).click();
    await page.locator('#lodging-form [name=name]').fill(name);
    await page.locator('#lodging-form [name=city]').fill('Osaka');
    await page.locator('#lodging-form [name=nightly]').fill('600');
    await page.locator('#lodging-form [name=nights]').fill('5');
    await page.locator('#lodging-form [name=cleaning]').fill('100');
    await page.locator('#lodging-form [name=taxes]').fill('200');
    await page.getByRole('button', { name: 'Salvar hospedagem' }).click();
  }
  await expect(page.locator('.hotel-compare')).toContainText('550,00');
  await expect(page.locator('.hotel-compare thead th')).toHaveCount(3);
  await page.goto('/#transport');
  await page.getByRole('button', { name: 'Adicionar trecho' }).click();
  await page.locator('#leg-form [name=from]').fill('Osaka');
  await page.locator('#leg-form [name=to]').fill('Kyoto');
  await page.locator('#leg-form [name=price]').fill('50');
  await page.getByRole('button', { name: 'Salvar trecho' }).click();
  await expect(page.locator('main')).toContainText('300,00');
  await page.getByRole('button', { name: 'Levar total para o orçamento' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('[name=localTransport]')).toHaveValue('50');
  await expect(page.locator('[name=shinkansen]')).toHaveValue('0');
});
test('wishlist exige câmbio manual e checklists/notas sobrevivem ao reload', async ({ page }) => {
  await page.goto('/#food');
  await page.getByRole('button', { name: 'Adicionar produto' }).click();
  await page.locator('#wishlist-form [name=name]').fill('Papelaria');
  await page.locator('#wishlist-form [name=price]').fill('1000');
  await page.locator('#wishlist-form [name=quantity]').fill('2');
  await page.getByRole('button', { name: 'Guardar na wishlist' }).click();
  await expect(page.locator('main')).toContainText('Preencha a cotação');
  await page.locator('[data-exchange]').fill('0.035');
  await page.locator('[data-exchange]').press('Tab');
  await expect(page.locator('main')).toContainText('70,00');
  await page.goto('/#packing');
  await page.locator('[data-check=packed]').first().check();
  await page.reload();
  await expect(page.locator('[data-check=packed]').first()).toBeChecked();
  await page.goto('/#checklist');
  await page.locator('#notes').fill('Ideias <script> sem execução');
  await page.locator('[data-check=checks]').first().check();
  await page.reload();
  await expect(page.locator('#notes')).toHaveValue('Ideias <script> sem execução');
  await expect(page.locator('[data-check=checks]').first()).toBeChecked();
});
test('backup exporta, rejeita arquivo inválido e pede revisão antes de importar', async ({
  page,
}) => {
  await page.goto('/#checklist');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar planejamento', exact: true }).click();
  expect((await downloading).suggestedFilename()).toContain('japan-diary-backup');
  await page.getByRole('button', { name: 'Importar cópia' }).click();
  await page.locator('#backup-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.locator('#import-status')).toContainText('Não foi possível importar');
  const state = initialState();
  state.notes = 'Backup importado';
  await page.locator('#backup-file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await expect(page.locator('#import-status')).toContainText('Arquivo válido');
  await expect(page.locator('#notes')).toHaveValue('');
  await page.getByRole('button', { name: 'Substituir pelo arquivo' }).click();
  await expect(page.locator('#notes')).toHaveValue('Backup importado');
});
test('mobile: navegação, modal e telas não criam overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.home-columns').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.locator('[data-nav=months]').click();
  await expect(page.locator('main h1')).toContainText('Quando');
  for (const section of sections) {
    await page.goto('/#' + section);
    await expect(page.locator('main h1')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  await page.getByRole('button', { name: 'Configurações da viagem' }).click();
  await expect(page.locator('dialog')).toBeVisible();
  expect(
    await page.locator('dialog').evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
  ).toBe(true);
});
test('desktop: captura visual, busca e mudança de tema', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Alternar tema claro e escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#global-search').fill('Nikko');
  await page.locator('#search-results a').first().click();
  await expect(page.locator('dialog')).toContainText('Nikko');
  await page.getByRole('button', { name: 'Fechar janela' }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
});
test('salva comparações financeiras independentes para as estações', async ({ page }) => {
  await page.goto('/#budget');
  await page.locator('[data-ui=quoteSeason]').selectOption('winter');
  await page.getByRole('button', { name: 'Salvar valores atuais' }).click();
  await page.locator('[data-ui=quoteSeason]').selectOption('summer');
  await page.locator('[name=domesticFlight]').fill('1500');
  await page.getByRole('button', { name: 'Salvar valores atuais' }).click();
  await expect(page.locator('.four-season-costs')).toContainText('36.250,00');
  await expect(page.locator('.four-season-costs')).toContainText('34.750,00');
  await page.reload();
  await expect(page.locator('.four-season-costs')).toContainText('36.250,00');
  await expect(page.locator('#budget-season-chart')).toBeVisible();
});
