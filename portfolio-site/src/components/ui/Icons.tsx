import type { SVGProps } from 'react';

export interface IconProps {
  className?: string;
}

type SvgBaseProps = Pick<SVGProps<SVGSVGElement>, 'className'>;

function StrokeIcon({
  className = 'size-16 shrink-0',
  strokeWidth = 1.2,
  children,
}: SvgBaseProps & {
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/**
 * 400x400 angled geometric architectural mark derived from overlapping
 * diagonal chamfered strips forming a balanced square emblem.
 */
export function BrandMark({ className = 'size-30 shrink-0' }: IconProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M0 44L44 0H92L0 92V44ZM0 138L138 0H186L0 186V138ZM0 232L232 0H280L0 280V232ZM0 326L326 0H374L0 374V326ZM26 400L400 26V74L74 400H26ZM120 400L400 120V168L168 400H120ZM214 400L400 214V262L262 400H214ZM308 400L400 308V356L356 400H308Z" />
    </svg>
  );
}

/**
 * 500x100 architectural footer SVG wordmark for Om M. Doddamani.
 */
export function BrandWordmark({
  className = 'h-auto w-full max-w-440',
  label = 'Om M. Doddamani',
}: IconProps & { label?: string }) {
  return (
    <svg
      viewBox="0 0 500 100"
      fill="currentColor"
      role="img"
      aria-label={label}
      className={className}
    >
      <rect x="0" y="10" width="38" height="8" />
      <rect x="0" y="82" width="120" height="2" opacity="0.25" />
      <text
        x="0"
        y="66"
        fontSize="47"
        fontWeight="500"
        letterSpacing="-1.4"
        fontFamily="var(--font-sans)"
      >
        OM M. DODDAMANI
      </text>
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M2.5 8h11" />
      <path d="M9.5 4 13.5 8l-4 4" />
    </StrokeIcon>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M13.5 8h-11" />
      <path d="M6.5 4 2.5 8l4 4" />
    </StrokeIcon>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M4 12 12 4" />
      <path d="M5.5 4H12v6.5" />
    </StrokeIcon>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M8 2.5v11" />
      <path d="M4 9.5 8 13.5l4-4" />
    </StrokeIcon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M8 3v10" />
      <path d="M3 8h10" />
    </StrokeIcon>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M3 8h10" />
    </StrokeIcon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M3.5 3.5 12.5 12.5" />
      <path d="M12.5 3.5 3.5 12.5" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.4}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </StrokeIcon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.4}>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </StrokeIcon>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.4}>
      <path d="M3.5 10 8 5.5 12.5 10" />
    </StrokeIcon>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.4}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.2 10.2 13.5 13.5" />
    </StrokeIcon>
  );
}

export function TerminalIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.1}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M4.5 6 7 8 4.5 10" />
      <path d="M8.5 10h3" />
    </StrokeIcon>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.3}>
      <path d="M2.5 4.5h11" />
      <path d="M2.5 8h11" />
      <path d="M2.5 11.5h11" />
    </StrokeIcon>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M4 2.5h5.5L12.5 5.5v8H4z" />
      <path d="M9.5 2.5v3h3" />
    </StrokeIcon>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <path d="M2.5 4h4l1.5 1.5h5.5v7h-11z" />
    </StrokeIcon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.3}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </StrokeIcon>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className} strokeWidth={1.2}>
      <polygon points="4.5,3 12.5,8 4.5,13" />
    </StrokeIcon>
  );
}
