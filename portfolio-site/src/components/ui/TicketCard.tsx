import type { ReactNode } from 'react';

export interface TicketCardProps {
  surface?: 'dark' | 'light';
  left: ReactNode;
  right: ReactNode;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export function TicketCard({
  surface = 'dark',
  left,
  right,
  className = '',
  leftClassName = '',
  rightClassName = '',
}: TicketCardProps) {
  const isDark = surface === 'dark';
  const surfaceClasses = isDark
    ? 'bg-black text-white'
    : 'bg-off-white text-black';
  const perforationColor = isDark ? 'text-white/40' : 'text-black/30';

  return (
    <div
      className={`ticket-notches grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_auto_minmax(0,5fr)] rounded-12 ${surfaceClasses} ${className}`}
    >
      <div className={`min-w-0 p-24 lg:p-40 ${leftClassName}`}>{left}</div>
      <div
        aria-hidden="true"
        className={`ticket-perforation shrink-0 ${perforationColor}`}
      />
      <div className={`min-w-0 p-24 lg:p-40 ${rightClassName}`}>{right}</div>
    </div>
  );
}
