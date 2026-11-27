import { useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { SplitPillButton } from '../ui/SplitPillButton';

export function FaqSection() {
  const { faqSection } = PORTFOLIO_DATA;
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set([0]));

  const toggleItem = (idx: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section
      id="faq"
      className="scroll-mt-120 bg-black px-16 py-64 text-white lg:px-80 lg:py-128"
    >
      <div className="grid grid-cols-1 gap-x-16 gap-y-40 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-112">
            <h2 className="text-headline-10 font-medium text-white">
              {faqSection.heading}
            </h2>
            <div className="mt-24">
              <SplitPillButton
                to={faqSection.ctaHref}
                variant="secondary"
                label={faqSection.ctaLabel}
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/15 border-t border-b border-white/15 lg:col-span-7 lg:col-start-6">
          {faqSection.items.map((item, idx) => {
            const isOpen = openIndices.has(idx);
            const btnId = `faq-trigger-${idx}`;
            const panelId = `faq-panel-${idx}`;

            return (
              <div key={item.index}>
                <button
                  id={btnId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(idx)}
                  className="flex w-full items-center justify-between gap-16 py-20 text-left focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <span className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-baseline sm:gap-12">
                    <span className="tabular-nums shrink-0 font-mono text-caption-10 text-mid-grey">
                      {item.index} /
                    </span>
                    <span className="font-mono text-caption-20 uppercase text-white">
                      {item.question}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="relative inline-flex size-24 shrink-0 items-center justify-center rounded-4 bg-white/10 text-white"
                  >
                    <span className="block h-1.5 w-10 bg-current" />
                    <span
                      className={`absolute h-10 w-1.5 bg-current transition-[transform,opacity] duration-150 motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${
                        isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                      }`}
                    />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${
                    isOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-20 text-body-20 leading-relaxed text-ghost-grey">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
