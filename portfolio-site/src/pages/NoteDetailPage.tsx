import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArticleHeaderLineArt,
  PaperWaveEdge,
} from '../components/notes/EllipsusArtwork';
import { InkCircle, InkUnderline } from '../components/notes/InkMarks';
import { NoteProse } from '../components/notes/NoteProse';
import { NotesNotFound, NotesShell } from '../components/notes/NotesShell';
import {
  ApiError,
  fetchPublishedNoteBySlug,
  fetchPublishedNotes,
  type PublicNote,
} from '../lib/notesClient';

function formatNumericDate(iso: string): string {
  try {
    const dt = new Date(iso);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function NoteDetailPage() {
  const { slug } = useParams();
  const [note, setNote] = useState<PublicNote | null>(null);
  const [otherNotes, setOtherNotes] = useState<PublicNote[]>([]);
  const [status, setStatus] = useState<
    'loading' | 'found' | 'not_found' | 'error'
  >('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [nightPaper, setNightPaper] = useState(false);

  useEffect(() => {
    if (!slug) {
      setStatus('not_found');
      return;
    }
    let active = true;
    setStatus('loading');

    Promise.all([
      fetchPublishedNoteBySlug(slug),
      fetchPublishedNotes().catch(() => [] as PublicNote[]),
    ])
      .then(([item, allNotes]) => {
        if (!active) return;
        setNote(item);
        setOtherNotes(allNotes.filter((n) => n.slug !== slug).slice(0, 2));
        setStatus('found');
        document.title = `${item.title} — om·notes`;
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus('not_found');
        } else {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load note.');
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      setProgress(Math.max(0, Math.min(1, window.scrollY / scrollable)));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [slug]);

  if (status === 'not_found') {
    return (
      <NotesShell>
        <NotesNotFound />
      </NotesShell>
    );
  }

  if (status === 'loading') {
    return (
      <NotesShell>
        <section className="bg-[#f4f4f2] px-20 py-96 lg:px-48">
          <div className="mx-auto max-w-[1160px] text-[15px] text-[#64645e]">
            Opening essay…
          </div>
        </section>
      </NotesShell>
    );
  }

  if (status === 'error' || !note) {
    return (
      <NotesShell>
        <section className="bg-[#f4f4f2] px-20 py-96 lg:px-48">
          <div className="mx-auto max-w-[1160px] text-[15px] text-[#b81a14]">
            {errorMsg}
          </div>
        </section>
      </NotesShell>
    );
  }

  return (
    <NotesShell readingProgress={progress} darkSurface={nightPaper}>
      <article className="min-w-0">
        {/* Hand-drawn manuscript strip illustration (echoes article-top.png) */}
        <ArticleHeaderLineArt dark={nightPaper} />

        {/* Full-bleed Warm Stone Header Band (unboxed, asymmetrical) */}
        <header
          className={`px-20 pt-28 pb-56 transition-colors duration-200 lg:px-48 lg:pt-40 lg:pb-72 ${
            nightPaper ? 'bg-[#1f1f22] text-[#fbfbf9]' : 'bg-[#f4f4f2] text-[#282825]'
          }`}
        >
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-between gap-12">
              <Link
                to="/notes"
                className={`group text-[14px] font-medium transition-colors ${
                  nightPaper
                    ? 'text-[#b5b5ac] hover:text-white'
                    : 'text-[#64645e] hover:text-[#282825]'
                }`}
              >
                <InkUnderline variant="sweep" tone="coral" trigger="hover">
                  ← All notes
                </InkUnderline>
              </Link>

              {/* Ellipsus daylight / night reading toggle */}
              <div
                role="group"
                aria-label="Reader paper tone"
                className={`inline-flex items-center gap-4 rounded-8 p-4 ${
                  nightPaper ? 'bg-white/10' : 'bg-[#e6e6de]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setNightPaper(false)}
                  aria-pressed={!nightPaper}
                  className={`cursor-pointer rounded-4 px-10 py-4 text-[12px] font-medium transition-colors ${
                    !nightPaper
                      ? 'bg-[#fbfbf9] text-[#282825]'
                      : 'text-[#b5b5ac] hover:text-white'
                  }`}
                >
                  ☀ Light
                </button>
                <button
                  type="button"
                  onClick={() => setNightPaper(true)}
                  aria-pressed={nightPaper}
                  className={`cursor-pointer rounded-4 px-10 py-4 text-[12px] font-medium transition-colors ${
                    nightPaper
                      ? 'bg-[#2e2e34] text-white'
                      : 'text-[#64645e] hover:text-[#282825]'
                  }`}
                >
                  ☾ Night
                </button>
              </div>
            </div>

            <div className="mt-36 grid grid-cols-1 gap-40 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end lg:gap-64">
              <div className="min-w-0">
                <span
                  className={`inline-block rounded-4 border px-8 py-2 text-[10px] font-medium tracking-[0.08em] uppercase ${
                    nightPaper
                      ? 'border-white/35 text-[#ecece7]'
                      : 'border-[#282825]/65 text-[#282825]'
                  }`}
                >
                  Field Note
                </span>

                <h1 className="mt-20 font-serif text-[clamp(40px,5.6vw,74px)] leading-[1.02] font-normal tracking-[-0.03em]">
                  {note.title}
                </h1>

                {note.excerpt && (
                  <p
                    className={`mt-24 max-w-[660px] text-[18px] leading-[1.65] ${
                      nightPaper ? 'text-[#c2c2ba]' : 'text-[#64645e]'
                    }`}
                  >
                    {note.excerpt}
                  </p>
                )}
              </div>

              {/* Slim Right Metadata Rail matching article-top.png / article-body.png */}
              <dl
                className={`space-y-16 text-[13px] lg:text-right ${
                  nightPaper ? 'text-[#b5b5ac]' : 'text-[#64645e]'
                }`}
              >
                <div>
                  <dt className="text-[10px] font-medium tracking-[0.1em] uppercase opacity-75">
                    Written by
                  </dt>
                  <dd
                    className={`mt-4 text-[14px] font-medium ${
                      nightPaper ? 'text-[#fbfbf9]' : 'text-[#282825]'
                    }`}
                  >
                    Om M. Doddamani
                  </dd>
                </div>

                <div
                  className={`border-t pt-14 ${
                    nightPaper ? 'border-white/12' : 'border-[#d6d6ce]'
                  }`}
                >
                  <dt className="text-[10px] font-medium tracking-[0.1em] uppercase opacity-75">
                    Publish date
                  </dt>
                  <dd
                    className={`mt-4 tabular-nums text-[14px] ${
                      nightPaper ? 'text-[#fbfbf9]' : 'text-[#282825]'
                    }`}
                  >
                    {formatNumericDate(note.publishedAt)}
                  </dd>
                </div>

                <div
                  className={`border-t pt-14 ${
                    nightPaper ? 'border-white/12' : 'border-[#d6d6ce]'
                  }`}
                >
                  <dt className="text-[10px] font-medium tracking-[0.1em] uppercase opacity-75">
                    Reading time
                  </dt>
                  <dd
                    className={`mt-4 tabular-nums text-[14px] ${
                      nightPaper ? 'text-[#fbfbf9]' : 'text-[#282825]'
                    }`}
                  >
                    {note.readingMinutes} min read
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <PaperWaveEdge
          fromColor={nightPaper ? '#1f1f22' : '#f4f4f2'}
          toColor={nightPaper ? '#1a1a1d' : '#f8f8f7'}
        />

        {/* Open full-bleed writing paper (echoes article-body.png right-center reading rhythm) */}
        <section
          className={`px-20 pt-24 pb-96 transition-colors duration-200 lg:px-48 lg:pt-36 lg:pb-128 ${
            nightPaper ? 'bg-[#1a1a1d]' : 'bg-[#f8f8f7]'
          }`}
        >
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-40 lg:grid-cols-[240px_minmax(0,680px)] lg:gap-64">
            {/* Left quiet marginalia track */}
            <aside
              className={`text-[13px] ${
                nightPaper ? 'text-[#9d9d95]' : 'text-[#64645e]'
              }`}
            >
              <div className="space-y-16 lg:sticky lg:top-96">
                <p>
                  <Link
                    to="/notes/studio"
                    className={`group font-medium ${
                      nightPaper ? 'text-[#fbfbf9]' : 'text-[#282825]'
                    }`}
                  >
                    <InkCircle tone="violet" trigger="hover" className="px-6 py-2">
                      Revise in Studio →
                    </InkCircle>
                  </Link>
                </p>

                {otherNotes.length > 0 && (
                  <div className="hidden border-t border-current/12 pt-16 lg:block">
                    <p className="text-[10px] font-medium tracking-[0.1em] uppercase opacity-75">
                      More essays
                    </p>
                    <ul className="mt-10 space-y-10">
                      {otherNotes.map((other) => (
                        <li key={other.id}>
                          <Link
                            to={`/notes/${other.slug}`}
                            className={`block leading-[1.35] hover:underline ${
                              nightPaper ? 'text-[#dcdcd4]' : 'text-[#282825]'
                            }`}
                          >
                            {other.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Prose Column (min-w-0 prevents code blocks overflowing mobile grid) */}
            <div className="min-w-0">
              <NoteProse content={note.body} dark={nightPaper} />

              <footer
                className={`mt-64 flex flex-wrap items-center justify-between gap-16 border-t pt-28 text-[14px] font-medium ${
                  nightPaper ? 'border-white/12' : 'border-[#e2e2da]'
                }`}
              >
                <Link
                  to="/notes"
                  className={`group ${
                    nightPaper ? 'text-[#fbfbf9]' : 'text-[#282825]'
                  }`}
                >
                  <InkUnderline variant="wave" tone="coral" trigger="hover">
                    ← Back to all notes
                  </InkUnderline>
                </Link>

                <Link
                  to="/notes/studio"
                  className={`group ${
                    nightPaper
                      ? 'text-[#b5b5ac] hover:text-white'
                      : 'text-[#64645e] hover:text-[#282825]'
                  }`}
                >
                  <InkCircle tone="sage" trigger="hover" className="px-8 py-2">
                    Edit in Studio
                  </InkCircle>
                </Link>
              </footer>
            </div>
          </div>
        </section>
      </article>
    </NotesShell>
  );
}
