import { useState } from 'react';

/** A code block with line numbers, a copy button, and muted comment lines. */
export function CodeBlock({ code, label = 'Code' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="course-code">
      <div className="course-code-bar">
        <span>{label}</span>
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="course-code-pre">
        <code>
          {lines.map((line, i) => (
            <span key={i} className={'course-code-line' + (line.trim().startsWith('//') ? ' is-comment' : '')}>
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
