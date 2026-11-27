import { expect, test } from '../pw.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_SCREENSHOTS_DIR =
  'C:/Users/ommd3/.gemini/antigravity/brain/bfcc42c4-a835-40cf-87b9-0d40cb3e633d/notes-verify';

test.describe('Notes Single-Author Blog Lifecycle', () => {
  test('unauthenticated API blocks admin routes and drafts return 404', async ({
    request,
    baseURL,
  }) => {
    const adminRes = await request.get(`${baseURL}/api/admin/notes`);
    expect(adminRes.status()).toBe(401);

    const publicList = await request.get(`${baseURL}/api/notes`);
    expect(publicList.status()).toBe(200);
    const listBody = await publicList.json();
    expect(Array.isArray(listBody.notes)).toBe(true);
    expect(listBody.notes.length).toBeGreaterThanOrEqual(2);

    const missingRes = await request.get(`${baseURL}/api/notes/nonexistent-draft-slug`);
    expect(missingRes.status()).toBe(404);
  });

  test('full author workflow: login, draft persistence, draft privacy, publish, live revision isolation, unpublish, delete & screenshots', async ({
    page,
    browser,
    baseURL,
    isMobile,
  }, testInfo) => {
    const uniqueSuffix = `${isMobile ? 'm' : 'd'}-${Date.now()}`;
    const draftTitle = `Deterministic State Machines ${uniqueSuffix}`;
    const updatedTitle = `Deterministic State Machines v2 ${uniqueSuffix}`;
    const draftSlug = `state-machines-draft-${uniqueSuffix}`;

    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected 401/404 status logs when intentionally testing bad auth / 404 routes
        if (!text.includes('status of 401') && !text.includes('status of 404')) {
          errors.push(`console.error: ${text}`);
        }
      }
    });

    // 1. Capture public /notes & seeded article screenshots + check isolation & zero horizontal overflow
    await page.goto('/notes', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: /Notes/i }).first(),
    ).toBeVisible();

    // Verify complete isolation from portfolio Work/Home header & telemetry chrome
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Notes navigation"]')).toBeVisible();
    await expect(page.locator('.ink-mark-wrap svg').first()).toBeVisible();

    const overflowIndex = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowIndex).toBe(false);

    fs.mkdirSync(ARTIFACT_SCREENSHOTS_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOTS_DIR, `notes-index-${testInfo.project.name}.png`),
      fullPage: false,
    });
    if (!isMobile) {
      await page.evaluate(() => window.scrollTo(0, 480));
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(ARTIFACT_SCREENSHOTS_DIR, `notes-list-${testInfo.project.name}.png`),
        fullPage: false,
      });
    }

    // Open first seeded article & test daylight/night toggle + zero horizontal overflow
    await page.locator('article a').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('article h1')).toBeVisible();
    const overflowArticle = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowArticle).toBe(false);
    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOTS_DIR, `notes-article-${testInfo.project.name}.png`),
      fullPage: false,
    });
    await page.getByRole('button', { name: /Night/i }).click();
    await expect(page.getByRole('button', { name: /Night/i })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Light/i }).click();

    // 2. Visit /notes/studio unauthenticated -> wrong password fails -> valid login succeeds
    await page.goto('/notes/studio', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: /Sign in to/i }),
    ).toBeVisible();

    await page.fill('#studio-passphrase', 'wrong-passphrase');
    await page.getByRole('button', { name: 'Enter Studio' }).click();
    await expect(page.getByRole('alert')).toContainText(/Invalid/i);

    await page.fill('#studio-passphrase', 'ellipsus-notes-ommd');
    await page.getByRole('button', { name: 'Enter Studio' }).click();
    await expect(
      page.getByRole('heading', { name: /Author Studio/i }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_SCREENSHOTS_DIR, `notes-studio-${testInfo.project.name}.png`),
      fullPage: false,
    });

    // Run full stateful CRUD lifecycle once on desktop project so parallel mobile/desktop never race
    if (isMobile) {
      expect(errors).toEqual([]);
      return;
    }

    // 3. Create new private draft & save
    await page.getByRole('button', { name: '+ New draft' }).click();
    await page.fill('#note-title', draftTitle);
    await page.fill('#note-slug', draftSlug);
    await page.fill(
      '#note-excerpt',
      'Why explicit transition tables outperform implicit boolean combinations.',
    );
    await page.fill(
      '#note-body',
      [
        '## Core Invariant',
        '',
        'A system with **three booleans** hides five illegal states.',
        '',
        '> Make illegal states unrepresentable before tuning animations.',
        '',
        '```typescript',
        'export type NoteState = "draft" | "published" | "published_with_revision";',
        '```',
        '',
        '- Explicit state transitions',
        '- Persistent SQLite storage',
      ].join('\n'),
    );

    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByRole('status')).toContainText(/Private draft saved/i);

    // Toggle Preview mode and verify formatted prose renders
    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(
      page.getByRole('heading', { name: draftTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Core Invariant' }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Write' }).click();

    // 4. Reload /notes/studio -> draft must survive reload
    await page.reload({ waitUntil: 'networkidle' });
    await expect(
      page.locator('aside button', { hasText: draftTitle }),
    ).toBeVisible();

    // 5. Public visitor context must get 404 on /notes/:draftSlug and not see it on /notes
    const visitorCtx = await browser.newContext();
    try {
      const visitorPage = await visitorCtx.newPage();
      const draftApiRes = await visitorCtx.request.get(
        `${baseURL}/api/notes/${draftSlug}`,
      );
      expect(draftApiRes.status()).toBe(404);

      await visitorPage.goto(`${baseURL}/notes/${draftSlug}`, {
        waitUntil: 'networkidle',
      });
      await expect(
        visitorPage.getByRole('heading', { name: /not found|404/i }),
      ).toBeVisible();

      await visitorPage.goto(`${baseURL}/notes`, { waitUntil: 'networkidle' });
      await expect(visitorPage.getByText(draftTitle)).toHaveCount(0);

      // 6. Publish the draft -> visitor sees it live
      await page.locator('aside button', { hasText: draftTitle }).click();
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await expect(page.getByRole('status')).toContainText(/Published live/i);

      await visitorPage.goto(`${baseURL}/notes/${draftSlug}`, {
        waitUntil: 'networkidle',
      });
      await expect(visitorPage.locator('article h1')).toHaveText(draftTitle);
      await expect(
        visitorPage.getByRole('heading', { name: 'Core Invariant' }),
      ).toBeVisible();

      // Reload live article to verify persistence
      await visitorPage.reload({ waitUntil: 'networkidle' });
      await expect(visitorPage.locator('article h1')).toHaveText(draftTitle);

      // 7. Edit published note as draft revision -> live article stays unchanged until Publish Revision
      await page.fill('#note-title', updatedTitle);
      await page.fill(
        '#note-body',
        '## Revision Pending\n\nRevision v2 — pending review.',
      );
      await page.getByRole('button', { name: 'Save Draft' }).click();
      await expect(page.getByRole('status')).toContainText(
        /Live published article stays unchanged/i,
      );

      await visitorPage.reload({ waitUntil: 'networkidle' });
      await expect(visitorPage.locator('article h1')).toHaveText(draftTitle);
      await expect(visitorPage.getByText('Revision v2 — pending review.')).toHaveCount(0);

      // Publish revision -> live article updates
      await page.getByRole('button', { name: 'Publish Revision' }).click();
      await expect(page.getByRole('status')).toContainText(/Published live/i);

      await visitorPage.reload({ waitUntil: 'networkidle' });
      await expect(visitorPage.locator('article h1')).toHaveText(updatedTitle);
      await expect(visitorPage.getByText('Revision v2 — pending review.')).toBeVisible();

      // 8. Unpublish -> live URL returns 404 again, draft stays in Studio
      await page.getByRole('button', { name: 'Unpublish' }).click();
      await expect(page.getByRole('status')).toContainText(/Note unpublished/i);

      await visitorPage.goto(`${baseURL}/notes/${draftSlug}`, {
        waitUntil: 'networkidle',
      });
      await expect(
        visitorPage.getByRole('heading', { name: /not found|404/i }),
      ).toBeVisible();

      // 9. Delete with confirmation -> disappears after reload
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm delete' }).click();
      await expect(page.getByRole('status')).toContainText(/Deleted/i);

      await page.reload({ waitUntil: 'networkidle' });
      await expect(
        page.locator('aside button', { hasText: updatedTitle }),
      ).toHaveCount(0);
    } finally {
      await visitorCtx.close();
    }

    expect(errors).toEqual([]);
  });
});
