import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SESSION_COOKIE_NAME = 'om_notes_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESERVED_SLUGS = new Set(['studio', 'admin', 'new', 'edit', 'api', 'login', 'logout']);

function resolveDataDir() {
  return process.env.NOTES_DATA_DIR || path.join(process.cwd(), 'data');
}

function loadEnvLocalPassword(rootDir) {
  if (process.env.NOTES_ADMIN_PASSWORD) {
    return process.env.NOTES_ADMIN_PASSWORD;
  }
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key === 'NOTES_ADMIN_PASSWORD' && val) {
        return val;
      }
    }
  }
  return 'ellipsus-notes-ommd';
}

function ensureAuthConfig(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const authFile = path.join(dataDir, 'auth-config.json');
  const rootDir = process.cwd();
  const configuredPassword = loadEnvLocalPassword(rootDir);

  let config = null;
  if (fs.existsSync(authFile)) {
    try {
      config = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    } catch {
      config = null;
    }
  }

  const secret = config?.secret || crypto.randomBytes(32).toString('hex');
  const salt = config?.salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(configuredPassword, salt, 64).toString('hex');

  if (!config || config.hash !== hash || config.secret !== secret) {
    const nextConfig = { secret, salt, hash };
    fs.writeFileSync(authFile, JSON.stringify(nextConfig, null, 2));
    return nextConfig;
  }
  return config;
}

const SEED_NOTES = [
  {
    id: 'note-independent-verifier',
    title: 'Why a scheduler should never grade its own homework',
    slug: 'independent-physical-verifier',
    excerpt:
      'Decoupling heuristic orbit scheduling from backend/src/validation/verifier.ts makes every slew transition, sunlit window, and downlink bound independently falsifiable.',
    publishedAt: '2026-02-14T10:00:00.000Z',
    body: `Most optimization demos bundle the solver and the constraint checker inside the same loop. When a score looks high, it is hard to tell whether the schedule actually obeyed physics or whether an edge case slipped past a shared assumption.

In **Constellation Lab**, schedule generation and schedule verification live on opposite sides of a strict contract.

## Decoupling solver from truth

Every candidate plan produced by \`cpsat\`, \`greedy\`, \`heuristic\`, \`rolling_horizon\`, or adaptive \`sra_rhr\` is handed as plain JSON to \`backend/src/validation/verifier.ts\`. The verifier recomputes physical transitions from scratch without reading any solver internals.

> A scheduler should never grade its own homework. If a transition violates slew rate or eclipse power budgets, the verifier rejects the entire pass with an explicit trace.

### What the verifier checks independently

- **Slew transition time**: measures the 3D look-vector angle between consecutive targets and enforces \`setupTimeSec + angleDeg / slewRateDegPerSec\`.
- **Sunlit intervals**: integrates eclipse flags across propagation steps instead of trusting summary flags.
- **Provenance tags**: attaches \`VERIFIED_SOURCE\`, \`MODEL_ESTIMATE\`, \`SYNTHETIC_ASSUMPTION\`, or \`UNVERIFIED\` to every parameter.

\`\`\`ts
export function requiredTransitionTimeSec(
  prevLookVec: Vec3 | null,
  nextLookVec: Vec3 | null,
  slewRateDegPerSec: number,
  setupTimeSec: number,
): number {
  if (!prevLookVec || !nextLookVec) return setupTimeSec;
  const cosAngle = Math.max(-1, Math.min(1, dot(prevLookVec, nextLookVec)));
  const angleDeg = Math.acos(cosAngle) * CONSTANTS.RAD_TO_DEG;
  return setupTimeSec + angleDeg / Math.max(0.1, slewRateDegPerSec);
}
\`\`\`

Honest engineering means documenting what is *not* established too. In \`arQ\`, the UI states plainly that quantum advantage and live-fleet deployment are not established.`,
  },
  {
    id: 'note-instruments-expand-capability',
    title: 'Instruments expand capability',
    slug: 'instruments-expand-capability',
    excerpt:
      'Like Newton’s fluxions or Leibniz’s notation, formalizing an ambiguous problem into an inspectable instrument turns guesswork into repeatable calculation.',
    publishedAt: '2026-01-28T10:00:00.000Z',
    body: `Good software rarely starts as a grand architecture diagram. It starts when an existing problem feels needlessly opaque, and you build a small, sharp instrument to see its structure clearly.

### Notation as leverage

In the seventeenth century, calculus did not only add new theorems—it introduced notation that let ordinary working steps carry complex reasoning reliably. Software instruments work the same way.

- **RuleCanvas** turns nested \`if/else\` policy trees into a typed AND/OR flow graph with cycle detection and boundary-case replay.
- **Learning CRC Visually** compiles \`CRC-16-CCITT\` polynomial division frame-by-frame in Remotion so every bit shift is inspectable at 30fps.
- **Meridian Folio** moves encryption to client-side Web Crypto \`AES-256-GCM\` before an opaque envelope ever touches Cloudflare Workers KV.

> One reliable instrument makes room for the next. You do not need hype when the tool itself can be opened, inspected, and tested.

At **Cerenetics** and in my coursework at **VVCE Mysuru**, that posture keeps the scope grounded: build tools people can trust, verify the hard parts first, and write down what failed when something breaks—just like our early hackathon lessons from \`EVA\`.`,
  },
  {
    id: 'note-automata-and-offline-ai',
    title: 'Verification across 8,921 stars and offline inference',
    slug: 'verification-across-automata-and-offline-ai',
    excerpt:
      'From Costellar’s ε-NFA to minimized DFA pipeline over the HYG catalog to PRISM’s offline AI workflow: testing every state transition before shipping.',
    publishedAt: '2026-01-10T10:00:00.000Z',
    body: `Formal computer science courses often treat automata theory as blackboard exercises disconnected from real software. **Costellar (AstroFA)** started as an attempt to bridge that gap directly.

### From regular expression to star catalog

Instead of matching toy strings, Costellar compiles star-pattern queries through three inspectable stages and runs them against **8,921 real stars** from the HYG database (\`V <= 6.5\`):

1. Build an \`ε-NFA\` via Thompson’s construction.
2. Compute \`ε-closure\` and subset powerset determinization into a \`DFA\`.
3. Apply Hopcroft-style partition refinement to produce a minimal \`DFA\`, verified by **74 / 74 passing unit tests**.

---

### Carrying the habit into AI systems

Whether presenting **Deep Reinforcement Learning for game systems** at IEEE AIEI or designing **PRISM** for constrained offline AI inference (accepted for conference presentation), the principle transfers cleanly:

- Keep state transitions deterministic wherever possible.
- Measure failure modes explicitly rather than hiding behind averages.
- Separate draft exploration from published claims until the evidence holds.`,
  },
];

let cachedCtx = null;

function getContext() {
  const dataDir = resolveDataDir();
  if (cachedCtx && cachedCtx.dataDir === dataDir) {
    return cachedCtx;
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'notes.db');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      draft_title TEXT NOT NULL,
      draft_slug TEXT NOT NULL UNIQUE,
      draft_excerpt TEXT NOT NULL,
      draft_body TEXT NOT NULL,
      draft_updated_at TEXT NOT NULL,
      published_title TEXT,
      published_slug TEXT UNIQUE,
      published_excerpt TEXT,
      published_body TEXT,
      published_at TEXT,
      published_updated_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `);

  const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM notes').get();
  const seedMarker = path.join(dataDir, '.seeded');
  if ((countRow?.cnt ?? 0) === 0 && !fs.existsSync(seedMarker)) {
    const insert = db.prepare(`
      INSERT INTO notes (
        id, draft_title, draft_slug, draft_excerpt, draft_body, draft_updated_at,
        published_title, published_slug, published_excerpt, published_body,
        published_at, published_updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of SEED_NOTES) {
      insert.run(
        item.id,
        item.title,
        item.slug,
        item.excerpt,
        item.body,
        item.publishedAt,
        item.title,
        item.slug,
        item.excerpt,
        item.body,
        item.publishedAt,
        item.publishedAt,
        item.publishedAt,
      );
    }
    fs.writeFileSync(seedMarker, new Date().toISOString());
  }

  const auth = ensureAuthConfig(dataDir);
  cachedCtx = { dataDir, db, auth };
  return cachedCtx;
}

export function normalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidSlug(slug) {
  return Boolean(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

function computeReadingMinutes(body) {
  const words = String(body || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function toPublicNote(row) {
  if (!row || !row.published_slug) return null;
  return {
    id: row.id,
    title: row.published_title,
    slug: row.published_slug,
    excerpt: row.published_excerpt,
    body: row.published_body,
    publishedAt: row.published_at,
    updatedAt: row.published_updated_at,
    readingMinutes: computeReadingMinutes(row.published_body),
  };
}

function toAdminNote(row) {
  const isPublished = Boolean(row.published_slug);
  const hasUnpublishedChanges =
    isPublished &&
    (row.draft_title !== row.published_title ||
      row.draft_slug !== row.published_slug ||
      row.draft_excerpt !== row.published_excerpt ||
      row.draft_body !== row.published_body);
  const status = !isPublished
    ? 'draft'
    : hasUnpublishedChanges
      ? 'published_with_revision'
      : 'published';

  return {
    id: row.id,
    status,
    isPublished,
    hasUnpublishedChanges,
    createdAt: row.created_at,
    draft: {
      title: row.draft_title,
      slug: row.draft_slug,
      excerpt: row.draft_excerpt,
      body: row.draft_body,
      updatedAt: row.draft_updated_at,
      readingMinutes: computeReadingMinutes(row.draft_body),
    },
    published: isPublished
      ? {
          title: row.published_title,
          slug: row.published_slug,
          excerpt: row.published_excerpt,
          body: row.published_body,
          publishedAt: row.published_at,
          updatedAt: row.published_updated_at,
          readingMinutes: computeReadingMinutes(row.published_body),
        }
      : null,
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const map = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    map[k] = decodeURIComponent(v);
  }
  return map;
}

function signToken(token, secret) {
  const sig = crypto.createHmac('sha256', secret).update(token).digest('hex');
  return `${token}.${sig}`;
}

function verifySignedToken(rawCookie, secret) {
  if (!rawCookie || typeof rawCookie !== 'string') return null;
  const dot = rawCookie.indexOf('.');
  if (dot <= 0) return null;
  const token = rawCookie.slice(0, dot);
  const sig = rawCookie.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(token).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return token;
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAuthenticatedSession(req, ctx) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE_NAME];
  const token = verifySignedToken(raw, ctx.auth.secret);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  ctx.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  const row = ctx.db
    .prepare('SELECT token_hash, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(tokenHash, now);
  return row ? tokenHash : null;
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

export async function handleNotesApi(req, res) {
  const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = urlObj.pathname;
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  const ctx = getContext();
  const method = (req.method || 'GET').toUpperCase();

  try {
    // ── Public Notes Endpoints ─────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/notes') {
      const rows = ctx.db
        .prepare(
          'SELECT * FROM notes WHERE published_slug IS NOT NULL ORDER BY published_at DESC, created_at DESC',
        )
        .all();
      sendJson(res, 200, { notes: rows.map(toPublicNote).filter(Boolean) });
      return true;
    }

    if (method === 'GET' && pathname.startsWith('/api/notes/')) {
      const slug = decodeURIComponent(pathname.slice('/api/notes/'.length));
      if (!slug || slug.includes('/')) {
        sendJson(res, 404, { error: 'Note not found.' });
        return true;
      }
      const row = ctx.db
        .prepare('SELECT * FROM notes WHERE published_slug = ?')
        .get(slug);
      const pub = toPublicNote(row);
      if (!pub) {
        sendJson(res, 404, { error: 'Note not found.' });
        return true;
      }
      sendJson(res, 200, { note: pub });
      return true;
    }

    // ── Auth Endpoints ─────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/auth/session') {
      const authenticated = Boolean(getAuthenticatedSession(req, ctx));
      sendJson(res, 200, { authenticated });
      return true;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!password) {
        sendJson(res, 400, { error: 'Passphrase is required.' });
        return true;
      }
      const attempt = crypto.scryptSync(password, ctx.auth.salt, 64);
      const expected = Buffer.from(ctx.auth.hash, 'hex');
      if (attempt.length !== expected.length || !crypto.timingSafeEqual(attempt, expected)) {
        sendJson(res, 401, { error: 'Invalid passphrase.' });
        return true;
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashSessionToken(rawToken);
      const expiresAt = Date.now() + SESSION_TTL_MS;
      ctx.db
        .prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)')
        .run(tokenHash, expiresAt);

      const signed = signToken(rawToken, ctx.auth.secret);
      sendJson(
        res,
        200,
        { authenticated: true },
        {
          'Set-Cookie': `${SESSION_COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
        },
      );
      return true;
    }

    if (method === 'POST' && pathname === '/api/auth/logout') {
      const tokenHash = getAuthenticatedSession(req, ctx);
      if (tokenHash) {
        ctx.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      }
      sendJson(
        res,
        200,
        { authenticated: false },
        {
          'Set-Cookie': `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        },
      );
      return true;
    }

    // ── Protected Admin / Studio Endpoints ─────────────────────────────────
    if (pathname === '/api/admin/notes' || pathname.startsWith('/api/admin/notes/')) {
      const session = getAuthenticatedSession(req, ctx);
      if (!session) {
        sendJson(res, 401, { error: 'Authentication required.' });
        return true;
      }

      if (method === 'GET' && pathname === '/api/admin/notes') {
        const rows = ctx.db
          .prepare('SELECT * FROM notes ORDER BY draft_updated_at DESC, created_at DESC')
          .all();
        sendJson(res, 200, { notes: rows.map(toAdminNote) });
        return true;
      }

      if (method === 'POST' && pathname === '/api/admin/notes') {
        const body = await readJsonBody(req);
        const title = String(body.title || 'Untitled Note').trim();
        const slugInput = body.slug ? normalizeSlug(body.slug) : normalizeSlug(title);
        const slug = isValidSlug(slugInput) ? slugInput : `draft-${Date.now()}`;
        const excerpt = String(body.excerpt || '').trim();
        const content = String(body.body || '');

        if (!title) {
          sendJson(res, 400, { error: 'Title is required.' });
          return true;
        }
        if (!isValidSlug(slug)) {
          sendJson(res, 400, { error: 'Invalid or reserved URL slug.' });
          return true;
        }

        const existing = ctx.db
          .prepare('SELECT id FROM notes WHERE draft_slug = ? OR published_slug = ?')
          .get(slug, slug);
        if (existing) {
          sendJson(res, 409, { error: `Slug "${slug}" is already in use.` });
          return true;
        }

        const id = crypto.randomUUID();
        const nowIso = new Date().toISOString();
        ctx.db
          .prepare(
            `INSERT INTO notes (
              id, draft_title, draft_slug, draft_excerpt, draft_body, draft_updated_at,
              published_title, published_slug, published_excerpt, published_body,
              published_at, published_updated_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)`,
          )
          .run(id, title, slug, excerpt, content, nowIso, nowIso);

        const created = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        sendJson(res, 201, { note: toAdminNote(created) });
        return true;
      }

      const rest = pathname.slice('/api/admin/notes/'.length);
      const parts = rest.split('/').filter(Boolean);
      const id = decodeURIComponent(parts[0] || '');
      const action = parts[1] || null;
      if (!id) {
        sendJson(res, 404, { error: 'Note not found.' });
        return true;
      }

      const existingRow = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      if (!existingRow) {
        sendJson(res, 404, { error: 'Note not found.' });
        return true;
      }

      // PUT /api/admin/notes/:id -> saves draft ONLY; published snapshot stays live
      if (method === 'PUT' && !action) {
        const body = await readJsonBody(req);
        const title = String(body.title ?? existingRow.draft_title).trim();
        const slug = normalizeSlug(body.slug ?? existingRow.draft_slug);
        const excerpt = String(body.excerpt ?? existingRow.draft_excerpt).trim();
        const content = String(body.body ?? existingRow.draft_body);

        if (!title) {
          sendJson(res, 400, { error: 'Title is required.' });
          return true;
        }
        if (!isValidSlug(slug)) {
          sendJson(res, 400, { error: 'Use lowercase letters, numbers, and hyphens for the URL slug.' });
          return true;
        }

        const conflict = ctx.db
          .prepare('SELECT id FROM notes WHERE id != ? AND (draft_slug = ? OR published_slug = ?)')
          .get(id, slug, slug);
        if (conflict) {
          sendJson(res, 409, { error: `Slug "${slug}" belongs to another post.` });
          return true;
        }

        const nowIso = new Date().toISOString();
        ctx.db
          .prepare(
            `UPDATE notes
             SET draft_title = ?, draft_slug = ?, draft_excerpt = ?, draft_body = ?, draft_updated_at = ?
             WHERE id = ?`,
          )
          .run(title, slug, excerpt, content, nowIso, id);

        const updated = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        sendJson(res, 200, { note: toAdminNote(updated) });
        return true;
      }

      // POST /api/admin/notes/:id/publish -> promotes draft snapshot to published
      if (method === 'POST' && action === 'publish') {
        const targetSlug = normalizeSlug(existingRow.draft_slug);
        if (!existingRow.draft_title.trim()) {
          sendJson(res, 400, { error: 'Add a title before publishing.' });
          return true;
        }
        if (!isValidSlug(targetSlug)) {
          sendJson(res, 400, { error: 'Provide a valid URL slug before publishing.' });
          return true;
        }
        if (!existingRow.draft_body.trim()) {
          sendJson(res, 400, { error: 'Write article content before publishing.' });
          return true;
        }

        const conflict = ctx.db
          .prepare('SELECT id FROM notes WHERE id != ? AND (published_slug = ? OR draft_slug = ?)')
          .get(id, targetSlug, targetSlug);
        if (conflict) {
          sendJson(res, 409, { error: `Slug "${targetSlug}" conflicts with another note.` });
          return true;
        }

        const nowIso = new Date().toISOString();
        const publishedAt = existingRow.published_at || nowIso;
        ctx.db
          .prepare(
            `UPDATE notes
             SET published_title = draft_title,
                 published_slug = draft_slug,
                 published_excerpt = draft_excerpt,
                 published_body = draft_body,
                 published_at = ?,
                 published_updated_at = ?
             WHERE id = ?`,
          )
          .run(publishedAt, nowIso, id);

        const updated = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        sendJson(res, 200, { note: toAdminNote(updated) });
        return true;
      }

      // POST /api/admin/notes/:id/unpublish -> removes published snapshot, keeps draft intact
      if (method === 'POST' && action === 'unpublish') {
        ctx.db
          .prepare(
            `UPDATE notes
             SET published_title = NULL,
                 published_slug = NULL,
                 published_excerpt = NULL,
                 published_body = NULL,
                 published_updated_at = NULL
             WHERE id = ?`,
          )
          .run(id);
        const updated = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        sendJson(res, 200, { note: toAdminNote(updated) });
        return true;
      }

      // POST /api/admin/notes/:id/discard -> reverts draft back to current published snapshot
      if (method === 'POST' && action === 'discard') {
        if (!existingRow.published_slug) {
          sendJson(res, 400, { error: 'Only published notes can discard an unpublished revision.' });
          return true;
        }
        const nowIso = new Date().toISOString();
        ctx.db
          .prepare(
            `UPDATE notes
             SET draft_title = published_title,
                 draft_slug = published_slug,
                 draft_excerpt = published_excerpt,
                 draft_body = published_body,
                 draft_updated_at = ?
             WHERE id = ?`,
          )
          .run(nowIso, id);
        const updated = ctx.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        sendJson(res, 200, { note: toAdminNote(updated) });
        return true;
      }

      // DELETE /api/admin/notes/:id
      if (method === 'DELETE' && !action) {
        ctx.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
        sendJson(res, 200, { deleted: true, id });
        return true;
      }
    }

    sendJson(res, 404, { error: 'API route not found.' });
    return true;
  } catch (err) {
    if (err?.message === 'PAYLOAD_TOO_LARGE') {
      sendJson(res, 413, { error: 'Payload too large.' });
      return true;
    }
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: 'Invalid JSON request body.' });
      return true;
    }
    console.error('[notes-api]', err);
    sendJson(res, 500, { error: 'Internal server error.' });
    return true;
  }
}
