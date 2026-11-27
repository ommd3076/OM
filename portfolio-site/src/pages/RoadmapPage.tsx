import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AsciiCanvas } from '../components/ui/AsciiCanvas';
import { StatusDot } from '../components/ui/StatusDot';
import { PORTFOLIO_DATA, type RoadmapItem } from '../data/portfolio';

const ROADMAP_VOTES_KEY = 'om_roadmap_votes_v1';

function readStoredVotes(): string[] {
  try {
    const raw = window.localStorage.getItem(ROADMAP_VOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

export function RoadmapPage() {
  const { roadmapPage } = PORTFOLIO_DATA;
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [votedIds, setVotedIds] = useState<string[]>(readStoredVotes);

  useEffect(() => {
    try {
      window.localStorage.setItem(ROADMAP_VOTES_KEY, JSON.stringify(votedIds));
    } catch {
      // Ignore storage errors
    }
  }, [votedIds]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of roadmapPage.items) {
      seen.add(item.category);
    }
    return ['ALL', ...Array.from(seen)];
  }, [roadmapPage.items]);

  const filteredItems = useMemo(
    () =>
      activeCategory === 'ALL'
        ? roadmapPage.items
        : roadmapPage.items.filter((item) => item.category === activeCategory),
    [roadmapPage.items, activeCategory],
  );

  const toggleVote = (index: string) => {
    setVotedIds((prev) =>
      prev.includes(index)
        ? prev.filter((id) => id !== index)
        : [...prev, index],
    );
  };

  const columns: {
    id: RoadmapItem['column'];
    label: string;
    variant: 'shipped' | 'accent' | 'planned';
  }[] = [
    { id: 'shipped', label: 'Shipped', variant: 'shipped' },
    { id: 'in_progress', label: 'In progress', variant: 'accent' },
    { id: 'planned', label: 'Planned', variant: 'planned' },
  ];

  return (
    <section className="relative overflow-hidden bg-black px-16 pt-120 pb-80 text-white lg:px-80 lg:pt-160 lg:pb-112">
      <AsciiCanvas
        mode="backdrop"
        seed="roadmap-board"
        interactive={false}
        className="pointer-events-none absolute inset-0 h-full opacity-20"
      />

      <div className="relative z-10 mx-auto max-w-1440">
        <p className="font-mono text-caption-10 uppercase text-mid-grey">
          {roadmapPage.eyebrow}
        </p>
        <h1 className="mt-12 text-headline-20 font-medium text-white">
          {roadmapPage.heading}
        </h1>
        <p className="mt-16 max-w-600 text-body-20 text-ghost-grey">
          {roadmapPage.summary}
        </p>

        {/* Category Filter Pills */}
        <div
          role="group"
          aria-label="Filter roadmap by category"
          className="mt-32 flex flex-wrap gap-8"
        >
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-4 border px-12 py-6 font-mono text-ui uppercase transition-colors duration-150 ${
                  isSelected
                    ? 'border-off-white bg-off-white text-black'
                    : 'border-white/20 text-ghost-grey hover:border-white/40 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="mt-32 flex flex-col gap-16 lg:flex-row">
          {columns.map((column) => {
            const colItems = filteredItems.filter(
              (item) => item.column === column.id,
            );

            return (
              <div
                key={column.id}
                className="flex-1 rounded-8 border border-white/15 bg-black p-20"
              >
                <div className="mb-16 flex items-center justify-between gap-8 border-b border-white/12 pb-12 font-mono text-caption-10 uppercase text-white">
                  <span className="inline-flex items-center gap-8">
                    <StatusDot
                      variant={column.variant}
                      ping={column.id === 'in_progress'}
                    />
                    <span>{column.label}</span>
                  </span>
                  <span className="tabular-nums text-mid-grey">
                    {colItems.length}
                  </span>
                </div>

                {colItems.length === 0 ? (
                  <div className="rounded-4 border border-dashed border-white/15 p-20 text-center font-mono text-caption-10 uppercase text-mid-grey">
                    NOTHING HERE YET
                  </div>
                ) : (
                  <ul className="flex flex-col gap-16">
                    {colItems.map((item) => {
                      const isVoted = votedIds.includes(item.index);
                      const voteCount = item.defaultVotes + (isVoted ? 1 : 0);

                      return (
                        <li
                          key={item.index}
                          className="rounded-8 border border-current/20 p-16"
                        >
                          <div className="flex items-center justify-between gap-8">
                            <span className="tabular-nums font-mono text-ui uppercase text-mid-grey">
                              {item.index} · {item.category}
                            </span>

                            <button
                              type="button"
                              aria-pressed={isVoted}
                              aria-label={`Upvote ${item.title} (${voteCount} votes)`}
                              onClick={() => toggleVote(item.index)}
                              className={`inline-flex items-center gap-4 rounded-4 border px-8 py-4 font-mono text-ui tabular-nums transition-colors duration-150 ${
                                isVoted
                                  ? 'border-off-white bg-off-white text-black'
                                  : 'border-white/20 text-ghost-grey hover:border-white/40 hover:text-white'
                              }`}
                            >
                              <span aria-hidden="true">▲</span>
                              <span>{voteCount}</span>
                            </button>
                          </div>

                          <h2 className="mt-10 text-body-20 font-medium text-white">
                            {item.link ? (
                              <Link
                                to={item.link}
                                className="underline decoration-white/25 underline-offset-4 hover:decoration-white"
                              >
                                {item.title}
                              </Link>
                            ) : (
                              item.title
                            )}
                          </h2>

                          <p className="mt-8 text-body-10 text-ghost-grey">
                            {item.description}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
