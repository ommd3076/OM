import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface MinimapBand {
  id: string;
  heightPx: number;
  isDark: boolean;
  scrollTop: number;
}

const TRACK_HEIGHT = 120;

function isDarkSurface(bgColor: string): boolean {
  const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 110;
}

export interface PageMinimapProps {
  isReducedMotion: boolean;
}

export function PageMinimap({ isReducedMotion }: PageMinimapProps) {
  const location = useLocation();
  const [bands, setBands] = useState<MinimapBand[]>([
    { id: 'default-1', heightPx: 60, isDark: false, scrollTop: 0 },
    { id: 'default-2', heightPx: 60, isDark: true, scrollTop: 400 },
  ]);
  const [scrollState, setScrollState] = useState<{
    topPx: number;
    heightPx: number;
    pct: number;
  }>({
    topPx: 0,
    heightPx: 28,
    pct: 0,
  });

  // Measure <main> sections / bands dynamically
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    let rafId = 0;

    const measure = () => {
      document.documentElement.setAttribute('data-minimap-measuring', 'true');

      const candidates = Array.from(
        mainEl.querySelectorAll<HTMLElement>(':scope > section, [data-minimap-band]'),
      );

      const elements = candidates.length > 0 ? candidates : [mainEl as HTMLElement];
      const measured = elements.map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          id: el.id || `band-${idx}`,
          rawHeight: Math.max(40, rect.height),
          isDark: isDarkSurface(style.backgroundColor),
          scrollTop: Math.max(0, rect.top + window.scrollY),
        };
      });

      const totalHeight = measured.reduce((sum, item) => sum + item.rawHeight, 0);
      const safeTotal = Math.max(1, totalHeight);

      const normalized: MinimapBand[] = measured.map((item) => ({
        id: item.id,
        heightPx: Math.max(6, (item.rawHeight / safeTotal) * TRACK_HEIGHT),
        isDark: item.isDark,
        scrollTop: item.scrollTop,
      }));

      setBands(normalized);
      document.documentElement.removeAttribute('data-minimap-measuring');
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(mainEl);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.documentElement.removeAttribute('data-minimap-measuring');
    };
  }, [location.pathname]);

  // Track live viewport scroll position
  useEffect(() => {
    const updateScroll = () => {
      const docHeight = Math.max(1, document.documentElement.scrollHeight);
      const winHeight = window.innerHeight;
      const maxScroll = Math.max(1, docHeight - winHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const frameHeight = Math.max(
        18,
        Math.min(TRACK_HEIGHT - 4, (winHeight / docHeight) * TRACK_HEIGHT),
      );
      const maxOffset = Math.max(0, TRACK_HEIGHT - frameHeight);

      setScrollState({
        topPx: ratio * maxOffset,
        heightPx: frameHeight,
        pct: Math.round(ratio * 100),
      });
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [location.pathname, bands]);

  const jumpToBand = (scrollTop: number) => {
    window.scrollTo({
      top: scrollTop,
      behavior: isReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <aside
      data-minimap-region
      aria-label="Page section minimap"
      className="fixed top-16 right-16 z-30 hidden w-68 rounded-4 border border-black/15 bg-off-white p-4 text-black lg:block"
    >
      <div className="relative flex h-120 w-full flex-col overflow-hidden rounded-2 border border-black/15">
        {bands.map((band) => (
          <button
            key={band.id}
            type="button"
            aria-label={`Scroll to section ${band.id}`}
            onClick={() => jumpToBand(band.scrollTop)}
            style={{ height: `${band.heightPx}px` }}
            className={`w-full shrink-0 border-b border-black/10 transition-opacity duration-150 hover:opacity-85 last:border-b-0 ${
              band.isDark ? 'bg-black' : 'bg-off-white'
            }`}
          />
        ))}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 border-2 border-accent bg-accent/15"
          style={{
            height: `${scrollState.heightPx}px`,
            transform: `translateY(${scrollState.topPx}px)`,
          }}
        >
          <span className="block h-1 w-full bg-accent animate-minimap-scan" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between font-mono text-ui tabular-nums text-dark-grey">
        <span>MAP</span>
        <span className="animate-minimap-scan-counter">
          {String(scrollState.pct).padStart(2, '0')}%
        </span>
      </div>
    </aside>
  );
}
