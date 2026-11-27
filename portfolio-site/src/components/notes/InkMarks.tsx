import type { ReactNode } from 'react';

export type InkTone = 'violet' | 'coral' | 'sage' | 'amber' | 'obsidian';

const INK_STROKE_MAP: Record<InkTone, string> = {
  violet: '#b845e6',
  coral: '#e35656',
  sage: '#45a07a',
  amber: '#d98a2b',
  obsidian: '#282825',
};

const HIGHLIGHT_FILL_MAP: Record<InkTone, string> = {
  violet: 'rgba(184, 69, 230, 0.14)',
  coral: 'rgba(227, 86, 86, 0.15)',
  sage: '#deeee6',
  amber: '#f6e6b8',
  obsidian: 'rgba(40, 40, 37, 0.08)',
};

export interface InkCircleProps {
  children: ReactNode;
  tone?: InkTone;
  trigger?: 'mount' | 'hover' | 'active';
  active?: boolean;
  className?: string;
  strokeWidth?: number;
}

/**
 * Signature Ellipsus-style hand-drawn brush oval loop around headlines or labels.
 */
export function InkCircle({
  children,
  tone = 'violet',
  trigger = 'mount',
  active = false,
  className = '',
  strokeWidth = 2.6,
}: InkCircleProps) {
  const stroke = INK_STROKE_MAP[tone];
  const stateClass =
    trigger === 'mount'
      ? 'ink-draw-mount'
      : trigger === 'active'
        ? active
          ? 'ink-draw-active'
          : 'ink-draw-hover'
        : 'ink-draw-hover';

  return (
    <span
      className={`ink-mark-wrap relative inline-block px-[0.28em] py-[0.04em] ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 240 96"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute -inset-x-[12%] -inset-y-[18%] z-0 h-[136%] w-[124%] overflow-visible ${stateClass}`}
      >
        <path
          d="M 20 50 C 14 20, 74 7, 130 9 C 190 11, 228 26, 224 52 C 220 77, 168 88, 108 85 C 49 82, 10 67, 14 42 C 17 21, 82 11, 148 16"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          className="ink-path-primary"
        />
        <path
          d="M 32 34 C 58 14, 118 11, 178 18 C 210 22, 224 40, 212 60"
          fill="none"
          stroke={stroke}
          strokeOpacity={0.45}
          strokeWidth={Math.max(1.2, strokeWidth * 0.6)}
          strokeLinecap="round"
          pathLength={100}
          className="ink-path-secondary"
        />
      </svg>
    </span>
  );
}

export interface InkUnderlineProps {
  children: ReactNode;
  variant?: 'sweep' | 'wave' | 'double';
  tone?: InkTone;
  trigger?: 'mount' | 'hover' | 'active';
  active?: boolean;
  className?: string;
}

/**
 * Dynamic hand-drawn brush underline under emphasized phrases and links.
 */
export function InkUnderline({
  children,
  variant = 'wave',
  tone = 'coral',
  trigger = 'mount',
  active = false,
  className = '',
}: InkUnderlineProps) {
  const stroke = INK_STROKE_MAP[tone];
  const stateClass =
    trigger === 'mount'
      ? 'ink-draw-mount'
      : trigger === 'active'
        ? active
          ? 'ink-draw-active'
          : 'ink-draw-hover'
        : 'ink-draw-hover';

  return (
    <span className={`ink-mark-wrap relative inline-block pb-[0.06em] ${className}`}>
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 240 24"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute right-0 -bottom-[0.14em] left-0 z-0 h-[0.34em] w-full overflow-visible ${stateClass}`}
      >
        {variant === 'sweep' && (
          <path
            d="M 2 16 C 58 9, 134 8, 238 14"
            fill="none"
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={100}
            className="ink-path-primary"
          />
        )}
        {variant === 'wave' && (
          <path
            d="M 2 14 Q 32 5, 62 14 T 122 13 T 182 13 T 238 12"
            fill="none"
            stroke={stroke}
            strokeWidth={2.3}
            strokeLinecap="round"
            pathLength={100}
            className="ink-path-primary"
          />
        )}
        {variant === 'double' && (
          <>
            <path
              d="M 3 11 C 68 7, 156 7, 237 11"
              fill="none"
              stroke={stroke}
              strokeWidth={2.2}
              strokeLinecap="round"
              pathLength={100}
              className="ink-path-primary"
            />
            <path
              d="M 14 19 C 80 16, 166 15, 228 18"
              fill="none"
              stroke={stroke}
              strokeOpacity={0.62}
              strokeWidth={1.6}
              strokeLinecap="round"
              pathLength={100}
              className="ink-path-secondary"
            />
          </>
        )}
      </svg>
    </span>
  );
}

/**
 * Full-bleed tapered pen-drawn horizontal divider between articles on /notes.
 */
export function InkDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`w-full py-12 ${className}`}>
      <svg
        viewBox="0 0 1200 10"
        preserveAspectRatio="none"
        className="h-8 w-full overflow-visible"
      >
        <path
          d="M 2 6 Q 310 3, 620 5 T 1198 4"
          fill="none"
          stroke="#282825"
          strokeOpacity={0.38}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function InkHighlight({
  children,
  tone = 'sage',
  className = '',
}: {
  children: ReactNode;
  tone?: InkTone;
  className?: string;
}) {
  return (
    <mark
      style={{ backgroundColor: HIGHLIGHT_FILL_MAP[tone] }}
      className={`inline-block rounded-[4px] px-[0.26em] py-[0.02em] text-inherit ${className}`}
    >
      {children}
    </mark>
  );
}
