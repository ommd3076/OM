import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, findChromiumExecutable } from './pw.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ROUTE_PAIRS = [
  { key: 'home', target: '/', ref: '/' },
  { key: 'projects', target: '/projects', ref: '/blog' },
  {
    key: 'project-detail',
    target: '/projects/:firstSlug',
    ref: '/blog/serve-content-to-ai-agents-llms-txt-markdown-sanity',
  },
  { key: 'about', target: '/about', ref: '/legal/privacy-policy' },
  { key: 'roadmap', target: '/roadmap', ref: '/roadmap' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

function printHelp() {
  console.log(`Usage: node e2e/visual-compare.mjs [options]

Options:
  --url <url>        Target base URL (default: BASE_URL env or http://127.0.0.1:4173)
  --ref <url>        Reference base URL (default: https://www.contentarchitecture.dev/)
  --skip-ref         Skip capturing/comparing against the live reference site
  --ref-only         Only capture/inspect the reference site
  --routes <csv>     Comma-separated target routes to capture (e.g. /,/projects,/about)
  --out <dir>        Output directory for screenshots & parity-report.json
                     (default: portfolio-site/e2e/artifacts/visual)
  --help             Show this help message
`);
}

function parseArgs(argv) {
  const opts = {
    url: process.env.BASE_URL || 'http://127.0.0.1:4173',
    ref: 'https://www.contentarchitecture.dev/',
    skipRef: false,
    refOnly: false,
    routes: null,
    out: path.join(__dirname, 'artifacts', 'visual'),
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--skip-ref') {
      opts.skipRef = true;
    } else if (arg === '--ref-only') {
      opts.refOnly = true;
    } else if (arg.startsWith('--url=')) {
      opts.url = arg.slice('--url='.length);
    } else if (arg === '--url' && argv[i + 1]) {
      opts.url = argv[++i];
    } else if (arg.startsWith('--ref=')) {
      opts.ref = arg.slice('--ref='.length);
    } else if (arg === '--ref' && argv[i + 1]) {
      opts.ref = argv[++i];
    } else if (arg.startsWith('--routes=')) {
      opts.routes = arg.slice('--routes='.length).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--routes' && argv[i + 1]) {
      opts.routes = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--out=')) {
      opts.out = path.resolve(arg.slice('--out='.length));
    } else if (arg === '--out' && argv[i + 1]) {
      opts.out = path.resolve(argv[++i]);
    }
  }
  return opts;
}

function sanitizeRouteKey(routePath) {
  if (routePath === '/') return 'home';
  return routePath
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase() || 'route';
}

function joinUrl(base, routePath) {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanRoute = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${cleanBase}${cleanRoute}`;
}

async function resolveTargetRoutes(browser, targetBaseUrl, requestedRoutes) {
  let pairs = DEFAULT_ROUTE_PAIRS;
  if (requestedRoutes && requestedRoutes.length > 0) {
    pairs = requestedRoutes.map((r) => {
      const existing = DEFAULT_ROUTE_PAIRS.find((p) => p.target === r);
      if (existing) return existing;
      return { key: sanitizeRouteKey(r), target: r, ref: r };
    });
  }

  const needsSlugDiscovery = pairs.some((p) => p.target.includes(':firstSlug'));
  if (!needsSlugDiscovery) return pairs;

  let firstSlug = null;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(joinUrl(targetBaseUrl, '/projects'), {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await page.waitForSelector('main a[href^="/projects/"]', { timeout: 5000 }).catch(() => null);
    firstSlug = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const found = anchors.find((a) => /^\/projects\/[^/?#]+/.test(a.getAttribute('href') || ''));
      return found ? found.getAttribute('href') : null;
    });
  } catch {
    firstSlug = null;
  } finally {
    await ctx.close();
  }

  return pairs
    .map((p) => {
      if (!p.target.includes(':firstSlug')) return p;
      if (!firstSlug) return null;
      return { ...p, target: firstSlug };
    })
    .filter(Boolean);
}

async function capturePage(browser, baseUrl, routePath, routeKey, kind, outDir, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err?.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const fullUrl = joinUrl(baseUrl, routePath);
  const kindDir = path.join(outDir, kind);
  fs.mkdirSync(kindDir, { recursive: true });

  const foldPath = path.join(kindDir, `${routeKey}-${viewport.name}-fold.png`);
  const fullPath = path.join(kindDir, `${routeKey}-${viewport.name}-full.png`);

  try {
    const response = await page.goto(fullUrl, {
      waitUntil: 'networkidle',
      timeout: 25_000,
    }).catch(async () => {
      // Fallback to domcontentloaded if networkidle times out on persistent connections
      return await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    });

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
    await page.waitForTimeout(250);

    await page.screenshot({ path: foldPath, fullPage: false });
    await page.screenshot({ path: fullPath, fullPage: true });

    const metrics = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      const footer = document.querySelector('footer');
      const footerBg = footer ? getComputedStyle(footer).backgroundColor : null;
      const h1 = document.querySelector('main h1') || document.querySelector('h1');
      const h2 = document.querySelector('main h2') || document.querySelector('h2');
      const monoEl =
        document.querySelector('header a, header button, pre, code, [class*="font-mono"]') || null;

      const h1Style = h1 ? getComputedStyle(h1) : null;
      const h2Style = h2 ? getComputedStyle(h2) : null;
      const monoStyle = monoEl ? getComputedStyle(monoEl) : null;

      const fonts = Array.from(document.fonts)
        .filter((f) => f.status === 'loaded')
        .map((f) => f.family);
      const uniqueFonts = [...new Set(fonts)];

      // Sample palette tokens across visible nodes
      const colorSamples = new Set();
      const allEls = Array.from(document.querySelectorAll('body, header, header *, main, main *, footer, footer *'));
      for (let i = 0; i < Math.min(allEls.length, 400); i++) {
        const s = getComputedStyle(allEls[i]);
        if (s.backgroundColor) colorSamples.add(s.backgroundColor);
        if (s.color) colorSamples.add(s.color);
        if (s.borderColor) colorSamples.add(s.borderColor);
      }

      const bands = Array.from(document.querySelectorAll('main section, main [id], footer'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            height: Math.round(r.height),
            bg: s.backgroundColor,
            paddingLeft: Number.parseFloat(s.paddingLeft) || 0,
            paddingRight: Number.parseFloat(s.paddingRight) || 0,
          };
        })
        .filter((b) => b.height > 120);

      const gutterSamples = bands
        .filter((b) => b.paddingLeft > 0 || b.paddingRight > 0)
        .slice(0, 6)
        .map((b) => ({ id: b.id || b.tag, paddingLeft: b.paddingLeft, paddingRight: b.paddingRight }));

      const opaqueSurfaces = bands
        .filter((b) => b.bg && !b.bg.endsWith(', 0)') && b.bg !== 'transparent')
        .map((b) => ({ id: b.id || b.tag, bg: b.bg }));

      return {
        title: document.title,
        finalUrl: window.location.href,
        overflow: {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        },
        palette: {
          bodyBg: bodyStyle.backgroundColor,
          bodyColor: bodyStyle.color,
          footerBg,
          hasOffWhite: colorSamples.has('rgb(241, 238, 231)'),
          hasDarkSurface: colorSamples.has('rgb(35, 35, 35)'),
          hasDeepBlack: colorSamples.has('rgb(0, 0, 0)'),
          hasAccentOrange: colorSamples.has('rgb(255, 145, 0)'),
        },
        fonts: {
          loadedFamilies: uniqueFonts,
          hasSans: uniqueFonts.some((f) => /geist/i.test(f) && !/mono/i.test(f)),
          hasMono: uniqueFonts.some((f) => /geist.*mono/i.test(f)),
        },
        typography: {
          body: {
            fontSize: Number.parseFloat(bodyStyle.fontSize),
            lineHeight: Number.parseFloat(bodyStyle.lineHeight),
          },
          h1: h1Style
            ? {
                fontSize: Number.parseFloat(h1Style.fontSize),
                lineHeight: Number.parseFloat(h1Style.lineHeight),
                fontWeight: h1Style.fontWeight,
                text: (h1.innerText || '').trim().slice(0, 80),
              }
            : null,
          h2: h2Style
            ? {
                fontSize: Number.parseFloat(h2Style.fontSize),
                lineHeight: Number.parseFloat(h2Style.lineHeight),
                fontWeight: h2Style.fontWeight,
              }
            : null,
          mono: monoStyle ? { fontSize: Number.parseFloat(monoStyle.fontSize) } : null,
        },
        gutters: gutterSamples,
        surfaces: opaqueSurfaces,
      };
    });

    return {
      ok:
        (response?.status() ?? 200) < 400 &&
        !metrics.overflow.hasOverflow &&
        pageErrors.length === 0 &&
        consoleErrors.length === 0,
      status: response?.status() ?? null,
      screenshots: {
        fold: path.relative(outDir, foldPath),
        full: path.relative(outDir, fullPath),
      },
      ...metrics,
      errors: {
        pageErrors,
        consoleErrors,
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err?.message || String(err),
      overflow: { scrollWidth: null, innerWidth: viewport.width, hasOverflow: false },
      errors: { pageErrors: [...pageErrors, err?.message || String(err)], consoleErrors },
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  fs.mkdirSync(opts.out, { recursive: true });
  const executablePath = findChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const report = {
    timestamp: new Date().toISOString(),
    targetUrl: opts.refOnly ? null : opts.url,
    refUrl: opts.skipRef ? null : opts.ref,
    skipRef: opts.skipRef,
    refOnly: opts.refOnly,
    executablePath: executablePath || 'playwright-default',
    results: [],
    summary: {
      totalChecks: 0,
      targetPassed: 0,
      targetFailed: 0,
      overflowCount: 0,
      fatalErrorCount: 0,
    },
  };

  let exitCode = 0;

  try {
    const routePairs = opts.refOnly
      ? DEFAULT_ROUTE_PAIRS.filter((p) => !p.target.includes(':firstSlug')).map((p) => ({
          ...p,
          target: p.ref,
        }))
      : await resolveTargetRoutes(browser, opts.url, opts.routes);

    for (const pair of routePairs) {
      for (const vp of VIEWPORTS) {
        const entry = {
          routeKey: pair.key,
          viewport: vp.name,
          targetRoute: pair.target,
          refRoute: pair.ref,
          target: null,
          ref: null,
        };

        if (!opts.refOnly) {
          const res = await capturePage(browser, opts.url, pair.target, pair.key, 'target', opts.out, vp);
          entry.target = res;
          report.summary.totalChecks += 1;
          if (res.ok) {
            report.summary.targetPassed += 1;
          } else {
            report.summary.targetFailed += 1;
            exitCode = 1;
          }
          if (res.overflow?.hasOverflow) report.summary.overflowCount += 1;
          if ((res.errors?.pageErrors?.length || 0) > 0 || res.error) report.summary.fatalErrorCount += 1;

          const statusTag = res.ok ? 'PASS' : 'FAIL';
          console.log(
            `[TARGET ${statusTag}] ${pair.target} (${vp.name}) status=${res.status ?? 'ERR'} overflow=${res.overflow?.scrollWidth}/${res.overflow?.innerWidth} h1=${res.typography?.h1?.fontSize ?? '-'}px fonts=${res.fonts?.hasSans ? 'sans' : '-'}/${res.fonts?.hasMono ? 'mono' : '-'}`
          );
        }

        if (!opts.skipRef) {
          const refRes = await capturePage(browser, opts.ref, pair.ref, pair.key, 'ref', opts.out, vp);
          entry.ref = refRes;
          if (opts.refOnly) {
            report.summary.totalChecks += 1;
            if (refRes.ok) report.summary.targetPassed += 1;
            else {
              report.summary.targetFailed += 1;
              exitCode = 1;
            }
          }
          console.log(
            `[REF    ${refRes.ok ? 'OK  ' : 'WARN'}] ${pair.ref} (${vp.name}) status=${refRes.status ?? 'ERR'} overflow=${refRes.overflow?.scrollWidth}/${refRes.overflow?.innerWidth} h1=${refRes.typography?.h1?.fontSize ?? '-'}px`
          );
        }

        report.results.push(entry);
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(opts.out, 'parity-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nParity report written to: ${reportPath}`);
  console.log(
    `Summary: passed=${report.summary.targetPassed}/${report.summary.totalChecks}, overflow=${report.summary.overflowCount}, fatalErrors=${report.summary.fatalErrorCount}`
  );

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('visual-compare failed:', err);
  process.exit(1);
});
