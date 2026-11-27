import { test, expect } from '../pw.mjs';
import {
  attachErrorCollectors,
  waitForFontsAndMain,
  assertZeroOverflow,
  discoverFirstProjectSlug,
  openIdeSearch,
  toggleIdeTerminal,
  ensureMobileFilesOpen,
} from '../helpers.mjs';

test.describe('Tier 2 — Boundary, Negative & Accessibility', () => {
  test('T2-01: zero horizontal overflow & zero console/page errors across all routes', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page, { allowNotFoundConsole: true });
    const firstSlug = await discoverFirstProjectSlug(page);

    for (const route of ['/', '/projects', firstSlug, '/about', '/roadmap', '/nonexistent-route']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await waitForFontsAndMain(page);
      await assertZeroOverflow(page, `${testInfo.project.name} ${route}`);
    }

    errors.assertClean();
  });

  test('T2-02: prefers-reduced-motion suppresses animations & keeps content visible', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const motionAudit = await page.evaluate(() => {
      const h1 = document.querySelector('main h1');
      const h1Opacity = h1 ? Number.parseFloat(getComputedStyle(h1).opacity) : 0;
      const animatedEls = Array.from(document.querySelectorAll('[data-odometer] span, header span, .animate-pulse, [class*="status"]'));
      const activeLongAnimations = animatedEls.filter((el) => {
        const s = getComputedStyle(el);
        const dur = Number.parseFloat(s.animationDuration || '0');
        return s.animationName !== 'none' && dur > 0.05 && s.animationPlayState !== 'paused';
      });
      return {
        h1Opacity,
        activeLongAnimationsCount: activeLongAnimations.length,
      };
    });

    expect(motionAudit.h1Opacity).toBe(1);
    expect(motionAudit.activeLongAnimationsCount).toBe(0);
    errors.assertClean();
  });

  test('T2-03: footer email validation rejects invalid input & isolates honeypot', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();

    const emailInput = footer.locator('input[type="email"]').first();
    const submitBtn = footer.locator('button[type="submit"]').first();
    await expect(emailInput).toBeVisible();

    // Verify honeypot field isolation if present
    const honeypots = footer.locator('input:not([type="email"])');
    const hpCount = await honeypots.count();
    for (let i = 0; i < hpCount; i++) {
      const hp = honeypots.nth(i);
      const ariaHidden = await hp.getAttribute('aria-hidden');
      const tabIdx = await hp.getAttribute('tabindex');
      expect(ariaHidden === 'true' || tabIdx === '-1').toBe(true);
    }

    // Empty submit must not succeed
    await emailInput.fill('');
    await submitBtn.click();
    const validAfterEmpty = await emailInput.evaluate((el) => el.checkValidity());
    expect(validAfterEmpty).toBe(false);

    // Malformed emails must be rejected
    for (const bad of ['not-an-email', 'user@']) {
      await emailInput.fill(bad);
      await submitBtn.click();
      const isValid = await emailInput.evaluate((el) => el.checkValidity());
      expect(isValid, `Malformed email "${bad}" should fail validity check`).toBe(false);
    }

    errors.assertClean();
  });

  test('T2-04: unknown route & unknown project slug 404 recovery + deep-link reload', async ({ page }) => {
    const errors = attachErrorCollectors(page, { allowNotFoundConsole: true });

    for (const badRoute of ['/nonexistent-route', '/projects/nonexistent-slug']) {
      await page.goto(badRoute, { waitUntil: 'domcontentloaded' });
      await waitForFontsAndMain(page);
      await expect(page.locator('main')).toContainText(/404|not found/i);
      await expect(page.locator('main a[href="/"]').first()).toBeVisible();
    }

    // Deep-link reload check
    for (const validRoute of ['/projects', '/about']) {
      await page.goto(validRoute, { waitUntil: 'domcontentloaded' });
      await waitForFontsAndMain(page);
      const reloadRes = await page.reload({ waitUntil: 'domcontentloaded' });
      expect(reloadRes?.status()).toBe(200);
      await waitForFontsAndMain(page);
    }

    errors.assertClean();
  });

  test('T2-05: keyboard-only navigation, [inert] tab skipping, FAQ & Escape dismissal', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    // Tab moves focus onto an interactive element inside the document
    await page.keyboard.press('Tab');
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(activeTag);

    // Verify [inert] elements are excluded from keyboard focus
    const inertHasFocusable = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('[inert]'));
      return panels.some((p) => {
        const innerLink = p.querySelector('a, button');
        if (!innerLink) return false;
        innerLink.focus();
        return document.activeElement === innerLink;
      });
    });
    expect(inertHasFocusable, 'Elements inside [inert] must not receive focus').toBe(false);

    // FAQ keyboard toggle via Enter
    const secondFaq = page.locator('main button[aria-expanded][aria-controls]').nth(1);
    await secondFaq.scrollIntoViewIfNeeded();
    await secondFaq.focus();
    await page.keyboard.press('Enter');
    await expect(secondFaq).toHaveAttribute('aria-expanded', 'true');

    // Learn more + modal open + Escape dismissal
    const learnMoreBtn = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /learn more/i }).first();
    await learnMoreBtn.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // IDE search palette opens and closes via Escape
    const ideSection = page.locator('main section, main [id]').filter({ hasText: /Constellation/i }).first();
    await openIdeSearch(page, ideSection);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(searchInput).toBeHidden();

    errors.assertClean();
  });

  test('T2-06: IDE negative inputs (unknown command & empty search) + mobile file drawer boundary', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isMobile = testInfo.project.name === 'mobile';

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const ideSection = page.locator('main section, main [id]').filter({ hasText: /Constellation/i }).first();
    await ideSection.scrollIntoViewIfNeeded();

    if (isMobile) {
      await ensureMobileFilesOpen(ideSection);
      await assertZeroOverflow(page, 'mobile IDE drawer open');
      const closeFilesBtn = ideSection.locator('button').filter({ hasText: /close files|files/i }).first();
      if ((await closeFilesBtn.count()) > 0 && (await closeFilesBtn.isVisible())) {
        await closeFilesBtn.click();
      }
    }

    // Empty search query feedback
    await openIdeSearch(page, ideSection);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('zzzz-missing-file-query');
    const visibleDialogs = page.locator('[role="dialog"]:visible');
    const searchTarget = (await visibleDialogs.count()) > 0 ? visibleDialogs.last() : ideSection;
    await expect(searchTarget).toContainText(/no (files|results|matches)|not found|0 (results|matches)/i);
    await page.keyboard.press('Escape');

    // Unknown terminal command handled gracefully
    await toggleIdeTerminal(page, ideSection);
    const termInput = ideSection.locator('input[type="text"], input:not([type]), textarea').last();
    await expect(termInput).toBeVisible();
    await termInput.fill('foobar123');
    const beforeTermText = await ideSection.innerText();
    await termInput.press('Enter');
    await expect.poll(async () => await ideSection.innerText()).not.toBe(beforeTermText);
    await expect(ideSection).toContainText(/not found|unknown|command|help/i);

    errors.assertClean();
  });

  test('T2-07: mobile stacking, Escape drawer close & rapid ticket toggle consistency', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isMobile = testInfo.project.name === 'mobile';

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    if (isMobile) {
      // 10 pillars align uniformly on left edge (ml-0)
      const pillarLefts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main *'))
          .filter((el) => el.children.length === 0 && /^0(?:0[1-9]|10)\s*\/?$/.test((el.textContent || '').trim()))
          .map((m) => Math.round(m.getBoundingClientRect().left))
      );
      expect(pillarLefts.length).toBe(10);
      const spread = Math.max(...pillarLefts) - Math.min(...pillarLefts);
      expect(spread, `Mobile pillars should align vertically without stagger (spread=${spread})`).toBeLessThanOrEqual(8);

      // Mobile menu closes on Escape
      const menuBtn = page.locator('header button').filter({ hasText: /menu/i }).first();
      await menuBtn.click();
      await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    }

    // Rapid Engineering <-> Research toggle leaves deterministic final state
    const ticket = page.locator('.ticket-notches').first();
    await ticket.scrollIntoViewIfNeeded();
    const engBtn = ticket.locator('button').filter({ hasText: /Engineering/i }).first();
    const resBtn = ticket.locator('button').filter({ hasText: /Research/i }).first();
    for (let i = 0; i < 4; i++) {
      await resBtn.click();
      await engBtn.click();
    }
    const engText = await ticket.innerText();
    await resBtn.click();
    await expect.poll(async () => await ticket.innerText()).not.toBe(engText);
    const finalText = await ticket.innerText();
    expect(finalText.length).toBeGreaterThan(20);

    errors.assertClean();
  });
});
