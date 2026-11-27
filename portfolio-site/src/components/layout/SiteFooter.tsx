import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { AsciiCanvas } from '../ui/AsciiCanvas';
import { ArrowUpRightIcon, BrandWordmark, CloseIcon } from '../ui/Icons';
import { OdometerText } from '../ui/OdometerText';
import {
  DEFAULT_SPIRAL_CAMERA,
  SpiralCanvas,
  type SpiralCameraState,
} from '../ui/SpiralCanvas';
import { SplitPillButton } from '../ui/SplitPillButton';

const TOAST_DISMISSED_KEY = 'om_toast_dismissed';

export interface SiteFooterProps {
  isReducedMotion: boolean;
}

export function SiteFooter({ isReducedMotion }: SiteFooterProps) {
  const { identity } = PORTFOLIO_DATA;

  // Main footer contact form state
  const [footerEmail, setFooterEmail] = useState('');
  const [footerHoneypot, setFooterHoneypot] = useState('');
  const [footerSubmitted, setFooterSubmitted] = useState(false);

  // Floating bottom-left toast state
  const [toastScrolledIn, setToastScrolledIn] = useState(false);
  const [toastDismissed, setToastDismissed] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(TOAST_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [toastEmail, setToastEmail] = useState('');
  const [toastHoneypot, setToastHoneypot] = useState('');
  const [toastSubmitted, setToastSubmitted] = useState(false);

  const resurfaceRef = useRef<HTMLDivElement>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const figureBoxRef = useRef<HTMLElement>(null);
  const copyWrapRef = useRef<HTMLDivElement>(null);
  const eyeBoxRef = useRef<HTMLDivElement>(null);
  const footerCameraRef = useRef<SpiralCameraState>({
    ...DEFAULT_SPIRAL_CAMERA,
  });

  useEffect(() => {
    const outerEl = resurfaceRef.current;
    const stageEl = stageBoxRef.current;
    const figureEl = figureBoxRef.current;
    const eyeEl = eyeBoxRef.current;
    const copyEl = copyWrapRef.current;
    if (!outerEl || !stageEl || !figureEl || !eyeEl || !copyEl) return;

    const applyProgress = (rawP: number) => {
      const p = Math.max(0, Math.min(1, rawP));
      const w = figureEl.offsetWidth || window.innerWidth;
      const h = figureEl.offsetHeight || window.innerHeight;
      const stageH = stageEl.offsetHeight || window.innerHeight;
      const radius = Math.min(236, 0.4 * w);
      const s = 1 - Math.pow(1 - p, 2);
      const t = Math.max(0, Math.min(1, (p - 0.35) / 0.65));
      const eased =
        t < 0.5 ? 4 * Math.pow(t, 3) : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const copyOpacity = Math.max(0, Math.min(1, (eased - 0.6) / 0.4));

      eyeEl.style.setProperty('--eye', `${(2 * radius).toFixed(1)}px`);
      copyEl.style.opacity = copyOpacity.toFixed(4);
      footerCameraRef.current = {
        x: 0,
        y: h > 0 ? (h - stageH) / h : 0,
        zoom: Math.pow(2.6, 1 - s),
        twist: 0.9 * (1 - s),
        light: radius * eased,
        hidden: false,
      };
    };

    if (isReducedMotion) {
      applyProgress(1);
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const rect = outerEl.getBoundingClientRect();
      const startTop = window.innerHeight * 0.75;
      const total = Math.max(1, rect.height - window.innerHeight + startTop);
      const p = (startTop - rect.top) / total;
      applyProgress(p);
    };

    const schedule = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [isReducedMotion]);

  useEffect(() => {
    const checkScroll = () => {
      if (window.scrollY > 320) {
        setToastScrolledIn(true);
      }
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const handleFooterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (footerHoneypot.trim() !== '') {
      setFooterEmail('');
      return;
    }
    if (!footerEmail.trim()) return;
    setFooterSubmitted(true);
    setFooterEmail('');
  };

  const handleToastSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (toastHoneypot.trim() !== '') {
      setToastEmail('');
      return;
    }
    if (!toastEmail.trim()) return;
    setToastSubmitted(true);
    setToastEmail('');
  };

  const handleDismissToast = () => {
    setToastDismissed(true);
    try {
      window.sessionStorage.setItem(TOAST_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage failures in restricted contexts
    }
  };

  const showToast = toastScrolledIn && !toastDismissed;

  return (
    <>
      <section
        aria-label="Portfolio resurface"
        className="relative isolate bg-black text-white"
      >
        <div
          ref={resurfaceRef}
          className={
            isReducedMotion
              ? 'h-svh'
              : 'h-[calc(100svh+var(--resurface))] [--resurface:0px] lg:[--resurface:80svh]'
          }
        >
          <div
            ref={stageBoxRef}
            className={
              isReducedMotion
                ? 'relative h-svh'
                : 'sticky top-0 h-svh'
            }
          >
            <div className="relative h-full">
              <div
                ref={eyeBoxRef}
                className="absolute inset-0 flex items-center justify-center bg-off-white text-black"
                style={{ ['--eye' as string]: '420px' }}
              >
                <div
                  ref={copyWrapRef}
                  className="flex w-[calc(var(--eye)*0.78)] max-w-360 flex-col items-center gap-16 px-16 text-center lg:gap-20"
                >
                  <p className="font-mono text-caption-10 uppercase text-dark-grey">
                    {identity.wordmark} · {identity.handle}
                  </p>
                  <h2 className="text-[clamp(24px,2.5vw,34px)] leading-[1.12] font-medium text-black">
                    {identity.footerResurfaceHeading}
                  </h2>
                  <SplitPillButton
                    to="/projects"
                    variant="primary"
                    dot
                    label={identity.footerResurfaceCtaLabel}
                  />
                </div>
              </div>

              <figure
                ref={figureBoxRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <SpiralCanvas
                  cameraRef={footerCameraRef}
                  alpha
                  entrance={false}
                  interactive={false}
                  className="bg-transparent"
                />
              </figure>
            </div>
          </div>
        </div>

        <AsciiCanvas
          mode="seam"
          direction="dark-to-light"
          seed="footer-resurface-seam"
        />
      </section>

      <footer className="border-t border-black/15 bg-off-white px-16 pt-48 pb-32 text-black lg:px-80 lg:pt-80 lg:pb-48">
        <div className="grid grid-cols-1 gap-x-16 gap-y-40 lg:grid-cols-12">
          <div className="flex flex-col gap-24 lg:col-span-5">
            <BrandWordmark label={identity.fullName} className="h-auto w-full max-w-440 text-black" />
            <p className="max-w-340 text-body-10 text-dark-grey">
              {identity.footerBio}
            </p>

            <form
              onSubmit={handleFooterSubmit}
              className="mt-8 flex flex-col gap-12"
            >
              <input
                type="text"
                name="website"
                value={footerHoneypot}
                onChange={(e) => setFooterHoneypot(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                className="sr-only"
              />
              <div className="flex flex-col gap-8 sm:flex-row sm:items-stretch">
                <input
                  type="email"
                  required
                  value={footerEmail}
                  onChange={(e) => {
                    setFooterEmail(e.target.value);
                    if (footerSubmitted) setFooterSubmitted(false);
                  }}
                  placeholder={identity.toastPlaceholder}
                  aria-label="Email address"
                  className="h-48 min-w-0 flex-1 rounded-8 border border-black/20 bg-white/60 px-16 text-ui-20 text-black placeholder:text-dark-grey lg:text-body-10"
                />
                <SplitPillButton
                  type="submit"
                  variant="primary"
                  label="STAY UPDATED"
                />
              </div>

              {footerSubmitted && (
                <p role="status" className="font-mono text-caption-10 text-black">
                  Note received — you can also write directly to {identity.email}.
                </p>
              )}

              <noscript>
                <p className="font-mono text-caption-10 text-[#dc2626]">
                  This form needs JavaScript to send. Write to {identity.email}.
                </p>
              </noscript>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-24 sm:grid-cols-3 lg:col-span-5 lg:col-start-8">
            <div>
              <h3 className="mb-12 font-mono text-ui uppercase text-dark-grey">
                Routes
              </h3>
              <ul className="flex flex-col gap-10">
                {identity.footerNavLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center font-mono text-caption-10 uppercase text-black hover:underline"
                    >
                      <OdometerText text={link.label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-12 font-mono text-ui uppercase text-dark-grey">
                Profiles
              </h3>
              <ul className="flex flex-col gap-10">
                {identity.footerProfileLinks.map((link) => (
                  <li key={link.id}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith('http') ? '_blank' : undefined}
                        rel={
                          link.href.startsWith('http')
                            ? 'noopener noreferrer'
                            : undefined
                        }
                        className="inline-flex items-center gap-4 font-mono text-caption-10 uppercase text-black hover:underline"
                      >
                        <OdometerText text={link.label} />
                        {link.href.startsWith('http') && (
                          <ArrowUpRightIcon className="size-12 shrink-0" />
                        )}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="inline-flex items-center font-mono text-caption-10 uppercase text-black hover:underline"
                      >
                        <OdometerText text={link.label} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className="mb-12 font-mono text-ui uppercase text-dark-grey">
                Colophon
              </h3>
              <ul className="flex flex-col gap-8 font-mono text-caption-10 text-dark-grey">
                <li>{identity.locationLabel}</li>
                <li>VVCE · CSE</li>
                <li>Cerenetics</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-48 flex flex-col gap-12 border-t border-current/15 pt-24 font-mono text-caption-10 text-dark-grey sm:flex-row sm:items-center sm:justify-between">
          <span>{identity.copyrightLine}</span>
          <div className="flex flex-wrap items-center gap-16">
            <span>
              {identity.roleHeadline} · {identity.handle}
            </span>
            <Link
              to={isReducedMotion ? '?motion=full' : '?motion=reduce'}
              className="underline hover:text-black"
            >
              {isReducedMotion ? 'Motion: Reduced (?motion=full)' : 'Motion: Full (?motion=reduce)'}
            </Link>
          </div>
        </div>
      </footer>

      {showToast && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Direct contact note"
          className="fixed bottom-92 left-8 z-30 w-[calc(100vw-16px)] max-w-360 rounded-8 border border-white/15 bg-black p-16 text-white animate-fade-in lg:bottom-16 lg:left-16"
        >
          <div className="flex items-start justify-between gap-12">
            <p className="font-mono text-caption-10 text-white">
              {identity.toastTitle}
            </p>
            <button
              type="button"
              onClick={handleDismissToast}
              aria-label="Dismiss notification"
              className="inline-flex size-24 shrink-0 items-center justify-center rounded-4 text-ghost-grey transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="size-14" />
            </button>
          </div>

          <form onSubmit={handleToastSubmit} className="mt-12 flex flex-col gap-8">
            <input
              type="text"
              name="company_url"
              value={toastHoneypot}
              onChange={(e) => setToastHoneypot(e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              className="sr-only"
            />
            <div className="flex items-center gap-8">
              <input
                type="email"
                required
                value={toastEmail}
                onChange={(e) => {
                  setToastEmail(e.target.value);
                  if (toastSubmitted) setToastSubmitted(false);
                }}
                placeholder={identity.toastPlaceholder}
                aria-label="Quick contact email"
                className="h-36 min-w-0 flex-1 rounded-4 border border-white/20 bg-black-deep px-10 text-ui-20 text-white placeholder:text-mid-grey lg:text-body-10"
              />
              <button
                type="submit"
                className="inline-flex h-36 shrink-0 items-center rounded-4 bg-ghost-grey px-12 font-mono text-ui uppercase text-black transition-colors duration-150 hover:bg-white"
              >
                Send
              </button>
            </div>
            {toastSubmitted && (
              <p className="font-mono text-ui text-ghost-grey">
                Note received — {identity.email}
              </p>
            )}
          </form>
        </aside>
      )}
    </>
  );
}
