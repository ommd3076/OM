import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { BrandMark } from '../ui/Icons';
import { OdometerText } from '../ui/OdometerText';
import { StatusDot } from '../ui/StatusDot';

export interface SiteHeaderProps {
  isReducedMotion: boolean;
}

export function SiteHeader({ isReducedMotion }: SiteHeaderProps) {
  const { identity } = PORTFOLIO_DATA;
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Cycle ticker items when motion is permitted
  useEffect(() => {
    if (isReducedMotion || identity.tickerItems.length <= 1) {
      setTickerIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % identity.tickerItems.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isReducedMotion, identity.tickerItems.length]);

  // Passive scroll percentage tracker for ticker bar
  useEffect(() => {
    const updateScroll = () => {
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const pct = Math.min(
        100,
        Math.max(0, Math.round((window.scrollY / scrollable) * 100)),
      );
      setScrollPct(pct);
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Close mobile drawer on Escape & restore focus, or when widening to desktop
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (href.startsWith('/#') && location.pathname === '/') {
      const targetId = href.slice(2);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: isReducedMotion ? 'auto' : 'smooth',
        });
      }
    }
  };

  const activeTicker = identity.tickerItems[tickerIndex] ?? identity.tickerItems[0];

  return (
    <>
      {menuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black-deep/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <header
        data-site-chrome
        className="pointer-events-none fixed inset-x-0 top-0 z-30 p-8 lg:flex lg:justify-center lg:p-16"
      >
        <div className="pointer-events-auto inline-flex min-w-160 flex-col rounded-4 p-4 checkerboard-bezel lg:min-w-0">
          <div className="flex items-center justify-between gap-12 rounded-2 bg-black p-4 text-white ring-1 ring-white/10 lg:gap-20 lg:px-8 lg:py-6">
            <Link
              to="/"
              aria-label={`${identity.fullName} — Home`}
              onClick={() => setMenuOpen(false)}
              className="inline-flex shrink-0 items-center justify-center rounded-2 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <BrandMark className="size-24 text-white lg:size-30" />
            </Link>

            <nav
              aria-label="Primary"
              className="hidden items-center gap-16 pr-8 lg:flex"
            >
              {identity.navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="inline-flex items-center gap-6 rounded-2 px-2 py-2 font-mono text-caption-10 uppercase text-ghost-grey transition-colors duration-150 hover:text-white motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none"
                >
                  {item.hasAccentDot && <StatusDot />}
                  <OdometerText text={item.label} />
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-8 lg:hidden">
              <button
                ref={menuButtonRef}
                type="button"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-drawer"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-8 rounded-2 px-6 py-2 font-mono text-caption-10 uppercase text-white"
              >
                <span>Menu</span>
                <span aria-hidden="true">{menuOpen ? '−' : '+'}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 hidden h-18 w-full items-center justify-between gap-16 overflow-hidden rounded-2 bg-ghost-grey px-8 text-black lg:flex">
            <div className="flex min-w-0 items-center gap-6">
              <span className="truncate font-mono text-ui uppercase tracking-wide">
                {activeTicker}
              </span>
              <span
                aria-hidden="true"
                className="inline-block h-10 w-6 shrink-0 bg-black animate-cursor-blink motion-reduce:hidden [[data-motion=reduce]_&]:hidden"
              />
            </div>
            <span className="shrink-0 tabular-nums font-mono text-ui uppercase">
              {String(scrollPct).padStart(2, '0')}%
            </span>
          </div>

          {menuOpen && (
            <nav
              id="mobile-nav-drawer"
              aria-label="Mobile navigation"
              className="mt-4 max-h-[calc(100svh-88px)] w-[min(calc(100vw-24px),340px)] overflow-y-auto overscroll-contain rounded-2 bg-black p-16 text-white ring-1 ring-white/10 animate-fade-in lg:hidden"
            >
              <div className="flex flex-col gap-10">
                {identity.navItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className="flex items-center justify-between rounded-2 py-4 font-mono text-caption-10 uppercase text-ghost-grey hover:text-white"
                  >
                    <span className="inline-flex items-center gap-8">
                      {item.hasAccentDot && <StatusDot />}
                      <span>{item.label}</span>
                    </span>
                    <span className="text-mid-grey" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-12 border-t border-white/10 pt-12">
                <p className="mb-8 font-mono text-ui uppercase text-mid-grey">
                  Routes
                </p>
                <div className="grid grid-cols-2 gap-8">
                  {identity.footerNavLinks.map((routeLink) => (
                    <Link
                      key={routeLink.id}
                      to={routeLink.href}
                      onClick={() => handleNavClick(routeLink.href)}
                      className="rounded-2 py-4 font-mono text-caption-10 uppercase text-ghost-grey hover:text-white"
                    >
                      {routeLink.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
