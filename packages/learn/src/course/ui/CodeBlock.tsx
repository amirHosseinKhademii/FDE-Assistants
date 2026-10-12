import { useState } from 'react';
import { highlightLine } from './highlight';

/** The dark editor-style code panel: window bar, line numbers, syntax colors, and a Copy button. */
export function CodeBlock({ code, label = 'TypeScript' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');

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
        <span className="course-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="course-code-label">{label}</span>
        <button type="button" className="course-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="course-code-pre">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="course-code-line">
              {line ? highlightLine(line) : ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** The terminal-style panel that shows what the code prints. */
export function OutputPanel({ output }: { output: string }) {
  return (
    <div className="course-term">
      <div className="course-term-bar">Output</div>
      <pre>{output}</pre>
    </div>
  );
}
