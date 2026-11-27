import { test, expect } from '../pw.mjs';
import {
  PALETTE,
  isNearRgb,
  attachErrorCollectors,
  waitForFontsAndMain,
  discoverFirstProjectSlug,
  ensureMobileFilesOpen,
  openIdeSearch,
  toggleIdeTerminal,
} from '../helpers.mjs';

test.describe('Tier 1 — Core Functional & Design Parity', () => {
  test('T1-01: routes, checkerboard header, minimap & mobile menu drawer', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isDesktop = testInfo.project.name === 'desktop';

    const homeRes = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(homeRes?.status()).toBe(200);
    await waitForFontsAndMain(page);

    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    const headerAudit = await header.evaluate((el) => {
      const style = getComputedStyle(el);
      const nodes = [el, ...Array.from(el.querySelectorAll('*'))];
      const hasCheckerboard = nodes.some((n) => {
        const bgImg = getComputedStyle(n).backgroundImage || '';
        const bgColor = getComputedStyle(n).backgroundColor || '';
        return /conic-gradient|linear-gradient|url\(/i.test(bgImg) || bgColor === 'rgb(0, 0, 0)';
      });
      const hasDarkInner = nodes.some((n) => getComputedStyle(n).backgroundColor === 'rgb(35, 35, 35)');
      const hasAccentDot = nodes.some((n) => {
        const s = getComputedStyle(n);
        return s.backgroundColor === 'rgb(255, 145, 0)' || s.color === 'rgb(255, 145, 0)';
      });
      const tickerEl = nodes.find((n) => {
        const s = getComputedStyle(n);
        const rect = n.getBoundingClientRect();
        return s.backgroundColor === 'rgb(222, 222, 222)' && rect.height >= 12 && rect.height <= 26 && rect.width > 120;
      });
      const homeLink = el.querySelector('a[href="/"]');
      const visibleLinks = Array.from(el.querySelectorAll('a[href]')).filter((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && a.getAttribute('href') !== '/';
      });
      return {
        position: style.position,
        hasCheckerboard,
        hasDarkInner,
        hasAccentDot,
        hasTicker: Boolean(tickerEl),
        hasHomeLink: Boolean(homeLink),
        visibleNavCount: visibleLinks.length,
      };
    });

    expect(headerAudit.position).toBe('fixed');
    expect(headerAudit.hasCheckerboard, 'Header should have #000 checkerboard bezel').toBe(true);
    expect(headerAudit.hasDarkInner, 'Header should have #232323 inner pill').toBe(true);
    expect(headerAudit.hasAccentDot, 'Header should include #ff9100 status dot').toBe(true);
    expect(headerAudit.hasHomeLink, 'Header should include brand home link href="/"').toBe(true);

    if (isDesktop) {
      expect(headerAudit.hasTicker, 'Desktop header should render ~18px #dedede ticker bar').toBe(true);
      expect(headerAudit.visibleNavCount).toBeGreaterThanOrEqual(5);

      // Top-right minimap with #ff9100 indicator shifting on scroll
      const minimapBefore = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('aside, nav, div')).filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return s.position === 'fixed' && r.right > window.innerWidth - 140 && r.top < 250 && r.width > 16 && r.height > 40;
        });
        for (const c of candidates) {
          const orange = Array.from(c.querySelectorAll('*')).find((child) => {
            const cs = getComputedStyle(child);
            return cs.backgroundColor === 'rgb(255, 145, 0)' || /255,\s*145,\s*0/.test(cs.borderColor);
          });
          if (orange) return orange.getBoundingClientRect().top;
        }
        return null;
      });
      expect(minimapBefore, 'Desktop top-right minimap #ff9100 viewport indicator should exist').not.toBeNull();

      await page.evaluate(() => window.scrollTo(0, Math.floor(document.documentElement.scrollHeight * 0.45)));
      await page.waitForTimeout(200);

      const minimapAfter = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('aside, nav, div')).filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return s.position === 'fixed' && r.right > window.innerWidth - 140 && r.top < 250 && r.width > 16 && r.height > 40;
        });
        for (const c of candidates) {
          const orange = Array.from(c.querySelectorAll('*')).find((child) => {
            const cs = getComputedStyle(child);
            return cs.backgroundColor === 'rgb(255, 145, 0)' || /255,\s*145,\s*0/.test(cs.borderColor);
          });
          if (orange) return orange.getBoundingClientRect().top;
        }
        return null;
      });
      expect(minimapAfter).toBeGreaterThan(minimapBefore);
    } else {
      const menuBtn = header.locator('button').filter({ hasText: /menu/i }).first();
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();
      await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('a[href="/projects"]:visible').first()).toBeVisible();
      await expect(page.locator('a[href="/about"]:visible').first()).toBeVisible();
      await expect(page.locator('a[href="/roadmap"]:visible').first()).toBeVisible();
      await menuBtn.click();
    }

    // Verify core routes render HTTP 200 with visible <main> & distinct headings
    const headings = new Set();
    for (const route of ['/', '/projects', '/about', '/roadmap']) {
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `Route ${route} should return 200`).toBe(200);
      await waitForFontsAndMain(page);
      const h1 = page.locator('main h1, main h2').first();
      await expect(h1).toBeVisible();
      headings.add((await h1.innerText()).trim());
    }
    expect(headings.size).toBeGreaterThanOrEqual(3);
    errors.assertClean();
  });

  test('T1-02: palette polarity, Geist fonts, fluid typography & anti-slop', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isDesktop = testInfo.project.name === 'desktop';

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const audit = await page.evaluate(() => {
      const fonts = Array.from(document.fonts).map((f) => ({ family: f.family, status: f.status }));
      const bodyStyle = getComputedStyle(document.body);
      const footer = document.querySelector('footer');
      const footerBg = footer ? getComputedStyle(footer).backgroundColor : null;
      const h1 = document.querySelector('main h1');
      const h2 = document.querySelector('main h2');
      const h1Style = h1 ? getComputedStyle(h1) : null;
      const h2Style = h2 ? getComputedStyle(h2) : null;

      // Collect alternating opaque section backgrounds inside main
      const bands = Array.from(document.querySelectorAll('main section, main [id]'))
        .map((el) => ({
          tag: el.tagName,
          id: el.id,
          height: el.getBoundingClientRect().height,
          bg: getComputedStyle(el).backgroundColor,
        }))
        .filter((b) => b.height > 150 && b.bg && !b.bg.endsWith(', 0)') && b.bg !== 'transparent');

      // Anti-slop check in hero: no purple/blue gradients or backdrop-filter glassmorphism
      const hero = document.querySelector('main section, main > div');
      const heroNodes = hero ? [hero, ...Array.from(hero.querySelectorAll('*'))] : [];
      const hasGlassOrNeonSlop = heroNodes.some((n) => {
        const s = getComputedStyle(n);
        const bf = s.backdropFilter || s.webkitBackdropFilter || 'none';
        const bgImg = s.backgroundImage || 'none';
        const hasBackdrop = bf !== 'none' && bf !== '';
        const hasPurpleBlueGrad = /gradient/i.test(bgImg) && /(purple|indigo|violet|cyan|blue|138,|99,|59,)/i.test(bgImg);
        return hasBackdrop || hasPurpleBlueGrad;
      });

      return {
        fonts,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        bodyFontSize: Number.parseFloat(bodyStyle.fontSize),
        footerBg,
        h1Size: h1Style ? Number.parseFloat(h1Style.fontSize) : 0,
        h1Weight: h1Style ? h1Style.fontWeight : '',
        h2Size: h2Style ? Number.parseFloat(h2Style.fontSize) : 0,
        bands,
        hasGlassOrNeonSlop,
      };
    });

    const loadedSans = audit.fonts.some(
      (f) => f.status === 'loaded' && /geist/i.test(f.family) && !/mono/i.test(f.family)
    );
    const loadedMono = audit.fonts.some(
      (f) => f.status === 'loaded' && /geist.*mono/i.test(f.family)
    );
    expect(loadedSans, `Expected loaded Geist sans font, got: ${JSON.stringify(audit.fonts)}`).toBe(true);
    expect(loadedMono, `Expected loaded Geist Mono font, got: ${JSON.stringify(audit.fonts)}`).toBe(true);

    expect(isNearRgb(audit.bodyBg, PALETTE.offWhite), `Body bg ${audit.bodyBg} should be #f1eee7`).toBe(true);
    expect(isNearRgb(audit.bodyColor, PALETTE.black), `Body color ${audit.bodyColor} should be #232323`).toBe(true);
    if (audit.footerBg) {
      expect(isNearRgb(audit.footerBg, PALETTE.offWhite), `Footer bg ${audit.footerBg} should be #f1eee7`).toBe(true);
    }

    const hasLightBand = audit.bands.some((b) => isNearRgb(b.bg, PALETTE.offWhite));
    const hasDarkBand = audit.bands.some((b) => isNearRgb(b.bg, PALETTE.black));
    expect(hasLightBand && hasDarkBand, 'Home should alternate #f1eee7 and #232323 bands').toBe(true);

    expect(audit.h1Size).toBeGreaterThanOrEqual(isDesktop ? 40 : 36);
    expect(Number.parseInt(audit.h1Weight, 10)).toBeGreaterThanOrEqual(500);
    expect(audit.h2Size).toBeGreaterThanOrEqual(isDesktop ? 36 : 28);
    expect(audit.bodyFontSize).toBeGreaterThanOrEqual(15);
    expect(audit.bodyFontSize).toBeLessThanOrEqual(26);
    expect(audit.hasGlassOrNeonSlop, 'Hero must not use glassmorphic backdrop-filter or purple/blue neon gradients').toBe(false);

    errors.assertClean();
  });

  test('T1-03: hero split stage, metric receipt table & 10 staggered pillars', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isDesktop = testInfo.project.name === 'desktop';

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    // Hero checks
    const heroH1 = page.locator('main h1').first();
    await expect(heroH1).toBeVisible();
    const connectors = page.locator('main [data-connector]');
    expect(await connectors.count()).toBeGreaterThanOrEqual(2);
    const firstConnectorBox = await connectors.first().boundingBox();
    expect(firstConnectorBox?.height).toBeGreaterThanOrEqual(38);
    expect(firstConnectorBox?.height).toBeLessThanOrEqual(60);

    const canvasBox = await page.locator('main canvas').first().boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(100);
    expect(canvasBox?.height).toBeGreaterThan(100);

    // Estimate / metric receipt band
    const receiptMetrics = await page.evaluate(() => {
      const pres = Array.from(document.querySelectorAll('main pre, main table, main code'));
      const receiptEl = pres.find((el) => {
        const txt = el.textContent || '';
        return /\+[-+]+\+/.test(txt) || /\.{3,}|·{3,}/.test(txt);
      });
      const largeNumbers = Array.from(document.querySelectorAll('main *'))
        .map((el) => ({
          text: (el.innerText || '').trim(),
          size: Number.parseFloat(getComputedStyle(el).fontSize),
        }))
        .filter((x) => x.size >= 90 && x.text.length > 0 && x.text.length <= 20);
      return {
        hasReceiptTable: Boolean(receiptEl),
        maxDisplaySize: largeNumbers.reduce((m, x) => Math.max(m, x.size), 0),
      };
    });
    expect(receiptMetrics.hasReceiptTable, 'Expected ASCII +---+ / dotted-leader receipt table').toBe(true);
    expect(receiptMetrics.maxDisplaySize).toBeGreaterThanOrEqual(isDesktop ? 130 : 88);

    // 10 numbered engineering pillars (001 / .. 010 /)
    const pillarLefts = await page.evaluate(() => {
      const markers = Array.from(document.querySelectorAll('main *')).filter((el) => {
        if (el.children.length > 0) return false;
        const txt = (el.textContent || '').trim();
        return /^0(?:0[1-9]|10)\s*\/?$/.test(txt);
      });
      return markers.map((m) => ({
        text: m.textContent.trim(),
        left: Math.round(m.getBoundingClientRect().left),
      }));
    });

    expect(pillarLefts.length, `Expected 10 pillar markers (001..010), got ${pillarLefts.length}`).toBe(10);
    if (isDesktop) {
      const distinctLefts = new Set(pillarLefts.map((p) => p.left));
      expect(distinctLefts.size, 'Desktop pillars should stagger horizontally across columns').toBeGreaterThanOrEqual(2);
    }

    errors.assertClean();
  });

  test('T1-04: interactive IDE explorer, repo switch, file click, Cmd/Ctrl+K search & Cmd/Ctrl+J terminal', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const ideSection = page.locator('main section, main [id]').filter({
      hasText: /Constellation/i,
    }).filter({
      hasText: /RuleCanvas|Costellar/i,
    }).first();
    await expect(ideSection).toBeVisible();
    await ideSection.scrollIntoViewIfNeeded();

    // Verify grounded repos appear
    const ideText = await ideSection.innerText();
    expect(ideText).toMatch(/Constellation/i);
    expect(ideText).toMatch(/Costellar/i);
    expect(ideText).toMatch(/RuleCanvas/i);

    const codePane = ideSection.locator('pre, code, [role="code"]').first();
    await expect(codePane).toBeVisible();
    const initialCode = await codePane.innerText();

    // Switch repo tab (e.g., Costellar or RuleCanvas)
    const switchBtn = ideSection.locator('button, [role="tab"]').filter({ hasText: /Costellar|RuleCanvas/i }).first();
    await switchBtn.click();
    await expect.poll(async () => await codePane.innerText()).not.toBe(initialCode);

    // Open mobile files drawer if present, then click another file in file tree
    await ensureMobileFilesOpen(ideSection);
    const fileButtons = ideSection.locator('button').filter({ hasText: /\.(ts|tsx|md|json|py|yml|yaml|txt)$/i });
    const fileCount = await fileButtons.count();
    expect(fileCount).toBeGreaterThanOrEqual(2);
    const codeBeforeFileClick = await codePane.innerText();
    await fileButtons.nth(1).click();
    // Some implementations might pick the already-active file at index 1, so check index 0 if unchanged
    if ((await codePane.innerText()) === codeBeforeFileClick && fileCount > 0) {
      await fileButtons.nth(0).click();
    }
    expect((await codePane.innerText()).length).toBeGreaterThan(10);

    // Search files via Cmd/Ctrl+K or Search button
    await openIdeSearch(page, ideSection);
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('README');
    const resultItem = page.locator('[role="dialog"] button, [role="listbox"] [role="option"], [role="option"]').filter({ hasText: /readme/i }).first();
    if ((await resultItem.count()) > 0) {
      await resultItem.click();
    } else {
      await searchInput.press('Enter');
    }

    // Terminal via Cmd/Ctrl+J or Terminal button
    await toggleIdeTerminal(page, ideSection);
    const termInput = ideSection.locator('input[type="text"], input:not([type]), textarea').filter({
      hasNotText: /search/i,
    }).last();
    await expect(termInput).toBeVisible();
    await termInput.fill('help');
    const beforeTermText = await ideSection.innerText();
    await termInput.press('Enter');
    await expect.poll(async () => await ideSection.innerText()).not.toBe(beforeTermText);
    await expect(ideSection).toContainText(/\b(ls|help|cat|clear|command|whoami|pwd)\b/i);

    errors.assertClean();
  });

  test('T1-05: showcase 16:9 grid, ticket mode toggle & FAQ accordion', async ({ page }, testInfo) => {
    const errors = attachErrorCollectors(page);
    const isDesktop = testInfo.project.name === 'desktop';

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    // Showcase 16:9 cards linking to /projects/:slug
    const showcaseCards = page.locator('main a[href^="/projects/"]');
    const cardCount = await showcaseCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(2);

    const firstMediaBox = await showcaseCards.first().locator('img, canvas, [class*="aspect"]').first().boundingBox();
    if (firstMediaBox && firstMediaBox.height > 0) {
      const ratio = firstMediaBox.width / firstMediaBox.height;
      expect(ratio).toBeGreaterThan(1.55);
      expect(ratio).toBeLessThan(1.95);
    }

    if (isDesktop && cardCount >= 2) {
      const box0 = await showcaseCards.nth(0).boundingBox();
      const box1 = await showcaseCards.nth(1).boundingBox();
      expect(Math.abs((box0?.y ?? 0) - (box1?.y ?? 999))).toBeLessThan(40);
    }

    // Ticket notches card with Engineering / Research toggle
    const ticket = page.locator('.ticket-notches').first();
    await expect(ticket).toBeVisible();
    const ticketBefore = await ticket.innerText();
    const researchBtn = ticket.locator('button').filter({ hasText: /Research/i }).first();
    const engBtn = ticket.locator('button').filter({ hasText: /Engineering/i }).first();
    await expect(engBtn).toBeVisible();
    await expect(researchBtn).toBeVisible();
    await researchBtn.click();
    await expect.poll(async () => await ticket.innerText()).not.toBe(ticketBefore);
    await expect(ticket).toContainText(/01/);
    await expect(ticket).toContainText(/05/);

    // FAQ accordion: Q1 expanded by default, collapsed panels marked [inert]
    const faqButtons = page.locator('main button[aria-expanded][aria-controls]');
    const faqCount = await faqButtons.count();
    expect(faqCount).toBeGreaterThanOrEqual(2);
    await expect(faqButtons.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(faqButtons.nth(1)).toHaveAttribute('aria-expanded', 'false');

    const secondPanelId = await faqButtons.nth(1).getAttribute('aria-controls');
    const secondPanel = page.locator(`#${secondPanelId}`);
    await expect(secondPanel).toHaveAttribute('inert', '');

    await faqButtons.nth(1).click();
    await expect(faqButtons.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(secondPanel).not.toHaveAttribute('inert', '');

    errors.assertClean();
  });

  test('T1-06: Learn more + dialog, scroll toast & footer email form', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);

    const learnMoreBtn = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /learn more/i }).first();
    await expect(learnMoreBtn).toBeVisible();
    await learnMoreBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeLessThanOrEqual(980);
    const dialogText = await dialog.innerText();
    expect(dialogText).toMatch(/Om M\.? Doddamani/i);
    expect(dialogText).toMatch(/VVCE|Cerenetics/i);
    expect(dialogText).toMatch(/001/);

    const closeBtn = dialog.locator('button').filter({ hasText: /close|×|esc/i }).first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).toBeHidden();

    // Scroll down to trigger toast & reveal footer
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);

    const toastDismiss = page.locator('[role="status"] button, [aria-label*="dismiss" i]').filter({
      hasNotText: /learn more|menu/i,
    }).first();
    if ((await toastDismiss.count()) > 0 && (await toastDismiss.isVisible())) {
      await toastDismiss.click();
    }

    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    const footerEmail = footer.locator('input[type="email"]').first();
    await expect(footerEmail).toBeVisible();
    await footerEmail.fill('reviewer@example.com');
    await footer.locator('button[type="submit"]').first().click();

    // Expect confirmation state or clean input handling without errors
    await expect(footer).toContainText(/sent|subscribed|thank|received|ok|inbox|note/i);
    errors.assertClean();
  });

  test('T1-07: /projects index & /projects/:slug case study with #ff9100 progress bar', async ({ page }) => {
    const errors = attachErrorCollectors(page);

    const firstSlugHref = await discoverFirstProjectSlug(page);
    const projectsBg = await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundColor);
    const pageBg = isNearRgb(projectsBg, PALETTE.black)
      ? projectsBg
      : await page.locator('main section, main > div').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isNearRgb(pageBg, PALETTE.black), `/projects surface ${pageBg} should be #232323`).toBe(true);

    const lightTicket = page.locator('.ticket-notches').first();
    await expect(lightTicket).toBeVisible();
    const ticketBg = await lightTicket.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isNearRgb(ticketBg, PALETTE.offWhite), `Project ticket ${ticketBg} should be #f1eee7`).toBe(true);

    // Open case study
    await page.locator(`a[href="${firstSlugHref}"]`).first().click();
    await page.waitForURL(new RegExp(firstSlugHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await waitForFontsAndMain(page);

    const studyAudit = await page.evaluate(() => {
      const h1 = document.querySelector('main h1');
      const article = document.querySelector('main article') || h1?.parentElement;
      const articleWidth = article ? article.getBoundingClientRect().width : 0;
      const text = document.querySelector('main')?.innerText || '';
      const hasCode = Boolean(document.querySelector('main pre, main code'));
      const backLink = Boolean(document.querySelector('main a[href="/projects"], a[href="/projects"]'));
      return { articleWidth, text, hasCode, backLink };
    });

    expect(studyAudit.articleWidth).toBeLessThanOrEqual(980);
    expect(studyAudit.text).toMatch(/ROLE|STACK|REPO/i);
    expect(studyAudit.hasCode, 'Case study should contain code/architecture block').toBe(true);
    expect(studyAudit.backLink, 'Case study should include back link to /projects').toBe(true);

    // Top 3px #ff9100 reading progress bar advances on scroll
    const getProgressMetric = () =>
      page.evaluate(() => {
        const bars = Array.from(document.querySelectorAll('div, span')).filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return (
            (s.position === 'fixed' || s.position === 'sticky') &&
            r.top <= 12 &&
            r.height >= 2 &&
            r.height <= 6 &&
            s.backgroundColor === 'rgb(255, 145, 0)'
          );
        });
        if (!bars.length) return null;
        const b = bars[0];
        const r = b.getBoundingClientRect();
        const t = getComputedStyle(b).transform;
        return { width: r.width, transform: t };
      });

    const beforeScroll = await getProgressMetric();
    await page.evaluate(() => window.scrollTo(0, Math.floor(document.documentElement.scrollHeight * 0.6)));
    await page.waitForTimeout(200);
    const afterScroll = await getProgressMetric();

    expect(afterScroll, 'Expected top 3px #ff9100 reading progress bar').not.toBeNull();
    expect(
      afterScroll.width > (beforeScroll?.width ?? 0) || afterScroll.transform !== beforeScroll?.transform,
      'Reading progress bar should advance on scroll'
    ).toBe(true);

    errors.assertClean();
  });

  test('T1-08: /about editorial profile, /roadmap Kanban & 404 recovery', async ({ page }) => {
    const errors = attachErrorCollectors(page, { allowNotFoundConsole: true });

    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    const aboutText = await page.locator('main').innerText();
    expect(aboutText).toMatch(/Vidyavardhaka|VVCE/i);
    expect(aboutText).toMatch(/Cerenetics/i);
    expect(aboutText).toMatch(/Instruments expand capability/i);
    expect(aboutText).toMatch(/PRISM/i);
    expect(aboutText).toMatch(/IEEE\s*AIEI/i);
    expect(aboutText).toMatch(/ommd3076/i);

    await page.goto('/roadmap', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    const roadmapMain = page.locator('main');
    await expect(roadmapMain).toContainText(/Shipped/i);
    await expect(roadmapMain).toContainText(/In\s*progress/i);
    await expect(roadmapMain).toContainText(/Planned/i);

    const interactiveControl = roadmapMain.locator('button').first();
    await expect(interactiveControl).toBeVisible();
    await interactiveControl.click();

    await page.goto('/nonexistent-route', { waitUntil: 'domcontentloaded' });
    await waitForFontsAndMain(page);
    await expect(page.locator('main')).toContainText(/404|not found/i);
    await expect(page.locator('main a[href="/"]').first()).toBeVisible();

    errors.assertClean();
  });
});
