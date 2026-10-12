import { useState } from 'react';
import { highlightLine } from './highlight';

/** A compact code view: a slim bar with the language and Copy, then the code with faint line numbers. */
export function CodeBlock({ code }: { code: string }) {
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
        <span className="course-code-label">TypeScript</span>
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

/** What the code prints. A small muted label, then the text in the code font. */
export function OutputPanel({ output }: { output: string }) {
  return (
    <div className="course-output">
      <p className="course-output-label">Output</p>
      <pre className="course-output-pre">{output}</pre>
    </div>
  );
}
