export type HighlightLanguage =
  | 'typescript'
  | 'markdown'
  | 'json'
  | 'sh'
  | 'bash';

export interface HighlightToken {
  readonly text: string;
  readonly colorVar?: string;
}

const TS_KEYWORDS = new Set([
  'import',
  'export',
  'from',
  'type',
  'interface',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'default',
  'async',
  'await',
  'as',
  'readonly',
  'true',
  'false',
  'null',
  'undefined',
  'void',
  'new',
  'try',
  'catch',
  'throw',
  'in',
  'of',
  'extends',
  'implements',
]);

const TS_BUILTIN_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'unknown',
  'never',
  'any',
  'object',
  'Promise',
  'Response',
  'Request',
  'CryptoKey',
  'Uint8Array',
  'BufferSource',
  'TextEncoder',
  'Record',
  'Map',
  'Set',
  'Array',
  'Math',
  'JSON',
]);

const SH_KEYWORDS = new Set([
  'npm',
  'npx',
  'node',
  'git',
  'cd',
  'ls',
  'cat',
  'tree',
  'echo',
  'export',
  'run',
  'test',
  'build',
  'dev',
]);

function pushToken(
  tokens: HighlightToken[],
  text: string,
  colorVar?: string,
): void {
  if (!text) return;
  const prev = tokens[tokens.length - 1];
  if (prev && prev.colorVar === colorVar) {
    tokens[tokens.length - 1] = { text: prev.text + text, colorVar };
  } else {
    tokens.push({ text, colorVar });
  }
}

function tokenizeMarkdownLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  if (/^\s*#{1,6}\s/.test(line)) {
    pushToken(tokens, line, 'var(--sh-comment)');
    return tokens;
  }

  if (/^\s*([-*]|\d+\.)\s/.test(line)) {
    const match = line.match(/^(\s*(?:[-*]|\d+\.)\s)(.*)$/);
    if (match) {
      pushToken(tokens, match[1], 'var(--sh-jsxliterals)');
      return [...tokens, ...tokenizeMarkdownInline(match[2])];
    }
  }

  return tokenizeMarkdownInline(line);
}

function tokenizeMarkdownInline(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        pushToken(tokens, text.slice(i, end + 1), 'var(--sh-string)');
        i = end + 1;
        continue;
      }
    }

    if (text[i] === '|' || text[i] === '-' || text[i] === ':') {
      const ch = text[i];
      if (ch === '|' || (ch === '-' && text[i + 1] === '>')) {
        const len = ch === '-' ? 2 : 1;
        pushToken(tokens, text.slice(i, i + len), 'var(--sh-sign)');
        i += len;
        continue;
      }
    }

    if (/[A-Z_]{3,}/.test(text.slice(i))) {
      const match = text.slice(i).match(/^[A-Z][A-Z0-9_]{2,}/);
      if (match) {
        pushToken(tokens, match[0], 'var(--sh-class)');
        i += match[0].length;
        continue;
      }
    }

    pushToken(tokens, text[i], 'var(--sh-identifier)');
    i += 1;
  }

  return tokens;
}

function tokenizeShellLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '#') {
      pushToken(tokens, line.slice(i), 'var(--sh-comment)');
      break;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      pushToken(tokens, line.slice(i, j), 'var(--sh-string)');
      i = j;
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /\s/.test(line[j])) j += 1;
      pushToken(tokens, line.slice(i, j));
      i = j;
      continue;
    }

    if (ch === '-' && /[a-zA-Z-]/.test(line[i + 1] ?? '')) {
      const match = line.slice(i).match(/^--?[a-zA-Z0-9_-]+/);
      if (match) {
        pushToken(tokens, match[0], 'var(--sh-property)');
        i += match[0].length;
        continue;
      }
    }

    if (/[a-zA-Z0-9_./~-]/.test(ch)) {
      const match = line.slice(i).match(/^[a-zA-Z0-9_./~-]+/);
      if (match) {
        const word = match[0];
        if (SH_KEYWORDS.has(word)) {
          pushToken(tokens, word, 'var(--sh-keyword)');
        } else if (/^\d+(\.\d+)?$/.test(word)) {
          pushToken(tokens, word, 'var(--sh-number)');
        } else {
          pushToken(tokens, word, 'var(--sh-identifier)');
        }
        i += word.length;
        continue;
      }
    }

    pushToken(tokens, ch, 'var(--sh-sign)');
    i += 1;
  }

  return tokens;
}

export function highlightCode(
  code: string,
  language: HighlightLanguage = 'typescript',
): HighlightToken[][] {
  const lines = code.split('\n');

  if (language === 'markdown') {
    return lines.map(tokenizeMarkdownLine);
  }

  if (language === 'sh' || language === 'bash') {
    return lines.map(tokenizeShellLine);
  }

  let inBlockComment = false;
  let inTemplate = false;

  return lines.map((line) => {
    const tokens: HighlightToken[] = [];
    let i = 0;

    while (i < line.length) {
      if (inBlockComment) {
        const closeIdx = line.indexOf('*/', i);
        if (closeIdx === -1) {
          pushToken(tokens, line.slice(i), 'var(--sh-comment)');
          i = line.length;
        } else {
          pushToken(tokens, line.slice(i, closeIdx + 2), 'var(--sh-comment)');
          i = closeIdx + 2;
          inBlockComment = false;
        }
        continue;
      }

      if (inTemplate) {
        let j = i;
        while (j < line.length) {
          if (line[j] === '\\') {
            j += 2;
            continue;
          }
          if (line[j] === '`') {
            j += 1;
            inTemplate = false;
            break;
          }
          j += 1;
        }
        pushToken(tokens, line.slice(i, j), 'var(--sh-string)');
        i = j;
        continue;
      }

      const ch = line[i];
      const next = line[i + 1];

      if (ch === '/' && next === '/') {
        pushToken(tokens, line.slice(i), 'var(--sh-comment)');
        break;
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true;
        const closeIdx = line.indexOf('*/', i + 2);
        if (closeIdx === -1) {
          pushToken(tokens, line.slice(i), 'var(--sh-comment)');
          i = line.length;
        } else {
          pushToken(tokens, line.slice(i, closeIdx + 2), 'var(--sh-comment)');
          i = closeIdx + 2;
          inBlockComment = false;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === '\\') {
            j += 2;
            continue;
          }
          if (line[j] === quote) {
            j += 1;
            break;
          }
          j += 1;
        }
        const literal = line.slice(i, j);
        // JSON property key detection
        const rest = line.slice(j).trimStart();
        if (language === 'json' && rest.startsWith(':')) {
          pushToken(tokens, literal, 'var(--sh-property)');
        } else {
          pushToken(tokens, literal, 'var(--sh-string)');
        }
        i = j;
        continue;
      }

      if (ch === '`') {
        let j = i + 1;
        let closed = false;
        while (j < line.length) {
          if (line[j] === '\\') {
            j += 2;
            continue;
          }
          if (line[j] === '`') {
            j += 1;
            closed = true;
            break;
          }
          j += 1;
        }
        if (!closed) inTemplate = true;
        pushToken(tokens, line.slice(i, j), 'var(--sh-string)');
        i = j;
        continue;
      }

      if (/\s/.test(ch)) {
        let j = i + 1;
        while (j < line.length && /\s/.test(line[j])) j += 1;
        pushToken(tokens, line.slice(i, j));
        i = j;
        continue;
      }

      if (/[0-9]/.test(ch) && !/[a-zA-Z_$]/.test(line[i - 1] ?? '')) {
        const match = line.slice(i).match(/^(0x[0-9a-fA-F]+|\d+(\.\d+)?)/);
        if (match) {
          pushToken(tokens, match[0], 'var(--sh-number)');
          i += match[0].length;
          continue;
        }
      }

      if (/[a-zA-Z_$]/.test(ch)) {
        const match = line.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
        if (match) {
          const word = match[0];
          const afterWord = line.slice(i + word.length);
          const trimmedAfter = afterWord.trimStart();

          if (TS_KEYWORDS.has(word)) {
            pushToken(tokens, word, 'var(--sh-keyword)');
          } else if (TS_BUILTIN_TYPES.has(word) || /^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
            pushToken(tokens, word, 'var(--sh-class)');
          } else if (trimmedAfter.startsWith('(')) {
            pushToken(tokens, word, 'var(--sh-entity)');
          } else if (
            trimmedAfter.startsWith(':') &&
            !trimmedAfter.startsWith('::')
          ) {
            pushToken(tokens, word, 'var(--sh-property)');
          } else {
            pushToken(tokens, word, 'var(--sh-identifier)');
          }

          i += word.length;
          continue;
        }
      }

      pushToken(tokens, ch, 'var(--sh-sign)');
      i += 1;
    }

    return tokens;
  });
}
