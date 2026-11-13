// Visual review matrix. Captures real screens at the agreed viewports and records
// layout metrics that a human reviewer should not have to measure by eye.
// UI_SHOTS=<dir> chooses the output folder; UI_VIEWPORTS=core|all; UI_SCREENS=a,b filters.
import { test, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { seed, mockMochi } from '../fixtures/state.js';

const OUT = process.env.UI_SHOTS || 'test-results/ui-polish';
const ALL = [
  [320, 700],
  [360, 800],
  [390, 844],
  [430, 932],
  [844, 390],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1180, 820],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];
const CORE = [
  [390, 844],
  [820, 1180],
  [1440, 900],
];
const VIEWPORTS = process.env.UI_VIEWPORTS === 'all' ? ALL : CORE;
const ONLY = (process.env.UI_SCREENS || '').split(',').filter(Boolean);

async function prepare(context, theme) {
  await seed(context, theme);
  await mockMochi(context);
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('img')].map((image) => {
        image.loading = 'eager';
        return image.decode().catch(() => {});
      }),
    );
  });
  await page.waitForTimeout(250);
}

async function go(page, hash) {
  await page.goto('/#' + hash);
  await page.locator('main h1').first().waitFor();
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function openMochi(page, hash, trigger, submit) {
  await go(page, hash);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(`[data-mochi="${trigger}"]:visible`).first().click();
  const panel = page.locator('.mochi-panel');
  await panel.locator('#mochi-request-form').waitFor();
  if (submit) {
    await panel.locator('[name=consent]').check();
    await panel.locator('#mochi-request-form [type=submit]').click();
    await panel.locator(submit).waitFor();
  }
  await page.waitForTimeout(250);
}

const screens = {
  home: (page) => go(page, 'home'),
  'home-seasons': async (page) => {
    await go(page, 'home');
    await page.locator('.welcome-seasons').scrollIntoViewIfNeeded();
  },
  'wizard-1': (page) => go(page, 'planner/1'),
  'wizard-2': (page) => go(page, 'planner/2'),
  'wizard-3': (page) => go(page, 'planner/3'),
  'wizard-4': (page) => go(page, 'planner/4'),
  'wizard-5': (page) => go(page, 'planner/5'),
  'wizard-6': (page) => go(page, 'planner/6'),
  result: (page) => go(page, 'recommendations'),
  'result-cities': async (page) => {
    await go(page, 'recommendations');
    await page.locator('.recommendation-city-grid').scrollIntoViewIfNeeded();
  },
  'result-route': async (page) => {
    await go(page, 'recommendations');
    await page.locator('.result-route').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  },
  itinerary: async (page) => {
    await go(page, 'itinerary');
    await page.locator('.day-card').first().scrollIntoViewIfNeeded();
  },
  budget: (page) => go(page, 'budget'),
  'budget-table': async (page) => {
    await go(page, 'budget');
    await page.locator('.budget-layout').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  },
  destinations: async (page) => {
    await go(page, 'destinations');
    await page.waitForTimeout(900);
  },
  months: async (page) => {
    await go(page, 'months');
    await page.locator('canvas').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  },
  hotels: (page) => go(page, 'hotels'),
  explore: (page) => go(page, 'explore'),
  events: (page) => go(page, 'events'),
  'mochi-chat': (page) => openMochi(page, 'itinerary', 'chat'),
  'mochi-chat-answer': async (page) => {
    await openMochi(page, 'itinerary', 'chat');
    const panel = page.locator('.mochi-panel');
    await panel.locator('[name=consent]').check();
    await panel.locator('#mochi-message').fill('Como organizar seis malas grandes?');
    await panel.locator('#mochi-request-form [type=submit]').click();
    await panel.locator('.from-user').waitFor();
    await page.waitForTimeout(250);
  },
  'mochi-proposal': (page) => openMochi(page, 'recommendations', 'itinerary', '.mochi-proposal'),
  'mochi-review': (page) => openMochi(page, 'itinerary', 'analyze', '.mochi-review'),
  menu: async (page) => {
    await go(page, 'home');
    const toggle = page.locator('.mobile-menu');
    if (await toggle.isVisible()) await toggle.click();
    await page.waitForTimeout(300);
  },
  search: async (page) => {
    await go(page, 'home');
    const trigger = page.locator('[data-action="search-open"]:visible');
    if (await trigger.count()) await trigger.first().click();
    const sheet = page.locator('#sheet-search');
    const input = (await sheet.isVisible()) ? sheet : page.locator('#global-search');
    await input.fill('kyo');
    await page.waitForTimeout(300);
  },
};

const darkScreens = ['home', 'wizard-1', 'wizard-3', 'result', 'mochi-chat', 'budget', 'itinerary'];

async function metrics(page, w, h) {
  return page.evaluate(
    ({ w, h }) => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          cs.visibility !== 'hidden' &&
          cs.display !== 'none' &&
          r.bottom > 0 &&
          r.top < innerHeight &&
          !el.closest('[inert], [hidden], .sr-only, .leaflet-control-attribution')
        );
      };
      const layer = document.querySelector('dialog[open]') || document;
      const texts = [...layer.querySelectorAll('body *, dialog[open] *')].filter(
        (el) =>
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) &&
          visible(el),
      );
      const tiny = texts
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
        .map((el) => `${el.className || el.tagName}:${getComputedStyle(el).fontSize}`);
      const touch = w <= 1024;
      const targets = touch
        ? [...layer.querySelectorAll('a[href], button, input, select, summary, textarea')]
            .filter((el) => visible(el) && !el.closest('.leaflet-container, p, li'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return Math.min(r.width, r.height) < 40;
            })
            .map(
              (el) =>
                `${el.className || el.tagName}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
            )
        : [];
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el || !visible(el)) return null;
        return el.getBoundingClientRect();
      };
      const overlap = (a, b) =>
        a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const launcher = box('.mochi-launcher'),
        bottomNav = box('.mobile-primary-nav'),
        wizardFooter = box('.wizard-footer');
      const composer = box('.mochi-panel #mochi-message');
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        tinyText: [...new Set(tiny)].slice(0, 12),
        tinyCount: tiny.length,
        smallTargets: [...new Set(targets)].slice(0, 12),
        smallTargetCount: targets.length,
        launcherOverlapsNav: !!overlap(launcher, bottomNav),
        launcherOverlapsWizard: !!overlap(launcher, wizardFooter),
        composerInView: composer ? composer.top >= 0 && composer.bottom <= innerHeight : null,
      };
    },
    { w, h },
  );
}

for (const [w, h] of VIEWPORTS) {
  test(`visual matrix ${w}x${h}`, async ({ browser }) => {
    test.setTimeout(240000);
    const dir = `${OUT}/${w}x${h}`;
    await mkdir(dir, { recursive: true });
    const report = {};
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        reducedMotion: 'reduce',
        hasTouch: w <= 1024,
        isMobile: w <= 430 || h <= 430,
      });
      await prepare(context, theme);
      const page = await context.newPage();
      const names = Object.keys(screens).filter(
        (name) =>
          (!ONLY.length || ONLY.includes(name)) &&
          (theme === 'light' || darkScreens.includes(name)),
      );
      for (const name of names) {
        if (name === 'menu' && w > 1024) continue;
        try {
          await screens[name](page);
          const file = `${dir}/${name}${theme === 'dark' ? '-dark' : ''}.jpg`;
          await page.screenshot({ path: file, type: 'jpeg', quality: 78 });
          report[`${name}${theme === 'dark' ? '-dark' : ''}`] = await metrics(page, w, h);
        } catch (error) {
          report[name] = { error: String(error.message).split('\n')[0] };
        }
        await page.keyboard.press('Escape').catch(() => {});
      }
      await context.close();
    }
    await writeFile(`${dir}/metrics.json`, JSON.stringify(report, null, 2));
    expect(Object.keys(report).length).toBeGreaterThan(0);
  });
}

test.afterAll(async () => {
  const summary = {};
  for (const [w, h] of VIEWPORTS) {
    try {
      summary[`${w}x${h}`] = JSON.parse(await readFile(`${OUT}/${w}x${h}/metrics.json`, 'utf8'));
    } catch {}
  }
  await writeFile(`${OUT}/metrics-summary.json`, JSON.stringify(summary, null, 2));
});
