import type { ReactNode } from 'react';

const KEYWORDS = new Set([
  'import', 'from', 'export', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in',
  'new', 'class', 'extends', 'async', 'await', 'type', 'interface', 'default', 'true', 'false', 'null', 'undefined',
  'throw', 'try', 'catch', 'finally', 'typeof', 'as', 'readonly', 'switch', 'case', 'break', 'continue', 'this',
]);

/**
 * A small hand-written tokenizer for one line of TypeScript. It knows comments,
 * strings, numbers and keywords, and leaves everything else plain. It is not a
 * parser, and it does not track template strings across lines.
 */
export function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = '';
  let i = 0;
  const flush = () => {
    if (plain) out.push(plain);
    plain = '';
  };
  const push = (cls: string, text: string) => {
    flush();
    out.push(
      <span key={out.length} className={cls}>
        {text}
      </span>,
    );
  };

  while (i < line.length) {
    const ch = line[i];
    if (line.startsWith('//', i)) {
      push('tok-com', line.slice(i));
      break;
    }
    if (line.startsWith('/*', i)) {
      const end = line.indexOf('*/', i + 2);
      const stop = end < 0 ? line.length : end + 2;
      push('tok-com', line.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 1, line.length);
      push('tok-str', line.slice(i, stop));
      i = stop;
      continue;
    }
    if (/[0-9]/.test(ch) && !/[A-Za-z0-9_$]/.test(line[i - 1] ?? '')) {
      let j = i;
      while (j < line.length && /[0-9._]/.test(line[j])) j++;
      push('tok-num', line.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) push('tok-kw', word);
      else plain += word;
      i = j;
      continue;
    }
    plain += ch;
    i++;
  }
  flush();
  return out;
}
