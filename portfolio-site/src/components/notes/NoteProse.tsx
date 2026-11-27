import { Fragment } from 'react';
import { InkUnderline } from './InkMarks';

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'hr' };

function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function renderInline(text: string, dark: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  const strongClass = dark
    ? 'font-semibold text-[#fbfbf9]'
    : 'font-semibold text-[#282825]';
  const emClass = dark
    ? 'font-serif italic text-[1.06em] text-[#fbfbf9]'
    : 'font-serif italic text-[1.06em] text-[#282825]';
  const codeClass = dark
    ? 'rounded-4 bg-white/10 px-6 py-2 font-mono text-[0.86em] text-[#f4f4f2]'
    : 'rounded-4 bg-[#ecece7] px-6 py-2 font-mono text-[0.86em] text-[#282825]';
  const linkClass = dark
    ? 'text-[#fbfbf9] underline decoration-[#b845e6] decoration-2 underline-offset-4 hover:text-[#e7b2ff]'
    : 'text-[#282825] underline decoration-[#b845e6] decoration-2 underline-offset-4 hover:text-[#7c1fa8]';

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    key += 1;

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={key} className={codeClass}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className={strongClass}>
          {renderInline(token.slice(2, -2), dark)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className={emClass}>
          {renderInline(token.slice(1, -1), dark)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const sep = token.indexOf('](');
      const label = token.slice(1, sep);
      const rawUrl = token.slice(sep + 2, -1);
      const safeUrl = sanitizeHref(rawUrl);
      if (safeUrl) {
        const external = safeUrl.startsWith('http');
        nodes.push(
          <a
            key={key}
            href={safeUrl}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={linkClass}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(label);
      }
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes;
}

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim().toLowerCase() || 'code';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', language: lang, code: codeLines.join('\n') });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    const isUl = /^[-*]\s+/.test(trimmed);
    const isOl = /^\d+\.\s+/.test(trimmed);
    if (isUl || isOl) {
      const items: string[] = [];
      const itemRegex = isUl ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/;
      while (i < lines.length) {
        const cur = (lines[i] ?? '').trim();
        const m = cur.match(itemRegex);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'list', ordered: isOl, items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? '';
      const curTrim = cur.trim();
      if (
        !curTrim ||
        curTrim.startsWith('```') ||
        curTrim.startsWith('>') ||
        /^(#{1,3})\s+/.test(curTrim) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(curTrim) ||
        /^([-*]|\d+\.)\s+/.test(curTrim)
      ) {
        break;
      }
      paraLines.push(curTrim);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
  }

  return blocks;
}

/**
 * Ellipsus-faithful prose renderer: expressive narrow serif headings with dynamic
 * coral/violet ink underlines, comfortable Manrope body copy, and calm code blocks.
 */
export function NoteProse({
  content,
  dark = false,
}: {
  content: string;
  dark?: boolean;
}) {
  const blocks = parseMarkdown(content);

  if (blocks.length === 0) {
    return (
      <p
        className={`font-serif text-[20px] italic ${
          dark ? 'text-[#9d9d95]' : 'text-[#64645e]'
        }`}
      >
        Nothing written yet.
      </p>
    );
  }

  return (
    <div
      className={`space-y-24 font-sans text-[17px] leading-[1.78] ${
        dark ? 'text-[#dcdcd4]' : 'text-[#282825]/90'
      }`}
    >
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          if (block.level === 1 || block.level === 2) {
            return (
              <h2
                key={idx}
                className={`pt-24 font-serif text-[clamp(28px,3.2vw,40px)] leading-[1.12] font-normal tracking-[-0.025em] ${
                  dark ? 'text-[#fbfbf9]' : 'text-[#282825]'
                }`}
              >
                <InkUnderline variant="wave" tone="coral" trigger="mount">
                  {renderInline(block.text, dark)}
                </InkUnderline>
              </h2>
            );
          }
          return (
            <h3
              key={idx}
              className={`pt-14 font-sans text-[13px] font-semibold tracking-[0.06em] uppercase ${
                dark ? 'text-[#b5b5ac]' : 'text-[#64645e]'
              }`}
            >
              {renderInline(block.text, dark)}
            </h3>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-[17px] leading-[1.8]">
              {renderInline(block.text, dark)}
            </p>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className={`my-28 border-l-2 border-[#b845e6] pl-24 font-serif text-[clamp(21px,2.3vw,27px)] leading-[1.48] italic ${
                dark ? 'text-[#fbfbf9]' : 'text-[#282825]'
              }`}
            >
              {block.lines.map((ln, lIdx) => (
                <Fragment key={lIdx}>
                  {renderInline(ln, dark)}
                  {lIdx < block.lines.length - 1 && <br />}
                </Fragment>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag
              key={idx}
              className={`space-y-10 pl-24 text-[17px] leading-[1.76] marker:text-[#b845e6] ${
                block.ordered ? 'list-decimal' : 'list-disc'
              }`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-6">
                  {renderInline(item, dark)}
                </li>
              ))}
            </Tag>
          );
        }

        if (block.type === 'hr') {
          return (
            <div
              key={idx}
              aria-hidden="true"
              className="my-40 flex items-center justify-center gap-16 opacity-60"
            >
              <span className="h-[1px] flex-1 bg-current opacity-20" />
              <span className="font-serif text-[20px] italic">· · ·</span>
              <span className="h-[1px] flex-1 bg-current opacity-20" />
            </div>
          );
        }

        const lines = block.code.split('\n');
        return (
          <div
            key={idx}
            className={`my-28 overflow-hidden rounded-8 font-mono ${
              dark
                ? 'bg-[#222227] text-[#ecece7]'
                : 'bg-[#efefea] text-[#282825]'
            }`}
          >
            <div
              className={`flex items-center justify-between px-18 py-8 font-mono text-[11px] tracking-[0.06em] uppercase ${
                dark
                  ? 'border-b border-white/8 text-[#9d9d95]'
                  : 'border-b border-[#dcdcd4] text-[#64645e]'
              }`}
            >
              <span>{block.language}</span>
            </div>
            <pre className="m-0 overflow-x-auto p-18 font-mono text-[13px] leading-[1.65]">
              <code>
                {lines.map((line, lineIdx) => (
                  <div key={lineIdx} className="flex min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-28 shrink-0 select-none pr-12 text-right tabular-nums opacity-45"
                    >
                      {lineIdx + 1}
                    </span>
                    <span className="min-w-0 whitespace-pre">
                      {line || ' '}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
