import { useEffect, useRef } from 'react';

export interface AsciiCanvasProps {
  mode: 'vortex' | 'seam' | 'backdrop';
  direction?: 'light-to-dark' | 'dark-to-light';
  seed?: string;
  progress?: number;
  interactive?: boolean;
  className?: string;
}

const ASCII_RAMP = ' .:-=+*#%@';
const SEAM_PHRASE =
  'OM M. DODDAMANI · CERENETICS · VVCE · CONSTELLATION LAB · COSTELLAR · RULECANVAS · MERIDIAN FOLIO · PRISM · IEEE AIEI · ';
const WAVE_OCTAVES = [
  [0.045, 0.07],
  [0.12, 0.04],
  [0.33, 0.02],
] as const;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10000;
}

function hashCell(col: number, row: number, salt: number): number {
  let h = Math.imul(col, 0x466f45d) ^ Math.imul(row, 0x127409f) ^ Math.imul(salt, 0x4f9ffb7);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise2D(x: number, y: number, salt: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hashCell(ix, iy, salt);
  const b = hashCell(ix, iy + 1, salt);
  const c = a + (hashCell(ix + 1, iy, salt) - a) * fx;
  const d = b + (hashCell(ix + 1, iy + 1, salt) - b) * fx;
  return c + (d - c) * fy;
}

function expThreshold(val: number, cutoff: number, scale: number): number {
  return val < cutoff ? -scale * Math.log(Math.max(1e-5, val / cutoff)) : -1;
}

function queryReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attrReduce = document.documentElement.getAttribute('data-motion') === 'reduce';
  return mediaReduce || attrReduce;
}

export function AsciiCanvas({
  mode,
  direction = 'light-to-dark',
  seed = 'content-architecture',
  progress = 0,
  interactive = true,
  className = '',
}: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const seedOffset = hashSeed(seed) * 0.001;
    let frameId = 0;
    let twinkleTimer = 0;
    let isVisible = true;
    let reducedMotion = queryReducedMotion();
    let logicalWidth = 0;
    let logicalHeight = 0;

    // Precomputed GlyphSeam grid state
    let seamState: {
      cols: number;
      rows: number;
      cellW: number;
      cellH: number;
      middle: number;
      step: number;
      flipWithin: Float32Array;
      dustWithin: Float32Array;
      levelWithin: Float32Array;
      solid: Uint8Array;
      charIdx: Uint8Array;
      phase: Uint8Array;
      drawn: Uint8Array;
    } | null = null;

    const buildSeamState = () => {
      if (logicalWidth <= 0 || logicalHeight <= 0) return;
      const cellH = 14;
      const cols = Math.max(8, Math.round(logicalWidth / (14 * 0.55)));
      const cellW = logicalWidth / cols;
      const rows = Math.max(4, Math.ceil(logicalHeight / cellH));
      const total = cols * rows;

      const flipWithin = new Float32Array(total);
      const dustWithin = new Float32Array(total);
      const solid = new Uint8Array(total);
      const charIdx = new Uint8Array(total);
      const phase = new Uint8Array(total);
      const drawn = new Uint8Array(total);
      const levelWithin = Float32Array.from({ length: 4 }, (_, t) => {
        return -0.1 * rows * Math.log(Math.pow((t + 0.5) / 4, 1.4285714285714286));
      });

      seamState = {
        cols,
        rows,
        cellW,
        cellH,
        middle: rows / 2,
        step: 0,
        flipWithin,
        dustWithin,
        levelWithin,
        solid,
        charIdx,
        phase,
        drawn,
      };

      for (let r = 0; r < rows; r += 1) {
        const edgeDist = Math.min(r, rows - 1 - r);
        const env = Math.max(0, Math.min(1, edgeDist / Math.max(1, 0.14 * rows)));
        for (let c = 0; c < cols; c += 1) {
          computeSeamCell(seamState, c, r, env);
        }
      }
    };

    const computeSeamCell = (
      st: NonNullable<typeof seamState>,
      col: number,
      row: number,
      envOverride?: number,
    ) => {
      const idx = row * st.cols + col;
      const ph = st.phase[idx] ?? 0;
      const env =
        envOverride ??
        Math.max(0, Math.min(1, Math.min(row, st.rows - 1 - row) / Math.max(1, 0.14 * st.rows)));
      const nFlip = 0.86 * valueNoise2D(0.09 * col, 0.8 * row, 3) + 0.14 * hashCell(col, row, 4 + ph);
      const nDust = 0.8 * valueNoise2D(0.2 * col, row, 6) + 0.2 * hashCell(col, row, 7 + ph);
      const ch = (col + Math.floor(hashCell(row, 0, 5) * SEAM_PHRASE.length) + 7 * ph) % SEAM_PHRASE.length;
      const isSpace = SEAM_PHRASE[ch] === ' ';

      st.flipWithin[idx] = expThreshold(1 - nFlip, 0.4 * env, 0.085 * st.rows);
      st.dustWithin[idx] = isSpace ? -1 : expThreshold(nDust, 0.62 * env, 0.1 * st.rows);
      st.solid[idx] = !isSpace && hashCell(col, row, 8) < 0.82 ? 1 : 0;
      st.charIdx[idx] = ch;
    };

    const horizonRow = (st: NonNullable<typeof seamState>, col: number) => {
      let y = st.middle + st.step / 2;
      for (let oi = 0; oi < WAVE_OCTAVES.length; oi += 1) {
        const [freq, amp] = WAVE_OCTAVES[oi];
        const x = col * freq + 0.045 * st.step * oi;
        const ix = Math.floor(x);
        const n0 = hashCell(ix, 0, 10 + oi);
        const n1 = hashCell(ix + 1, 0, 10 + oi);
        const v = n0 + (n1 - n0) * smooth(x - ix);
        y += (v - 0.5) * 2 * amp * st.rows;
      }
      return Math.min(Math.max(y, 0.14 * st.rows), 0.86 * st.rows);
    };

    const evalSeamCell = (
      st: NonNullable<typeof seamState>,
      fromDark: boolean,
      col: number,
      row: number,
      horizon: number,
    ): number => {
      const idx = row * st.cols + col;
      const dist = Math.abs(row + 0.5 - horizon);
      const flipped = dist < (st.flipWithin[idx] ?? -1);
      const baseDark = row + 0.5 < horizon ? fromDark : !fromDark;
      const isDark = flipped ? !baseDark : baseDark;

      let kind = 0;
      let level = 0;
      if (flipped) {
        kind = st.solid[idx] ? 1 : 0;
      } else if (dist < (st.dustWithin[idx] ?? -1)) {
        kind = 2;
        while (level < 4 && dist < (st.levelWithin[level] ?? -1)) {
          level += 1;
        }
      }
      return isDark ? (kind === 0 ? 0 : 2 | (kind << 2) | (level << 4) | 128) : 1 | (kind << 2) | (level << 4);
    };

    const drawSeamCell = (
      st: NonNullable<typeof seamState>,
      col: number,
      row: number,
      code: number,
    ) => {
      const x = col * st.cellW;
      const y = row * st.cellH;
      const bgType = code & 3;
      const glyphType = (code >> 2) & 3;

      ctx.globalAlpha = 1;
      if (bgType === 0) {
        ctx.fillStyle = '#232323';
        ctx.fillRect(x, y, st.cellW + 0.5, st.cellH + 0.5);
      } else if (bgType === 1) {
        ctx.fillStyle = '#f1eee7';
        ctx.fillRect(x, y, st.cellW + 0.5, st.cellH + 0.5);
      } else {
        ctx.fillStyle = '#232323';
        ctx.fillRect(x, y, st.cellW + 0.5, st.cellH + 0.5);
      }

      if (glyphType !== 0) {
        if (glyphType === 2) {
          ctx.globalAlpha = 0.28 + (((code >> 4) & 7) / 4) * 0.72;
        } else if (glyphType === 3) {
          ctx.globalAlpha = 0.045;
        }
        ctx.fillStyle = code & 128 ? '#f1eee7' : '#232323';
        const ch = SEAM_PHRASE[st.charIdx[row * st.cols + col] ?? 0] ?? '';
        if (ch && ch !== ' ') {
          ctx.fillText(ch, x + st.cellW / 2, y + 0.58 * st.cellH);
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawSeamFull = (scrollNorm: number) => {
      if (!seamState) return;
      const fromDark = direction === 'dark-to-light';
      seamState.step = reducedMotion ? 0 : Math.round((0.5 - scrollNorm) * 0.26 * seamState.rows * 2);
      ctx.font = '500 10.36px "Geist Mono Variable", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let col = 0; col < seamState.cols; col += 1) {
        const h = horizonRow(seamState, col);
        for (let row = 0; row < seamState.rows; row += 1) {
          const code = evalSeamCell(seamState, fromDark, col, row, h);
          seamState.drawn[row * seamState.cols + col] = code;
          drawSeamCell(seamState, col, row, code);
        }
      }
    };

    const getSeamScrollNorm = (): number => {
      const rect = canvas.getBoundingClientRect();
      const total = window.innerHeight + rect.height;
      if (total <= 0) return 0.5;
      return Math.max(0, Math.min(1, (window.innerHeight - rect.top) / total));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      logicalWidth = Math.max(1, Math.floor(rect.width));
      logicalHeight = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mode === 'seam') buildSeamState();
    };

    const drawFrame = (timeMs: number) => {
      if (logicalWidth <= 0 || logicalHeight <= 0) return;
      const t = reducedMotion ? 0 : timeMs * 0.001;

      if (mode === 'seam') {
        drawSeamFull(getSeamScrollNorm());
        return;
      }

      if (mode === 'vortex') {
        ctx.fillStyle = '#232323';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        const cellW = logicalWidth < 640 ? 11 : 13;
        const cellH = logicalWidth < 640 ? 16 : 18;
        const cols = Math.ceil(logicalWidth / cellW);
        const rows = Math.ceil(logicalHeight / cellH);
        const px = interactive && !reducedMotion ? (pointerRef.current.x - 0.5) * 0.25 : 0;
        const py = interactive && !reducedMotion ? (pointerRef.current.y - 0.5) * 0.25 : 0;
        const cx = logicalWidth * (0.5 + px);
        const cy = logicalHeight * (0.5 + py);
        const maxR = Math.min(logicalWidth, logicalHeight) * (0.46 + progress * 0.28);

        ctx.font = `${cellW}px "Geist Mono Variable", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let row = 0; row < rows; row += 1) {
          const y = (row + 0.5) * cellH;
          for (let col = 0; col < cols; col += 1) {
            const x = (col + 0.5) * cellW;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.hypot(dx, dy);
            const normDist = dist / Math.max(1, maxR);
            const angle = Math.atan2(dy, dx);
            const ringWave = Math.sin(normDist * 10 - t * 1.15 + seedOffset);
            const spiral = Math.cos(angle * 4 + normDist * 7 - t * 0.85);
            const falloff = Math.max(0, 1 - Math.abs(normDist - 0.52) * 1.45);
            const clamped = Math.max(
              0,
              Math.min(0.999, (0.5 + 0.35 * ringWave + 0.25 * spiral) * (0.28 + 0.72 * falloff)),
            );
            if (clamped < 0.14) continue;
            const glyph = ASCII_RAMP[Math.floor(clamped * ASCII_RAMP.length)] ?? '.';
            ctx.fillStyle = clamped > 0.72 ? '#f1eee7' : clamped > 0.44 ? '#dedede' : '#5b5a56';
            ctx.fillText(glyph, x, y);
          }
        }
        return;
      }

      // mode === 'backdrop' (ambient low-contrast typographic matrix)
      ctx.fillStyle = '#232323';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      const cellW = 14;
      const cellH = 18;
      const cols = Math.ceil(logicalWidth / cellW);
      const rows = Math.ceil(logicalHeight / cellH);
      ctx.font = '11px "Geist Mono Variable", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let row = 0; row < rows; row += 1) {
        const y = (row + 0.5) * cellH;
        for (let col = 0; col < cols; col += 1) {
          const x = (col + 0.5) * cellW;
          const v =
            0.5 +
            0.5 *
              Math.sin(col * 0.31 + row * 0.23 + seedOffset * 4 + t * 0.35) *
              Math.cos(col * 0.17 - row * 0.29 + seedOffset * 2);
          if (v < 0.38) continue;
          const idx = Math.min(ASCII_RAMP.length - 1, Math.floor(v * ASCII_RAMP.length));
          const glyph = ASCII_RAMP[idx] ?? '.';
          ctx.fillStyle = v > 0.82 ? 'rgba(222,222,222,0.16)' : 'rgba(91,90,86,0.28)';
          ctx.fillText(glyph, x, y);
        }
      }
    };

    const tick = (timeMs: number) => {
      drawFrame(timeMs);
      if (!reducedMotion && isVisible && mode !== 'seam') {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const onSeamScroll = () => {
      if (mode !== 'seam' || !seamState || !isVisible || reducedMotion) return;
      const nextStep = Math.round((0.5 - getSeamScrollNorm()) * 0.26 * seamState.rows * 2);
      if (nextStep !== seamState.step) {
        drawSeamFull(getSeamScrollNorm());
      }
    };

    const startOrRenderStatic = () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(twinkleTimer);
      reducedMotion = queryReducedMotion();
      if (mode === 'seam') {
        drawFrame(0);
        if (!reducedMotion && isVisible) {
          twinkleTimer = window.setInterval(() => {
            if (!seamState || !isVisible) return;
            const norm = getSeamScrollNorm();
            if (norm <= 0 || norm >= 1) return;
            const fromDark = direction === 'dark-to-light';
            ctx.font = '500 10.36px "Geist Mono Variable", ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let k = 0; k < 12; k += 1) {
              const col = Math.floor(Math.random() * seamState.cols);
              const h = horizonRow(seamState, col);
              const row = Math.round(h + (Math.random() - 0.5) * seamState.rows * 0.4);
              if (row < 0 || row >= seamState.rows) continue;
              const idx = row * seamState.cols + col;
              seamState.phase[idx] = ((seamState.phase[idx] ?? 0) + 1) % 251;
              computeSeamCell(seamState, col, row);
              const code = evalSeamCell(seamState, fromDark, col, row, h);
              seamState.drawn[idx] = code;
              drawSeamCell(seamState, col, row, code);
            }
          }, 120);
        }
        return;
      }

      if (reducedMotion || !isVisible) {
        drawFrame(0);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    resize();
    startOrRenderStatic();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      drawFrame(0);
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        startOrRenderStatic();
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(canvas);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => startOrRenderStatic();
    mediaQuery.addEventListener('change', onMotionChange);

    const attrObserver = new MutationObserver(() => startOrRenderStatic());
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    if (mode === 'seam') {
      window.addEventListener('scroll', onSeamScroll, { passive: true });
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || reducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerRef.current = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
    };

    if (interactive && mode === 'vortex') {
      canvas.addEventListener('pointermove', onPointerMove);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(twinkleTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mediaQuery.removeEventListener('change', onMotionChange);
      attrObserver.disconnect();
      window.removeEventListener('scroll', onSeamScroll);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, [mode, direction, seed, progress, interactive]);

  const defaultHeight = mode === 'seam' ? 'h-[calc(var(--seam)+2px)]' : 'h-full';

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      {...(mode === 'seam' ? { 'data-seam': '' } : {})}
      className={`block w-full ${defaultHeight} ${className}`}
    />
  );
}
