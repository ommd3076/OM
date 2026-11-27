import { expect } from './pw.mjs';

export const PALETTE = {
  offWhite: [241, 238, 231], // #f1eee7
  black: [35, 35, 35], // #232323
  blackDeep: [0, 0, 0], // #000000
  accent: [255, 145, 0], // #ff9100
  ghostGrey: [222, 222, 222], // #dedede
};

export function parseRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const m = colorStr.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (!m) return null;
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

export function isNearRgb(colorStr, target, tolerance = 3) {
  const parsed = parseRgb(colorStr);
  if (!parsed || parsed.a === 0) return false;
  return (
    Math.abs(parsed.r - target[0]) <= tolerance &&
    Math.abs(parsed.g - target[1]) <= tolerance &&
    Math.abs(parsed.b - target[2]) <= tolerance
  );
}

/**
 * Attach strict zero-tolerance pageerror & console.error collectors.
 * Optionally ignores HTTP 404 resource load messages when intentionally testing unknown routes.
 */
export function attachErrorCollectors(page, { allowNotFoundConsole = false } = {}) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err?.message || String(err));
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (allowNotFoundConsole && /status of 404|404 \(Not Found\)/i.test(text)) {
        return;
      }
      consoleErrors.push(text);
    }
  });

  return {
    pageErrors,
    consoleErrors,
    assertClean() {
      expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toEqual([]);
      expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    },
  };
}

export async function waitForFontsAndMain(page) {
  await page.waitForSelector('main', { state: 'visible' });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
}

export async function assertZeroOverflow(page, label = '') {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected ${label ? `(${label})` : ''}: scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth}`
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

/**
 * Discover first project case study href dynamically from /projects (or home showcase).
 */
export async function discoverFirstProjectSlug(page) {
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await waitForFontsAndMain(page);
  const href = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const match = anchors.find((a) => {
      const h = a.getAttribute('href') || '';
      return /^\/projects\/[^/?#]+/.test(h);
    });
    return match ? match.getAttribute('href') : null;
  });
  expect(href, 'Expected at least one /projects/:slug link on /projects').toBeTruthy();
  return href;
}

/**
 * Cross-platform shortcut key helper ('Meta+k' on macOS, 'Control+k' on Windows/Linux).
 */
export function shortcutKey(letter) {
  return process.platform === 'darwin' ? `Meta+${letter}` : `Control+${letter}`;
}

export async function openIdeSearch(page, ideSection) {
  const searchBtn = ideSection.locator('button').filter({
    hasText: /⌘\s*K|Ctrl\s*\+?\s*K|Search/i,
  }).first();
  if ((await searchBtn.count()) > 0 && (await searchBtn.isVisible())) {
    await searchBtn.click();
    return;
  }
  await ideSection.scrollIntoViewIfNeeded();
  await page.keyboard.press(shortcutKey('k'));
}

export async function toggleIdeTerminal(page, ideSection) {
  const termBtn = ideSection.locator('button').filter({
    hasText: /⌘\s*J|Ctrl\s*\+?\s*J|Terminal/i,
  }).first();
  if ((await termBtn.count()) > 0 && (await termBtn.isVisible())) {
    await termBtn.click();
    return;
  }
  await ideSection.scrollIntoViewIfNeeded();
  await page.keyboard.press(shortcutKey('j'));
}

export async function ensureMobileFilesOpen(ideSection) {
  const openFilesBtn = ideSection
    .locator('button')
    .filter({ hasText: /open files|files/i })
    .first();
  if ((await openFilesBtn.count()) > 0 && (await openFilesBtn.isVisible())) {
    const expanded = await openFilesBtn.getAttribute('aria-expanded');
    if (expanded === 'false' || expanded === null) {
      await openFilesBtn.click();
    }
  }
}
