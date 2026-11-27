import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPlaywrightPackageDir(dirPath) {
  if (!dirPath) return false;
  return (
    fs.existsSync(path.join(dirPath, 'test.mjs')) &&
    fs.existsSync(path.join(dirPath, 'index.mjs'))
  );
}

function getNpxCacheRoots() {
  const roots = new Set();
  const envCache = process.env.npm_config_cache;
  if (envCache) {
    roots.add(path.join(envCache, '_npx'));
  }
  if (process.env.LOCALAPPDATA) {
    roots.add(path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx'));
  }
  if (os.homedir()) {
    roots.add(path.join(os.homedir(), '.npm', '_npx'));
    roots.add(path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx'));
  }
  return [...roots];
}

function resolvePlaywrightDir() {
  // 1. Explicit env override
  if (process.env.PLAYWRIGHT_PACKAGE_DIR) {
    const candidate = path.resolve(process.env.PLAYWRIGHT_PACKAGE_DIR);
    if (isPlaywrightPackageDir(candidate)) return candidate;
  }

  // 2. NODE_PATH entries
  if (process.env.NODE_PATH) {
    for (const entry of process.env.NODE_PATH.split(path.delimiter)) {
      if (!entry) continue;
      const candidate = path.join(entry, 'playwright');
      if (isPlaywrightPackageDir(candidate)) return candidate;
    }
  }

  // 3. Upward node_modules from e2e/ and process.cwd()
  for (const startDir of [__dirname, process.cwd()]) {
    let current = path.resolve(startDir);
    while (true) {
      const candidate = path.join(current, 'node_modules', 'playwright');
      if (isPlaywrightPackageDir(candidate)) return candidate;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  // 4. npm _npx cache directories (sorted newest first by mtime)
  for (const npxRoot of getNpxCacheRoots()) {
    if (!fs.existsSync(npxRoot)) continue;
    let subdirs = [];
    try {
      subdirs = fs
        .readdirSync(npxRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => {
          const full = path.join(npxRoot, d.name);
          let mtimeMs = 0;
          try {
            mtimeMs = fs.statSync(full).mtimeMs;
          } catch {
            // ignore
          }
          return { full, mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
    } catch {
      subdirs = [];
    }
    for (const sub of subdirs) {
      const candidate = path.join(sub.full, 'node_modules', 'playwright');
      if (isPlaywrightPackageDir(candidate)) return candidate;
    }
  }

  // 5. Global npm root -g
  try {
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const globalRoot = execFileSync(npmBin, ['root', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    }).trim();
    if (globalRoot) {
      const candidate = path.join(globalRoot, 'playwright');
      if (isPlaywrightPackageDir(candidate)) return candidate;
    }
  } catch {
    // ignore
  }

  throw new Error(
    'Unable to locate Playwright package (test.mjs & index.mjs). Checked PLAYWRIGHT_PACKAGE_DIR, NODE_PATH, upward node_modules, npm _npx cache, and npm root -g.'
  );
}

export const playwrightDir = resolvePlaywrightDir();

const testModule = await import(pathToFileURL(path.join(playwrightDir, 'test.mjs')).href);
const indexModule = await import(pathToFileURL(path.join(playwrightDir, 'index.mjs')).href);

export const test = testModule.test;
export const expect = testModule.expect;
export const defineConfig = testModule.defineConfig;
export const mergeTests = testModule.mergeTests;
export const mergeExpects = testModule.mergeExpects;
export const devices = testModule.devices ?? indexModule.devices;
export const chromium = testModule.chromium ?? indexModule.chromium;
export const firefox = testModule.firefox ?? indexModule.firefox;
export const webkit = testModule.webkit ?? indexModule.webkit;
export const request = testModule.request ?? indexModule.request;
export const selectors = testModule.selectors ?? indexModule.selectors;
export const errors = testModule.errors ?? indexModule.errors;

function parseRevision(dirName, prefix) {
  const raw = dirName.slice(prefix.length);
  const num = Number.parseInt(raw, 10);
  return Number.isFinite(num) ? num : -1;
}

function findBrowserInMsPlaywright(msPlaywrightDir) {
  if (!msPlaywrightDir || !fs.existsSync(msPlaywrightDir)) return undefined;

  let entries = [];
  try {
    entries = fs
      .readdirSync(msPlaywrightDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return undefined;
  }

  const headlessShellDirs = entries
    .filter((name) => name.startsWith('chromium_headless_shell-'))
    .sort(
      (a, b) =>
        parseRevision(b, 'chromium_headless_shell-') -
        parseRevision(a, 'chromium_headless_shell-')
    );

  const headlessRelPaths =
    process.platform === 'win32'
      ? [
          path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
          path.join('chrome-headless-shell-win32', 'chrome-headless-shell.exe'),
        ]
      : process.platform === 'darwin'
      ? [
          path.join('chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          path.join('chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
        ]
      : [path.join('chrome-headless-shell-linux', 'chrome-headless-shell')];

  for (const dirName of headlessShellDirs) {
    for (const rel of headlessRelPaths) {
      const exe = path.join(msPlaywrightDir, dirName, rel);
      if (fs.existsSync(exe)) return exe;
    }
  }

  const chromiumDirs = entries
    .filter((name) => name.startsWith('chromium-'))
    .sort((a, b) => parseRevision(b, 'chromium-') - parseRevision(a, 'chromium-'));

  const chromiumRelPaths =
    process.platform === 'win32'
      ? [path.join('chrome-win64', 'chrome.exe'), path.join('chrome-win', 'chrome.exe')]
      : process.platform === 'darwin'
      ? [
          path.join('chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          path.join('chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        ]
      : [path.join('chrome-linux', 'chrome')];

  for (const dirName of chromiumDirs) {
    for (const rel of chromiumRelPaths) {
      const exe = path.join(msPlaywrightDir, dirName, rel);
      if (fs.existsSync(exe)) return exe;
    }
  }

  return undefined;
}

export function findChromiumExecutable() {
  // 1. Explicit env override
  const envExe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (envExe && fs.existsSync(envExe)) {
    return envExe;
  }

  // 2. Playwright's default expected executable
  try {
    const defaultExe = chromium.executablePath();
    if (defaultExe && fs.existsSync(defaultExe)) {
      return defaultExe;
    }
  } catch {
    // ignore
  }

  // 3. PLAYWRIGHT_BROWSERS_PATH / ms-playwright cache fallback
  const cacheCandidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : undefined,
    os.homedir() ? path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright') : undefined,
    os.homedir() ? path.join(os.homedir(), '.cache', 'ms-playwright') : undefined,
  ].filter(Boolean);

  for (const dir of cacheCandidates) {
    const found = findBrowserInMsPlaywright(dir);
    if (found) return found;
  }

  // 4. System Chrome / Edge fallback
  if (process.platform === 'win32') {
    const systemBrowsers = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
        : undefined,
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean);

    for (const exe of systemBrowsers) {
      if (fs.existsSync(exe)) return exe;
    }
  } else if (process.platform === 'darwin') {
    const macBrowsers = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
    for (const exe of macBrowsers) {
      if (fs.existsSync(exe)) return exe;
    }
  } else {
    const linuxBrowsers = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
    ];
    for (const exe of linuxBrowsers) {
      if (fs.existsSync(exe)) return exe;
    }
  }

  return undefined;
}
