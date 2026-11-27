import type { CSSProperties } from 'react';

const SCRAMBLE_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+-';
const SCRAMBLE_LOWER = 'abcdefghijklmnopqrstuvwxyz0123456789/+-';

function pickScrambleGlyph(char: string, colIndex: number, step: number): string {
  const isLower = char >= 'a' && char <= 'z';
  const alphabet = isLower ? SCRAMBLE_LOWER : SCRAMBLE_UPPER;
  const code = char.charCodeAt(0);
  const idx = Math.abs(code * 31 + colIndex * 7 + step * 13) % alphabet.length;
  return alphabet[idx] ?? char;
}

export interface OdometerTextProps {
  text: string;
  className?: string;
  staggerMs?: number;
  trigger?: boolean;
}

export function OdometerText({
  text,
  className = '',
  staggerMs = 28,
  trigger = false,
}: OdometerTextProps) {
  const chars = Array.from(text);

  return (
    <span
      className={`inline-flex items-baseline ${className}`}
      {...(trigger ? { 'data-odometer-trigger': '' } : {})}
    >
      <span className="sr-only">{text}</span>
      <span data-odometer="" aria-hidden="true">
        {chars.map((char, colIndex) => {
          if (char === ' ') {
            return (
              <span
                key={`space-${colIndex}`}
                data-odometer-column=""
                style={
                  {
                    '--odometer-delay': `${colIndex * staggerMs}ms`,
                  } as CSSProperties
                }
              >
                <span data-odometer-glyph="">{'\u00A0'}</span>
              </span>
            );
          }

          const stack = [
            char,
            pickScrambleGlyph(char, colIndex, 1),
            pickScrambleGlyph(char, colIndex, 2),
            pickScrambleGlyph(char, colIndex, 3),
            pickScrambleGlyph(char, colIndex, 4),
            char,
          ];

          return (
            <span
              key={`col-${colIndex}`}
              data-odometer-column=""
              style={
                {
                  '--odometer-delay': `${colIndex * staggerMs}ms`,
                } as CSSProperties
              }
            >
              {stack.map((glyph, step) => (
                <span key={step} data-odometer-glyph="">
                  {glyph}
                </span>
              ))}
            </span>
          );
        })}
      </span>
    </span>
  );
}
