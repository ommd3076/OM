import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ArrowUpRightIcon } from './Icons';
import { OdometerText } from './OdometerText';
import { StatusDot } from './StatusDot';

export interface SplitPillButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  dot?: boolean;
  icon?: ReactNode;
  to?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SplitPillButton({
  label,
  variant = 'primary',
  dot = false,
  icon,
  to,
  href,
  external = false,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ariaLabel,
}: SplitPillButtonProps) {
  const isPrimary = variant === 'primary';

  const halfColors = isPrimary
    ? 'bg-black text-white group-hover:bg-black-deep'
    : 'bg-ghost-grey text-black group-hover:bg-white';

  const connectorColors = isPrimary
    ? 'text-black group-hover:text-black-deep'
    : 'text-ghost-grey group-hover:text-white';

  const disabledClasses = disabled
    ? 'opacity-50 grayscale pointer-events-none'
    : 'cursor-pointer';

  const wrapperClasses = `group inline-flex items-center select-none rounded-8 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${disabledClasses} ${className}`;

  const renderedIcon =
    icon ??
    (external ? (
      <ArrowUpRightIcon className="size-16 shrink-0" />
    ) : (
      <ArrowRightIcon className="size-16 shrink-0" />
    ));

  const inner = (
    <>
      <span
        className={`inline-flex h-48 items-center gap-10 rounded-8 px-20 lg:px-24 font-mono text-caption-10 uppercase tracking-wide transition-colors duration-150 ease-in-out motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${halfColors}`}
      >
        {dot && <StatusDot />}
        <OdometerText text={label} />
      </span>

      <span
        aria-hidden="true"
        className={`-mx-px flex h-26 w-6 shrink-0 flex-col self-center transition-colors duration-150 ease-in-out ${connectorColors} motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none`}
      >
        <span
          data-connector-notch="top"
          className="block h-4 w-6 shrink-0 bg-current"
        />
        <span className="-my-px block w-full grow bg-current" />
        <span
          data-connector-notch="bottom"
          className="block h-4 w-6 shrink-0 bg-current"
        />
      </span>

      <span
        aria-hidden="true"
        className={`inline-flex size-48 shrink-0 items-center justify-center rounded-8 transition-colors duration-150 ease-in-out motion-reduce:transition-none [[data-motion=reduce]_&]:transition-none ${halfColors}`}
      >
        {renderedIcon}
      </span>
    </>
  );

  if (to && !disabled) {
    return (
      <Link
        data-connector=""
        to={to}
        onClick={onClick}
        aria-label={ariaLabel}
        className={wrapperClasses}
      >
        {inner}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a
        data-connector=""
        href={href}
        onClick={onClick}
        aria-label={ariaLabel}
        className={wrapperClasses}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      data-connector=""
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={wrapperClasses}
    >
      {inner}
    </button>
  );
}
