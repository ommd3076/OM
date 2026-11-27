import { useEffect, useMemo, useRef, useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsciiTable } from '../ui/AsciiTable';

function OdometerDigits({
  prefix,
  value,
  max,
  reducedMotion,
}: {
  prefix: string;
  value: number;
  max: number;
  reducedMotion: boolean;
}) {
  const digits = useMemo(() => {
    const len = String(max).length;
    return Array.from({ length: len }, (_, idx) => {
      const place = 10 ** (len - idx - 1);
      const cells = Math.floor(max / place) + 1;
      const step = Math.floor(value / place);
      return { place, cells, step };
    });
  }, [max, value]);

  return (
    <div
      role="img"
      aria-label={`${prefix}${max}`}
      className="mt-20 flex items-baseline text-display-10 font-medium tabular-nums text-black"
    >
      <span>{prefix}</span>
      {digits.map((d) => (
        <span
          key={d.place}
          className="relative inline-block h-lh overflow-y-clip"
        >
          <span className="invisible">{(d.cells - 1) % 10}</span>
          <span
            className="absolute inset-x-0 top-0 flex flex-col items-center"
            style={{
              transform: `translateY(${(-d.step / d.cells) * 100}%)`,
              transition: reducedMotion
                ? 'none'
                : 'transform 520ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {Array.from({ length: d.cells }, (_, n) => (
              <span key={n} className="block h-lh">
                {n % 10}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

export function EstimateSection() {
  const { estimate } = PORTFOLIO_DATA;
  const isReducedMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);

  const totalRows = useMemo(
    () => estimate.phases.reduce((acc, p) => acc + p.rows.length, 0),
    [estimate.phases],
  );

  const [scrollProgress, setScrollProgress] = useState<number>(() =>
    isReducedMotion ? 1 : 0,
  );
  const [clickedRow, setClickedRow] = useState<number | null>(null);

  // Drive row-by-row progression, receipt unroll, and counter strictly from scroll position
  useEffect(() => {
    if (isReducedMotion) {
      setScrollProgress(1);
      return;
    }

    let rafId = 0;
    let lastY = window.scrollY;

    const updateFromScroll = () => {
      rafId = 0;
      const el = sectionRef.current;
      if (!el) return;

      // Clear manual row override whenever the user actually scrolls
      if (Math.abs(window.scrollY - lastY) > 4) {
        lastY = window.scrollY;
        setClickedRow(null);
      }

      const rect = el.getBoundingClientRect();
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        // On desktop, Hero dive opens the portal around rect.top ≈ -600px and section stays pinned until rect.top ≈ -(rect.height - innerHeight)
        const enterOffset = window.innerHeight * 0.65;
        const travel = Math.max(1, rect.height - window.innerHeight * 1.65);
        const p = Math.max(0, Math.min(1, (-rect.top - enterOffset) / travel));
        setScrollProgress(p);
      } else {
        const startTop = window.innerHeight * 0.65;
        const travel = Math.max(1, rect.height - window.innerHeight * 0.45);
        const p = Math.max(0, Math.min(1, (startTop - rect.top) / travel));
        setScrollProgress(p);
      }
    };

    const schedule = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [isReducedMotion]);

  const scrollRowIndex = Math.min(
    totalRows - 1,
    Math.max(0, Math.floor(scrollProgress * totalRows)),
  );
  const activeRowIndex = clickedRow !== null ? clickedRow : scrollRowIndex;

  // Unroll smoothly across the first ~35% of scroll through EstimateSection, then stay 100% open
  const revealProgress = isReducedMotion
    ? 1
    : Math.max(0.35, Math.min(1, scrollProgress * 2.5 + 0.32));

  // Count ~0 -> ~10 smoothly as user scrolls through rows
  const displayCount = isReducedMotion
    ? estimate.counterTarget
    : Math.min(
        estimate.counterTarget,
        Math.max(0, Math.round(Math.min(1, scrollProgress * 1.35) * estimate.counterTarget)),
      );

  return (
    <section
      ref={sectionRef}
      id="estimateSection"
      data-dive-arrival=""
      className="bg-off-white text-black"
    >
      <div
        className="px-16 py-64 lg:flex lg:min-h-svh lg:items-center lg:px-80 lg:pt-96 lg:pb-48"
        style={
          isReducedMotion
            ? undefined
            : {
                transform: 'scale(var(--dive-arrive, 1))',
                transformOrigin: 'center center',
              }
        }
      >
        <div className="grid w-full grid-cols-1 gap-x-16 gap-y-32 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <h2 className="text-headline-10 font-medium text-black">
              {estimate.heading}
            </h2>
            <p className="mt-16 max-w-440 text-body-20 text-dark-grey">
              {estimate.summary}
            </p>

            <OdometerDigits
              prefix={estimate.counterPrefix}
              value={displayCount}
              max={estimate.counterTarget}
              reducedMotion={isReducedMotion}
            />

            <div className="mt-12 flex flex-wrap items-center gap-12">
              <span className="font-mono text-caption-10 uppercase text-dark-grey">
                {estimate.counterCaption}
              </span>
              <span className="rounded-4 bg-black/10 px-8 py-4 font-mono text-ui uppercase text-black">
                {estimate.badgeLabel}
              </span>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-6 lg:col-start-7">
            <div
              className="relative w-[round(down,100%,1ch)] lg:mx-auto lg:max-w-[56ch]"
              style={{ ['--q' as string]: revealProgress.toFixed(4) }}
            >
              <div
                style={
                  isReducedMotion
                    ? undefined
                    : {
                        clipPath: 'inset(0 0 calc((1 - var(--q, 1)) * 100%) 0)',
                        transition: 'clip-path 100ms linear',
                      }
                }
              >
                <AsciiTable
                  header={estimate.receiptHeader}
                  footerLeft={estimate.receiptFooterLeft}
                  footerRight={estimate.receiptFooterRight}
                  phases={estimate.phases}
                  activeRowIndex={activeRowIndex}
                  onRowSelect={(idx) => setClickedRow(idx)}
                  surface="light"
                />
              </div>

              {!isReducedMotion && revealProgress < 0.995 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[-1ch] h-2 bg-black"
                  style={{
                    top: `calc(${(revealProgress * 100).toFixed(2)}%)`,
                    opacity: Math.min(1, revealProgress * 4),
                  }}
                >
                  <span
                    className="absolute -top-3 h-8 w-[3ch] bg-black"
                    style={{
                      left: `calc(1ch + ${(activeRowIndex % 2 === 0 ? 0.18 : 0.72) * 100}% * 0.75)`,
                      transition: 'left 180ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
