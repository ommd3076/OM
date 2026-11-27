import { useEffect, useRef, useState } from 'react';

export interface SpiralCameraState {
  x: number;
  y: number;
  zoom: number;
  twist: number;
  light: number;
  hidden: boolean;
}

export const DEFAULT_SPIRAL_CAMERA: SpiralCameraState = {
  x: 0,
  y: 0,
  zoom: 1,
  twist: 0,
  light: 0,
  hidden: false,
};

export interface SpiralCanvasProps {
  cameraRef?: React.RefObject<SpiralCameraState>;
  phrase?: string;
  alpha?: boolean;
  entrance?: boolean;
  interactive?: boolean;
  className?: string;
}

interface RingDef {
  radius: number;
  charsCount: number;
  speed: number;
  letterSizePx: number;
  bandCenter: number;
  bandHalfWidth: number;
  bandSoftness: number;
}

interface RippleWave {
  start: number;
  strength: number;
}

const DEFAULT_PHRASE = 'OM M. DODDAMANI · AI SYSTEMS · CERENETICS · ';
const HOLD_PROMPTS = {
  idle: 'Click & hold',
  holding: 'Keep holding',
  charged: 'Release',
} as const;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function wrapAngle(a: number): number {
  let r = (a + Math.PI) % (2 * Math.PI);
  if (r < 0) r += 2 * Math.PI;
  return r - Math.PI;
}

function queryReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduce'
  );
}

function buildRingDefs(seedNum = 0.42): RingDef[] {
  const rings: RingDef[] = [];
  let s = seedNum;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const S = 0.65 * Math.PI;
  for (let i = 0; i < 30; i += 1) {
    const a = i / 29;
    const radius = 0.06 + 1.39 * a;
    const speed = (i % 2 === 0 ? 1 : -1) * (0.006 + (1 - a) * (0.035 - 0.006));
    const letterSizePx = 14 + 16 * a;
    const charsCount = Math.max(
      8,
      Math.floor((2 * Math.PI * radius) / (0.6 * letterSizePx * (2 / 1080))),
    );
    const bandCenter =
      rand() < 0.15 ? rand() * Math.PI * 2 : 0.25 + (rand() - 0.5) * S;
    const bandHalfWidth =
      Math.min(0.98, rand() < 0.1 ? 0.05 + 0.15 * rand() : 0.25 + 0.35 * a + 0.3 * rand()) *
      Math.PI;
    const bandSoftness = Math.PI * (0.07 + 0.13 * rand());
    rings.push({
      radius,
      charsCount,
      speed,
      letterSizePx,
      bandCenter,
      bandHalfWidth,
      bandSoftness,
    });
  }
  return rings;
}

function buildAtlasCanvas(phrase: string): {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  dotIndex: number;
} {
  const full = phrase.endsWith('.') ? phrase : `${phrase}.`;
  const dotIndex = full.length - 1;
  const cols = 8;
  const rows = Math.ceil(full.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64 * rows;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 57.6px "Geist Mono Variable", ui-monospace, monospace';
    for (let i = 0; i < full.length; i += 1) {
      const x = ((i % cols) + 0.5) * 64;
      const y = (Math.floor(i / cols) + 0.55) * 64;
      const ch = full[i];
      if (i === dotIndex) {
        ctx.beginPath();
        ctx.arc(x, y, 5.76, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillText(ch ?? '', x, y);
      }
    }
  }
  return { canvas, cols, rows, dotIndex };
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export function SpiralCanvas({
  cameraRef,
  phrase = DEFAULT_PHRASE,
  alpha = false,
  entrance = true,
  interactive = true,
  className = '',
}: SpiralCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [holdPhase, setHoldPhase] = useState<'idle' | 'holding' | 'charged'>('idle');
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setIsCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';

    for (const child of Array.from(container.children)) {
      if (child instanceof HTMLCanvasElement) {
        container.removeChild(child);
      }
    }
    container.appendChild(canvas);

    const ringDefs = buildRingDefs();
    const fullPhrase = phrase.endsWith('.') ? phrase : `${phrase}.`;
    const letterCount = fullPhrase.length - 1;
    const dotIndex = letterCount;
    const ringsCount = ringDefs.length;

    const arrivalTimes = new Float32Array(ringsCount);
    for (let i = 0; i < ringsCount; i += 1) {
      const r = ringDefs[i]?.radius ?? 0;
      const dist = Math.max(0, r - 0.425);
      arrivalTimes[i] = 1.8 * smoothstep(0, 1, Math.min(1, dist / 1.6));
    }

    // Build instance buffers
    let totalInstances = 0;
    for (const r of ringDefs) totalInstances += r.charsCount;
    const aRadius = new Float32Array(totalInstances);
    const aTheta0 = new Float32Array(totalInstances);
    const aSpeed = new Float32Array(totalInstances);
    const aSize = new Float32Array(totalInstances);
    const aCharIdx = new Float32Array(totalInstances);
    const aRingIdx = new Float32Array(totalInstances);

    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    let writeIdx = 0;
    for (let ri = 0; ri < ringsCount; ri += 1) {
      const ring = ringDefs[ri];
      const isLetter = new Uint8Array(ring.charsCount);
      const letterIdx = new Uint16Array(ring.charsCount);
      let cursor = 0;
      while (cursor < ring.charsCount) {
        for (let ci = 0; ci < letterCount && cursor < ring.charsCount; ci += 1) {
          if (fullPhrase[ci] !== ' ') {
            isLetter[cursor] = 1;
            letterIdx[cursor] = ci;
          }
          cursor += 1;
        }
        const gap = 1 + Math.floor(3 * rand());
        cursor += gap;
      }

      const startAngle = rand() * Math.PI * 2;
      const stepAngle = (2 * Math.PI) / ring.charsCount;
      const outer = ring.bandHalfWidth + ring.bandSoftness;
      const inner = Math.max(0, ring.bandHalfWidth - ring.bandSoftness);

      for (let k = 0; k < ring.charsCount; k += 1) {
        const theta = startAngle + k * stepAngle;
        const delta = Math.abs(wrapAngle(theta - ring.bandCenter));
        const bandMask = smoothstep(outer, inner, delta);
        const showGlyph =
          isLetter[k] === 1 &&
          (bandMask > 0.7 || (bandMask >= 0.3 && rand() < bandMask));

        aRadius[writeIdx] = ring.radius;
        aTheta0[writeIdx] = theta;
        aSpeed[writeIdx] = ring.speed;
        aRingIdx[writeIdx] = ri;
        if (showGlyph) {
          aCharIdx[writeIdx] = letterIdx[k] ?? 0;
          aSize[writeIdx] = ring.letterSizePx * (0.85 + 0.15 * bandMask);
        } else {
          aCharIdx[writeIdx] = dotIndex;
          aSize[writeIdx] = 5;
        }
        writeIdx += 1;
      }
    }

    const gl = canvas.getContext('webgl2', {
      alpha,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });

    const atlas = buildAtlasCanvas(phrase);
    let glProg: WebGLProgram | null = null;
    let portalProg: WebGLProgram | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let portalVao: WebGLVertexArrayObject | null = null;
    let atlasTex: WebGLTexture | null = null;

    if (gl) {
      const vsSource = `#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;
in float aRadius;
in float aTheta0;
in float aSpeed;
in float aSize;
in float aCharIdx;
in float aRingIdx;

uniform float uTime;
uniform vec2 uFitScale;
uniform vec2 uCenter;
uniform vec2 uAtlasGrid;
uniform float uPxToDesign;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform float uMouseRadius;
uniform float uRingCharge[30];
uniform float uRingGather[30];
uniform float uRippleStarts[16];
uniform float uRingOffsets[30];
uniform float uRingArrivalTime[30];
uniform float uLight;

const float LIGHT_CRUMBLE_S = 0.4500;
const float LIGHT_FADE_S = 0.1000;
const float RIPPLE_DURATION_S = 1.8000;
const float RIPPLE_MAX_RADIUS_S = 1.6000;
const float RIPPLE_WIDTH_S = 0.8500;
const float RIPPLE_RADIAL_PUSH_S = 0.0450;
const float RIPPLE_SCALE_BOOST_S = 0.5000;
const float DOT_SIZE_PX_S = 5.0000;
const float ENTRANCE_FADE_S = 0.5000;
const float HOLD_GATHER_SCALE_S = 0.1200;
const float HOLD_SHAKE_AMPLITUDE_S = 0.0020;
const float HOLD_SHAKE_FRACTION_S = 0.1800;
const float HOLD_GLITCH_RATE_S = 9.0000;
const float HOLD_GLITCH_FRACTION_S = 0.1500;

out vec2 vUv;
out float vRingT;
out float vAlpha;

void main() {
  float rippleInfluence = 0.0;
  for (int r = 0; r < 16; r++) {
    float start = uRippleStarts[r];
    if (start < 0.0) continue;
    float elapsed = uTime - start;
    if (elapsed < 0.0 || elapsed >= RIPPLE_DURATION_S) continue;
    float t = elapsed / RIPPLE_DURATION_S;
    float waveRadius = smoothstep(0.0, 1.0, t) * RIPPLE_MAX_RADIUS_S;
    float bell = 1.0 - smoothstep(0.0, RIPPLE_WIDTH_S * 0.5, abs(aRadius - waveRadius));
    float lifeFade = smoothstep(0.0, 0.22, t) * (1.0 - smoothstep(0.78, 1.0, t));
    rippleInfluence = max(rippleInfluence, bell * lifeFade);
  }

  float holdCharge = uRingCharge[int(aRingIdx)];
  float gatherAmt = uRingGather[int(aRingIdx)];
  float effectiveRadius = aRadius * (1.0 - gatherAmt * HOLD_GATHER_SCALE_S) + rippleInfluence * RIPPLE_RADIAL_PUSH_S;

  float theta = aTheta0 + uTime * aSpeed + uRingOffsets[int(aRingIdx)];
  float c = cos(theta);
  float s = sin(theta);
  vec2 ringCenter = vec2(c, s) * effectiveRadius;

  float mouseDist = length(ringCenter - uMouse);
  float hoverInfluence = (1.0 - smoothstep(0.0, uMouseRadius, mouseDist)) * uMouseInfluence;
  float lightReach = 1.0 - smoothstep(uLight, uLight * (1.0 + LIGHT_CRUMBLE_S) + 1e-5, effectiveRadius);

  float strength = max(max(hoverInfluence * 2.5, rippleInfluence), lightReach);
  float seed = aTheta0 * 7.13 + aRadius * 13.97;
  float threshold = fract(sin(seed * 12.9898) * 43758.5453);
  float isDot = step(threshold, strength);

  float glitchTick = floor(uTime * HOLD_GLITCH_RATE_S);
  float glitchNoise = fract(sin(seed * 91.7 + glitchTick * 7.31) * 43758.5453);
  isDot = max(isDot, step(glitchNoise, holdCharge * HOLD_GLITCH_FRACTION_S));
  float charIdxNow = mix(aCharIdx, ${dotIndex}.0, isDot);

  float sizePx = mix(aSize, DOT_SIZE_PX_S, isDot) * (1.0 + rippleInfluence * RIPPLE_SCALE_BOOST_S);
  float designSize = sizePx * uPxToDesign;
  vec2 rotated = vec2(
    -position.x * s - position.y * c,
    position.x * c - position.y * s
  ) * designSize;

  float shakeSeed = fract(sin(aTheta0 * 91.17 + aRadius * 47.91) * 24634.6345);
  float shakes = step(shakeSeed, HOLD_SHAKE_FRACTION_S);
  vec2 tremor = vec2(
    sin(uTime * (38.0 + shakeSeed * 14.0) + shakeSeed * 271.0),
    cos(uTime * (34.0 + shakeSeed * 17.0) + shakeSeed * 113.0)
  ) * (holdCharge * shakes * HOLD_SHAKE_AMPLITUDE_S);

  vec2 worldPos = (ringCenter + rotated + tremor) * uFitScale + uCenter;

  float col = mod(charIdxNow, uAtlasGrid.x);
  float row = floor(charIdxNow / uAtlasGrid.x);
  vUv = vec2((col + uv.x) / uAtlasGrid.x, (row + (1.0 - uv.y)) / uAtlasGrid.y);
  vRingT = clamp(aRadius, 0.0, 1.2);

  float arrival = uRingArrivalTime[int(aRingIdx)];
  vAlpha = clamp((uTime - arrival) / ENTRANCE_FADE_S, 0.0, 1.0);
  vAlpha *= smoothstep(uLight, uLight * (1.0 + LIGHT_FADE_S) + 1e-5, effectiveRadius);

  gl_Position = vec4(worldPos, 0.0, 1.0);
}`;

      const fsSource = `#version 300 es
precision mediump float;
uniform sampler2D tAtlas;
in vec2 vUv;
in float vRingT;
in float vAlpha;
out vec4 fragColor;
void main() {
  vec4 sampled = texture(tAtlas, vUv);
  float dim = mix(0.85, 1.0, smoothstep(0.0, 0.85, vRingT));
  fragColor = vec4(vec3(dim), sampled.a * vAlpha);
}`;

      const portalVs = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
uniform vec2 uCenter;
uniform vec2 uHalfSize;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(uCenter + position * 2.0 * uHalfSize, 0.0, 1.0);
}`;

      const portalFs = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float edge = fwidth(d);
  fragColor = vec4(0.0, 0.0, 0.0, 1.0 - smoothstep(1.0 - edge, 1.0, d));
}`;

      glProg = createProgram(gl, vsSource, fsSource);
      portalProg = createProgram(gl, portalVs, portalFs);

      if (glProg && portalProg) {
        const quadPos = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
        const quadUv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);

        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const bindAttr = (
          loc: number,
          data: Float32Array,
          size: number,
          instanced: boolean,
        ) => {
          if (loc < 0) return;
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
          if (instanced) gl.vertexAttribDivisor(loc, 1);
        };

        bindAttr(gl.getAttribLocation(glProg, 'position'), quadPos, 2, false);
        bindAttr(gl.getAttribLocation(glProg, 'uv'), quadUv, 2, false);
        bindAttr(gl.getAttribLocation(glProg, 'aRadius'), aRadius, 1, true);
        bindAttr(gl.getAttribLocation(glProg, 'aTheta0'), aTheta0, 1, true);
        bindAttr(gl.getAttribLocation(glProg, 'aSpeed'), aSpeed, 1, true);
        bindAttr(gl.getAttribLocation(glProg, 'aSize'), aSize, 1, true);
        bindAttr(gl.getAttribLocation(glProg, 'aCharIdx'), aCharIdx, 1, true);
        bindAttr(gl.getAttribLocation(glProg, 'aRingIdx'), aRingIdx, 1, true);

        portalVao = gl.createVertexArray();
        gl.bindVertexArray(portalVao);
        bindAttr(gl.getAttribLocation(portalProg, 'position'), quadPos, 2, false);
        bindAttr(gl.getAttribLocation(portalProg, 'uv'), quadUv, 2, false);
        gl.bindVertexArray(null);

        atlasTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          atlas.canvas,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    }

    const ctx2d = !glProg ? canvas.getContext('2d') : null;

    let width = 1;
    let height = 1;
    let fitX = 1;
    let fitY = 1;
    let rafId = 0;
    let isIntersecting = true;
    let isVisibleTab = !document.hidden;
    let reducedMotion = queryReducedMotion();
    let lastNow = performance.now();
    let elapsed = reducedMotion || !entrance ? 2.3 : 0;

    const ripples: RippleWave[] = [];
    if (!reducedMotion && entrance) {
      ripples.push({ start: 0, strength: 1 });
    }

    const ringTargetOffset = new Float32Array(ringsCount);
    const ringOffset = new Float32Array(ringsCount);
    const ringCharge = new Float32Array(ringsCount);
    const ringGather = new Float32Array(ringsCount);
    const ringChargeCurrent = new Float32Array(ringsCount);
    const ringGatherCurrent = new Float32Array(ringsCount);
    const ringHoldLag = new Float32Array(ringsCount);

    let mouseInfluence = 0;
    let targetMouseInfluence = 0;
    const mousePos = new Float32Array([999, 999]);
    const targetMousePos = new Float32Array([999, 999]);
    let isHolding = false;
    let isCharged = false;
    let holdCharge = 0;
    let holdGather = 0;
    let scrollBoost = 0;
    let lastScrollY = window.scrollY;
    let releaseStartTime = -1;
    let portalClearActive = false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      const aspect = width / height;
      if (aspect >= 1) {
        fitX = 1;
        fitY = aspect;
      } else {
        fitX = 1 / aspect;
        fitY = 1;
      }
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const renderScene = () => {
      const cam = cameraRef?.current ?? DEFAULT_SPIRAL_CAMERA;
      if (cam.hidden) return;

      if (gl && glProg && vao && portalProg && portalVao && atlasTex) {
        gl.clearColor(35 / 255, 35 / 255, 35 / 255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
          gl.SRC_ALPHA,
          gl.ONE_MINUS_SRC_ALPHA,
          gl.ONE,
          gl.ONE_MINUS_SRC_ALPHA,
        );

        gl.useProgram(glProg);
        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);

        const lightNormalized = cam.light / (0.5 * width * fitX * cam.zoom);

        gl.uniform1f(gl.getUniformLocation(glProg, 'uTime'), elapsed);
        gl.uniform2f(gl.getUniformLocation(glProg, 'uFitScale'), fitX * cam.zoom, fitY * cam.zoom);
        gl.uniform2f(gl.getUniformLocation(glProg, 'uCenter'), cam.x, cam.y);
        gl.uniform2f(gl.getUniformLocation(glProg, 'uAtlasGrid'), atlas.cols, atlas.rows);
        gl.uniform1f(gl.getUniformLocation(glProg, 'uPxToDesign'), 2 / 1080);
        gl.uniform2f(gl.getUniformLocation(glProg, 'uMouse'), mousePos[0], mousePos[1]);
        gl.uniform1f(gl.getUniformLocation(glProg, 'uMouseInfluence'), mouseInfluence);
        gl.uniform1f(gl.getUniformLocation(glProg, 'uMouseRadius'), 0.35);
        gl.uniform1fv(gl.getUniformLocation(glProg, 'uRingCharge'), ringCharge);
        gl.uniform1fv(gl.getUniformLocation(glProg, 'uRingGather'), ringGather);

        const rippleStarts = new Float32Array(16).fill(-1);
        for (let i = 0; i < Math.min(16, ripples.length); i += 1) {
          rippleStarts[i] = ripples[i]?.start ?? -1;
        }
        gl.uniform1fv(gl.getUniformLocation(glProg, 'uRippleStarts'), rippleStarts);

        const finalOffsets = new Float32Array(ringsCount);
        for (let i = 0; i < ringsCount; i += 1) {
          finalOffsets[i] = ringOffset[i] + ringHoldLag[i] + cam.twist;
        }
        gl.uniform1fv(gl.getUniformLocation(glProg, 'uRingOffsets'), finalOffsets);
        gl.uniform1fv(gl.getUniformLocation(glProg, 'uRingArrivalTime'), arrivalTimes);
        gl.uniform1f(gl.getUniformLocation(glProg, 'uLight'), lightNormalized);
        gl.uniform1i(gl.getUniformLocation(glProg, 'tAtlas'), 0);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, totalInstances);

        const hasPortal = alpha && cam.light > 0;
        if (hasPortal !== portalClearActive) {
          portalClearActive = hasPortal;
          container.style.backgroundColor = hasPortal ? 'transparent' : '#232323';
        }
        if (hasPortal) {
          gl.useProgram(portalProg);
          gl.bindVertexArray(portalVao);
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform2f(gl.getUniformLocation(portalProg, 'uCenter'), cam.x, cam.y);
          gl.uniform2f(
            gl.getUniformLocation(portalProg, 'uHalfSize'),
            cam.light / (0.5 * width),
            cam.light / (0.5 * height),
          );
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.bindVertexArray(null);
        return;
      }

      // Deterministic 2D Fallback
      if (ctx2d) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d.clearRect(0, 0, width, height);
        if (!(alpha && cam.light > 0)) {
          ctx2d.fillStyle = '#232323';
          ctx2d.fillRect(0, 0, width, height);
        } else {
          ctx2d.fillStyle = '#232323';
          ctx2d.fillRect(0, 0, width, height);
        }
        const cx = width * (0.5 + cam.x * 0.5);
        const cy = height * (0.5 - cam.y * 0.5);
        const scale = Math.min(width, height) * 0.5 * cam.zoom;
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        for (let i = 0; i < totalInstances; i += 2) {
          const r = aRadius[i] * scale;
          if (alpha && cam.light > 0 && r < cam.light) continue;
          const ri = Math.floor(aRingIdx[i]);
          const theta = aTheta0[i] + elapsed * aSpeed[i] + cam.twist + ringOffset[ri];
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          if (px < -20 || px > width + 20 || py < -20 || py > height + 20) continue;
          const ci = Math.floor(aCharIdx[i]);
          ctx2d.fillStyle = ci === dotIndex ? 'rgba(241,238,231,0.55)' : '#f1eee7';
          if (ci === dotIndex) {
            ctx2d.beginPath();
            ctx2d.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx2d.fill();
          } else {
            ctx2d.font = `${Math.max(8, aSize[i] * (scale / 540))}px "Geist Mono Variable", monospace`;
            ctx2d.save();
            ctx2d.translate(px, py);
            ctx2d.rotate(theta + Math.PI / 2);
            ctx2d.fillText(fullPhrase[ci] ?? '', 0, 0);
            ctx2d.restore();
          }
        }
        if (alpha && cam.light > 0) {
          ctx2d.save();
          ctx2d.globalCompositeOperation = 'destination-out';
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, cam.light, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.restore();
        }
      }
    };

    const shouldAnimate = () =>
      isIntersecting && isVisibleTab && !reducedMotion && !(cameraRef?.current?.hidden ?? false);

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) * 0.001));
      lastNow = now;
      if (!reducedMotion) elapsed += dt;

      while (ripples.length > 0 && elapsed - ripples[0].start >= 1.8) {
        ripples.shift();
      }

      mouseInfluence += (targetMouseInfluence - mouseInfluence) * (1 - Math.exp(-6 * dt));
      const mEase = 1 - Math.exp(-14 * dt);
      mousePos[0] += (targetMousePos[0] - mousePos[0]) * mEase;
      mousePos[1] += (targetMousePos[1] - mousePos[1]) * mEase;

      if (isHolding) {
        holdCharge = Math.min(1, holdCharge + dt / 0.9);
        holdGather = 1 - (1 - holdGather) * Math.exp(-dt / 4);
        if (!isCharged && holdCharge >= 1) {
          isCharged = true;
          setHoldPhase('charged');
        }
      } else {
        holdCharge *= Math.exp(-10 * dt);
        holdGather *= Math.exp(-10 * dt);
      }

      const decay = Math.exp(-10 * dt);
      const releaseAge = elapsed - releaseStartTime;
      const releasing = releaseStartTime >= 0 && releaseAge < 1.8;
      const releaseFront = releasing
        ? 1.6 * smoothstep(0, 1, releaseAge / 1.8) + 0.425
        : Infinity;

      const curScrollY = window.scrollY;
      const scrollDelta = Math.abs(curScrollY - lastScrollY);
      lastScrollY = curScrollY;
      const scrollVel = dt > 0 ? Math.min(40, (scrollDelta / Math.max(dt, 0.008)) * 0.005) : 0;
      scrollBoost += (scrollVel - scrollBoost) * (1 - Math.exp(-4 * dt));

      const offsetEase = 1 - Math.exp(-3 * dt);
      for (let i = 0; i < ringsCount; i += 1) {
        const ring = ringDefs[i];
        let rc = ringChargeCurrent[i];
        let rg = ringGatherCurrent[i];
        if (isHolding) {
          const hEase = 1 - Math.exp(-14 * dt);
          rc += (holdCharge - rc) * hEase;
          rg += (smoothstep(0, 1, holdCharge) * holdGather - rg) * hEase;
        } else if (!releasing || releaseFront >= ring.radius) {
          rc *= decay;
          rg *= decay;
        }
        ringChargeCurrent[i] = rc;
        ringGatherCurrent[i] = rg;
        ringGather[i] = rg;
        const chargeSmoothed = smoothstep(0, 1, rc);
        ringCharge[i] = chargeSmoothed;
        ringHoldLag[i] -= chargeSmoothed * ring.speed * dt;

        let wavePush = 0;
        for (const rip of ripples) {
          const age = elapsed - rip.start;
          if (age < 0 || age >= 1.8) continue;
          const t = age / 1.8;
          const wr = 1.6 * smoothstep(0, 1, t);
          const bell = 1 - smoothstep(0, 0.425, Math.abs(ring.radius - wr));
          const env = smoothstep(0, 0.22, t) * (1 - smoothstep(0.78, 1, t));
          const val = bell * env * rip.strength;
          if (val > wavePush) wavePush = val;
        }
        const dir = Math.sign(ring.speed) || 1;
        ringTargetOffset[i] += (0.55 * wavePush * dir + ring.speed * scrollBoost) * dt;
        ringOffset[i] += (ringTargetOffset[i] - ringOffset[i]) * offsetEase;
      }

      renderScene();
      if (shouldAnimate()) {
        rafId = window.requestAnimationFrame(step);
      } else {
        rafId = 0;
      }
    };

    const kickLoop = () => {
      if (shouldAnimate()) {
        if (rafId === 0) {
          lastNow = performance.now();
          rafId = window.requestAnimationFrame(step);
        }
      } else {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        if (!(cameraRef?.current?.hidden ?? false)) renderScene();
      }
    };

    resize();
    renderScene();
    kickLoop();

    let fontsCancelled = false;
    document.fonts?.ready.then(() => {
      if (fontsCancelled) return;
      if (gl && atlasTex) {
        const refreshed = buildAtlasCanvas(phrase);
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, refreshed.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      renderScene();
    });

    const resizeObserver = new ResizeObserver(() => {
      resize();
      renderScene();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? true;
        kickLoop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    const onVisibility = () => {
      isVisibleTab = !document.hidden;
      kickLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => {
      reducedMotion = queryReducedMotion();
      kickLoop();
    };
    motionMq.addEventListener('change', onMotionChange);

    const attrObserver = new MutationObserver(onMotionChange);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    const toDesignCoords = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      const cam = cameraRef?.current ?? DEFAULT_SPIRAL_CAMERA;
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${clientX - rect.left + 14}px, ${clientY - rect.top + 14}px, 0)`;
      }
      return [(nx - cam.x) / (fitX * cam.zoom), (ny - cam.y) / (fitY * cam.zoom)] as const;
    };

    const onPointerEnter = (e: PointerEvent) => {
      if (!interactive || reducedMotion) return;
      const [dx, dy] = toDesignCoords(e.clientX, e.clientY);
      targetMousePos[0] = dx;
      targetMousePos[1] = dy;
      mousePos[0] = dx;
      mousePos[1] = dy;
      targetMouseInfluence = 1;
      setIsHovering(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || reducedMotion) return;
      const [dx, dy] = toDesignCoords(e.clientX, e.clientY);
      targetMousePos[0] = dx;
      targetMousePos[1] = dy;
    };

    const onPointerLeave = () => {
      targetMouseInfluence = 0;
      isHolding = false;
      isCharged = false;
      setIsHovering(false);
      setHoldPhase('idle');
    };

    const onPointerDown = () => {
      if (!interactive || reducedMotion) return;
      isHolding = true;
      isCharged = false;
      setHoldPhase('holding');
    };

    const onPointerUp = () => {
      if (!isHolding) return;
      isHolding = false;
      if (isCharged) {
        releaseStartTime = elapsed;
        ripples.push({ start: elapsed, strength: 0.7 + 0.6 * holdGather });
        while (ripples.length > 16) ripples.shift();
      }
      isCharged = false;
      setHoldPhase('idle');
    };

    if (interactive) {
      container.addEventListener('pointerenter', onPointerEnter);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerleave', onPointerLeave);
      container.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
    }

    return () => {
      fontsCancelled = true;
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionMq.removeEventListener('change', onMotionChange);
      attrObserver.disconnect();
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      try {
        container.removeChild(canvas);
      } catch {
        // Ignore if already removed
      }
    };
  }, [cameraRef, phrase, alpha, entrance, interactive]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`relative size-full select-none overflow-hidden bg-black ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {interactive && !isCoarse && (
        <div
          ref={labelRef}
          className={`pointer-events-none absolute top-0 left-0 z-10 rounded-4 border border-white/15 bg-black-deep/90 px-8 py-4 font-mono text-ui uppercase text-white transition-opacity duration-150 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {holdPhase === 'idle' && isCoarse ? 'Tap & hold' : HOLD_PROMPTS[holdPhase]}
        </div>
      )}
    </div>
  );
}
