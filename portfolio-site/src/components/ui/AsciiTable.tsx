import type { ReceiptItem } from '../../data/portfolio';

export interface AsciiTableProps {
  header: string;
  footerLeft?: string;
  footerRight?: string;
  phases: readonly ReceiptItem[];
  activeRowIndex?: number;
  onRowSelect?: (rowIndex: number) => void;
  surface?: 'light' | 'dark';
  className?: string;
}

const RULE_DASHES = '-'.repeat(96);
const DOTTED_FILL = '.'.repeat(96);

function AsciiBorderRule() {
  return (
    <code
      className="flex items-center font-mono text-[1em] leading-[1.35]"
      aria-hidden="true"
    >
      <span>+</span>
      <span className="min-w-0 w-0 flex-1 overflow-hidden whitespace-nowrap">
        {RULE_DASHES}
      </span>
      <span>+</span>
    </code>
  );
}

function DottedFill() {
  return (
    <span
      data-fill={DOTTED_FILL}
      aria-hidden="true"
      className="min-w-[2ch] flex-1 overflow-hidden whitespace-nowrap text-current/35 before:content-[attr(data-fill)]"
    />
  );
}

export function AsciiTable({
  header,
  footerLeft,
  footerRight,
  phases,
  activeRowIndex = 0,
  onRowSelect,
  surface = 'light',
  className = '',
}: AsciiTableProps) {
  const isLight = surface === 'light';
  const baseSurface = isLight ? 'text-black' : 'text-white';
  const mutedText = isLight ? 'text-dark-grey' : 'text-mid-grey';
  const activeSurface = isLight
    ? 'bg-black text-off-white'
    : 'bg-off-white text-black';
  const hoverSurface = isLight ? 'hover:bg-black/5' : 'hover:bg-white/5';

  let runningRowIdx = 0;

  return (
    <div
      className={`w-[round(down,100%,1ch)] lg:max-w-[56ch] font-mono text-caption-10 tabular-nums select-none ${baseSurface} ${className}`}
    >
      <AsciiBorderRule />

      <div className="flex items-center gap-[1ch] leading-[1.45]">
        <span aria-hidden="true">|</span>
        <div className="flex min-w-0 flex-1 items-center gap-[1ch] px-[0.5ch]">
          <span className="font-medium uppercase">{header}</span>
          <DottedFill />
        </div>
        <span aria-hidden="true">|</span>
      </div>

      <AsciiBorderRule />

      {phases.map((phase, phaseIdx) => (
        <div key={phase.phaseIndex}>
          <div
            className={`flex items-center gap-[1ch] leading-[1.45] ${mutedText}`}
          >
            <span aria-hidden="true">|</span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-[1ch] px-[0.5ch]">
              <span className="font-medium uppercase">
                {phase.phaseIndex} · {phase.title}
              </span>
              <span className="shrink-0 uppercase">{phase.summaryTag}</span>
            </div>
            <span aria-hidden="true">|</span>
          </div>

          {phase.rows.map((row) => {
            const rowIndex = runningRowIdx;
            runningRowIdx += 1;
            const isRowActive = rowIndex === activeRowIndex;

            const inner = (
              <div
                className={`flex min-w-0 flex-1 items-center gap-[1ch] px-[0.5ch] transition-[background-color,color] duration-200 ease-out motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${
                  isRowActive
                    ? activeSurface
                    : `${mutedText} ${onRowSelect ? hoverSurface : ''}`
                }`}
              >
                <span className="shrink-0">{row.label}</span>
                <DottedFill />
                <span className="shrink-0 text-right">{row.artifact}</span>
              </div>
            );

            return onRowSelect ? (
              <button
                key={`${phase.phaseIndex}-${row.label}`}
                type="button"
                onClick={() => onRowSelect(rowIndex)}
                aria-pressed={isRowActive}
                className="flex w-full items-center gap-[1ch] text-left leading-[1.45]"
              >
                <span aria-hidden="true">|</span>
                {inner}
                <span aria-hidden="true">|</span>
              </button>
            ) : (
              <div
                key={`${phase.phaseIndex}-${row.label}`}
                className="flex items-center gap-[1ch] leading-[1.45]"
              >
                <span aria-hidden="true">|</span>
                {inner}
                <span aria-hidden="true">|</span>
              </div>
            );
          })}

          {phaseIdx < phases.length - 1 && <AsciiBorderRule />}
        </div>
      ))}

      {(footerLeft || footerRight) && (
        <>
          <AsciiBorderRule />
          <div className="flex items-center gap-[1ch] leading-[1.45]">
            <span aria-hidden="true">|</span>
            <div className="flex min-w-0 flex-1 items-center gap-[1ch] px-[0.5ch]">
              <span className="shrink-0 uppercase">{footerLeft ?? ''}</span>
              <DottedFill />
              <span className="shrink-0 uppercase">{footerRight ?? ''}</span>
            </div>
            <span aria-hidden="true">|</span>
          </div>
        </>
      )}

      <AsciiBorderRule />
    </div>
  );
}
