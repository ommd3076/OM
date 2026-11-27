import { AsciiCanvas } from '../components/ui/AsciiCanvas';
import { ArrowUpRightIcon } from '../components/ui/Icons';
import { SplitPillButton } from '../components/ui/SplitPillButton';
import { PORTFOLIO_DATA } from '../data/portfolio';

export function AboutPage() {
  const { about, identity } = PORTFOLIO_DATA;

  return (
    <section className="relative overflow-hidden bg-black px-16 pt-120 pb-80 text-white lg:px-80 lg:pt-160 lg:pb-112">
      <AsciiCanvas
        mode="backdrop"
        seed="about-profile"
        interactive={false}
        className="pointer-events-none absolute inset-0 h-full opacity-20"
      />

      <div className="relative z-10 mx-auto max-w-920">
        <p className="font-mono text-caption-10 uppercase text-mid-grey">
          {about.eyebrow}
        </p>
        <h1 className="mt-12 text-headline-20 font-medium text-white">
          {about.title}
        </h1>
        <p className="mt-16 text-body-30 text-ghost-grey">{about.deck}</p>

        <dl className="mt-32 grid grid-cols-1 gap-16 border-y border-white/15 py-24 sm:grid-cols-2">
          {about.metadata.map((item) => (
            <div key={item.key}>
              <dt className="font-mono text-ui uppercase text-mid-grey">
                {item.key}
              </dt>
              <dd className="mt-4 font-mono text-caption-20 text-white">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-40 divide-y divide-white/12">
          {about.sections.map((section) => (
            <article key={section.index} className="py-28">
              <span className="tabular-nums font-mono text-caption-10 text-mid-grey">
                {section.index} /
              </span>
              <h2 className="mt-8 text-headline-10 font-medium text-white">
                {section.heading}
              </h2>
              <div className="mt-16 flex flex-col gap-12">
                {section.paragraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-body-20 leading-relaxed text-ghost-grey"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-16 flex list-disc flex-col gap-8 pl-20 text-body-20 leading-relaxed text-ghost-grey">
                  {section.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        <div className="mt-40 flex flex-wrap items-center justify-between gap-16 border-t border-white/15 pt-32">
          <div className="flex flex-wrap gap-12">
            <SplitPillButton
              to="/projects"
              variant="secondary"
              label="Explore projects"
            />
            <SplitPillButton
              to="/roadmap"
              variant="secondary"
              label="View roadmap"
            />
          </div>

          <div className="flex items-center gap-20 font-mono text-caption-10 uppercase">
            <a
              href={identity.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 text-ghost-grey underline underline-offset-4 hover:text-white"
            >
              <span>GitHub</span>
              <ArrowUpRightIcon className="size-12" />
            </a>
            <a
              href={identity.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 text-ghost-grey underline underline-offset-4 hover:text-white"
            >
              <span>LinkedIn</span>
              <ArrowUpRightIcon className="size-12" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
