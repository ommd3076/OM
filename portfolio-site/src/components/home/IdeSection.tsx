import { useEffect, useMemo, useRef, useState } from 'react';
import { PORTFOLIO_DATA, type IdeFileEntry } from '../../data/portfolio';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { highlightCode } from '../../lib/highlight';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  FileIcon,
  FolderIcon,
  SearchIcon,
  TerminalIcon,
} from '../ui/Icons';

interface TerminalEntry {
  readonly id: number;
  readonly prompt: string;
  readonly command: string;
  readonly output: string;
}

interface SearchMatch {
  readonly repoId: string;
  readonly repoName: string;
  readonly folderName: string;
  readonly file: IdeFileEntry;
}

export function IdeSection() {
  const { ideProjects } = PORTFOLIO_DATA;
  const isReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const [activeRepoId, setActiveRepoId] = useState<string>(
    ideProjects[0].id,
  );
  const activeRepo = useMemo(
    () => ideProjects.find((r) => r.id === activeRepoId) ?? ideProjects[0],
    [ideProjects, activeRepoId],
  );

  const [activeFilePath, setActiveFilePath] = useState<string>(
    ideProjects[0].defaultFilePath,
  );
  const activeFile = useMemo(
    () =>
      activeRepo.files.find((f) => f.path === activeFilePath) ??
      activeRepo.files[0],
    [activeRepo, activeFilePath],
  );

  const [treeExpanded, setTreeExpanded] = useState(true);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([
    {
      id: 0,
      prompt: ideProjects[0].terminalPrompt,
      command: 'help',
      output: ideProjects[0].terminalCommands.help ?? '',
    },
  ]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const nextEntryIdRef = useRef(1);

  const highlightedLines = useMemo(
    () => highlightCode(activeFile.content, activeFile.language),
    [activeFile.content, activeFile.language],
  );

  const allFiles = useMemo<SearchMatch[]>(
    () =>
      ideProjects.flatMap((repo) =>
        repo.files.map((file) => ({
          repoId: repo.id,
          repoName: repo.name,
          folderName: repo.repoName,
          file,
        })),
      ),
    [ideProjects],
  );

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter(
      (item) =>
        item.file.path.toLowerCase().includes(q) ||
        item.file.name.toLowerCase().includes(q) ||
        item.repoName.toLowerCase().includes(q) ||
        item.folderName.toLowerCase().includes(q),
    );
  }, [allFiles, searchQuery]);

  const selectRepo = (repoId: string) => {
    const target = ideProjects.find((r) => r.id === repoId);
    if (!target) return;
    setActiveRepoId(target.id);
    setActiveFilePath(target.defaultFilePath);
    setMobileFilesOpen(false);
  };

  const openSearch = () => {
    setSearchQuery('');
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    window.requestAnimationFrame(() => {
      searchTriggerRef.current?.focus();
    });
  };

  const selectSearchMatch = (match: SearchMatch) => {
    setActiveRepoId(match.repoId);
    setActiveFilePath(match.file.path);
    setMobileFilesOpen(false);
    closeSearch();
  };

  // Global Cmd/Ctrl+K and Cmd/Ctrl+J shortcuts + Escape handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => {
          if (prev) {
            window.requestAnimationFrame(() =>
              searchTriggerRef.current?.focus(),
            );
            return false;
          }
          setSearchQuery('');
          return true;
        });
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === 'j') {
        e.preventDefault();
        setTerminalOpen((prev) => {
          const next = !prev;
          if (next) {
            window.requestAnimationFrame(() => {
              terminalInputRef.current?.focus();
            });
          }
          return next;
        });
        return;
      }

      if (e.key === 'Escape') {
        if (searchOpen) {
          e.preventDefault();
          closeSearch();
        } else if (mobileFilesOpen) {
          e.preventDefault();
          setMobileFilesOpen(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, mobileFilesOpen]);

  // Auto-focus search input when palette opens
  useEffect(() => {
    if (!searchOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [searchOpen]);

  // Keep terminal scrolled to bottom on new output
  useEffect(() => {
    if (!terminalOpen || !terminalScrollRef.current) return;
    terminalScrollRef.current.scrollTop =
      terminalScrollRef.current.scrollHeight;
  }, [terminalOpen, terminalHistory]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = terminalInput.trim();
    if (!raw) return;

    setTerminalInput('');

    if (raw === 'clear') {
      setTerminalHistory([]);
      return;
    }

    let output = '';
    const lower = raw.toLowerCase();

    if (lower === 'help') {
      output =
        activeRepo.terminalCommands.help ??
        'Commands: help, ls, tree, cat <file>, projects, pwd, whoami, clear';
    } else if (lower === 'pwd') {
      output = `~/${activeRepo.id}`;
    } else if (lower === 'whoami') {
      output = PORTFOLIO_DATA.identity.handle;
    } else if (lower === 'projects') {
      output = ideProjects
        .map((r) => `${r.id.padEnd(20, ' ')} ${r.repoName} (${r.stackBadge})`)
        .join('\n');
    } else if (lower === 'ls') {
      output =
        activeRepo.terminalCommands.ls ??
        activeRepo.files.map((f) => f.path).join('  ');
    } else if (lower === 'tree') {
      output =
        activeRepo.terminalCommands.tree ??
        activeRepo.files.map((f) => `├── ${f.path}`).join('\n');
    } else if (lower.startsWith('cat ')) {
      const target = raw.slice(4).trim();
      const matchedFile = activeRepo.files.find(
        (f) =>
          f.path === target ||
          f.name === target ||
          f.path.toLowerCase() === target.toLowerCase() ||
          f.name.toLowerCase() === target.toLowerCase(),
      );
      if (matchedFile) {
        output = matchedFile.content;
      } else if (activeRepo.terminalCommands[raw]) {
        output = activeRepo.terminalCommands[raw];
      } else {
        output = `cat: ${target}: No such file in ${activeRepo.repoName}`;
      }
    } else if (activeRepo.terminalCommands[raw]) {
      output = activeRepo.terminalCommands[raw];
    } else {
      output = `Command not found: "${raw}". Type "help" for available commands.`;
    }

    const id = nextEntryIdRef.current;
    nextEntryIdRef.current += 1;

    setTerminalHistory((prev) => [
      ...prev,
      {
        id,
        prompt: activeRepo.terminalPrompt,
        command: raw,
        output,
      },
    ]);
  };

  return (
    <section id="the-repo" className="scroll-mt-120 bg-off-white text-black">
      <div
        className={
          isReducedMotion
            ? 'h-auto'
            : 'lg:h-[calc(100svh+var(--repo-distance))]'
        }
      >
        <div
          className={`flex flex-col p-8 pt-68 pb-24 lg:px-16 lg:pt-116 lg:pb-16 ${
            isReducedMotion ? 'h-auto' : 'lg:sticky lg:top-0 lg:h-[100svh]'
          }`}
        >
          <div className="checkerboard-bezel flex flex-1 flex-col rounded-4 p-8">
            <div className="relative flex min-h-560 flex-1 flex-col overflow-hidden rounded-4 bg-black text-white ring-1 ring-white/10 lg:min-h-0">
              {/* IDE Top Bar */}
              <div className="flex h-48 shrink-0 items-center justify-between gap-8 border-b border-white/10 px-12 lg:h-34">
                <div className="flex min-w-0 flex-1 items-center gap-8">
                  <button
                    type="button"
                    aria-expanded={mobileFilesOpen}
                    aria-haspopup="true"
                    onClick={() => setMobileFilesOpen((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-6 rounded-2 border border-white/15 px-8 py-4 font-mono text-ui uppercase text-white lg:hidden"
                  >
                    <FolderIcon className="size-12" />
                    <span>{mobileFilesOpen ? 'Close files' : 'Open files'}</span>
                  </button>

                  <div
                    role="tablist"
                    aria-label="Portfolio repositories"
                    className="flex min-w-0 items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {ideProjects.map((repo) => {
                      const isActive = repo.id === activeRepo.id;
                      return (
                        <button
                          key={repo.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => selectRepo(repo.id)}
                          className={`shrink-0 rounded-2 px-8 py-4 font-mono text-ui transition-colors duration-150 motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${
                            isActive
                              ? 'bg-off-white text-black'
                              : 'text-mid-grey hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {repo.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="hidden max-w-320 shrink-0 truncate font-mono text-ui text-mid-grey md:block">
                  {activeRepo.repoName} — {activeFile.path}
                </p>

                <div className="flex shrink-0 items-center gap-6">
                  <button
                    ref={searchTriggerRef}
                    type="button"
                    onClick={openSearch}
                    aria-label="Search files (⌘K)"
                    className="inline-flex h-26 items-center gap-6 rounded-2 border border-white/15 px-8 font-mono text-ui text-ghost-grey transition-colors duration-150 hover:bg-white hover:text-black"
                  >
                    <SearchIcon className="size-12" />
                    <span>⌘{'\u00a0'}K</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={terminalOpen}
                    aria-label="Toggle terminal (⌘J)"
                    onClick={() => {
                      setTerminalOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          window.requestAnimationFrame(() =>
                            terminalInputRef.current?.focus(),
                          );
                        }
                        return next;
                      });
                    }}
                    className={`inline-flex h-26 items-center gap-6 rounded-2 border px-8 font-mono text-ui transition-colors duration-150 ${
                      terminalOpen
                        ? 'border-off-white bg-off-white text-black'
                        : 'border-white/15 text-ghost-grey hover:bg-white hover:text-black'
                    }`}
                  >
                    <TerminalIcon className="size-12" />
                    <span>⌘{'\u00a0'}J</span>
                  </button>
                </div>
              </div>

              {/* IDE Workspace Body */}
              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {/* Desktop File Tree Sidebar */}
                {isDesktop && (
                  <aside
                    aria-label="Repository file tree"
                    className="flex w-240 shrink-0 flex-col overflow-y-auto border-r border-white/10 p-12"
                  >
                  <button
                    type="button"
                    aria-expanded={treeExpanded}
                    onClick={() => setTreeExpanded((v) => !v)}
                    className="flex items-center gap-6 rounded-2 px-6 py-4 text-left font-mono text-ui uppercase text-mid-grey hover:text-white"
                  >
                    {treeExpanded ? (
                      <ChevronDownIcon className="size-12 shrink-0" />
                    ) : (
                      <ChevronRightIcon className="size-12 shrink-0" />
                    )}
                    <FolderIcon className="size-14 shrink-0" />
                    <span className="truncate">{activeRepo.name}</span>
                  </button>

                  {treeExpanded && (
                    <ul className="mt-6 flex flex-col gap-2 pl-8">
                      {activeRepo.files.map((file) => {
                        const isSelected = file.path === activeFile.path;
                        return (
                          <li key={file.path}>
                            <button
                              type="button"
                              onClick={() => setActiveFilePath(file.path)}
                              className={`flex w-full items-center gap-8 rounded-2 px-8 py-6 text-left font-mono text-ui transition-colors duration-150 ${
                                isSelected
                                  ? 'bg-white/12 text-white'
                                  : 'text-ghost-grey hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <FileIcon className="size-12 shrink-0 text-mid-grey" />
                              <span className="truncate">{file.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-auto border-t border-white/10 pt-12 font-mono text-ui text-mid-grey">
                    <p className="truncate">{activeRepo.stackBadge}</p>
                      <a
                        href={activeRepo.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-block text-ghost-grey underline underline-offset-4 hover:text-white"
                      >
                        github.com/ommd3076
                      </a>
                    </div>
                  </aside>
                )}

                {/* Mobile File Drawer */}
                {!isDesktop && mobileFilesOpen && (
                  <>
                    <div
                      aria-hidden="true"
                      onClick={() => setMobileFilesOpen(false)}
                      className="absolute inset-0 z-20 bg-black-deep/70 lg:hidden"
                    />
                    <aside
                      id="ide-mobile-files-drawer"
                      aria-label="Mobile file explorer"
                      className="absolute inset-y-0 left-0 z-20 flex w-240 max-w-[82vw] flex-col overflow-y-auto border-r border-white/15 bg-black p-12 lg:hidden"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-8">
                        <span className="truncate font-mono text-ui uppercase text-mid-grey">
                          {activeRepo.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMobileFilesOpen(false)}
                          aria-label="Close files"
                          className="rounded-2 p-4 text-ghost-grey hover:text-white"
                        >
                          <CloseIcon className="size-14" />
                        </button>
                      </div>

                      <ul className="mt-8 flex flex-col gap-4">
                        {activeRepo.files.map((file) => {
                          const isSelected = file.path === activeFile.path;
                          return (
                            <li key={file.path}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (file.path !== activeFile.path) {
                                    setActiveFilePath(file.path);
                                    setMobileFilesOpen(false);
                                  }
                                }}
                                className={`flex w-full items-center gap-8 rounded-2 px-8 py-6 text-left font-mono text-ui ${
                                  isSelected
                                    ? 'bg-white/12 text-white'
                                    : 'text-ghost-grey hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <FileIcon className="size-12 shrink-0 text-mid-grey" />
                                <span className="truncate">{file.name}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </aside>
                  </>
                )}

                {/* Syntax-Highlighted Code Viewer */}
                <div className="min-w-0 flex-1 overflow-auto p-16 font-mono text-caption-10 leading-[1.6]">
                  <div className="mb-12 flex items-center justify-between gap-12 border-b border-white/10 pb-8 text-ui text-mid-grey">
                    <span className="truncate">{activeFile.path}</span>
                    <span className="shrink-0 uppercase">
                      {activeFile.language}
                    </span>
                  </div>

                  <pre className="m-0 min-w-0 overflow-x-auto">
                    <code>
                      {highlightedLines.map((lineTokens, lineIdx) => (
                        <div key={lineIdx} className="flex min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-36 shrink-0 select-none pr-16 text-right tabular-nums text-mid-grey/50"
                          >
                            {lineIdx + 1}
                          </span>
                          <span className="min-w-0 whitespace-pre">
                            {lineTokens.length > 0 ? (
                              lineTokens.map((tok, tokIdx) => (
                                <span
                                  key={tokIdx}
                                  style={
                                    tok.colorVar
                                      ? { color: tok.colorVar }
                                      : undefined
                                  }
                                >
                                  {tok.text}
                                </span>
                              ))
                            ) : (
                              ' '
                            )}
                          </span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>

                {/* Desktop Code Minimap */}
                <div
                  aria-hidden="true"
                  className="hidden w-88 shrink-0 select-none flex-col gap-3 overflow-hidden border-l border-white/10 p-10 xl:flex"
                >
                  {activeFile.content
                    .split('\n')
                    .slice(0, 48)
                    .map((line, idx) => {
                      const pct = Math.min(
                        100,
                        Math.max(10, Math.round((line.trim().length / 72) * 100)),
                      );
                      return (
                        <span
                          key={idx}
                          style={{ width: `${pct}%` }}
                          className={`block h-2 rounded-2 ${
                            line.trim().length === 0
                              ? 'bg-transparent'
                              : 'bg-white/20'
                          }`}
                        />
                      );
                    })}
                </div>
              </div>

              {/* Interactive Terminal Drawer (⌘J) */}
              {terminalOpen && (
                <div className="flex h-184 shrink-0 flex-col border-t border-white/10 bg-black-deep p-12 font-mono text-ui">
                  <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-6 text-mid-grey">
                    <span>TERMINAL · {activeRepo.repoName}</span>
                    <button
                      type="button"
                      onClick={() => setTerminalOpen(false)}
                      aria-label="Close terminal"
                      className="text-ghost-grey hover:text-white"
                    >
                      <CloseIcon className="size-12" />
                    </button>
                  </div>

                  <div
                    ref={terminalScrollRef}
                    className="min-h-0 flex-1 overflow-y-auto pr-4 text-ghost-grey"
                  >
                    {terminalHistory.map((entry) => (
                      <div key={entry.id} className="mb-8">
                        <p className="text-mid-grey">
                          <span>{entry.prompt}</span>{' '}
                          <span className="text-white">{entry.command}</span>
                        </p>
                        {entry.output && (
                          <pre className="mt-2 whitespace-pre-wrap text-ghost-grey">
                            {entry.output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleTerminalSubmit}
                    className="mt-8 flex items-center gap-8 border-t border-white/10 pt-8"
                  >
                    <span className="shrink-0 text-mid-grey">
                      {activeRepo.terminalPrompt}
                    </span>
                    <input
                      ref={terminalInputRef}
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      aria-label="Terminal command input"
                      placeholder="help, ls, cat README.md, projects…"
                      className="min-w-0 flex-1 bg-transparent text-ui-20 text-white placeholder:text-mid-grey/60 outline-none lg:text-ui"
                    />
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ⌘K File Search Palette Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black-deep/80 px-16 pt-80 pb-32 lg:pt-128"
          onClick={closeSearch}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="File search"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-600 overflow-hidden rounded-8 border border-white/15 bg-black text-white animate-fade-in"
          >
            <div className="flex items-center gap-10 border-b border-white/12 px-16 py-12">
              <SearchIcon className="size-16 shrink-0 text-mid-grey" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchMatches.length > 0) {
                    e.preventDefault();
                    selectSearchMatch(searchMatches[0]);
                  }
                }}
                aria-label="Search files"
                placeholder="Search files across repositories…"
                className="min-w-0 flex-1 bg-transparent text-ui-20 text-white placeholder:text-mid-grey outline-none lg:text-body-10"
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="rounded-4 border border-white/15 px-8 py-4 font-mono text-ui uppercase text-mid-grey hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-360 overflow-y-auto p-8">
              {searchMatches.length === 0 ? (
                <p className="px-12 py-24 text-center font-mono text-caption-10 text-mid-grey">
                  No matching files — 0 results
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {searchMatches.map((match) => (
                    <li key={`${match.repoId}-${match.file.path}`}>
                      <button
                        type="button"
                        onClick={() => selectSearchMatch(match)}
                        className="flex w-full items-center justify-between gap-12 rounded-4 px-12 py-10 text-left font-mono text-caption-10 text-ghost-grey transition-colors duration-150 hover:bg-white/10 hover:text-white"
                      >
                        <span className="flex min-w-0 items-center gap-8">
                          <FileIcon className="size-14 shrink-0 text-mid-grey" />
                          <span className="truncate text-white">
                            {match.file.path}
                          </span>
                        </span>
                        <span className="shrink-0 text-ui text-mid-grey">
                          {match.repoName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
