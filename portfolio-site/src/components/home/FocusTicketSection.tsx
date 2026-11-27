import { useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { AsciiCanvas } from '../ui/AsciiCanvas';
import { SplitPillButton } from '../ui/SplitPillButton';
import { StatusDot } from '../ui/StatusDot';
import { TicketCard } from '../ui/TicketCard';

export function FocusTicketSection() {
  const { pricingSection } = PORTFOLIO_DATA;
  const [modeIndex, setModeIndex] = useState<0 | 1>(0);
  const activeMode = pricingSection.modes[modeIndex];

  return (
    <>
      <AsciiCanvas
        mode="seam"
        direction="dark-to-light"
        seed="home-dark-to-light"
      />

      <section
        id="pricing"
        className="scroll-mt-120 bg-off-white px-16 py-64 text-black lg:px-80 lg:py-128"
      >
        <div className="mb-32 flex flex-wrap items-end justify-between gap-16">
          <h2 className="text-headline-10 font-medium text-black">
            {pricingSection.heading}
          </h2>
          <span className="rounded-4 border border-black/20 px-10 py-4 font-mono text-ui uppercase text-dark-grey">
            {pricingSection.badgeLabel}
          </span>
        </div>

        <TicketCard
          surface="dark"
          left={
            <div className="flex h-full flex-col justify-between gap-24">
              <div>
                <p className="inline-flex items-center gap-8 font-mono text-caption-10 uppercase text-mid-grey">
                  <StatusDot />
                  <span>{activeMode.eyebrow}</span>
                </p>
                <p className="mt-24 tabular-nums text-display-10 font-medium text-white">
                  {activeMode.metricDisplay}
                </p>
                <p className="mt-16 font-mono text-caption-20 uppercase text-ghost-grey">
                  {activeMode.metricCaption}
                </p>
              </div>
              <p className="text-body-10 text-mid-grey">{activeMode.footnote}</p>
            </div>
          }
          right={
            <div className="flex h-full flex-col justify-between gap-24">
              <div className="flex flex-col gap-20">
                <div
                  role="group"
                  aria-label="Track mode"
                  className="inline-flex self-start rounded-8 border border-white/15 bg-black-deep p-4"
                >
                  {pricingSection.modes.map((mode, idx) => {
                    const isSelected = modeIndex === idx;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setModeIndex(idx as 0 | 1)}
                        className={`rounded-4 px-14 py-8 font-mono text-caption-10 uppercase transition-colors duration-150 motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${
                          isSelected
                            ? 'bg-off-white text-black'
                            : 'text-mid-grey hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                <ul className="divide-y divide-white/12">
                  {activeMode.rows.map((row) => (
                    <li
                      key={row.index}
                      className="flex items-baseline justify-between gap-12 py-12 font-mono text-caption-10"
                    >
                      <span className="tabular-nums text-mid-grey">
                        {row.index} · {row.label}
                      </span>
                      <span className="text-right text-white">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {activeMode.ctaHref.startsWith('/') ? (
                  <SplitPillButton
                    to={activeMode.ctaHref}
                    variant="secondary"
                    label={activeMode.ctaLabel}
                  />
                ) : (
                  <SplitPillButton
                    href={activeMode.ctaHref}
                    variant="secondary"
                    label={activeMode.ctaLabel}
                  />
                )}
              </div>
            </div>
          }
        />
      </section>
    </>
  );
}
