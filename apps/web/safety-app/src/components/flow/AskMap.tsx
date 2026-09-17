/**
 * The anatomy of one answer — Calder Safety's nervous system.
 *
 * IT IS THE SAME COMPONENT THE OTHER TWO ENGAGEMENTS DRAW WITH, `@fde/uikit`'s
 * `FlowMap`: a graph on a fixed grid, a pulse that runs the sequence, a card
 * that turns over, and a readable stack where there is no room. Every node,
 * edge, word and hue below is this product's, and where this map differs from
 * theirs it differs because the systems do.
 *
 * ── THE ARGUMENT, AND IT IS NOT EITHER OF THEIRS ─────────────────────────
 *
 * Pharma's map says: the answer lives in six databases that cannot be joined,
 * so it has to be walked. Steering's says: no evidence comes from the
 * customer's systems at all, only from rows we built.
 *
 * This one says something neither of them can. THERE IS ONE STORE AND
 * EVERYTHING IS IN IT. Nothing here is hard because the data is scattered — it
 * is hard because 73,334 documents written by the public and by lawyers all
 * look equally relevant to a keyword, and the questions people ask are not
 * really searches. So the crowded column is the TOOLS, and four of those five
 * did not exist until retrieval was measured and found to be answering the
 * wrong question.
 *
 * ── THE ABSENCE THIS MAP EXISTS TO DRAW ──────────────────────────────────
 *
 * `nonEdges` means something different on every one of these maps, so it is
 * used once and deliberately. Pharma's dashes say "no query spans these two".
 * Here the absence worth drawing is the one everybody gets wrong:
 *
 *     THE MODEL IS NOT CONNECTED TO THE STORE.
 *
 * It has no connection, no credentials and no way to run anything. It emits
 * text; our code decides whether to honour it. A line from the model to a
 * cylinder would be the drawing telling exactly the lie the rest of this site
 * exists to correct — so instead there is a dash that never closes, and the
 * tools are the only crossing on the map.
 *
 * ── COLOUR IS PROVENANCE, AND ONLY THE STORE CARRIES IT ──────────────────
 *
 * A question has no source, so nothing on the way out is tinted. What comes
 * back takes the tone of the thing it came from: recalls in one, complaints in
 * the other, the same two tones the estate below gives them. The tools are
 * untinted because a tool is a way of asking rather than a source of facts —
 * the same rule both sibling maps follow.
 *
 * ── AND THE FIGURES ARE COUNTED, NOT TYPED IN ────────────────────────────
 *
 * Every row count comes from the generated estate. A second copy of "70,194
 * complaints" is a second copy that will one day disagree with the first.
 */
import { FlowMap } from '@fde/uikit';
import type { FlowEdge, FlowNode, FlowStage, FlowWeb } from '@fde/uikit';
import { CylinderGlyph } from '@veresk/surface';
import {
  AskGlyph,
  KeyGlyph,
  LensGlyph,
  LinkGlyph,
  ModelGlyph,
  SieveGlyph,
  TallyGlyph,
  TangleGlyph,
} from './cal-glyphs';
import { UNITS } from '../../lib/estate.generated';

/**
 * The kinds this map has. `FlowMap` takes `kind` as a free-form string and
 * styles nothing by it, so the vocabulary and the per-kind card widths in
 * `app.css` both belong to this product.
 */
type Kind = 'you' | 'loop' | 'model' | 'tool' | 'store';

/** Where the loop sits, and the tangle drawn behind it. */
const LOOP_X = 336;
const LOOP_Y = 330;
const WEB: FlowWeb = { nodeId: 'loop', rx: 148, ry: 112, points: 72, seed: 20260917 };
const LOOP_R = 142;

const TOOL_X = 672;

/** One tool. They are untinted: a way of asking is not a source of facts. */
function tool(id: string, sub: string, y: number, back: string): FlowNode {
  return { id, kind: 'tool' satisfies Kind, name: id, sub, back, x: TOOL_X, y, r: 96 };
}

const NODES: FlowNode[] = [
  {
    id: 'you',
    kind: 'you',
    name: 'A question',
    sub: 'ordinary words',
    back: 'Nothing about it arrives labelled. “We run 2020 F-150s, is the park problem known” names a vehicle, a symptom and a time, and none of them are fields.',
    x: 104,
    y: 330,
    r: 70,
    step: 1,
  },
  {
    id: 'loop',
    kind: 'loop',
    name: 'the loop',
    sub: 'our code, our machine',
    back: 'Sends the question and the menu of tools, runs whatever comes back as a request, hands the result over, and repeats until an answer arrives instead. Then checks it against nine rules before anybody sees it.',
    x: LOOP_X,
    y: LOOP_Y,
    r: LOOP_R,
    step: 2,
    cardDy: -8,
  },
  {
    id: 'model',
    kind: 'model',
    name: 'the model',
    sub: 'chooses, never reaches',
    back: 'No connection, no credentials, no way to run anything. All it can do is produce text — and one shape of text is a request. It is not doing the work; it is deciding what work to ask for.',
    x: 336,
    y: 84,
    r: 80,
    step: 3,
  },

  tool(
    'get_recall',
    'I know the number',
    86,
    'A question with one exact answer is a lookup, not a search. Written into the plan before any data was loaded, and the only one of the five that survived exactly as specified.',
  ),
  tool(
    'find_recalls',
    'is there a campaign?',
    208,
    'Allowed to find nothing — and when it does, it says what IS recalled on that vehicle. The difference between “I found nothing” and “I checked, and it is not there”.',
  ),
  tool(
    'search_complaints',
    'I want to read them',
    330,
    'Narrows first, then searches inside. The complaint answering the F-150 question sat at rank 3,026 against the whole corpus; filtered, it comes back first.',
  ),
  tool(
    'count_complaints',
    'I want how many',
    452,
    'Retrieval returns examples and counting is an aggregate. No six passages contain a total, and a model asked to count from examples produces a number that sounds right.',
  ),
  tool(
    'complaints_citing',
    'who named this campaign',
    574,
    'Evidence by reference rather than similarity — the person filing had the campaign in front of them. It reaches one complaint the vehicle filter cannot, because NHTSA filed it under the wrong model.',
  ),

  {
    id: 'recalls',
    kind: 'store',
    tone: 'var(--color-cal-1)',
    name: 'recalls',
    sub: `${UNITS.recalls.toLocaleString('en-GB')} campaigns`,
    back: 'What manufacturers admitted. Each names the makes, models, years and component it covers — which is why an absence here is a fact about the corpus rather than an impression of it.',
    x: 968,
    y: 208,
    r: 92,
    step: 4,
  },
  {
    id: 'complaints',
    kind: 'store',
    tone: 'var(--color-cal-2)',
    name: 'complaints',
    sub: `${UNITS.complaints.toLocaleString('en-GB')} filings`,
    back: 'What people filed, in their own words, about their own vehicles — 23% of them in capitals. The only place the question “is the fix holding” has any evidence at all.',
    x: 968,
    y: 452,
    r: 92,
    step: 5,
  },
];

/**
 * The sequence, in the order one answer actually runs it.
 *
 * The model is reached and answers BACK before any tool runs, because that is
 * the shape of the thing: it is asked what to ask for, and only then does our
 * code go to the store.
 */
const EDGES: FlowEdge[] = [
  { from: 'you', to: 'loop', at: 0 },
  { from: 'loop', to: 'model', at: 0.9, note: 'the question, and five tools', noteAt: [368, 206] },
  { from: 'model', to: 'loop', at: 1.9, note: 'a request', noteAt: [487, 150] },

  { from: 'loop', to: 'get_recall', at: 3.0 },
  { from: 'loop', to: 'find_recalls', at: 3.2 },
  { from: 'loop', to: 'search_complaints', at: 3.4 },
  { from: 'loop', to: 'count_complaints', at: 3.6 },
  { from: 'loop', to: 'complaints_citing', at: 3.8 },

  { from: 'get_recall', to: 'recalls', at: 5.0 },
  { from: 'find_recalls', to: 'recalls', at: 5.2 },
  { from: 'search_complaints', to: 'complaints', at: 5.4 },
  { from: 'count_complaints', to: 'complaints', at: 5.6 },
  { from: 'complaints_citing', to: 'complaints', at: 5.8 },
];

/**
 * THE ONE ABSENCE WORTH A DASH, and it is the point of the whole drawing.
 *
 * Every other map on this site uses `nonEdges` for two stores that cannot be
 * joined. Here the two stores join perfectly well — they are two kinds of row
 * in one database. What does not connect is the MODEL and the store.
 */
const NON_EDGES: Array<[string, string]> = [
  ['model', 'recalls'],
  ['model', 'complaints'],
];

const STAGES: FlowStage[] = [
  { title: 'asked', ids: ['you'] },
  { title: 'decided', ids: ['loop', 'model'] },
  {
    title: 'asked for',
    ids: [
      'get_recall',
      'find_recalls',
      'search_complaints',
      'count_complaints',
      'complaints_citing',
    ],
  },
  { title: 'read', ids: ['recalls', 'complaints'] },
];

function figureFor(node: FlowNode, inList: boolean) {
  switch (node.kind as Kind) {
    case 'you':
      return <AskGlyph />;
    case 'model':
      return <ModelGlyph />;
    case 'loop':
      return inList ? <TangleGlyph /> : null;
    case 'store':
      return <CylinderGlyph />;
    case 'tool':
      switch (node.id) {
        case 'get_recall':
          return <KeyGlyph />;
        case 'find_recalls':
          return <SieveGlyph />;
        case 'search_complaints':
          return <LensGlyph />;
        case 'count_complaints':
          return <TallyGlyph />;
        default:
          return <LinkGlyph />;
      }
    default:
      return null;
  }
}

export function AskMap() {
  return (
    <section className="pt-6 pb-14">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        The model never touches the data.
      </h2>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
        It cannot — no connection, no credentials, no way to run anything. All it
        can do is produce text, and one shape of text is a request. A question
        reaches a loop, the loop asks a model what to ask for, and five tools are
        the only things that ever read the store.{' '}
        <span className="hidden sm:inline">Open any of them to read what it does.</span>
      </p>

      <div className="mt-10">
        <FlowMap
          nodes={NODES}
          edges={EDGES}
          stages={STAGES}
          web={WEB}
          nonEdges={NON_EDGES}
          width={1100}
          height={690}
          cycle={9}
          figure={figureFor}
          stackNote="One database, and everything is in it. What makes this hard is not that the records are scattered — it is that 73,334 documents written by the public and by lawyers all look equally relevant to a keyword. Four of the five tools did not exist until retrieval was measured and found to be answering the wrong question."
        />
      </div>

      <p className="mt-8 hidden max-w-[62ch] text-sm leading-relaxed text-ui-faint sm:block">
        Nothing on the way out is tinted, because a question has no source. What
        comes back takes the colour of what it came from, and those are the two
        tones the estate below gives the same two things. The short dashes are
        the point of the drawing: between the model and the store there is no
        line, and there is no way to draw one.
      </p>
    </section>
  );
}
