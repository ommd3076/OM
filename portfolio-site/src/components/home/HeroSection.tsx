import { useEffect, useRef, useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ArrowDownIcon, CloseIcon } from '../ui/Icons';
import {
  DEFAULT_SPIRAL_CAMERA,
  SpiralCanvas,
  type SpiralCameraState,
} from '../ui/SpiralCanvas';
import { SplitPillButton } from '../ui/SplitPillButton';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function progressRange(start: number, end: number, val: number): number {
  if (end <= start) return val >= end ? 1 : 0;
  return clamp01((val - start) / (end - start));
}

export function HeroSection() {
  const { hero } = PORTFOLIO_DATA;
  const isReducedMotion = useReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const indexTriggerWrapRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const cameraRef = useRef<SpiralCameraState>({ ...DEFAULT_SPIRAL_CAMERA });
  const [indexOpen, setIndexOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Desktop scroll-driven concentric ring dive & circular portal into EstimateSection
  useEffect(() => {
    const trackEl = trackRef.current;
    const stageEl = stageRef.current;
    const figureEl = figureRef.current;
    const canvasWrapEl = canvasWrapRef.current;
    if (!trackEl || !stageEl) return;

    const resetDive = () => {
      stageEl.style.setProperty('--takeover', '0');
      stageEl.style.visibility = 'visible';
      stageEl.removeAttribute('data-lit');
      cameraRef.current = { ...DEFAULT_SPIRAL_CAMERA };
      const arrival = trackEl.nextElementSibling as HTMLElement | null;
      if (arrival?.hasAttribute('data-dive-arrival')) {
        arrival.style.setProperty('--dive-arrive', '1');
      }
    };

    if (isReducedMotion || !isDesktop) {
      resetDive();
      return;
    }

    let rafId = 0;

    const updateDive = () => {
      rafId = 0;
      const arrivalEl = trackEl.nextElementSibling as HTMLElement | null;
      const hasArrival = Boolean(arrivalEl?.hasAttribute('data-dive-arrival'));
      const stageH = stageEl.offsetHeight;
      const distance = hasArrival ? Math.max(0, trackEl.offsetHeight - stageH) : 0;

      if (distance <= 1 || !figureEl || !canvasWrapEl) {
        resetDive();
        return;
      }

      const cellW = Math.max(1, figureEl.offsetWidth);
      const canvasW = Math.max(1, canvasWrapEl.offsetWidth);
      const offsetRatio = 1 - cellW / canvasW;
      const zoomRatio =
        Math.max(cellW, stageEl.offsetHeight) / Math.max(canvasW, stageEl.offsetHeight);

      const rect = trackEl.getBoundingClientRect();
      const scrollRange = Math.max(1, trackEl.offsetHeight - window.innerHeight);
      const p = clamp01(-rect.top / scrollRange);

      const arrivalFrac = arrivalEl
        ? clamp01((arrivalEl.offsetTop - trackEl.offsetTop) / distance)
        : 0.625;
      const u = progressRange(0.02, 0.3, p);
      const d = Math.pow(progressRange(0.02, 0.94, p), 1.3);
      const f = Math.pow(progressRange(arrivalFrac, 0.94, p), 1.6);
      const light =
        (Math.hypot(stageEl.offsetWidth, stageEl.offsetHeight) / 2) * f;
      const hidden = f >= 1;
      const arriveScale = 0.5 + 0.5 * (1 - Math.pow(1 - f, 2));

      stageEl.style.setProperty('--takeover', u.toFixed(4));
      stageEl.style.visibility = hidden ? 'hidden' : 'visible';
      if (light > 0) {
        stageEl.setAttribute('data-lit', 'true');
      } else {
        stageEl.removeAttribute('data-lit');
      }

      if (arrivalEl && hasArrival) {
        arrivalEl.style.setProperty('--dive-arrive', arriveScale.toFixed(4));
      }

      cameraRef.current = {
        x: offsetRatio * (1 - u),
        y: 0,
        zoom: zoomRatio * Math.pow(6 / Math.max(0.05, zoomRatio), d),
        twist: -1.2 * d,
        light,
        hidden,
      };
    };

    const scheduleUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateDive);
    };

    updateDive();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(trackEl);

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      ro.disconnect();
      resetDive();
    };
  }, [isReducedMotion, isDesktop]);

  const closeDialog = () => {
    setIndexOpen(false);
    window.requestAnimationFrame(() => {
      const btn =
        indexTriggerWrapRef.current?.querySelector<HTMLElement>('button, a');
      btn?.focus();
    });
  };

  useEffect(() => {
    if (!indexOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [indexOpen]);

  const handlePrimaryClick = () => {
    const target = document.getElementById('the-repo');
    if (target) {
      target.scrollIntoView({
        behavior: isReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <div
      ref={trackRef}
      id="mainHeroSection"
      data-minimap-band=""
      className="dive-track relative bg-off-white"
    >
      <section
        ref={stageRef}
        className={`group/stage relative isolate grid min-h-svh grid-cols-1 grid-rows-[auto_80vh] gap-x-16 bg-off-white text-black data-[lit=true]:pointer-events-none data-[lit=true]:bg-transparent lg:grid-cols-12 lg:grid-rows-1 ${
          isReducedMotion ? '' : 'lg:sticky lg:top-0 lg:z-20'
        }`}
      >
        {/* Left 5-Col Editorial Copy */}
        <div
          className="relative z-10 flex flex-col justify-center px-16 pt-112 pb-32 lg:col-span-5 lg:px-0 lg:py-80 lg:pl-80"
          style={
            isReducedMotion || !isDesktop
              ? undefined
              : {
                  transform: 'translate3d(calc(var(--takeover, 0) * -96px), 0, 0)',
                  opacity: 'calc(1 - min(1, var(--takeover, 0) * 1.5))',
                }
          }
        >
          <p className="mb-20 font-mono text-caption-20 uppercase text-dark-grey">
            {hero.eyebrow}
          </p>

          <h1 className="mb-24 text-headline-20 font-medium text-black">
            {hero.headlineLines[0]}
            <br />
            {hero.headlineLines[1]}
          </h1>

          <p className="mb-32 max-w-440 text-body-20 text-dark-grey">
            {hero.summary}
          </p>

          <div className="flex flex-wrap items-center gap-12">
            <SplitPillButton
              href={hero.primaryCta.href}
              onClick={handlePrimaryClick}
              variant="primary"
              dot
              label={hero.primaryCta.label}
            />
            <div ref={indexTriggerWrapRef}>
              <SplitPillButton
                type="button"
                onClick={() => setIndexOpen(true)}
                variant="secondary"
                label={hero.secondaryCta.label}
              />
            </div>
          </div>

          <div className="mt-40 inline-flex items-center gap-10 font-mono text-caption-10 uppercase text-dark-grey lg:hidden">
            <span
              aria-hidden="true"
              className="relative inline-flex size-24 items-center justify-center rounded-full border border-black/25"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full border border-black/40 animate-hero-scroll-cue motion-reduce:hidden [[data-motion=reduce]_&]:hidden" />
              <ArrowDownIcon className="size-12" />
            </span>
            <span>{hero.scrollCue}</span>
          </div>
        </div>

        {/* Desktop Scroll Cue pinned bottom-left matching reference */}
        {isDesktop && (
          <div
            className="pointer-events-none absolute bottom-48 left-80 hidden items-center gap-10 font-mono text-caption-10 uppercase text-dark-grey group-data-[lit=true]/stage:invisible lg:inline-flex"
            style={
              isReducedMotion
                ? undefined
                : {
                    transform: 'translate3d(calc(var(--takeover, 0) * -96px), 0, 0)',
                    opacity: 'calc(1 - min(1, var(--takeover, 0) * 1.5))',
                  }
            }
          >
            <span
              aria-hidden="true"
              className="relative inline-flex size-24 items-center justify-center rounded-full border border-black/25"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full border border-black/40 animate-hero-scroll-cue motion-reduce:hidden [[data-motion=reduce]_&]:hidden" />
              <ArrowDownIcon className="size-12" />
            </span>
            <span>{hero.scrollCue}</span>
          </div>
        )}

        {/* Right 6-Col Concentric Spinning Rings Stage (expands full-bleed on desktop scroll) */}
        <figure
          ref={figureRef}
          aria-hidden="true"
          className="relative overflow-hidden bg-black group-data-[lit=true]/stage:bg-transparent lg:z-10 lg:col-span-6 lg:col-start-7 lg:overflow-visible"
          style={
            isDesktop && !isReducedMotion
              ? {
                  clipPath:
                    'inset(0 0 0 calc(var(--takeover, 0) * (-100% - 16px)))',
                }
              : undefined
          }
        >
          <div
            ref={canvasWrapRef}
            className="absolute inset-y-0 right-0 w-full bg-black group-data-[lit=true]/stage:bg-transparent lg:w-[calc(200%+16px)]"
          >
            <SpiralCanvas
              cameraRef={cameraRef}
              alpha={isDesktop && !isReducedMotion}
              entrance={!isReducedMotion}
              interactive
            />
          </div>
        </figure>
      </section>

      {/* System Index Modal Dialog */}
      {indexOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black-deep/85 p-16 lg:p-32"
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-index-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85svh] w-full max-w-720 overflow-y-auto overscroll-contain rounded-8 border border-white/15 bg-black p-24 text-white animate-fade-in lg:p-40"
          >
            <div className="flex flex-wrap items-start justify-between gap-16 border-b border-white/12 pb-20">
              <div>
                <p className="font-mono text-caption-10 uppercase text-mid-grey">
                  {hero.reelDialogEyebrow}
                </p>
                <h2
                  id="hero-index-dialog-title"
                  className="mt-8 text-headline-10 font-medium text-white"
                >
                  {hero.reelDialogTitle}
                </h2>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                aria-label="Close system index"
                className="inline-flex h-36 items-center gap-8 rounded-4 border border-white/15 px-12 font-mono text-caption-10 uppercase text-ghost-grey transition-colors duration-150 hover:bg-white hover:text-black"
              >
                <span>Close</span>
                <CloseIcon className="size-14" />
              </button>
            </div>

            <ul className="mt-20 divide-y divide-white/12">
              {hero.reelHighlights.map((item) => (
                <li
                  key={item.code}
                  className="grid grid-cols-1 gap-8 py-16 sm:grid-cols-12 sm:items-baseline"
                >
                  <span className="tabular-nums font-mono text-ui uppercase text-mid-grey sm:col-span-4">
                    {item.code}
                  </span>
                  <div className="sm:col-span-8">
                    <p className="font-mono text-caption-20 uppercase text-white">
                      {item.label}
                    </p>
                    <p className="mt-4 text-body-10 text-ghost-grey">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-24 flex flex-wrap items-center justify-between gap-16 border-t border-white/12 pt-20">
              <SplitPillButton
                to="/projects"
                variant="secondary"
                label="Open all projects"
                onClick={() => setIndexOpen(false)}
              />
              <button
                type="button"
                onClick={closeDialog}
                className="font-mono text-caption-10 uppercase text-mid-grey underline underline-offset-4 hover:text-white"
              >
                Return to home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
