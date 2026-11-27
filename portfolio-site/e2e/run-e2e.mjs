import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { playwrightDir } from './pw.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
  console.log(`Usage: node e2e/run-e2e.mjs [options]

Options:
  --tier=1|2|3|4|all    Run specific test tier or all tiers (default: all)
  --project=desktop|mobile
                        Run only desktop (1440x900) or mobile (390x844) project
  --list                List matching Playwright tests without running them
  --visual              Run visual-compare.mjs (standalone if --tier omitted, or after tests if --tier set)
  --skip-ref            Skip live reference capture when running --visual
  --url=<url>           Set BASE_URL (default: http://127.0.0.1:4173)
  --routes=<csv>        Pass route filter to visual-compare.mjs when --visual is enabled
  --out=<dir>           Pass output directory to visual-compare.mjs when --visual is enabled
  --help                Show this help message
`);
}

function parseArgs(argv) {
  const parsed = {
    tier: null,
    project: null,
    list: false,
    visual: false,
    skipRef: false,
    url: null,
    routes: null,
    out: null,
    help: false,
    extra: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--visual') {
      parsed.visual = true;
    } else if (arg === '--skip-ref') {
      parsed.skipRef = true;
    } else if (arg.startsWith('--tier=')) {
      parsed.tier = arg.slice('--tier='.length).toLowerCase();
    } else if (arg === '--tier' && argv[i + 1]) {
      parsed.tier = argv[++i].toLowerCase();
    } else if (arg.startsWith('--project=')) {
      parsed.project = arg.slice('--project='.length).toLowerCase();
    } else if (arg === '--project' && argv[i + 1]) {
      parsed.project = argv[++i].toLowerCase();
    } else if (arg.startsWith('--url=')) {
      parsed.url = arg.slice('--url='.length);
    } else if (arg === '--url' && argv[i + 1]) {
      parsed.url = argv[++i];
    } else if (arg.startsWith('--routes=')) {
      parsed.routes = arg.slice('--routes='.length);
    } else if (arg === '--routes' && argv[i + 1]) {
      parsed.routes = argv[++i];
    } else if (arg.startsWith('--out=')) {
      parsed.out = arg.slice('--out='.length);
    } else if (arg === '--out' && argv[i + 1]) {
      parsed.out = argv[++i];
    } else {
      parsed.extra.push(arg);
    }
  }
  return parsed;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const baseUrl = opts.url || process.env.BASE_URL || 'http://127.0.0.1:4173';
  const childEnv = {
    ...process.env,
    BASE_URL: baseUrl,
  };

  const runPlaywright = !opts.visual || opts.tier !== null || opts.list;
  let exitCode = 0;

  if (runPlaywright) {
    const cliJs = path.join(playwrightDir, 'cli.js');
    const configPath = path.join(__dirname, 'playwright.config.mjs');
    const pwArgs = [cliJs, 'test', '-c', configPath];

    const tier = opts.tier || 'all';
    if (tier !== 'all') {
      if (!['1', '2', '3', '4'].includes(tier)) {
        console.error(`Invalid --tier value "${tier}". Expected 1, 2, 3, 4, or all.`);
        process.exit(2);
      }
      pwArgs.push(`tests/tier${tier}.spec.mjs`);
    }

    if (opts.project) {
      if (!['desktop', 'mobile'].includes(opts.project)) {
        console.error(`Invalid --project value "${opts.project}". Expected desktop or mobile.`);
        process.exit(2);
      }
      pwArgs.push(`--project=${opts.project}`);
    }

    if (opts.list) {
      pwArgs.push('--list');
    }

    if (opts.extra.length > 0) {
      pwArgs.push(...opts.extra);
    }

    const pwResult = spawnSync(process.execPath, pwArgs, {
      cwd: __dirname,
      env: childEnv,
      stdio: 'inherit',
      shell: false,
    });

    exitCode = pwResult.status ?? 1;
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }

  if (opts.visual && !opts.list) {
    const visualScript = path.join(__dirname, 'visual-compare.mjs');
    const visualArgs = [visualScript, `--url=${baseUrl}`];
    if (opts.skipRef) visualArgs.push('--skip-ref');
    if (opts.routes) visualArgs.push(`--routes=${opts.routes}`);
    if (opts.out) visualArgs.push(`--out=${opts.out}`);

    const visResult = spawnSync(process.execPath, visualArgs, {
      cwd: __dirname,
      env: childEnv,
      stdio: 'inherit',
      shell: false,
    });

    exitCode = visResult.status ?? 1;
  }

  process.exit(exitCode);
}

main();
