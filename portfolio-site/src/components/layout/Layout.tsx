import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ReadmeDialog } from './ReadmeDialog';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

const MOTION_STORAGE_KEY = 'om_motion_pref';

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [motionOverride, setMotionOverride] = useState<'reduce' | 'full' | null>(
    () => {
      try {
        const stored = window.sessionStorage.getItem(MOTION_STORAGE_KEY);
        return stored === 'reduce' || stored === 'full' ? stored : null;
      } catch {
        return null;
      }
    },
  );
  const [systemPrefersReduced, setSystemPrefersReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Sync URL ?motion=reduce | ?motion=full with sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const param = params.get('motion');
    if (param === 'reduce' || param === 'full') {
      setMotionOverride(param);
      try {
        window.sessionStorage.setItem(MOTION_STORAGE_KEY, param);
      } catch {
        // Ignore storage failures
      }
    }
  }, [location.search]);

  // Listen to OS prefers-reduced-motion changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      setSystemPrefersReduced(e.matches);
    };
    setSystemPrefersReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const isReducedMotion =
    motionOverride === 'reduce' ||
    (motionOverride === null && systemPrefersReduced);

  // Reflect reduced-motion override on <html data-motion="reduce">
  useEffect(() => {
    if (isReducedMotion) {
      document.documentElement.setAttribute('data-motion', 'reduce');
    } else {
      document.documentElement.removeAttribute('data-motion');
    }
  }, [isReducedMotion]);

  const reducedMotionRef = useRef(isReducedMotion);
  reducedMotionRef.current = isReducedMotion;

  // Scroll to hash target or top on route change
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: reducedMotionRef.current ? 'auto' : 'smooth',
        });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-off-white text-black">
      <a
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-16 focus:z-50 focus:rounded-4 focus:bg-black focus:px-16 focus:py-8 focus:font-mono focus:text-caption-10 focus:text-white"
      >
        Skip to content
      </a>

      <SiteHeader isReducedMotion={isReducedMotion} />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>

      <SiteFooter isReducedMotion={isReducedMotion} />
      <ReadmeDialog />

      {isReducedMotion && (
        <Link
          to="?motion=full"
          onClick={() => {
            setMotionOverride('full');
            try {
              window.sessionStorage.setItem(MOTION_STORAGE_KEY, 'full');
            } catch {
              // Ignore
            }
          }}
          className="fixed bottom-8 left-8 z-30 max-w-[calc(100vw-112px)] truncate rounded-4 border border-white/15 bg-black px-10 py-6 font-mono text-ui uppercase text-ghost-grey hover:text-white lg:bottom-16 lg:left-1/2 lg:max-w-none lg:-translate-x-1/2"
        >
          REDUCED MOTION · ?MOTION=FULL
        </Link>
      )}
    </div>
  );
}
