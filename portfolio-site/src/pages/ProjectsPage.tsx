import { PORTFOLIO_DATA } from '../data/portfolio';
import { AsciiCanvas } from '../components/ui/AsciiCanvas';
import { ArrowUpRightIcon } from '../components/ui/Icons';
import { SplitPillButton } from '../components/ui/SplitPillButton';
import { TicketCard } from '../components/ui/TicketCard';

export function ProjectsPage() {
  const { projectsPage, showcaseProjects } = PORTFOLIO_DATA;

  return (
    <section className="relative overflow-hidden bg-black px-16 pt-120 pb-80 text-white lg:px-80 lg:pt-160 lg:pb-112">
      <AsciiCanvas
        mode="backdrop"
        seed="projects-index"
        interactive={false}
        className="pointer-events-none absolute inset-0 h-full opacity-20"
      />

      <div className="relative z-10 mx-auto max-w-1440">
        <p className="font-mono text-caption-10 uppercase text-mid-grey">
          {projectsPage.eyebrow}
        </p>
        <h1 className="mt-12 text-headline-20 font-medium text-white">
          {projectsPage.heading}
        </h1>
        <p className="mt-16 max-w-600 text-body-20 text-ghost-grey">
          {projectsPage.summary}
        </p>

        <div className="mt-48 flex flex-col gap-24">
          {showcaseProjects.map((project) => (
            <TicketCard
              key={project.slug}
              surface="light"
              left={
                <div className="flex h-full flex-col justify-between gap-16">
                  <div>
                    <span className="tabular-nums font-mono text-caption-10 uppercase text-dark-grey">
                      Entry {project.entryNumber} · {project.categoryTag}
                    </span>
                    <h2 className="mt-8 text-headline-10 font-medium text-black">
                      {project.title}
                    </h2>
                    <p className="mt-12 text-body-20 text-dark-grey">
                      {project.previewSummary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-8">
                    {project.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-4 border border-black/20 px-8 py-2 font-mono text-ui text-dark-grey"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              }
              right={
                <div className="flex h-full flex-col justify-between gap-20">
                  <div>
                    <p className="font-mono text-caption-10 uppercase text-black">
                      {project.keyFact}
                    </p>
                    <p className="mt-6 font-mono text-ui uppercase text-dark-grey">
                      {project.touchMeta}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-16">
                    <SplitPillButton
                      to={`/projects/${project.slug}`}
                      variant="primary"
                      label="Read case study"
                    />

                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 font-mono text-caption-10 uppercase text-black underline underline-offset-4 hover:text-dark-grey"
                      >
                        <span>GitHub</span>
                        <ArrowUpRightIcon className="size-12" />
                      </a>
                    )}

                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 font-mono text-caption-10 uppercase text-black underline underline-offset-4 hover:text-dark-grey"
                      >
                        <span>Live</span>
                        <ArrowUpRightIcon className="size-12" />
                      </a>
                    )}
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
