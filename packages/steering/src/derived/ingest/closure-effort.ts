/**
 * Section 2 of a closure report — the discipline split — which also parses.
 *
 *     2. EFFORT
 *
 *        Reported total: 1213.6 hours over 27 weeks.
 *
 *        systems            932.5 h
 *        software           281.1 h
 *
 * Needed because turning hours into euros needs to know WHICH hours: a safety
 * engineer and a calibration engineer are not the same money, and the rate card
 * is per discipline. Without this the cost answer can only be a total, priced at
 * a blended rate nobody approved.
 *
 * NOTE WHAT IS BEING PARSED HERE. This is the third distinct shape inside one
 * document: a label block at the top, a prose paragraph in the middle that only
 * a model can read, and a fixed-width table at the bottom. "Which pipeline does
 * this document belong to" was the wrong question — a document belongs to as
 * many pipelines as it has shapes.
 */

export interface EffortSplitLine {
  file_id: string; line_no: number; subject: string;
  discipline: string; hours: number;
}

const SUBJECT = /^.*\/(.+)\.md$/;
const SECTION = /^\s*(\d+)\.\s+([A-Z]+)/;
const ROW = /^\s{2,}([a-z_]+)\s{2,}([\d.]+)\s*h\s*$/;
const TOTAL = /^\s*Reported total:\s*([\d.]+)\s*hours\s*over\s*(\d+)\s*weeks/;

export function parseEffortSplits(
  files: readonly { path: string; content: string }[],
): { lines: EffortSplitLine[]; totals: { file_id: string; subject: string; hours: number; weeks: number }[] } {
  const lines: EffortSplitLine[] = [];
  const totals: { file_id: string; subject: string; hours: number; weeks: number }[] = [];

  for (const f of files) {
    const subject = f.path.replace(SUBJECT, '$1');
    let inEffort = false;
    f.content.split('\n').forEach((text, i) => {
      const sec = SECTION.exec(text);
      // Bounded by the section headings on both sides. Not by "lines that look
      // like a discipline and a number" — the LESSONS section further down is
      // free prose and could produce one by accident.
      if (sec) { inEffort = sec[2] === 'EFFORT'; return; }
      if (!inEffort) return;

      const t = TOTAL.exec(text);
      if (t) { totals.push({ file_id: f.path, subject, hours: Number(t[1]), weeks: Number(t[2]) }); return; }

      const r = ROW.exec(text);
      if (r) lines.push({ file_id: f.path, line_no: i + 1, subject, discipline: r[1], hours: Number(r[2]) });
    });
  }
  return { lines, totals };
}
