import { AsciiCanvas } from '../components/ui/AsciiCanvas';
import { SplitPillButton } from '../components/ui/SplitPillButton';
import { PORTFOLIO_DATA } from '../data/portfolio';

export function NotFoundPage() {
  const { notFound } = PORTFOLIO_DATA;

  return (
    <section className="relative overflow-hidden bg-black px-16 pt-120 pb-80 text-white lg:px-80 lg:pt-160 lg:pb-112">
      <AsciiCanvas
        mode="backdrop"
        seed="not-found-404"
        interactive={false}
        className="pointer-events-none absolute inset-0 h-full opacity-20"
      />

      <div className="relative z-10 mx-auto max-w-920">
        <p className="tabular-nums font-mono text-caption-20 uppercase text-accent">
          ERROR {notFound.code}
        </p>
        <h1 className="mt-12 text-headline-20 font-medium text-white">
          {notFound.heading}
        </h1>
        <p className="mt-16 max-w-600 text-body-20 text-ghost-grey">
          {notFound.summary}
        </p>

        <div className="mt-32 flex flex-wrap gap-12">
          {notFound.recoveryLinks.map((link, idx) => (
            <SplitPillButton
              key={link.id}
              to={link.href}
              variant="secondary"
              dot={idx === 0}
              label={link.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
