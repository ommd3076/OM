import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface RailTocItem {
  id: string;
  label: string;
  depth?: number;
}

export interface RailTocProps {
  items: RailTocItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
  offset?: number;
  indent?: number;
  title?: string;
  className?: string;
  onActiveChange?: (activeId: string | null, reachedIds: Set<string>) => void;
}

interface Point {
  x: number;
  y: number;
}

const RAIL_BASE_X = 12;

function buildRailPath(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(prev.x - curr.x) < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
    } else {
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
  }
  return d;
}

export function RailToc({
  items,
  containerRef,
  offset = 180,
  indent = 14,
  title = 'On this page',
  className = '',
  onActiveChange,
}: RailTocProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pathRef = useRef<SVGPathElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const [points, setPoints] = useState<Point[]>([]);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 48,
    height: 240,
  });
  const [totalLength, setTotalLength] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0); // 0 .. items.length - 1
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [scrollDir, setScrollDir] = useState<'down' | 'up'>('down');
  const [planePose, setPlanePose] = useState<{
    x: number;
    y: number;
    angleDeg: number;
  }>({ x: RAIL_BASE_X, y: 12, angleDeg: 180 });

  const railPath = useMemo(() => buildRailPath(points), [points]);

  // Measure vertical centers of each TOC button inside the list
  const measurePoints = useCallback(() => {
    const listEl = listRef.current;
    if (!listEl || items.length === 0) return;

    const listRect = listEl.getBoundingClientRect();
    let maxX = RAIL_BASE_X + 16;
    const nextPoints: Point[] = items.map((item, idx) => {
      const btn = itemRefs.current[idx];
      const depth = item.depth ?? 0;
      const x = RAIL_BASE_X + depth * indent;
      if (x + 16 > maxX) maxX = x + 16;
      if (!btn) {
        return { x, y: idx * 30 + 14 };
      }
      const r = btn.getBoundingClientRect();
      return {
        x,
        y: r.top - listRect.top + r.height / 2,
      };
    });

    setPoints(nextPoints);
    setSvgSize({
      width: Math.max(44, maxX),
      height: Math.max(40, listRect.height),
    });
  }, [items, indent]);

  useEffect(() => {
    measurePoints();
    const listEl = listRef.current;
    if (!listEl) return;

    const ro = new ResizeObserver(() => measurePoints());
    ro.observe(listEl);
    window.addEventListener('resize', measurePoints, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measurePoints);
    };
  }, [measurePoints]);

  useEffect(() => {
    if (!pathRef.current || !railPath) {
      setTotalLength(0);
      return;
    }
    const len = pathRef.current.getTotalLength();
    setTotalLength(len);
  }, [railPath]);

  // Track target section headings on scroll (both down and up)
  useEffect(() => {
    if (items.length === 0) return;
    let rafId = 0;

    const updateFromScroll = () => {
      const scroller = containerRef?.current ?? null;
      const currentTop = scroller ? scroller.scrollTop : window.scrollY;
      if (Math.abs(currentTop - lastScrollTopRef.current) > 1) {
        setScrollDir(currentTop >= lastScrollTopRef.current ? 'down' : 'up');
        lastScrollTopRef.current = currentTop;
      }

      const scrollerTop = scroller
        ? scroller.getBoundingClientRect().top
        : 0;
      const triggerY = scrollerTop + offset;

      const tops = items.map((item) => {
        const el = document.getElementById(item.id);
        return el ? el.getBoundingClientRect().top : Infinity;
      });

      // Find reached heading index and continuous fractional progress
      let reached = 0;
      for (let i = 0; i < tops.length; i += 1) {
        if (tops[i] <= triggerY) {
          reached = i;
        }
      }

      let frac = reached;
      if (reached < tops.length - 1) {
        const currTop = tops[reached];
        const nextTop = tops[reached + 1];
        const span = nextTop - currTop;
        if (Number.isFinite(currTop) && Number.isFinite(nextTop) && span > 1) {
          const t = Math.max(0, Math.min(1, (triggerY - currTop) / span));
          frac = reached + t;
        }
      }

      // If above the very first item, keep progress at 0
      if (tops[0] > triggerY) {
        frac = 0;
      }

      setActiveIdx(reached);
      setProgress(frac);

      if (onActiveChange) {
        const reachedSet = new Set<string>();
        if (tops[0] <= triggerY + 180) {
          for (let i = 0; i <= reached; i += 1) {
            reachedSet.add(items[i].id);
          }
        }
        onActiveChange(
          tops[0] <= triggerY + 180 ? items[reached]?.id ?? null : null,
          reachedSet,
        );
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    const target: EventTarget = containerRef?.current ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items, containerRef, offset, onActiveChange]);

  // Compute paper plane coordinates + tangent along the curved SVG rail
  const normalizedProgress =
    items.length > 1 ? Math.max(0, Math.min(1, progress / (items.length - 1))) : 0;

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl || totalLength <= 0) {
      if (points[0]) {
        setPlanePose({
          x: points[0].x,
          y: points[0].y,
          angleDeg: scrollDir === 'down' ? 180 : 0,
        });
      }
      return;
    }

    const dist = normalizedProgress * totalLength;
    const pt = pathEl.getPointAtLength(dist);
    const delta = 2;
    const pBefore = pathEl.getPointAtLength(Math.max(0, dist - delta));
    const pAfter = pathEl.getPointAtLength(Math.min(totalLength, dist + delta));
    const dx = pAfter.x - pBefore.x;
    const dy = pAfter.y - pBefore.y;

    // SVG arrow/plane points UP (-90deg) by default; tangent angle + 90 aligns DOWN path
    const tangentDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const angleDeg = scrollDir === 'down' ? tangentDeg : tangentDeg + 180;

    setPlanePose({ x: pt.x, y: pt.y, angleDeg });
  }, [normalizedProgress, totalLength, scrollDir, points]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prefersReduced =
      document.documentElement.getAttribute('data-motion') === 'reduce' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = containerRef?.current;
    if (scroller) {
      const targetTop =
        el.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        offset +
        4;
      scroller.scrollTo({
        top: targetTop,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    } else {
      const targetTop = el.getBoundingClientRect().top + window.scrollY - offset + 4;
      window.scrollTo({
        top: targetTop,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <nav
      aria-label={title}
      className={`select-none ${className}`}
    >
      <div
        data-slot="rail-toc-title"
        className="mb-14 flex items-center gap-8 font-mono text-caption-10 uppercase tracking-wide text-mid-grey"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-14 text-mid-grey"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h8M2 12h10" />
        </svg>
        <span>{title}</span>
      </div>

      <div className="relative">
        {/* Continuous SVG curved rail + animated paper plane */}
        <svg
          aria-hidden="true"
          width={svgSize.width}
          height={svgSize.height}
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
        >
          {railPath && (
            <>
              {/* Dashed upcoming rail */}
              <path
                ref={pathRef}
                d={railPath}
                fill="none"
                stroke="rgba(29, 99, 255, 0.28)"
                strokeWidth={1.5}
                strokeDasharray="3 4"
                strokeLinecap="round"
              />

              {/* Solid filled progress rail */}
              {totalLength > 0 && (
                <path
                  d={railPath}
                  fill="none"
                  stroke="#1d63ff"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeDasharray={totalLength}
                  strokeDashoffset={totalLength * (1 - normalizedProgress)}
                />
              )}
            </>
          )}

          {/* Heading node circles */}
          {points.map((pt, idx) => {
            const passed = idx <= activeIdx && normalizedProgress > 0;
            const isCurrent = idx === activeIdx;
            return (
              <circle
                key={items[idx].id}
                cx={pt.x}
                cy={pt.y}
                r={isCurrent ? 3.2 : 2.6}
                fill={passed || isCurrent ? '#1d63ff' : '#232323'}
                stroke={passed || isCurrent ? '#1d63ff' : 'rgba(29,99,255,0.45)'}
                strokeWidth={1.4}
              />
            );
          })}

          {/* Scroll-triggered Paper Plane indicator (flips on up/down scroll) */}
          {points.length > 0 && (
            <g
              data-slot="rail-toc-plane"
              transform={`translate(${planePose.x}, ${planePose.y}) rotate(${planePose.angleDeg})`}
              className="transition-transform duration-150 ease-out motion-reduce:transition-none"
            >
              <path
                d="M 0 -7 L 5.5 5.5 L 0 2.5 L -5.5 5.5 Z"
                fill="#ffffff"
                stroke="#1d63ff"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>

        <ul
          ref={listRef}
          data-slot="rail-toc-list"
          className="relative flex flex-col gap-6"
        >
          {items.map((item, idx) => {
            const depth = item.depth ?? 0;
            const isActive = idx === activeIdx;
            const isPassed = idx < activeIdx;
            return (
              <li key={item.id}>
                <button
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => handleJump(item.id)}
                  style={{ paddingLeft: `${RAIL_BASE_X + depth * indent + 18}px` }}
                  className={`w-full cursor-pointer py-4 text-left font-mono text-ui transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#1d63ff] ${
                    isActive
                      ? 'font-medium text-[#6ba2ff]'
                      : isPassed
                        ? 'text-ghost-grey hover:text-white'
                        : 'text-mid-grey/75 hover:text-ghost-grey'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
