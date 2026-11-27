import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_DATA, type ShowcaseNote } from '../../data/portfolio';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsciiCanvas } from '../ui/AsciiCanvas';
import { OdometerText } from '../ui/OdometerText';
import { SplitPillButton } from '../ui/SplitPillButton';

function TypewriterQuoteCard({
  note,
  index,
  total,
  reducedMotion,
}: {
  note: ShowcaseNote;
  index: number;
  total: number;
  reducedMotion: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [typedChars, setTypedChars] = useState<number>(() =>
    reducedMotion ? note.quote.length : 0,
  );

  useEffect(() => {
    if (reducedMotion) {
      setTypedChars(note.quote.length);
      return;
    }

    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reducedMotion, note.quote.length]);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    if (typedChars >= note.quote.length) return;

    const startDelay = typedChars === 0 ? index * 220 : 18;
    const timer = window.setTimeout(() => {
      setTypedChars((prev) => Math.min(note.quote.length, prev + 1));
    }, startDelay);

    return () => window.clearTimeout(timer);
  }, [reducedMotion, inView, typedChars, note.quote.length, index]);

  const shown = reducedMotion ? note.quote : note.quote.slice(0, typedChars);
  const remaining = reducedMotion ? '' : note.quote.slice(typedChars);
  const showCursor = !reducedMotion && inView && typedChars < note.quote.length + 1;

  return (
    <div
      ref={cardRef}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${note.author}`}
      className="min-w-0 w-[90%] shrink-0 grow-0 snap-center md:w-[55%]"
    >
      <div className="checkerboard-bezel h-full rounded-8 p-6 shadow-lg ring ring-black-deep lg:p-8">
        <figure className="flex h-full min-h-300 flex-col justify-between gap-24 overflow-hidden rounded-4 bg-black p-24 ring-1 ring-white/10 lg:min-h-460 lg:gap-48 lg:p-48">
          <div>
            <blockquote>
              <div className="text-body-30 text-white lg:text-headline-10">
                <span className="sr-only">{note.quote}</span>
                <span aria-hidden="true" className="whitespace-pre-wrap">
                  <span>{shown}</span>
                  {showCursor && (
                    <span className="relative inline">
                      <span className="animate-cursor-blink absolute top-[0.1em] left-0 inline-block h-[1.05em] w-[0.1em] bg-current" />
                    </span>
                  )}
                  <span className="text-transparent">{remaining}</span>
                </span>
              </div>
            </blockquote>
          </div>

          <figcaption className="flex items-center gap-16">
            <div className="relative flex size-48 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black-deep ring-1 ring-white/15">
              <AsciiCanvas
                mode="backdrop"
                seed={note.seed}
                interactive={false}
                className="pointer-events-none absolute inset-0 h-full opacity-75"
              />
              <span className="relative z-10 font-mono text-caption-10 font-medium text-white">
                {note.monogram}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-caption-10 uppercase text-white">
                {note.author}
              </p>
              <p className="mt-2 font-mono text-ui uppercase text-mid-grey">
                {note.role}
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  const { showcaseIntro, showcaseProjects, showcaseNotes } = PORTFOLIO_DATA;
  const isReducedMotion = useReducedMotion();

  return (
    <section
      id="showcase"
      className="relative isolate scroll-mt-120 overflow-hidden bg-black px-16 py-64 text-white lg:px-80 lg:py-128"
    >
      <AsciiCanvas
        mode="backdrop"
        seed="showcase-ambient-matrix"
        interactive={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full opacity-40"
      />

      <div className="flex flex-wrap items-end justify-between gap-24">
        <div className="max-w-600">
          <h2 className="text-headline-10 font-medium text-white">
            {showcaseIntro.heading}
          </h2>
          <p className="mt-16 text-body-20 text-ghost-grey">
            {showcaseIntro.summary}
          </p>
        </div>

        <SplitPillButton
          to="/projects"
          variant="secondary"
          label="All projects"
        />
      </div>

      <div className="mt-48 grid grid-cols-1 gap-x-24 gap-y-32 lg:grid-cols-2 lg:gap-y-64">
        {showcaseProjects.map((project) => (
          <Link
            key={project.slug}
            to={`/projects/${project.slug}`}
            className="group block min-w-0 rounded-8 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
          >
            <div className="relative aspect-video overflow-hidden rounded-8 border border-white/15 bg-black">
              <AsciiCanvas
                mode="backdrop"
                seed={project.asciiMotifSeed}
                interactive={false}
              />

              <div className="absolute inset-0 flex flex-col justify-between bg-black-deep/90 p-20 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none">
                <div className="flex items-center justify-between gap-12 font-mono text-ui uppercase text-mid-grey">
                  <span className="tabular-nums">ENTRY {project.entryNumber}</span>
                  <span>{project.categoryTag}</span>
                </div>

                <p className="text-body-20 text-white">
                  {project.previewSummary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-8 border-t border-white/12 pt-12">
                  <div className="flex flex-wrap gap-6">
                    {project.stack.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-4 border border-white/15 px-8 py-2 font-mono text-ui text-ghost-grey"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <span className="font-mono text-ui uppercase text-mid-grey">
                    {project.keyFact}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-16 flex items-baseline justify-between gap-12">
              <h3 className="font-mono text-caption-20 uppercase text-white">
                <OdometerText text={project.title} />
              </h3>
              <span className="tabular-nums shrink-0 font-mono text-ui text-mid-grey">
                ENTRY {project.entryNumber}
              </span>
            </div>

            <p className="mt-6 text-body-10 text-ghost-grey">
              {project.subtitle}
            </p>

            <p className="mt-4 hidden font-mono text-ui uppercase text-mid-grey pointer-coarse:block">
              {project.touchMeta}
            </p>
          </Link>
        ))}
      </div>

      {/* Checkerboard-Framed Dual/Carousel Typewriter Field Notes */}
      <div className="mt-96 lg:mt-160">
        <div className="mb-16 flex flex-wrap items-baseline justify-between gap-12">
          <p className="font-mono text-ui uppercase text-mid-grey">
            FIELD NOTES & BLOG
          </p>
          <Link
            to="/notes"
            className="font-mono text-ui uppercase text-ghost-grey underline decoration-white/25 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white"
          >
            Read all notes →
          </Link>
        </div>

        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Engineering field notes"
          className="scrollbar-invisible -mx-16 flex snap-x snap-mandatory items-stretch gap-12 overflow-x-auto px-16 pb-8 lg:-mx-80 lg:gap-16 lg:px-80"
        >
          {showcaseNotes.map((note, idx) => (
            <TypewriterQuoteCard
              key={note.id}
              note={note}
              index={idx}
              total={showcaseNotes.length}
              reducedMotion={isReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
