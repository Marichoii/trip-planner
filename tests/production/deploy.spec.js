import { test, expect } from '@playwright/test';
test('build funciona em subdiretório com imagens, gráficos e mapa', async ({ page }) => {
  const failures = [],
    errors = [];
  page.on('response', (res) => {
    if (res.url().startsWith('http://127.0.0.1:4173') && res.status() >= 400)
      failures.push(res.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('./');
  await expect(page.locator('.welcome-main-photo img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.welcome-main-photo img')
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  for (const route of ['months', 'destinations', 'itinerary', 'budget']) {
    await page.goto('./#' + route);
    if (route === 'months')
      await expect(page.locator('#season-score-text')).toContainText('Primavera:');
    if (route === 'destinations') {
      await expect(page.locator('.leaflet-marker-icon')).toHaveCount(29);
      await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
      await page
        .locator('.destination-card img')
        .first()
        .evaluate((image) => image.decode());
      await page
        .locator('.destination-card img')
        .nth(1)
        .evaluate((image) => image.decode());
    }
    if (route === 'budget') await expect(page.locator('#budget-chart')).toBeVisible();
    await page.screenshot({ path: `test-results/${route}-desktop.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['months', 'destinations', 'itinerary', 'budget']) {
    await page.goto('./#' + route);
    if (route === 'destinations') {
      await expect(page.locator('.leaflet-marker-icon')).toHaveCount(29);
      await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
      await page
        .locator('.destination-card img')
        .first()
        .evaluate((image) => image.decode());
      await page
        .locator('.destination-card img')
        .nth(1)
        .evaluate((image) => image.decode());
    }
    await expect(page.locator('main h1')).toBeVisible();
    await page.screenshot({ path: `test-results/${route}-mobile.png`, fullPage: false });
  }
  await page.goto('./#planner');
  await page.locator('[data-planner-action=season][data-id=summer]').click();
  for (let step = 1; step < 6; step++)
    await page.locator('#planner-page [data-planner-action=next]').click();
  await page.locator('[data-planner-action=generate]').click();
  await expect(page).toHaveURL(/\/trip-planner\/#recommendations/);
  await expect(page.locator('#recommendation-map .leaflet-marker-icon')).toHaveCount(3);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
