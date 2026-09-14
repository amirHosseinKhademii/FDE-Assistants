/**
 * The anatomy of one assessment — Vantis Steering's nervous system.
 *
 * IT IS MERIDIAN PHARMA'S `NerveMap` AS A COMPONENT AND NOT AS A PICTURE. The
 * drawing machinery is `@fde/uikit`'s `FlowMap`: a graph on a fixed grid, a
 * pulse that runs the sequence, a card that turns over, and a readable stack
 * where there is no room. Every node, edge, word and hue below is this
 * product's, and where the two maps differ they differ because the two systems
 * do.
 *
 * ── THE ARGUMENT, WHICH IS THE OPPOSITE OF PHARMA'S ──────────────────────
 *
 * Pharma's map says: the answer lives in six databases that cannot be joined,
 * so it has to be walked. The dashes between its cylinders are the whole point.
 *
 * This one says something else, and it took a retraction in
 * `docs/steering/PLAN.md` to be able to say it honestly: **no evidence in an
 * answer comes from the customer's systems.** `vst_crm`, `vst_alm`, `vst_plm`
 * and `vst_pmo` were generated alongside the corpus from the same constants, so
 * they are an answer key rather than a source. Everything a request cites is in
 * `vst_derived`, which is ours, built by reading 1,069 of the customer's files.
 *
 * ── AND EXACTLY ONE READ THAT BREAKS THAT SENTENCE, SO IT IS DRAWN ───────
 *
 * The first version of this map showed ZERO reads of the four, which was wrong
 * in the other direction and was caught by somebody else grepping for it.
 * `api.assess.tsx` calls `fetchRequirement`, and `answer/requirements.ts:111`
 * opens `urlFor('vst_alm')` — because you have to read the question you were
 * asked. It is the only `urlFor` on the whole answer path; everything else
 * resolves `derivedUrl()`.
 *
 * That read is a better fact than the absence it replaced, and the distinction
 * it draws is the one the product actually makes: **`vst_alm` is opened for the
 * QUESTION and never for the ANSWER.** Nothing it returns is ever cited. So it
 * is on the map, at the top left, with one edge and its own colour.
 *
 * The rest, read off the two tools' own imports rather than off a paragraph:
 *
 *   search_documents      → document_chunks
 *   find_comparable_work  → derived_effort, effort_split_lines,
 *                           rate_card_lines, extracted_facts
 *
 * Drawing four coloured `vst_*` cylinders under the TOOLS would still be the
 * precise claim the plan retracted, and `NerveMap.tsx` records making a smaller
 * version of that mistake once — an edge drawn from a sentence in a design doc
 * rather than from the function. The lesson survives both corrections intact: a
 * picture of the topology has to be read off the topology, in both directions.
 *
 * ── `nonEdges` MEANS SOMETHING DIFFERENT HERE, SO IT IS USED ONCE ────────
 *
 * Pharma's dashes say "no query spans these two". That would be a lie in the
 * opposite direction on this map: the five tables are five tables in one
 * Postgres database and they join perfectly well. The only absence worth a dash
 * is the one at the bottom — between the database a request reads and the three
 * it never touches.
 *
 * ── COLOUR IS WHICH READING PRODUCED THE ROW, AND NOTHING ELSE ──────────
 *
 * TWO SCALES, AND `app.css` ALREADY SETTLED WHICH IS WHICH: warm is theirs,
 * cool is ours. `--color-vst-1..4` mean "which of Vantis's four systems did
 * this come from"; `--color-src-*` mean "read out of the files, by us". No hue
 * is shared between them, which is the whole reason both can appear here.
 *
 * So `vst_alm` carries `--color-vst-2`, its own hue on the estate below, and it
 * is the ONLY warm thing on the map — which makes the single read visible as a
 * single read without a word being written. The ring of tables takes the cool
 * scale, the same three tones `Pipeline` and `Landed` give the three readings,
 * so this map and those sections are one argument rather than two.
 *
 * THAT THE MAP NOW COMES FIRST IS WHY THE COOL HUES ARE WORTH THE RISK. A
 * reader meets cyan, violet and pink here before anything has named them, and
 * meets them again on the three pipeline cards below with the explanation
 * attached. That order is survivable — an unexplained colour is a question, and
 * the section that answers it is the next thing on the page. The reverse, a
 * colour explained and then quietly reused to mean something else, is not.
 *
 * `derived_effort` takes the accent instead, because it is the join of all
 * three and `Landed.tsx` already marks it that way. `the answer key` takes no
 * hue at all, because no reading produced it — the same rule every "not one of
 * the set" thing on this site follows.
 *
 * ── THE FAN-OUT IS SERIAL, AND THE DRAWING HAD TO SAY SO ────────────────
 *
 * `steering:assess-all` works the bid one requirement at a time and is
 * resumable because it keeps no batch state — the list is recomputed from what
 * has been filed. Pharma's three simultaneously-working arms would have been a
 * picture of concurrency this program does not have, so the figure is a queue
 * with one marker stepping down it. See `bid-glyphs.tsx`.
 *
 * ── ORDER IS ENCODED TWICE, per the rule `FlowMap` states: the pulses carry
 * the sequence and a reduced-motion setting stills them, so the four columns
 * are captioned in words as well. No numerals on the stores — the tools call
 * them as they need them and that is not a sequence, so it would not be earned.
 */
import { FlowMap } from '@fde/uikit';
import { CylinderGlyph } from '@veresk/surface';
import type { FlowEdge, FlowNode, FlowStage, FlowWeb } from '@fde/uikit';
import {
  CaliperGlyph,
  FunnelGlyph,
  MagnifierGlyph,
  QueueGlyph,
  RequirementGlyph,
  StackGlyph,
  TangleGlyph,
} from './bid-glyphs';
import { ESTATE } from '../../lib/estate.generated';

/**
 * THE KINDS THIS MAP HAS. `FlowMap` takes `kind` as a free-form string and
 * styles nothing by it — what kinds exist is this product's vocabulary, so the
 * union and the per-kind card widths in `app.css` both live here.
 */
type Kind = 'you' | 'sor' | 'loop' | 'agents' | 'tool' | 'derived' | 'key';

/* ── THE FIGURES ARE COUNTED, NOT TYPED IN ─────────────────────────────────
   Every row count on this map comes from the same generated estate the section
   below reads. A second copy of "2,827 passages" is a second copy that will one
   day disagree with the first, and the last time a figure on this page was
   typed from memory it said 54 files when there were 1,069.
   ────────────────────────────────────────────────────────────────────────── */

const DERIVED_ROWS = new Map(
  (ESTATE.find((s) => s.db === 'vst_derived')?.tables ?? []).map((t) => [t.name, t.rows]),
);

/**
 * One derived table as a node. `noun` is what the rows ARE — "passages", "past
 * jobs" — because `2,827 rows` is true of every table here and tells a reader
 * nothing about which one they are looking at.
 *
 * A count that cannot be found is left out rather than guessed: a table renamed
 * in the database and not here should show a card with no figure, not a figure
 * from the wrong table.
 */
function derived(
  name: string,
  noun: string,
  tone: string | undefined,
  y: number,
  back: string,
): FlowNode {
  const rows = DERIVED_ROWS.get(name);
  return {
    id: name,
    kind: 'derived' satisfies Kind,
    tone,
    name,
    sub: rows === undefined ? noun : `${rows.toLocaleString('en-GB')} ${noun}`,
    back,
    x: 880,
    y,
    r: 92,
  };
}

/** Where the loop sits. The tangle behind it is built from the same two numbers. */
const LOOP_X = 316;
const LOOP_Y = 250;

/** The tangle's extent, and how many points make it look like a body. */
const WEB: FlowWeb = { nodeId: 'loop', rx: 152, ry: 116, points: 74, seed: 20260914 };

/** The clearance a fibre attaches at — the tangle's radius, not the card's. */
const LOOP_R = 146;

const NODES: FlowNode[] = [
  /* THE ONE SYSTEM OF RECORD A REQUEST OPENS, and it is opened before anything
     else happens — `api.assess.tsx` has the requirement in hand before the loop
     starts. It carries `--color-vst-2`, its own hue on the estate below, and it
     is the only warm thing on this map: one read, visible as one read. */
  {
    id: 'vst_alm',
    kind: 'sor',
    tone: 'var(--color-vst-2)',
    name: 'vst_alm',
    sub: 'one read, for the question',
    back: 'The one system of record a request opens, and never for any part of the answer.',
    x: 98,
    y: 70,
    r: 66,
  },
  {
    id: 'you',
    kind: 'you',
    name: 'A requirement',
    sub: 'one line of an OEM spec',
    back: 'Its text is the only thing about your bid that leaves this page.',
    x: 78,
    y: 240,
    r: 66,
  },
  {
    id: 'loop',
    kind: 'loop',
    name: 'the loop',
    sub: 'gpt-5-mini · 12 turns at most',
    back: 'Searches, prices, writes the dossier — then finds every quote in the file so the line numbers are real.',
    x: LOOP_X,
    y: LOOP_Y,
    cardDy: 150,
    /* The clearance is the TANGLE's radius, not the card's, so every fibre
       attaches at the edge of the body rather than vanishing behind it. */
    r: LOOP_R,
  },

  /* THE TWO TOOLS, AND THERE ARE ONLY TWO. Pharma has three and a fan-out;
     this has two, and saying so plainly is the accurate thing rather than a
     gap in the drawing. */
  {
    id: 'search_documents',
    kind: 'tool',
    name: 'search_documents',
    sub: '6 passages, no cutoff',
    back: "Hybrid search over the customer's own prose and code. It hands back the best passages even when they are poor.",
    x: 596,
    y: 105,
    r: 104,
  },
  {
    id: 'find_comparable_work',
    kind: 'tool',
    name: 'find_comparable_work',
    sub: 'the median of past jobs',
    back: 'Median rather than mean, and it refuses below three past jobs. On the K2 bid it refused 23 times out of 24.',
    x: 596,
    y: 345,
    r: 104,
  },

  /* ── THE RING: FIVE TABLES, ONE DATABASE, AND IT IS OURS ─────────────────
     Ordered by which tool reaches them — the index first, then the four a
     price is assembled from — rather than alphabetically or by row count. */
  derived(
    'document_chunks',
    'passages',
    'var(--color-src-4)',
    46,
    'The prose and the code, cut at their own seams and stored so they can be found by meaning.',
  ),
  derived(
    'extracted_facts',
    'facts',
    'var(--color-src-6)',
    176,
    'Facts that were wearing a sentence. Each carries the sentence it was read from.',
  ),
  derived(
    'derived_effort',
    'past jobs',
    /* THE JOIN, AND IT TAKES THE ACCENT RATHER THAN A READING'S HUE. It is
       assembled from all three readings, so no single one of them produced it —
       `Landed.tsx` marks it the same way for the same reason. */
    'var(--color-ui-accent)',
    306,
    'One row per closure report, and the table a price is actually queried from.',
  ),
  derived(
    'effort_split_lines',
    'lines',
    'var(--color-src-1)',
    436,
    'Hours by discipline. A price is a mix, and the mix is what a rate card is applied to.',
  ),
  derived(
    'rate_card_lines',
    'rates',
    'var(--color-src-1)',
    566,
    'Approved rates by year and region. Hours become euros through these and nothing else.',
  ),

  /* ── AND THE THREE THAT ARE NOT ON THE PATH ──────────────────────────────
     Drawn, with no edge to anything, because an absence drawn as nothing at
     all is indistinguishable from an oversight. The estate section below opens
     all four properly; here they are one card saying what they are FOR.

     A `the files` node stood between these and the ring for one revision, for
     the citation resolution that really does open the corpus mid-request. It
     came out: a stack of pages in a column of cylinders reads as a sixth
     store, and the fact survives perfectly well on the loop's own back face,
     which is whose work it is. */
  {
    id: 'key',
    kind: 'key',
    name: 'the answer key',
    sub: 'vst_crm · vst_plm · vst_pmo',
    back: 'What our reading is marked against. One command opens them, and it is the one that grades us.',
    x: 866,
    y: 716,
    r: 92,
  },

  /* ── THE SECOND CYCLE: A WHOLE BID, AND THE PAGE ABOUT IT ────────────────
     Both are real agents and neither is the assessment loop, so they sit in
     the loop's column rather than the tools' — the column is "what decides",
     and what a tool column holds is things the loop CALLS. */
  {
    id: 'bid',
    kind: 'agents',
    name: 'the work list',
    sub: '24 requirements, in turn',
    back: 'A whole bid, one requirement at a time and never in parallel. The list is recomputed from what is already filed.',
    x: 165,
    y: 660,
    r: 105,
  },
  {
    id: 'summariser',
    kind: 'agents',
    name: 'the summariser',
    sub: 'no tools, one call',
    back: 'A second and much smaller agent. It reads only the assessments already filed, and counts before it asks.',
    x: 485,
    y: 660,
    r: 110,
  },
];

const EDGES: FlowEdge[] = [
  /* FIRST, AND BEFORE THE LOOP EXISTS. You cannot assess a requirement without
     reading the requirement, so this fires at the top of the cycle and its
     return leg is the only warm pulse on the map. */
  { from: 'you', to: 'vst_alm', at: 0.2 },

  { from: 'you', to: 'loop', at: 0.7 },
  { from: 'loop', to: 'search_documents', at: 1.5 },
  { from: 'loop', to: 'find_comparable_work', at: 1.75 },

  { from: 'search_documents', to: 'document_chunks', at: 2.6 },

  /* FOUR, AND EVERY ONE READ OFF AN IMPORT. `find-comparable-work.ts` calls
     `fetchComparableJobs` (derived_effort), `fetchDisciplineMix`
     (effort_split_lines), `fetchRates` (rate_card_lines) and `fetchFactSources`
     (extracted_facts). The last is the one nobody would guess: the evidence
     comes back WITH the figure, because a tool that returned a number and left
     the model to fetch its justification afterwards produces citations
     assembled after the fact. */
  { from: 'find_comparable_work', to: 'derived_effort', at: 2.9 },
  { from: 'find_comparable_work', to: 'effort_split_lines', at: 3.1 },
  { from: 'find_comparable_work', to: 'rate_card_lines', at: 3.3 },
  { from: 'find_comparable_work', to: 'extracted_facts', at: 3.5 },

  /* THE BID CYCLE. Routed by hand to the left of the loop's label rather than
     through it, for pharma's reason: an edge through a card reads as an edge
     to it. */
  {
    from: 'bid',
    to: 'loop',
    at: 4.6,
    d: 'M 178 604 C 146 530, 150 420, 198 340',
    note: '24, one at a time',
    noteAt: [30, 528],
  },
  { from: 'bid', to: 'summariser', at: 5.4, note: 'what has been filed', noteAt: [262, 636] },
];

/**
 * THE ONE GAP THAT NEVER CLOSES, and it is the only pair on this map where an
 * absence is the information. Above it is the database a request reads. Below
 * it are the databases Vantis actually runs, which it does not — except for the
 * single `vst_alm` row at the top left, which is the question rather than any
 * part of the answer.
 *
 * Deliberately NOT drawn between the five derived tables: those are five tables
 * in one Postgres database and they join perfectly well. A dash between them
 * would be pharma's argument borrowed onto a topology that does not have it.
 */
const NON_EDGES: Array<[string, string]> = [['rate_card_lines', 'key']];

const STAGES: FlowStage[] = [
  { title: 'The question', ids: ['you', 'vst_alm'] },
  { title: 'A loop decides', ids: ['loop', 'bid', 'summariser'] },
  { title: 'A tool fetches', ids: ['search_documents', 'find_comparable_work'] },
  {
    title: 'Rows we made answer',
    ids: [
      'document_chunks',
      'extracted_facts',
      'derived_effort',
      'effort_split_lines',
      'rate_card_lines',
      'key',
    ],
  },
];

/**
 * Which drawing belongs to which node.
 *
 * The loop has no figure ON THE MAP — the tangle behind it is its figure, and
 * an icon on top of a tangle would label the same thing twice. In the narrow
 * surface's single column there is no tangle to stand in for it, so `inList`
 * asks for the reduced one.
 */
function figureFor(node: FlowNode, inList: boolean) {
  switch (node.kind as Kind) {
    case 'you':
      return <RequirementGlyph />;
    case 'loop':
      return inList ? <TangleGlyph /> : null;
    case 'agents':
      return node.id === 'bid' ? <QueueGlyph /> : <FunnelGlyph />;
    case 'tool':
      return node.id === 'search_documents' ? <MagnifierGlyph /> : <CaliperGlyph />;
    case 'sor':
    case 'derived':
      return <CylinderGlyph />;
    case 'key':
      return <StackGlyph />;
    default:
      return null;
  }
}

export function AssessMap() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        Every answer is assembled out of rows we made.
      </h2>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-ui-dim">
        Nothing here holds the answer on its own. A requirement reaches a loop, the loop reaches two
        tools, and the tools reach five tables in one database — ours, filled by reading the
        customer's own files. The only thing it opens of Vantis's own is the requirement it was
        asked about. How those tables were filled is the rest of this page.{' '}
        {/* The invitation only makes sense where the faces are turned down. The
            narrow surface shows both sides at once, so there is nothing to
            open. */}
        <span className="hidden sm:inline">Open any of them to read what it holds.</span>
      </p>

      <div className="mt-10">
        <FlowMap
          nodes={NODES}
          edges={EDGES}
          stages={STAGES}
          web={WEB}
          nonEdges={NON_EDGES}
          width={1000}
          height={820}
          cycle={10}
          figure={figureFor}
          stackNote="Every fact in an answer comes out of one database of ours, built by reading the customer's files. Of Vantis's own four systems a request opens exactly one, exactly once, for the text of the requirement — and never for any part of the answer."
        />
      </div>

      {/* About the DRAWING, so it is hidden wherever the drawing is. The stack
          makes the same point in its own last line. */}
      <p className="mt-8 hidden max-w-[60ch] text-sm leading-relaxed text-ui-faint sm:block">
        Warm is theirs and cool is ours — the one warm node is the only system of Vantis's a request
        opens, and it opens it for the question. The cool hues are which of the three readings
        produced the row, the same tones those stages carry further down. The short dash near the
        bottom is the point of the drawing: below it are the three databases nothing here ever
        reaches.
      </p>
    </section>
  );
}
