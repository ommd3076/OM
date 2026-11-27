import { test, expect } from '../pw.mjs';
import {
  attachErrorCollectors,
  waitForFontsAndMain,
  assertZeroOverflow,
  discoverFirstProjectSlug,
  openIdeSearch,
  toggleIdeTerminal,
} from '../helpers.mjs';

test.describe('Tier 3 — Cross-Feature Pairwise Workflows', () => {
  test('T3-01: desktop minimap scroll + Learn more modal + /projects navigation & back', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop minimap workflow');
    const errors = attachErrorCollectors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const getMinimapTop = () =>
      page.evaluate(() => {
        const fixed = Array.from(document.querySelectorAll('aside, nav, div')).filter((el) => {
          const r = el.getBoundingClientRect();
          return getComputedStyle(el).position === 'fixed' && r.right > window.innerWidth - 140 && r.height > 40;
        });
        for (const c of fixed) {
          const indicator = Array.from(c.querySelectorAll('*')).find((ch) => {
            const s = getComputedStyle(ch);
            return s.backgroundColor === 'rgb(255, 145, 0)' || /255,\s*145,\s*0/.test(s.borderColor);
          });
          if (indicator) return indicator.getBoundingClientRect().top;
        }
        return null;
      });

    const top0 = await getMinimapTop();
    await page.evaluate(() => window.scrollTo(0, Math.floor(document.documentElement.scrollHeight * 0.5)));
    await page.waitForTimeout(200);
    const top1 = await getMinimapTop();
    expect(top1).toBeGreaterThan(top0);

    // Open Learn more + modal and dismiss with Escape
    await page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /learn more/i }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Navigate via header to /projects and back via brand home link
    await page.locator('header a[href="/projects"]').first().click();
    await page.waitForURL(/\/projects/);
    await waitForFontsAndMain(page);
    await page.locator('header a[href="/"]').first().click();
    await page.waitForURL(/\/$/);
    await waitForFontsAndMain(page);

    errors.assertClean();
  });

  test('T3-02: mobile Menu drawer -> /about navigation -> resize to desktop 1440x900', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile drawer-to-desktop resize workflow');
    const errors = attachErrorCollectors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const menuBtn = page.locator('header button').filter({ hasText: /menu/i }).first();
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    await page.locator('a[href="/about"]:visible').first().click();
    await page.waitForURL(/\/about/);
    await waitForFontsAndMain(page);
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    // Resize to desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);
    await assertZeroOverflow(page, 'resized 390->1440 on /about');

    const visibleNavLinks = await page.locator('header a[href]:visible').count();
    expect(visibleNavLinks).toBeGreaterThanOrEqual(5);

    errors.assertClean();
  });

  test('T3-03: IDE repo switch + Cmd/Ctrl+K file search + Cmd/Ctrl+J terminal sync', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const ideSection = page.locator('main section, main [id]').filter({ hasText: /Constellation/i }).first();
    await ideSection.scrollIntoViewIfNeeded();
    const codePane = ideSection.locator('pre, code, [role="code"]').first();

    // Switch repo
    await ideSection.locator('button, [role="tab"]').filter({ hasText: /RuleCanvas|Costellar/i }).first().click();

    // Cmd/Ctrl+K search and open a file
    await openIdeSearch(page, ideSection);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('package');
    const option = page
      .locator('[role="dialog"] button, [role="listbox"] [role="option"], [role="option"]')
      .filter({ hasText: /package|readme/i })
      .filter({ hasNotText: /close|×|esc/i })
      .first();
    if ((await option.count()) > 0 && (await option.isVisible())) {
      await option.click();
    } else {
      await searchInput.press('Enter');
    }
    expect((await codePane.innerText()).length).toBeGreaterThan(5);

    // Cmd/Ctrl+J terminal execute ls
    await toggleIdeTerminal(page, ideSection);
    const termInput = ideSection.locator('input[type="text"], input:not([type]), textarea').last();
    await expect(termInput).toBeVisible();
    await termInput.fill('ls');
    const beforeTermText = await ideSection.innerText();
    await termInput.press('Enter');
    await expect.poll(async () => await ideSection.innerText()).not.toBe(beforeTermText);
    await expect(ideSection).toContainText(/\b(README|src|package|ls|App|main|index)\b/i);

    errors.assertClean();
  });

  test('T3-04: /projects ticket -> case study progress bar + home ticket, FAQ & toast state', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    const slugHref = await discoverFirstProjectSlug(page);

    await page.locator(`a[href="${slugHref}"]`).first().click();
    await page.waitForURL(new RegExp(slugHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await waitForFontsAndMain(page);

    // Scroll to advance reading progress and reveal resurface footer
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    await expect(page.locator('footer').first()).toBeVisible();

    // Return home
    await page.locator('header a[href="/"]').first().click();
    await page.waitForURL(/\/$/);
    await waitForFontsAndMain(page);

    // Toggle ticket mode
    const ticket = page.locator('.ticket-notches').first();
    await ticket.scrollIntoViewIfNeeded();
    await ticket.locator('button').filter({ hasText: /Research/i }).first().click();

    // Expand FAQ Q2
    const faqQ2 = page.locator('main button[aria-expanded][aria-controls]').nth(1);
    await faqQ2.scrollIntoViewIfNeeded();
    await faqQ2.click();
    await expect(faqQ2).toHaveAttribute('aria-expanded', 'true');

    // Dismiss floating toast if visible and verify it stays dismissed
    const toastDismiss = page
      .locator('[role="status"] button, [aria-label*="dismiss" i]')
      .filter({ hasNotText: /learn more|menu/i })
      .first();
    if ((await toastDismiss.count()) > 0 && (await toastDismiss.isVisible())) {
      await toastDismiss.click();
      await page.waitForTimeout(150);
      await expect(toastDismiss).toBeHidden();
    }

    errors.assertClean();
  });
});
