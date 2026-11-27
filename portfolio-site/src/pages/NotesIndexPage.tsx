import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  NotebookStackSketch,
  PaperWaveEdge,
} from '../components/notes/EllipsusArtwork';
import {
  InkCircle,
  InkDivider,
  InkUnderline,
} from '../components/notes/InkMarks';
import { NotesShell } from '../components/notes/NotesShell';
import { fetchPublishedNotes, type PublicNote } from '../lib/notesClient';

function formatLongDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function getMonthGroupLabel(iso: string): string {
  try {
    const dt = new Date(iso);
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dt);
    const year = dt.getFullYear();
    return `${month} ${year}`;
  } catch {
    return 'Archive';
  }
}

const HOVER_TONES = ['violet', 'coral', 'sage', 'amber'] as const;

export function NotesIndexPage() {
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    fetchPublishedNotes()
      .then((items) => {
        if (!active) return;
        setNotes(items);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load notes.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.excerpt.toLowerCase().includes(q) ||
        n.slug.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const groupedByMonth = useMemo(() => {
    const groups: Array<{
      label: string;
      items: Array<{ note: PublicNote; globalIdx: number }>;
    }> = [];
    filteredNotes.forEach((note, globalIdx) => {
      const label = getMonthGroupLabel(note.publishedAt);
      const existing = groups.find((g) => g.label === label);
      if (existing) {
        existing.items.push({ note, globalIdx });
      } else {
        groups.push({ label, items: [{ note, globalIdx }] });
      }
    });
    return groups;
  }, [filteredNotes]);

  return (
    <NotesShell>
      {/* Ellipsus #f4f4f2 warm stone hero stage (echoes post-fold.png + home-s3.png) */}
      <section className="relative overflow-hidden bg-[#f4f4f2] px-20 pt-40 pb-56 text-[#282825] lg:px-48 lg:pt-64 lg:pb-72">
        {/* Top-right sweeping purple ink curve echoing ellipsus.com/blog/whats-new */}
        <svg
          aria-hidden="true"
          viewBox="0 0 380 220"
          className="pointer-events-none absolute -top-28 -right-24 h-[150px] w-[260px] opacity-90 sm:h-[210px] sm:w-[340px]"
        >
          <path
            d="M 215 -10 C 190 75, 225 145, 385 112"
            fill="none"
            stroke="#b845e6"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>

        <div className="relative z-10 mx-auto max-w-[1180px]">
          <Link
            to="/"
            className="inline-flex items-center gap-6 text-[13px] font-medium text-[#64645e] transition-colors hover:text-[#282825]"
          >
            ← Portfolio
          </Link>

          <div className="mt-32 grid gap-32 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
            <div>
              <h1 className="font-serif text-[clamp(48px,6.8vw,92px)] leading-[0.98] font-normal tracking-[-0.035em] text-[#282825]">
                <InkCircle tone="violet" trigger="mount" strokeWidth={2.8}>
                  Notes &amp; <em className="italic">drafts</em>
                </InkCircle>
              </h1>

              <p className="mt-28 max-w-[680px] font-serif text-[clamp(22px,2.4vw,30px)] leading-[1.35] font-normal tracking-[-0.015em] text-[#282825]">
                Quiet essays, technical notebooks, and working revisions.{' '}
                <InkUnderline variant="wave" tone="coral" trigger="mount">
                  <em className="italic">Written deliberately.</em>
                </InkUnderline>
              </p>
            </div>

            <NotebookStackSketch className="hidden h-auto w-[170px] justify-self-end lg:block" />
          </div>
        </div>
      </section>

      {/* Organic torn-paper edge transitioning into pure #f8f8f7 paper */}
      <PaperWaveEdge fromColor="#f4f4f2" toColor="#f8f8f7" />

      {/* Open unboxed two-column month-grouped editorial list (echoes blog-list.png) */}
      <section className="bg-[#f8f8f7] px-20 pt-24 pb-96 text-[#282825] lg:px-48 lg:pt-36 lg:pb-128">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-32 flex flex-wrap items-center justify-between gap-16 border-b border-[#282825]/12 pb-16">
            <p className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#64645e] tabular-nums">
              {filteredNotes.length}{' '}
              {filteredNotes.length === 1 ? 'Published essay' : 'Published essays'}
            </p>

            <div>
              <label htmlFor="notes-search" className="sr-only">
                Filter essays
              </label>
              <input
                id="notes-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter notes…"
                className="w-[180px] border-b border-[#282825]/25 bg-transparent py-4 text-[14px] text-[#282825] placeholder:text-[#64645e]/70 focus:border-[#282825] focus:outline-none sm:w-[220px]"
              />
            </div>
          </div>

          {loading ? (
            <p className="py-48 text-[16px] text-[#64645e]">
              Loading published notes…
            </p>
          ) : error ? (
            <p className="py-48 text-[16px] text-[#b81a14]">{error}</p>
          ) : filteredNotes.length === 0 ? (
            <div className="py-56 text-center">
              <p className="font-serif text-[32px] text-[#282825]">
                {notes.length === 0
                  ? 'No published notes yet.'
                  : `No notes matched “${query}”.`}
              </p>
              {notes.length === 0 && (
                <p className="mt-12 text-[16px] text-[#64645e]">
                  Start drafting privately in{' '}
                  <Link
                    to="/notes/studio"
                    className="text-[#282825] underline decoration-[#b845e6] decoration-2 underline-offset-4"
                  >
                    Author Studio
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <div>
              {groupedByMonth.map((group, groupIdx) => (
                <Fragment key={group.label}>
                  {groupIdx > 0 && <InkDivider className="my-48" />}

                  <div className="grid gap-32 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-64">
                    {/* Left Column: Quiet serif Month + Year */}
                    <div>
                      <h2 className="font-serif text-[clamp(28px,2.8vw,38px)] leading-[1.12] font-normal tracking-[-0.025em] text-[#282825] lg:sticky lg:top-96">
                        {group.label}
                      </h2>
                    </div>

                    {/* Right Column: Clean unboxed essays */}
                    <div>
                      {group.items.map(({ note, globalIdx }, itemIdx) => {
                        const tone = HOVER_TONES[globalIdx % HOVER_TONES.length];
                        return (
                          <Fragment key={note.id}>
                            {itemIdx > 0 && <InkDivider className="my-40" />}
                            <article>
                              <Link
                                to={`/notes/${note.slug}`}
                                className="group block focus-visible:outline-2 focus-visible:outline-[#b845e6] focus-visible:outline-offset-8"
                              >
                                <p className="text-[13px] text-[#64645e]">
                                  <time dateTime={note.publishedAt}>
                                    {formatLongDate(note.publishedAt)}
                                  </time>
                                  <span className="mx-8" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="tabular-nums">
                                    {note.readingMinutes} min read
                                  </span>
                                </p>

                                <h3 className="mt-12 font-serif text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-normal tracking-[-0.025em] text-[#282825]">
                                  <InkUnderline
                                    variant={globalIdx % 2 === 0 ? 'sweep' : 'wave'}
                                    tone={tone}
                                    trigger="hover"
                                  >
                                    {note.title}
                                  </InkUnderline>
                                </h3>

                                {note.excerpt && (
                                  <p className="mt-14 max-w-[660px] text-[16px] leading-[1.7] text-[#64645e]">
                                    {note.excerpt}
                                  </p>
                                )}

                                <div className="mt-20 flex flex-wrap items-center gap-16 text-[12px] tracking-[0.04em] uppercase text-[#64645e]">
                                  <span>By: Om M. Doddamani</span>
                                  <span className="rounded-4 border border-[#282825]/60 px-8 py-2 text-[10px] font-medium tracking-[0.08em] text-[#282825]">
                                    Field Note
                                  </span>
                                  <span className="text-[13px] font-medium tracking-normal normal-case text-[#282825]">
                                    <InkCircle
                                      tone={tone}
                                      trigger="hover"
                                      strokeWidth={2}
                                      className="px-6 py-2"
                                    >
                                      Read essay →
                                    </InkCircle>
                                  </span>
                                </div>
                              </Link>
                            </article>
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </section>
    </NotesShell>
  );
}
