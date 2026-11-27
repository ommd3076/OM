import { useEffect, useRef, useState } from 'react';
import { PORTFOLIO_DATA } from '../../data/portfolio';
import { ArrowUpRightIcon, CloseIcon, PlusIcon } from '../ui/Icons';
import { OdometerText } from '../ui/OdometerText';

export function ReadmeDialog() {
  const { identity } = PORTFOLIO_DATA;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="fixed right-8 bottom-8 z-30 flex flex-col items-end lg:right-16 lg:bottom-16">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="group inline-flex flex-col items-end rounded-4 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="inline-flex h-22 items-center rounded-4 bg-ghost-grey px-8 font-mono text-ui uppercase text-black transition-colors duration-150 group-hover:bg-white motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none">
            <OdometerText text={identity.readmeTriggerLabel} />
          </span>
          <span
            aria-hidden="true"
            className="mr-18 block h-4 w-12 bg-ghost-grey transition-colors duration-150 group-hover:bg-white motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none"
          />
          <span
            aria-hidden="true"
            className="inline-flex size-48 items-center justify-center rounded-4 bg-ghost-grey text-black transition-colors duration-150 group-hover:bg-white motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none"
          >
            <PlusIcon className="size-16" />
          </span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black-deep/80 p-16 lg:p-32"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="readme-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85svh] w-full max-w-960 overflow-y-auto overscroll-contain rounded-8 border border-white/15 bg-black p-24 text-white animate-fade-in lg:p-48"
          >
            <div className="flex flex-wrap items-start justify-between gap-16 border-b border-white/12 pb-24">
              <div>
                <p className="font-mono text-caption-10 uppercase text-mid-grey">
                  {identity.wordmark} · {identity.handle}
                </p>
                <h2
                  id="readme-dialog-title"
                  className="mt-8 text-headline-10 font-medium text-white"
                >
                  {identity.readmeTitle}
                </h2>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                aria-label="Close dialog"
                className="inline-flex h-36 items-center gap-8 rounded-4 border border-white/15 px-12 font-mono text-caption-10 uppercase text-ghost-grey transition-colors duration-150 hover:bg-white hover:text-black"
              >
                <span>Close</span>
                <CloseIcon className="size-14" />
              </button>
            </div>

            <div className="mt-24 divide-y divide-white/12">
              {identity.readmeSections.map((section) => (
                <section
                  key={section.index}
                  className="grid grid-cols-1 gap-16 py-24 lg:grid-cols-12"
                >
                  <div className="lg:col-span-4">
                    <span className="tabular-nums font-mono text-caption-10 text-mid-grey">
                      {section.index} /
                    </span>
                    <h3 className="mt-6 text-body-30 font-medium text-white">
                      {section.heading}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-12 lg:col-span-8">
                    {section.body.map((paragraph, pIdx) => (
                      <p
                        key={pIdx}
                        className="text-body-20 leading-relaxed text-ghost-grey"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-between gap-16 border-t border-white/12 pt-24 font-mono text-caption-10 text-mid-grey">
              <span>
                {identity.locationLabel} · {identity.email}
              </span>
              <div className="flex items-center gap-20">
                <a
                  href={identity.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 text-ghost-grey hover:text-white"
                >
                  <span>GitHub</span>
                  <ArrowUpRightIcon className="size-14" />
                </a>
                <a
                  href={identity.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 text-ghost-grey hover:text-white"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRightIcon className="size-14" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
