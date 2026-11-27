import { test, expect } from '../pw.mjs';
import {
  attachErrorCollectors,
  waitForFontsAndMain,
  assertZeroOverflow,
  discoverFirstProjectSlug,
  ensureMobileFilesOpen,
  openIdeSearch,
  toggleIdeTerminal,
} from '../helpers.mjs';

test.describe('Tier 4 — Real-World Visitor Journeys', () => {
  test('T4-01: Recruiter & Founder/Researcher flow across Home, Case Study, About, Roadmap & Learn more', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop recruiter & researcher scenario');
    const errors = attachErrorCollectors(page);

    // 1. Scan Home hero, receipt, pillars, showcase
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('main')).toContainText(/001/);
    await expect(page.locator('main')).toContainText(/010/);

    // 2. Inspect Case Study via /projects
    const slugHref = await discoverFirstProjectSlug(page);
    await page.locator(`a[href="${slugHref}"]`).first().click();
    await page.waitForURL(new RegExp(slugHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await waitForFontsAndMain(page);
    await expect(page.locator('main h1').first()).toBeVisible();

    // 3. Read /about (Cerenetics, VVCE, PRISM, IEEE AIEI)
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    const aboutText = await page.locator('main').innerText();
    expect(aboutText).toMatch(/Cerenetics/i);
    expect(aboutText).toMatch(/Vidyavardhaka|VVCE/i);
    expect(aboutText).toMatch(/PRISM/i);
    expect(aboutText).toMatch(/IEEE\s*AIEI/i);

    // 4. Inspect /roadmap Kanban
    await page.goto('/roadmap', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    await expect(page.locator('main')).toContainText(/Shipped/i);
    await expect(page.locator('main')).toContainText(/In\s*progress/i);
    await expect(page.locator('main')).toContainText(/Planned/i);

    // 5. Open Learn more + README modal
    await page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /learn more/i }).first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Om M\.? Doddamani/i);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    errors.assertClean();
  });

  test('T4-02: Systems Developer inspecting Constellation Lab, RuleCanvas & Costellar + GitHub + Footer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop developer IDE scenario');
    const errors = attachErrorCollectors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const ideSection = page.locator('main section, main [id]').filter({ hasText: /Constellation/i }).first();
    await ideSection.scrollIntoViewIfNeeded();
    const codePane = ideSection.locator('pre, code, [role="code"]').first();

    // Inspect Constellation Lab, RuleCanvas, and Costellar
    for (const repoRegex of [/Constellation/i, /RuleCanvas/i, /Costellar/i]) {
      const btn = ideSection.locator('button, [role="tab"]').filter({ hasText: repoRegex }).first();
      await btn.click();
      expect((await codePane.innerText()).length).toBeGreaterThan(10);
    }

    // Use Cmd/Ctrl+K search & Cmd/Ctrl+J terminal
    await openIdeSearch(page, ideSection);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await page.keyboard.press('Escape');

    await toggleIdeTerminal(page, ideSection);
    const termInput = ideSection.locator('input[type="text"], input:not([type]), textarea').last();
    await expect(termInput).toBeVisible();
    await termInput.fill('help');
    const beforeTermText = await ideSection.innerText();
    await termInput.press('Enter');
    await expect.poll(async () => await ideSection.innerText()).not.toBe(beforeTermText);

    // Verify GitHub link (github.com/ommd3076) and footer email capture
    const githubLink = page.locator('a[href*="github.com/ommd3076"]').first();
    await expect(githubLink).toHaveAttribute('href', /github\.com\/ommd3076/i);

    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await footer.locator('input[type="email"]').first().fill('dev@ommd.dev');
    await footer.locator('button[type="submit"]').first().click();

    errors.assertClean();
  });

  test('T4-03: Mobile (390x844) & Reduced-Motion keyboard audit flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile & reduced-motion audit scenario');
    const errors = attachErrorCollectors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    await assertZeroOverflow(page, 'mobile audit /');

    // Navigate via mobile Menu drawer to /projects and /about
    const menuBtn = page.locator('header button').filter({ hasText: /menu/i }).first();
    await menuBtn.click();
    await page.locator('a[href="/projects"]:visible').first().click();
    await page.waitForURL(/\/projects/);
    await waitForFontsAndMain(page);
    await assertZeroOverflow(page, 'mobile audit /projects');

    await menuBtn.click();
    await page.locator('a[href="/about"]:visible').first().click();
    await page.waitForURL(/\/about/);
    await waitForFontsAndMain(page);
    await assertZeroOverflow(page, 'mobile audit /about');

    // Back home -> test IDE mobile drawer, Ticket toggle, FAQ keyboard toggle, & modal Escape
    await page.locator('header a[href="/"]').first().click();
    await page.waitForURL(/\/$/);
    await waitForFontsAndMain(page);

    const ideSection = page.locator('main section, main [id]').filter({ hasText: /Constellation/i }).first();
    await ideSection.scrollIntoViewIfNeeded();
    await ensureMobileFilesOpen(ideSection);
    await assertZeroOverflow(page, 'mobile audit IDE files open');

    const faq2 = page.locator('main button[aria-expanded][aria-controls]').nth(1);
    await faq2.scrollIntoViewIfNeeded();
    await faq2.focus();
    await page.keyboard.press('Space');
    await expect(faq2).toHaveAttribute('aria-expanded', 'true');

    const learnMoreBtn = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /learn more/i }).first();
    await learnMoreBtn.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    errors.assertClean();
  });
});
