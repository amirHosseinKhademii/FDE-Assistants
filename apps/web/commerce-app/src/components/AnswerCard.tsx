/**
 * Render a structured answer from the agent with decision, amount, reasoning, and sources.
 * Tolerant parser: handles case-insensitive labels, markdown formatting, and missing sections.
 */
import { useMemo } from 'react';

interface ParsedAnswer {
  decision?: string;
  amount?: string;
  why?: string;
  basedOn?: Array<{ text: string; reference: string }>;
  needsApproval?: { approved: boolean; reason: string };
  nextStep?: string;
}

/**
 * Parse the answer text into structured sections.
 * Tolerant of case variations, markdown, and missing sections.
 */
function parseAnswer(text: string): ParsedAnswer {
  const result: ParsedAnswer = {};

  // Split into lines
  const lines = text.split('\n').map((l) => l.trim());

  // Pattern to match labels: case-insensitive, optional leading chars, optional **
  const labelPattern = /^[#>*\-]*\*{0,2}([a-z\s]+?)\*{0,2}:(.*)$/i;

  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(labelPattern);

    if (match) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        saveSection(result, currentSection, content);
      }

      // Start new section
      currentSection = match[1].trim().toLowerCase();
      const remainder = match[2].trim();
      currentContent = remainder ? [remainder] : [];
    } else if (currentSection && line) {
      // Append to current section
      currentContent.push(line);
    }
  }

  // Save final section
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    saveSection(result, currentSection, content);
  }

  return result;
}

/**
 * Save parsed content into the result object, handling special cases.
 */
function saveSection(result: ParsedAnswer, section: string, content: string): void {
  const normalized = section.replace(/\s+/g, ' ').toLowerCase();

  if (normalized === 'decision') {
    result.decision = stripMarkdown(content);
  } else if (normalized === 'amount') {
    result.amount = stripMarkdown(content);
  } else if (normalized === 'why') {
    result.why = stripMarkdown(content);
  } else if (normalized === 'based on') {
    // Parse bullet list of references
    result.basedOn = parseBulletList(content);
  } else if (normalized === 'needs a person to approve' || normalized === 'needs a person to approve') {
    result.needsApproval = parseApproval(content);
  } else if (normalized === 'next step') {
    result.nextStep = stripMarkdown(content);
  }
}

/**
 * Strip markdown formatting: **, __, backticks.
 */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/`([^`]+)`/g, '$1');
}

/**
 * Parse a bullet list with references in square brackets at the end.
 * Each bullet is: "- text [reference]"
 */
function parseBulletList(content: string): Array<{ text: string; reference: string }> {
  const bullets: Array<{ text: string; reference: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Remove leading bullet marker
    const trimmed = line.replace(/^[\s]*[*\-•0-9.]+\s*/, '').trim();
    if (!trimmed) continue;

    // Extract reference in square brackets at the end
    const refMatch = trimmed.match(/\[([^\]]+)\]\s*$/);
    const reference = refMatch ? refMatch[1].replace(/`/g, '') : '';
    const text = refMatch ? trimmed.slice(0, refMatch.index).trim() : trimmed;

    if (text) {
      bullets.push({
        text: stripMarkdown(text),
        reference: stripMarkdown(reference),
      });
    }
  }

  return bullets;
}

/**
 * Parse the approval decision and reason.
 * Format: "Yes — reason" or "No"
 */
function parseApproval(content: string): { approved: boolean; reason: string } {
  const text = stripMarkdown(content).trim();
  const isYes = /^yes/i.test(text);

  if (isYes) {
    // Extract reason after —, –, - or :
    const reasonMatch = text.match(/^yes\s*[—–:\-]\s*(.+)$/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : '';
    return { approved: true, reason };
  }

  return { approved: false, reason: '' };
}

/**
 * Check if text looks like a reference ID (policy:, rule:, record:)
 * or if it equals the reference, then humanize it.
 */
function isReferenceId(text: string): boolean {
  return /^(policy:|rule:|record:)/.test(text.trim());
}

/**
 * Humanize a reference ID into plain language.
 * - policy:POL-RET-001 Rev 3#2 → "Returns policy (Rev 3), section 2"
 * - rule:return_windows:RW-KITCHEN → "return windows: RW-KITCHEN"
 * - record:thb_fleet.driver_reports:DRP-00066 → "driver reports DRP-00066"
 */
function humanizeReference(ref: string): string {
  const trimmed = ref.trim();

  // policy:DOC Rev N#S → "DOC (Rev N), section S"
  const policyMatch = trimmed.match(/^policy:([^ ]+)\s+Rev\s+(\d+)#(\d+)$/);
  if (policyMatch) {
    const [, doc, rev, section] = policyMatch;
    return `${doc} (Rev ${rev}), section ${section}`;
  }

  // rule:TABLE:ID → "table: ID" (replace _ with space)
  const ruleMatch = trimmed.match(/^rule:([^:]+):(.+)$/);
  if (ruleMatch) {
    const [, table, id] = ruleMatch;
    return `${table.replace(/_/g, ' ')}: ${id}`;
  }

  // record:DB.TABLE:PK → "table PK" (extract table, replace _ with space)
  const recordMatch = trimmed.match(/^record:([^.]+)\.([^:]+):(.+)$/);
  if (recordMatch) {
    const [, , table, pk] = recordMatch;
    return `${table.replace(/_/g, ' ')} ${pk}`;
  }

  return trimmed;
}

interface AnswerCardProps {
  text: string;
  turns: number;
}

export function AnswerCard({ text, turns }: AnswerCardProps) {
  const parsed = useMemo(() => parseAnswer(text), [text]);

  // Fallback: if no Decision field, render raw text as markdown-lite
  if (!parsed.decision) {
    return (
      <section className="rounded-lg border border-ui-line bg-ui-raised p-4">
        <h3 className="text-sm font-semibold text-ui-fg">Answer</h3>
        <div className="mt-3 space-y-2 leading-relaxed text-ui-fg">
          {stripMarkdown(text)
            .split('\n')
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
        <p className="mt-4 text-[0.8125rem] text-ui-faint">
          {turns} turn{turns === 1 ? '' : 's'}
        </p>
      </section>
    );
  }

  // Full structured card
  return (
    <section className="rounded-lg border border-ui-line bg-ui-raised p-4">
      <div className="space-y-4">
        {/* Decision + Amount */}
        <div>
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <h2 className="text-lg font-semibold text-ui-fg flex-1">{parsed.decision}</h2>
            {parsed.amount && (
              <div
                className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${
                  parsed.amount === 'none' || parsed.amount === 'to be decided'
                    ? 'bg-ui-line/40 text-ui-dim'
                    : 'bg-thb-1/20 text-thb-1'
                }`}
              >
                {parsed.amount}
              </div>
            )}
          </div>
        </div>

        {/* Why */}
        {parsed.why && (
          <div>
            <p className="text-sm leading-relaxed text-ui-fg">{parsed.why}</p>
          </div>
        )}

        {/* Based on */}
        {parsed.basedOn && parsed.basedOn.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-ui-fg uppercase tracking-wider mb-2">Based on</h3>
            <div className="space-y-2">
              {parsed.basedOn.map((item, i) => {
                // Check if text is a reference ID or equals the reference — if so, humanize it
                const shouldHumanize = item.text === item.reference || isReferenceId(item.text);
                const displayText = shouldHumanize ? humanizeReference(item.text || item.reference) : item.text;

                return (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-ui-faint mt-1">•</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ui-fg">{displayText}</p>
                      {item.reference && (
                        <div className="mt-1">
                          <code className="text-[0.75rem] bg-ui-line/30 text-ui-faint px-2 py-1 rounded font-mono">
                            {item.reference}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approval status */}
        {parsed.needsApproval && (
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${
                parsed.needsApproval.approved
                  ? 'bg-amber-400/15 text-amber-300'
                  : 'bg-green-400/15 text-green-300'
              }`}
            >
              {parsed.needsApproval.approved ? 'Needs approval' : 'No approval needed'}
            </div>
            {parsed.needsApproval.reason && (
              <span className="text-sm text-ui-dim">{parsed.needsApproval.reason}</span>
            )}
          </div>
        )}

        {/* Next step */}
        {parsed.nextStep && (
          <div className="pt-2 border-t border-ui-line/30">
            <p className="text-sm text-ui-dim italic">{parsed.nextStep}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-4 text-[0.8125rem] text-ui-faint">
        {turns} turn{turns === 1 ? '' : 's'}
      </p>
    </section>
  );
}
