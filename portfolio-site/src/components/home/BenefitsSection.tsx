import { useCallback, useMemo, useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { AsciiCanvas } from '../ui/AsciiCanvas';
import { RailToc, type RailTocItem } from '../ui/RailToc';

const STAGGER_OFFSETS = ['lg:ml-0', 'lg:ml-[12%]', 'lg:ml-[24%]'] as const;

export function BenefitsSection() {
  const { benefits } = PORTFOLIO_DATA;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reachedIds, setReachedIds] = useState<Set<string>>(() => new Set());

  const tocItems: RailTocItem[] = useMemo(
    () =>
      benefits.items.map((item, idx) => ({
        id: `habit-${item.index}`,
        label: item.title,
        depth: idx % 3,
      })),
    [benefits.items],
  );

  const handleActiveChange = useCallback(
    (nextActive: string | null, nextReached: Set<string>) => {
      setActiveId((prev) => (prev === nextActive ? prev : nextActive));
      setReachedIds((prev) => {
        if (
          prev.size === nextReached.size &&
          Array.from(nextReached).every((id) => prev.has(id))
        ) {
          return prev;
        }
        return nextReached;
      });
    },
    [],
  );

  return (
    <>
      <AsciiCanvas
        mode="seam"
        direction="light-to-dark"
        seed="home-light-to-dark"
      />

      <section
        id="features"
        className="scroll-mt-120 bg-black px-16 py-64 text-white lg:px-80 lg:py-128"
      >
        <div className="grid grid-cols-1 gap-x-24 gap-y-48 lg:grid-cols-12">
          {/* Left Sticky Heading & Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-112 lg:self-start">
            <h2 className="text-headline-10 font-medium text-white">
              {benefits.heading}
            </h2>
            <p className="mt-16 max-w-440 text-body-20 text-ghost-grey">
              {benefits.summary}
            </p>
          </div>

          {/* Middle Sticky RailTOC positioned directly left of 001, 002, ... */}
          <div className="lg:col-span-3 lg:sticky lg:top-112 lg:self-start">
            <RailToc
              items={tocItems}
              title="On this page"
              indent={12}
              offset={240}
              onActiveChange={handleActiveChange}
            />
          </div>

          {/* Right Staggered Habits with Square Borders & Square Number Boxes */}
          <div className="flex flex-col gap-48 lg:col-span-5">
            {benefits.items.map((item, idx) => {
              const habitId = `habit-${item.index}`;
              const offsetClass = STAGGER_OFFSETS[idx % STAGGER_OFFSETS.length];
              const isActive = activeId === habitId;
              const isReached = reachedIds.has(habitId);

              return (
                <article
                  key={item.index}
                  id={habitId}
                  className={`group relative ml-0 w-full scroll-mt-140 border p-20 transition-colors duration-200 lg:max-w-[76%] lg:p-24 ${offsetClass} ${
                    isActive
                      ? 'border-[#1d63ff] bg-[#1d63ff]/[0.06]'
                      : isReached
                        ? 'border-[#1d63ff]/55 bg-black-deep/35'
                        : 'border-[#1d63ff]/35 bg-black-deep/20 hover:border-[#1d63ff]/80'
                  }`}
                >
                  {/* 4 Corner Square Selection Handles (matching Figma blue frame) */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -top-3 -left-3 size-6 border transition-colors ${
                      isActive
                        ? 'border-[#1d63ff] bg-white'
                        : 'border-[#1d63ff]/75 bg-black group-hover:border-[#1d63ff] group-hover:bg-white'
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -top-3 -right-3 size-6 border transition-colors ${
                      isActive
                        ? 'border-[#1d63ff] bg-white'
                        : 'border-[#1d63ff]/75 bg-black group-hover:border-[#1d63ff] group-hover:bg-white'
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -bottom-3 -left-3 size-6 border transition-colors ${
                      isActive
                        ? 'border-[#1d63ff] bg-white'
                        : 'border-[#1d63ff]/75 bg-black group-hover:border-[#1d63ff] group-hover:bg-white'
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -bottom-3 -right-3 size-6 border transition-colors ${
                      isActive
                        ? 'border-[#1d63ff] bg-white'
                        : 'border-[#1d63ff]/75 bg-black group-hover:border-[#1d63ff] group-hover:bg-white'
                    }`}
                  />

                  <div className="flex items-center gap-12">
                    {/* Square box around 001..010 */}
                    <span
                      className={`inline-flex size-36 shrink-0 items-center justify-center border font-mono text-caption-10 tabular-nums transition-colors ${
                        isActive
                          ? 'border-[#1d63ff] bg-[#1d63ff]/20 text-[#6ba2ff]'
                          : isReached
                            ? 'border-[#1d63ff]/65 text-[#9bc0ff]'
                            : 'border-[#1d63ff]/45 text-mid-grey'
                      }`}
                    >
                      {item.index}
                    </span>

                    <h3 className="font-mono text-caption-20 uppercase text-white">
                      {item.title}
                    </h3>
                  </div>

                  <p className="mt-14 text-body-20 text-ghost-grey">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
