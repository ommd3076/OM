import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AsciiCanvas } from '../components/ui/AsciiCanvas';
import { ArrowLeftIcon, ArrowUpRightIcon } from '../components/ui/Icons';
import { OdometerText } from '../components/ui/OdometerText';
import { SplitPillButton } from '../components/ui/SplitPillButton';
import { PORTFOLIO_DATA, type CaseStudyCodeBlock } from '../data/portfolio';
import { highlightCode } from '../lib/highlight';
import { NotFoundPage } from './NotFoundPage';

function CodeSnippetCard({ block }: { block: CaseStudyCodeBlock }) {
  const lines = highlightCode(block.code, block.language);

  return (
    <div className="mt-8 overflow-hidden rounded-8 border border-white/15 bg-black-deep">
      <div className="flex items-center justify-between gap-12 border-b border-white/10 px-16 py-10 font-mono text-ui text-mid-grey">
        <span className="truncate">{block.filename}</span>
        <span className="shrink-0 uppercase">{block.language}</span>
      </div>

      <pre className="m-0 overflow-x-auto p-16 font-mono text-caption-10 leading-[1.6]">
        <code>
          {lines.map((lineTokens, lineIdx) => (
            <div key={lineIdx} className="flex min-w-0">
              <span
                aria-hidden="true"
                className="w-32 shrink-0 select-none pr-12 text-right tabular-nums text-mid-grey/50"
              >
                {lineIdx + 1}
              </span>
              <span className="min-w-0 whitespace-pre">
                {lineTokens.length > 0 ? (
                  lineTokens.map((tok, tokIdx) => (
                    <span
                      key={tokIdx}
                      style={
                        tok.colorVar ? { color: tok.colorVar } : undefined
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
  );
}

export function ProjectDetailPage() {
  const { slug } = useParams();
  const article = PORTFOLIO_DATA.caseStudies.find((item) => item.slug === slug);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const next = Math.max(0, Math.min(1, window.scrollY / scrollable));
      setProgress(next);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [slug]);

  if (!article) {
    return <NotFoundPage />;
  }

  const hasCustomCodeBlock = article.sections.some((s) => Boolean(s.codeBlock));
  const fallbackManifest: CaseStudyCodeBlock = {
    filename: `${article.slug}/manifest.md`,
    language: 'markdown',
    code: `# ${article.title} (Entry ${article.entryNumber})
- Role: ${article.role}
- Status: ${article.statusLabel}
- Stack: ${article.stack.join(', ')}
- Repository: ${article.repoUrl ?? 'Pending'}`,
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-40 h-3 origin-left bg-accent"
        style={{ transform: `scaleX(${progress})` }}
      />

      <section className="relative overflow-hidden bg-black px-16 pt-120 pb-80 text-white lg:px-80 lg:pt-160 lg:pb-112">
        <AsciiCanvas
          mode="backdrop"
          seed={`case-${article.slug}`}
          interactive={false}
          className="pointer-events-none absolute inset-0 h-full opacity-20"
        />

        <article className="relative z-10 mx-auto max-w-920">
          <Link
            to="/projects"
            className="inline-flex items-center gap-8 font-mono text-caption-10 uppercase text-ghost-grey hover:text-white"
          >
            <ArrowLeftIcon className="size-14" />
            <OdometerText text="ALL PROJECTS" />
          </Link>

          <p className="mt-24 tabular-nums font-mono text-caption-10 uppercase text-mid-grey">
            ENTRY {article.entryNumber} · CASE STUDY
          </p>

          <h1 className="mt-8 text-headline-20 font-medium text-white">
            {article.title}
          </h1>

          <p className="mt-16 text-body-30 text-ghost-grey">{article.deck}</p>

          <dl className="mt-32 grid grid-cols-1 gap-16 border-y border-white/15 py-20 font-mono text-caption-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-mid-grey">[ROLE]</dt>
              <dd className="mt-4 text-white">{article.role}</dd>
            </div>

            <div>
              <dt className="text-mid-grey">[STATUS]</dt>
              <dd className="mt-4 text-white">{article.statusLabel}</dd>
            </div>

            <div>
              <dt className="text-mid-grey">[REPO]</dt>
              <dd className="mt-4">
                {article.repoUrl ? (
                  <a
                    href={article.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-4 text-ghost-grey underline underline-offset-4 hover:text-white"
                  >
                    <span>GitHub</span>
                    <ArrowUpRightIcon className="size-12" />
                  </a>
                ) : (
                  <span className="text-mid-grey">Pending</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-mid-grey">[STACK]</dt>
              <dd className="mt-4 flex flex-wrap gap-4">
                {article.stack.map((tech) => (
                  <code
                    key={tech}
                    className="rounded-2 border border-white/15 px-6 py-2 text-ui text-ghost-grey"
                  >
                    {tech}
                  </code>
                ))}
              </dd>
            </div>
          </dl>

          {article.verificationNote && (
            <div className="mt-24 rounded-8 border border-white/15 bg-black-deep/60 p-16 font-mono text-caption-10 text-ghost-grey">
              <span className="mr-8 text-accent">NOTE:</span>
              <span>{article.verificationNote}</span>
            </div>
          )}

          <div className="mt-40 flex flex-col gap-40">
            {article.sections.map((section) => (
              <section key={section.heading} className="flex flex-col gap-16">
                <h2 className="text-headline-10 font-medium text-white">
                  {section.heading}
                </h2>

                {section.paragraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-body-20 leading-relaxed text-ghost-grey"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="flex list-disc flex-col gap-8 pl-20 text-body-20 text-ghost-grey">
                    {section.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {section.codeBlock && (
                  <CodeSnippetCard block={section.codeBlock} />
                )}
              </section>
            ))}

            {!hasCustomCodeBlock && (
              <section className="flex flex-col gap-12">
                <h2 className="text-body-30 font-medium text-white">
                  Repository Manifest
                </h2>
                <CodeSnippetCard block={fallbackManifest} />
              </section>
            )}
          </div>

          <div className="mt-56 flex flex-wrap items-center justify-between gap-16 border-t border-white/15 pt-32">
            <SplitPillButton
              to="/projects"
              variant="secondary"
              label="All projects"
            />
            <SplitPillButton
              href={`mailto:${PORTFOLIO_DATA.identity.email}`}
              variant="primary"
              dot
              label="Write directly"
            />
          </div>
        </article>
      </section>
    </>
  );
}
