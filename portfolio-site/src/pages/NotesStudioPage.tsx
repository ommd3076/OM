import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { InkCircle, InkUnderline } from '../components/notes/InkMarks';
import { NoteProse } from '../components/notes/NoteProse';
import { NotesShell } from '../components/notes/NotesShell';
import {
  ApiError,
  createDraftNote,
  deleteNote,
  discardRevision,
  fetchAdminNotes,
  fetchAuthSession,
  loginStudio,
  logoutStudio,
  publishNote,
  saveDraftNote,
  slugifyTitle,
  unpublishNote,
  type AdminNote,
} from '../lib/notesClient';

interface DraftForm {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
}

const EMPTY_FORM: DraftForm = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
};

function estimateWords(markdown: string): number {
  const words = markdown.trim().match(/\S+/g);
  return words ? words.length : 0;
}

function estimateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220));
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function StatusIndicator({ note }: { note: AdminNote }) {
  if (note.status === 'published') {
    return (
      <span className="inline-flex items-center gap-6 text-[11px] font-medium text-[#057b40]">
        <span aria-hidden="true" className="inline-block size-6 rounded-full bg-[#057b40]" />
        Published
      </span>
    );
  }
  if (note.status === 'published_with_revision') {
    return (
      <span className="inline-flex items-center gap-6 text-[11px] font-medium text-[#b85028]">
        <span aria-hidden="true" className="inline-block size-6 rounded-full bg-[#d98a2b]" />
        Live + Revision
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-6 text-[11px] font-medium text-[#64645e]">
      <span aria-hidden="true" className="inline-block size-6 rounded-full bg-[#9d9d95]" />
      Draft
    </span>
  );
}

export function NotesStudioPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'ok' | 'error';
    message: string;
  } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedNote = useMemo(
    () => notes.find((item) => item.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const loadNoteIntoForm = useCallback((note: AdminNote | null) => {
    if (!note) {
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setSlugTouched(false);
      setDirty(false);
      setConfirmDeleteOpen(false);
      return;
    }

    setSelectedId(note.id);
    setForm({
      title: note.draft.title,
      slug: note.draft.slug,
      excerpt: note.draft.excerpt,
      body: note.draft.body,
    });
    setSlugTouched(Boolean(note.draft.slug));
    setDirty(false);
    setConfirmDeleteOpen(false);
  }, []);

  const refreshNotes = useCallback(
    async (preferId?: string | null) => {
      setLoadingNotes(true);
      try {
        const list = await fetchAdminNotes();
        setNotes(list);
        if (preferId === null) {
          loadNoteIntoForm(null);
        } else if (preferId) {
          const target = list.find((n) => n.id === preferId) ?? list[0] ?? null;
          loadNoteIntoForm(target);
        } else if (selectedId) {
          const current = list.find((n) => n.id === selectedId) ?? list[0] ?? null;
          loadNoteIntoForm(current);
        } else {
          loadNoteIntoForm(list[0] ?? null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setAuthenticated(false);
        } else {
          setFeedback({
            tone: 'error',
            message: err instanceof Error ? err.message : 'Failed to load notes.',
          });
        }
      } finally {
        setLoadingNotes(false);
      }
    },
    [loadNoteIntoForm, selectedId],
  );

  useEffect(() => {
    let active = true;
    fetchAuthSession()
      .then((authed) => {
        if (!active) return;
        setAuthenticated(authed);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setAuthenticated(false);
        setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authenticated) {
      void refreshNotes();
    }
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      await loginStudio(passphrase);
      setPassphrase('');
      setAuthenticated(true);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Authentication failed.',
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusyAction('logout');
    try {
      await logoutStudio();
      setAuthenticated(false);
      setNotes([]);
      loadNoteIntoForm(null);
      setFeedback(null);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSelectNote = (note: AdminNote) => {
    if (
      dirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved edits in the editor and switch notes?')
    ) {
      return;
    }
    setFeedback(null);
    loadNoteIntoForm(note);
  };

  const handleNewDraft = () => {
    if (
      dirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Start a new draft and clear your unsaved local edits?')
    ) {
      return;
    }
    setFeedback(null);
    setMode('write');
    loadNoteIntoForm(null);
  };

  const updateTitle = (value: string) => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      title: value,
      slug:
        !slugTouched && !selectedNote?.isPublished
          ? slugifyTitle(value)
          : prev.slug,
    }));
  };

  const updateSlug = (value: string) => {
    setDirty(true);
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: value }));
  };

  const applyMarkdownAction = (kind: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? form.body.length;
    const end = textarea.selectionEnd ?? form.body.length;
    const selected = form.body.slice(start, end);
    const before = form.body.slice(0, start);
    const after = form.body.slice(end);

    let replacement = selected;
    let cursorOffsetStart = 0;
    let cursorOffsetEnd = 0;

    if (kind === 'h2') {
      const text = selected || 'Section heading';
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}## ${text}`;
      cursorOffsetStart = prefix.length + 3;
      cursorOffsetEnd = cursorOffsetStart + text.length;
    } else if (kind === 'h3') {
      const text = selected || 'Subheading';
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}### ${text}`;
      cursorOffsetStart = prefix.length + 4;
      cursorOffsetEnd = cursorOffsetStart + text.length;
    } else if (kind === 'bold') {
      const text = selected || 'emphasized text';
      replacement = `**${text}**`;
      cursorOffsetStart = 2;
      cursorOffsetEnd = 2 + text.length;
    } else if (kind === 'italic') {
      const text = selected || 'italic text';
      replacement = `*${text}*`;
      cursorOffsetStart = 1;
      cursorOffsetEnd = 1 + text.length;
    } else if (kind === 'quote') {
      const text = selected || 'Quiet note or pull-quote.';
      const quoted = text
        .split('\n')
        .map((line) => (line.startsWith('> ') ? line : `> ${line}`))
        .join('\n');
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}${quoted}`;
      cursorOffsetStart = prefix.length + 2;
      cursorOffsetEnd = replacement.length;
    } else if (kind === 'code') {
      const text = selected || 'symbolName';
      replacement = `\`${text}\``;
      cursorOffsetStart = 1;
      cursorOffsetEnd = 1 + text.length;
    } else if (kind === 'codeblock') {
      const text = selected || 'const example = true;';
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}\`\`\`typescript\n${text}\n\`\`\`\n`;
      cursorOffsetStart = prefix.length + '```typescript\n'.length;
      cursorOffsetEnd = cursorOffsetStart + text.length;
    } else if (kind === 'list') {
      const text = selected || 'First point\nSecond point';
      const listed = text
        .split('\n')
        .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
        .join('\n');
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}${listed}`;
      cursorOffsetStart = prefix.length + 2;
      cursorOffsetEnd = replacement.length;
    } else if (kind === 'hr') {
      const prefix = before.length > 0 && !before.endsWith('\n\n') ? '\n\n' : '';
      replacement = `${prefix}---\n\n`;
      cursorOffsetStart = replacement.length;
      cursorOffsetEnd = replacement.length;
    } else if (kind === 'link') {
      const text = selected || 'link label';
      replacement = `[${text}](https://)`;
      cursorOffsetStart = `[${text}](`.length;
      cursorOffsetEnd = replacement.length - 1;
    }

    const nextBody = `${before}${replacement}${after}`;
    setForm((prev) => ({ ...prev, body: nextBody }));
    setDirty(true);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + cursorOffsetStart,
        start + cursorOffsetEnd,
      );
    });
  };

  const persistDraftInternal = async (): Promise<AdminNote> => {
    const cleanSlug = slugifyTitle(form.slug || form.title);
    const payload = {
      title: form.title,
      slug: cleanSlug,
      excerpt: form.excerpt,
      body: form.body,
    };

    const saved = selectedId
      ? await saveDraftNote(selectedId, payload)
      : await createDraftNote(payload);

    setNotes((prev) => {
      const exists = prev.some((n) => n.id === saved.id);
      return exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev];
    });
    loadNoteIntoForm(saved);
    return saved;
  };

  const handleSaveDraft = async () => {
    setFeedback(null);
    setBusyAction('save');
    try {
      const saved = await persistDraftInternal();
      setFeedback({
        tone: 'ok',
        message: saved.isPublished
          ? 'Revision saved as draft. Live published article stays unchanged until you publish the revision.'
          : 'Private draft saved. It remains hidden from public URLs.',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthenticated(false);
      } else {
        setFeedback({
          tone: 'error',
          message: err instanceof Error ? err.message : 'Could not save draft.',
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    setFeedback(null);
    setBusyAction('publish');
    try {
      let targetId = selectedId;
      if (!targetId || dirty) {
        const saved = await persistDraftInternal();
        targetId = saved.id;
      }
      const published = await publishNote(targetId);
      setNotes((prev) => prev.map((n) => (n.id === published.id ? published : n)));
      loadNoteIntoForm(published);
      setFeedback({
        tone: 'ok',
        message: `Published live at /notes/${published.published?.slug ?? published.draft.slug}.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthenticated(false);
      } else {
        setFeedback({
          tone: 'error',
          message: err instanceof Error ? err.message : 'Could not publish note.',
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedId) return;
    setFeedback(null);
    setBusyAction('unpublish');
    try {
      const updated = await unpublishNote(selectedId);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      loadNoteIntoForm(updated);
      setFeedback({
        tone: 'ok',
        message:
          'Note unpublished. Public URL now returns 404 while the draft stays in Studio.',
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not unpublish note.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDiscardRevision = async () => {
    if (!selectedId) return;
    setFeedback(null);
    setBusyAction('discard');
    try {
      const reverted = await discardRevision(selectedId);
      setNotes((prev) => prev.map((n) => (n.id === reverted.id ? reverted : n)));
      loadNoteIntoForm(reverted);
      setFeedback({
        tone: 'ok',
        message:
          'Unpublished revision discarded. Draft matches the live article again.',
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          err instanceof Error ? err.message : 'Could not discard revision.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    const deletedTitle = form.title || 'note';
    setFeedback(null);
    setBusyAction('delete');
    try {
      await deleteNote(selectedId);
      const remaining = notes.filter((n) => n.id !== selectedId);
      setNotes(remaining);
      loadNoteIntoForm(remaining[0] ?? null);
      setConfirmDeleteOpen(false);
      setFeedback({
        tone: 'ok',
        message: `Deleted "${deletedTitle}".`,
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not delete note.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const wordCount = estimateWords(form.body);
  const readingMinutes = estimateReadingMinutes(wordCount);
  const resolvedSlug = slugifyTitle(form.slug || form.title);

  if (!authChecked) {
    return (
      <NotesShell>
        <section className="bg-[#f4f4f2] px-20 py-96 lg:px-48">
          <div className="mx-auto max-w-[540px] text-[15px] text-[#64645e]">
            Verifying studio session…
          </div>
        </section>
      </NotesShell>
    );
  }

  if (!authenticated) {
    return (
      <NotesShell>
        <section className="relative overflow-hidden bg-[#f4f4f2] px-20 pt-56 pb-112 lg:px-48 lg:pt-88 lg:pb-144">
          <svg
            aria-hidden="true"
            viewBox="0 0 360 180"
            className="pointer-events-none absolute -top-24 -right-24 h-[150px] w-[260px] opacity-85"
          >
            <path
              d="M 190 -10 C 170 60, 210 130, 370 105"
              fill="none"
              stroke="#b845e6"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          </svg>

          <div className="relative z-10 mx-auto max-w-[540px]">
            <Link
              to="/notes"
              className="group inline-flex items-center gap-6 text-[14px] font-medium text-[#64645e] hover:text-[#282825]"
            >
              <InkUnderline variant="sweep" tone="coral" trigger="hover">
                ← Back to Notes
              </InkUnderline>
            </Link>

            <h1 className="mt-32 font-serif text-[clamp(40px,5.2vw,60px)] leading-[1.03] font-normal tracking-[-0.03em] text-[#282825]">
              Sign in to{' '}
              <InkCircle tone="violet" trigger="mount">
                <em className="italic">write</em>
              </InkCircle>{' '}
              &amp; revise.
            </h1>

            <p className="mt-18 text-[16px] leading-[1.68] text-[#64645e]">
              Private drafts remain inside local SQLite behind an HttpOnly
              session cookie. Public URLs only serve published essays.
            </p>

            <form onSubmit={handleLogin} className="mt-36 space-y-24">
              <div>
                <label
                  htmlFor="studio-passphrase"
                  className="block text-[13px] font-medium text-[#282825]"
                >
                  Author passphrase
                </label>
                <div className="mt-8 flex items-end gap-12 border-b border-[#282825]/35 pb-10 focus-within:border-[#282825]">
                  <input
                    id="studio-passphrase"
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Enter studio passphrase"
                    className="w-full border-0 bg-transparent text-[16px] text-[#282825] placeholder:text-[#64645e]/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase((v) => !v)}
                    className="shrink-0 cursor-pointer text-[12px] font-medium text-[#64645e] hover:text-[#282825]"
                  >
                    {showPassphrase ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {authError && (
                <div role="alert" className="text-[14px] font-medium text-[#b81a14]">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="cursor-pointer rounded-8 bg-[#020203] px-24 py-12 text-[14px] font-medium text-[#fbfbf9] transition-colors hover:bg-[#282825] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Verifying…' : 'Enter Studio'}
              </button>
            </form>
          </div>
        </section>
      </NotesShell>
    );
  }

  return (
    <NotesShell>
      {/* Top Studio Strip matching Ellipsus's calm app bar (home-s2.png) */}
      <div className="border-b border-[#d8d8d0] bg-[#f4f4f2] px-20 py-14 lg:px-48">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-14">
          <div className="flex flex-wrap items-center gap-24">
            <h1 className="font-serif text-[28px] leading-none font-normal tracking-[-0.025em] text-[#282825]">
              Author{' '}
              <InkUnderline variant="sweep" tone="violet" trigger="mount">
                <em className="italic">Studio</em>
              </InkUnderline>
            </h1>

            <div
              role="tablist"
              aria-label="Editor view mode"
              className="flex items-center gap-16 text-[13px] font-medium"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'write'}
                onClick={() => setMode('write')}
                className={`cursor-pointer py-2 transition-colors ${
                  mode === 'write'
                    ? 'text-[#282825]'
                    : 'text-[#64645e] hover:text-[#282825]'
                }`}
              >
                <InkUnderline
                  variant="wave"
                  tone="coral"
                  trigger="active"
                  active={mode === 'write'}
                >
                  Write
                </InkUnderline>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'preview'}
                onClick={() => setMode('preview')}
                className={`cursor-pointer py-2 transition-colors ${
                  mode === 'preview'
                    ? 'text-[#282825]'
                    : 'text-[#64645e] hover:text-[#282825]'
                }`}
              >
                <InkUnderline
                  variant="wave"
                  tone="violet"
                  trigger="active"
                  active={mode === 'preview'}
                >
                  Preview
                </InkUnderline>
              </button>
            </div>

            <span className="text-[12px] text-[#64645e]">
              {dirty ? 'Unsaved changes' : 'Synced'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-10">
            {selectedNote?.published && (
              <Link
                to={`/notes/${selectedNote.published.slug}`}
                className="text-[13px] font-medium text-[#057b40] underline decoration-[#057b40]/40 underline-offset-4 hover:decoration-[#057b40]"
              >
                View Live ↗
              </Link>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={busyAction !== null}
              className="cursor-pointer rounded-8 border border-[#282825]/30 bg-white/70 px-14 py-6 text-[13px] font-medium text-[#282825] transition-colors hover:border-[#282825] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busyAction === 'save' ? 'Saving…' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={
                busyAction !== null ||
                Boolean(
                  selectedNote?.isPublished &&
                    !selectedNote.hasUnpublishedChanges &&
                    !dirty,
                )
              }
              className="cursor-pointer rounded-8 bg-[#020203] px-16 py-6 text-[13px] font-medium text-[#fbfbf9] transition-colors hover:bg-[#282825] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busyAction === 'publish'
                ? 'Publishing…'
                : selectedNote?.isPublished
                  ? selectedNote.hasUnpublishedChanges || dirty
                    ? 'Publish Revision'
                    : 'Published'
                  : 'Publish'}
            </button>

            {selectedNote?.hasUnpublishedChanges && (
              <button
                type="button"
                onClick={handleDiscardRevision}
                disabled={busyAction !== null}
                className="cursor-pointer px-8 py-6 text-[13px] font-medium text-[#64645e] underline underline-offset-4 hover:text-[#282825]"
              >
                Discard Revision
              </button>
            )}

            {selectedNote?.isPublished && (
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={busyAction !== null}
                className="cursor-pointer px-8 py-6 text-[13px] font-medium text-[#64645e] underline underline-offset-4 hover:text-[#282825]"
              >
                Unpublish
              </button>
            )}

            {selectedId && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={busyAction !== null}
                className="cursor-pointer px-8 py-6 text-[13px] font-medium text-[#b81a14] hover:underline"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={busyAction !== null}
              className="cursor-pointer pl-6 text-[12px] text-[#64645e] hover:text-[#282825]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Ellipsus connected-drafts two-pane workspace */}
      <div className="mx-auto grid min-h-[75svh] max-w-[1280px] lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Left Navigation Drawer (active note marked like home-s2.png My work circle/rail) */}
        <aside className="border-b border-[#d8d8d0] bg-[#f4f4f2] px-20 py-24 lg:border-r lg:border-b-0 lg:px-24">
          <div className="flex items-center justify-between gap-8 pb-16">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#64645e]">
              Drafts &amp; Essays ({notes.length})
            </span>
            <button
              type="button"
              onClick={handleNewDraft}
              className="cursor-pointer rounded-8 bg-[#020203] px-12 py-6 text-[12px] font-medium text-[#fbfbf9] transition-colors hover:bg-[#282825]"
            >
              + New draft
            </button>
          </div>

          {loadingNotes && notes.length === 0 ? (
            <p className="py-20 text-[14px] text-[#64645e]">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="py-20 text-[14px] text-[#64645e]">
              No notes yet. Draft your first essay on the manuscript sheet.
            </p>
          ) : (
            <ul className="divide-y divide-[#e2e2da]">
              {notes.map((item) => {
                const isActive = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectNote(item)}
                      className={`w-full cursor-pointer border-l-2 py-14 pl-12 pr-6 text-left transition-colors ${
                        isActive
                          ? 'border-[#45a07a] bg-[#f8f8f7]'
                          : 'border-transparent hover:bg-[#f8f8f7]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-8">
                        <StatusIndicator note={item} />
                        <span className="tabular-nums text-[11px] text-[#64645e]">
                          {formatShortDate(item.draft.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-6 line-clamp-2 font-serif text-[20px] leading-[1.2] text-[#282825]">
                        {item.draft.title || 'Untitled note'}
                      </p>
                      <p className="mt-4 truncate font-mono text-[11px] text-[#64645e]">
                        /notes/{item.draft.slug || 'draft'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Centered Open Manuscript Sheet on #f8f8f7 Paper (echoes home-s5.png Chapter 5) */}
        <div className="min-w-0 bg-[#f8f8f7] px-20 py-36 sm:px-40 lg:px-64 lg:py-48">
          <div className="mx-auto max-w-[700px]">
            {selectedNote?.isPublished && (
              <p className="mb-18 border-l-2 border-[#057b40] pl-12 text-[13px] text-[#64645e]">
                Live article stays unchanged at{' '}
                <Link
                  to={`/notes/${selectedNote.published?.slug}`}
                  className="font-medium text-[#282825] underline decoration-[#057b40] underline-offset-4"
                >
                  /notes/{selectedNote.published?.slug}
                </Link>{' '}
                while you edit drafts here. Click{' '}
                <strong className="font-semibold text-[#282825]">
                  Publish Revision
                </strong>{' '}
                to update the public article.
              </p>
            )}

            {feedback && (
              <div
                role="status"
                className={`mb-20 border-l-2 pl-12 text-[14px] font-medium ${
                  feedback.tone === 'ok'
                    ? 'border-[#057b40] text-[#057b40]'
                    : 'border-[#b81a14] text-[#b81a14]'
                }`}
              >
                {feedback.message}
              </div>
            )}

            {confirmDeleteOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-dialog-title"
                className="mb-28 border-y border-[#b81a14]/35 bg-[#f1d4d0]/55 px-20 py-20 text-[#282825]"
              >
                <p
                  id="delete-dialog-title"
                  className="font-serif text-[26px] leading-[1.18]"
                >
                  Permanently delete “{form.title || 'Untitled note'}”?
                </p>
                <p className="mt-6 text-[14px] text-[#64645e]">
                  This removes both the private draft and any live published
                  article immediately.
                </p>
                <div className="mt-16 flex flex-wrap items-center gap-12">
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={busyAction !== null}
                    className="cursor-pointer rounded-8 bg-[#b81a14] px-16 py-8 text-[13px] font-medium text-white"
                  >
                    {busyAction === 'delete' ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="cursor-pointer px-12 py-8 text-[13px] font-medium text-[#282825]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {mode === 'write' ? (
              <div>
                <div>
                  <label htmlFor="note-title" className="sr-only">
                    Post title
                  </label>
                  <textarea
                    id="note-title"
                    rows={2}
                    value={form.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    placeholder="Title of your essay…"
                    className="w-full resize-none border-0 bg-transparent font-serif text-[clamp(34px,4.4vw,54px)] leading-[1.05] font-normal tracking-[-0.03em] text-[#282825] placeholder:text-[#c5c5ba] focus:outline-none"
                  />
                </div>

                {/* Underline-only URL slug & excerpt strip */}
                <div className="mt-16 space-y-12 border-y border-[#e2e2da] py-16">
                  <div className="flex flex-wrap items-center justify-between gap-12">
                    <div className="flex flex-1 flex-wrap items-center gap-6">
                      <label
                        htmlFor="note-slug"
                        className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#64645e]"
                      >
                        Slug
                      </label>
                      <span className="font-mono text-[13px] text-[#64645e]">
                        /notes/
                      </span>
                      <input
                        id="note-slug"
                        type="text"
                        value={form.slug}
                        onChange={(e) => updateSlug(e.target.value)}
                        placeholder={resolvedSlug || 'your-post-slug'}
                        className="min-w-180 flex-1 border-b border-transparent bg-transparent py-2 font-mono text-[13px] text-[#282825] focus:border-[#282825] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSlugTouched(false);
                        setDirty(true);
                        setForm((prev) => ({
                          ...prev,
                          slug: slugifyTitle(prev.title),
                        }));
                      }}
                      className="cursor-pointer text-[12px] text-[#64645e] underline underline-offset-4 hover:text-[#282825]"
                    >
                      Sync from title
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="note-excerpt"
                      className="block text-[11px] font-semibold tracking-[0.06em] uppercase text-[#64645e]"
                    >
                      Subtitle
                    </label>
                    <input
                      id="note-excerpt"
                      type="text"
                      value={form.excerpt}
                      onChange={(e) => {
                        setDirty(true);
                        setForm((prev) => ({ ...prev, excerpt: e.target.value }));
                      }}
                      placeholder="One concise sentence summarizing what this essay covers."
                      className="mt-4 w-full border-b border-transparent bg-transparent py-4 text-[16px] text-[#282825] placeholder:text-[#64645e]/55 focus:border-[#282825] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Ellipsus Inline Format Controls (echoes home-s2.png top format strip) */}
                <div className="mt-16 flex flex-wrap items-center justify-between gap-10 border-b border-[#e2e2da] pb-14">
                  <div
                    role="toolbar"
                    aria-label="Markdown formatting"
                    className="flex flex-wrap items-center gap-4"
                  >
                    {[
                      { id: 'h2', label: 'H2' },
                      { id: 'h3', label: 'H3' },
                      { id: 'bold', label: 'Bold' },
                      { id: 'italic', label: 'Italic' },
                      { id: 'quote', label: 'Quote' },
                      { id: 'code', label: 'Code' },
                      { id: 'codeblock', label: 'Block' },
                      { id: 'list', label: 'List' },
                      { id: 'hr', label: 'Rule' },
                      { id: 'link', label: 'Link' },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => applyMarkdownAction(tool.id)}
                        className="cursor-pointer rounded-4 px-8 py-4 text-[12px] font-medium text-[#64645e] transition-colors hover:bg-[#ecece7] hover:text-[#282825]"
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  <span className="tabular-nums text-[12px] text-[#64645e]">
                    {wordCount} words · {readingMinutes} min read
                  </span>
                </div>

                <div className="mt-20">
                  <label htmlFor="note-body" className="sr-only">
                    Article body in Markdown
                  </label>
                  <textarea
                    ref={bodyRef}
                    id="note-body"
                    value={form.body}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, body: e.target.value }));
                    }}
                    rows={18}
                    placeholder="Write in Markdown… ## headings draw subtle ink underlines, > pull quotes breathe in italic serif, **bold**, *italic*, `code`, lists, and fenced blocks."
                    className="min-h-[420px] w-full resize-y border-0 bg-transparent text-[17px] leading-[1.82] text-[#282825] placeholder:text-[#64645e]/55 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Preview Mode — mirrors pure Ellipsus unboxed reader layout */
              <article>
                <div className="border-b border-[#e2e2da] pb-28">
                  <div className="flex flex-wrap items-center justify-between gap-12 text-[12px] text-[#64645e]">
                    <span className="rounded-4 border border-[#282825]/60 px-8 py-2 text-[10px] font-medium tracking-[0.08em] uppercase text-[#282825]">
                      {selectedNote?.hasUnpublishedChanges
                        ? 'Draft revision preview'
                        : selectedNote?.isPublished
                          ? 'Published preview'
                          : 'Private draft preview'}
                    </span>
                    <span className="font-mono">
                      /notes/{resolvedSlug || 'untitled'}
                    </span>
                  </div>

                  <h1 className="mt-24 font-serif text-[clamp(38px,5vw,60px)] leading-[1.04] font-normal tracking-[-0.03em] text-[#282825]">
                    {form.title || 'Untitled note'}
                  </h1>

                  {form.excerpt && (
                    <p className="mt-18 text-[18px] leading-[1.65] text-[#64645e]">
                      {form.excerpt}
                    </p>
                  )}

                  <p className="mt-18 text-[13px] text-[#64645e]">
                    Written by Om M. Doddamani · {readingMinutes} min read ·{' '}
                    {wordCount} words
                  </p>
                </div>

                <div className="pt-32">
                  {form.body.trim() ? (
                    <NoteProse content={form.body} />
                  ) : (
                    <p className="font-serif text-[20px] italic text-[#64645e]">
                      Start writing in the editor to preview formatted prose
                      here.
                    </p>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </NotesShell>
  );
}
