/**
 * The shape of the worked example, and the reason it is a hand-written type
 * next to a generated value.
 *
 * `worked-example.generated.ts` is written by `pnpm steering:worked-example`,
 * which runs the real loop and serialises what came back. Typing it HERE rather
 * than in the generated file means the page is compiled against a contract
 * rather than against whatever one run happened to produce — so a field that
 * stops being emitted is a build error instead of a blank on the page.
 *
 * `WORKED` IS NULLABLE ON PURPOSE. Until somebody spends the money there is no
 * example, and the page renders nothing rather than a placeholder. An invented
 * specimen on a page whose whole argument is "here is the real output" would be
 * the worst thing on this site.
 */
import type { Requirement } from '../hooks/use-assess';

export interface WorkedExample {
  ref: string;
  requirement: Requirement;
  /** The validated answer, exactly as the contract allows it. */
  assessment: any;
  /** What happened when each quoted sentence was looked for in the file it names. */
  citations?: {
    exact: number;
    corrected: number;
    unresolved: Array<{ file: string; quote: string }>;
  };
  run: {
    turns: number;
    toolCalls: number;
    ms: number;
    engine: string;
    stoppedBecause: string;
    schemaRetries: number;
  };
  /** Every tool call, in order, with what it returned. */
  trace: Array<{ name: string; summary?: string; ms?: number; ok?: boolean }>;
  /** The command that produced this, printed on the page. */
  measuredBy: string;
  /** The date it was produced, printed on the page. */
  measuredAt: string;
}
