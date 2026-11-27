export type StatusDotVariant = 'accent' | 'shipped' | 'planned';

export interface StatusDotProps {
  variant?: StatusDotVariant;
  ping?: boolean;
  className?: string;
}

const CORE_COLOR: Record<StatusDotVariant, string> = {
  accent: 'bg-accent',
  shipped: 'bg-white',
  planned: 'bg-mid-grey',
};

const HALO_COLOR: Record<StatusDotVariant, string> = {
  accent: 'bg-accent',
  shipped: 'bg-white',
  planned: 'bg-mid-grey',
};

export function StatusDot({
  variant = 'accent',
  ping,
  className = '',
}: StatusDotProps) {
  const showPing = ping ?? variant === 'accent';

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex size-6 shrink-0 items-center justify-center ${className}`}
    >
      {showPing && (
        <span
          className={`absolute inset-0 rounded-full ${HALO_COLOR[variant]} animate-status-ping motion-reduce:hidden [[data-motion=reduce]_&]:hidden`}
        />
      )}
      <span className={`relative size-6 rounded-full ${CORE_COLOR[variant]}`} />
    </span>
  );
}
