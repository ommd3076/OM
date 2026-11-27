import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { InkCircle, InkUnderline } from './InkMarks';

export function NotesShell({
  children,
  readingProgress,
  darkSurface = false,
}: {
  children: ReactNode;
  readingProgress?: number;
  darkSurface?: boolean;
}) {
  const { pathname } = useLocation();
  const isStudio = pathname.startsWith('/notes/studio');
  const isNotesIndex = pathname === '/notes';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`notes-theme flex min-h-screen flex-col transition-colors duration-200 selection:bg-[#f6e6b8] selection:text-[#282825] ${
        darkSurface
          ? 'bg-[#1a1a1d] text-[#ecece7]'
          : 'bg-[#f8f8f7] text-[#282825]'
      }`}
    >
      {typeof readingProgress === 'number' && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-[#b845e6] transition-transform duration-75"
          style={{ transform: `scaleX(${readingProgress})` }}
        />
      )}

      {/* Exact Ellipsus 74px #f4f4f2 navigation bar: left serif mark, center flat links, right action pair */}
      <header
        className={`sticky top-0 z-40 transition-colors duration-200 ${
          darkSurface
            ? scrolled
              ? 'border-b border-white/10 bg-[#1a1a1d]/92 backdrop-blur-md'
              : 'bg-[#1a1a1d]'
            : scrolled
              ? 'border-b border-[#d8d8d0] bg-[#f4f4f2]/94 backdrop-blur-md'
              : 'bg-[#f4f4f2]'
        }`}
      >
        <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between gap-16 px-20 lg:px-48">
          {/* Left: Ellipsus-inspired organic serif logotype with dot inflection */}
          <Link
            to="/notes"
            className="group inline-flex items-baseline gap-2 rounded-4 focus-visible:outline-2 focus-visible:outline-[#b845e6] focus-visible:outline-offset-4"
          >
            <span
              className={`font-serif text-[27px] leading-none font-normal tracking-[-0.04em] ${
                darkSurface ? 'text-[#fbfbf9]' : 'text-[#282825]'
              }`}
            >
              om<span className="italic text-[#b845e6]">·</span>notes
            </span>
          </Link>

          {/* Center: Clean unboxed text nav links */}
          <nav
            aria-label="Notes navigation"
            className="flex items-center gap-24 text-[14px] font-medium sm:gap-32"
          >
            <Link
              to="/notes"
              className={`py-4 transition-colors ${
                darkSurface
                  ? isNotesIndex
                    ? 'text-white'
                    : 'text-[#a3a39a] hover:text-white'
                  : isNotesIndex
                    ? 'text-[#282825]'
                    : 'text-[#64645e] hover:text-[#282825]'
              }`}
            >
              <InkUnderline
                variant="wave"
                tone="coral"
                trigger="active"
                active={isNotesIndex}
              >
                Essays
              </InkUnderline>
            </Link>

            <Link
              to="/notes/studio"
              className={`hidden py-4 transition-colors sm:inline-flex ${
                darkSurface
                  ? isStudio
                    ? 'text-white'
                    : 'text-[#a3a39a] hover:text-white'
                  : isStudio
                    ? 'text-[#282825]'
                    : 'text-[#64645e] hover:text-[#282825]'
              }`}
            >
              <InkCircle
                tone="sage"
                trigger="active"
                active={isStudio}
                strokeWidth={1.8}
                className="px-6 py-1"
              >
                Write
              </InkCircle>
            </Link>

            <Link
              to="/"
              className={`hidden py-4 transition-colors sm:inline-flex ${
                darkSurface
                  ? 'text-[#a3a39a] hover:text-white'
                  : 'text-[#64645e] hover:text-[#282825]'
              }`}
            >
              Portfolio
            </Link>
          </nav>

          {/* Right: Ellipsus twin-button actions (outline secondary + solid black primary) */}
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className={`hidden rounded-8 border px-14 py-8 text-[13px] font-medium transition-colors md:inline-flex ${
                darkSurface
                  ? 'border-white/25 text-[#ecece7] hover:border-white'
                  : 'border-[#282825]/30 bg-white/60 text-[#282825] hover:border-[#282825]'
              }`}
            >
              ← Portfolio
            </Link>
            <Link
              to="/notes/studio"
              className={`rounded-8 px-16 py-8 text-[13px] font-medium transition-colors ${
                darkSurface
                  ? 'bg-[#fbfbf9] text-[#020203] hover:bg-white'
                  : 'bg-[#020203] text-[#fbfbf9] hover:bg-[#282825]'
              }`}
            >
              Author Studio
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Deep Ellipsus Slate-Black Colophon Footer */}
      <footer className="bg-[#020203] px-20 py-56 text-[#b5b5ac] lg:px-48 lg:py-64">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-28 sm:flex-row sm:items-end">
          <div>
            <p className="font-serif text-[30px] leading-[1.12] font-normal tracking-[-0.025em] text-[#fbfbf9]">
              Write like a <span className="italic">human</span>.
            </p>
            <p className="mt-10 text-[14px] text-[#8e8e86]">
              Personal field notes & connected revisions by Om M. Doddamani ·
              Persisted in SQLite.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-24 text-[14px]">
            <Link to="/notes" className="text-[#fbfbf9] hover:underline">
              Essays
            </Link>
            <Link to="/notes/studio" className="text-[#fbfbf9] hover:underline">
              Author Studio
            </Link>
            <Link to="/" className="text-[#8e8e86] hover:text-white">
              Main Portfolio ↗
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function NotesNotFound({
  title = 'Note not found — drafts remain private.',
  description = 'Unpublished drafts remain inside the private Studio and cannot be opened from public links.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="bg-[#f4f4f2] px-20 py-96 lg:px-48 lg:py-144">
      <div className="mx-auto max-w-[720px]">
        <span className="inline-block rounded-4 border border-[#282825]/60 px-8 py-2 text-[11px] font-medium tracking-[0.08em] uppercase text-[#282825]">
          404 · Unavailable
        </span>
        <h1 className="mt-20 font-serif text-[clamp(38px,5vw,64px)] leading-[1.04] font-normal tracking-[-0.03em] text-[#282825]">
          {title}
        </h1>
        <p className="mt-18 max-w-[540px] text-[17px] leading-[1.68] text-[#64645e]">
          {description}
        </p>
        <div className="mt-32 flex flex-wrap items-center gap-20 text-[14px] font-medium">
          <Link
            to="/notes"
            className="rounded-8 bg-[#020203] px-18 py-10 text-[#fbfbf9] transition-colors hover:bg-[#282825]"
          >
            Return to Essays
          </Link>
          <Link
            to="/notes/studio"
            className="text-[#282825] underline decoration-[#b845e6] decoration-2 underline-offset-4"
          >
            Open Author Studio →
          </Link>
        </div>
      </div>
    </section>
  );
}
