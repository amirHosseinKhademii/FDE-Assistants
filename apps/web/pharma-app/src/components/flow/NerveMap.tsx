/**
 * The anatomy of one answer.
 *
 * WHAT REPLACED WHAT. This is the successor to `TheWalk` — six dots in a row
 * with a light running along them. The dots were right about the premise and
 * silent about everything in front of it: a reader saw six databases and no
 * sign of the loop, the agents or the tools that actually reach them. This
 * draws the whole nervous system, from the question typed at the desk to the
 * seven stores it ends up reading, and keeps every argument the row of dots was
 * making.
 *
 * THE ARGUMENT IT INHERITS, AND MUST NOT LOSE: the dashes never close. A
 * neural picture is MADE of connections, so the instinct is to mesh the six
 * systems together and the mesh would be a lie — `mrd_erp` and `mrd_tms` are
 * separate databases on separate credentials and no query spans them. So the
 * topology here is a strict star: a system connects upward to the tool that
 * reads it and to nothing else, and the only marks between two systems are the
 * short dashed segments that never close. That is why "where did this lot go"
 * costs a person twelve minutes today.
 *
 * COLOUR MEANS PROVENANCE, AND NOTHING ELSE. The six hues are already spoken
 * for as the six systems of record (`DESIGN.md` §2), and three of them are the
 * same hex as a semantic token — `--color-hop-3` IS `--color-ui-info` and
 * `--color-flow-person`, `--color-hop-1` IS `--color-ui-accent`. On every other
 * page that is harmless because hop hues and actor hues never share a frame.
 * Here they would, for the first time. So the actors — you, the loop, the
 * agents, the tools — carry NO hue at all, and colour arrives only at the outer
 * ring. The impulse travelling out is neutral, because a question has no
 * source; the impulse coming back takes the hue of the system it came from,
 * because a finding does. Every citation in the dossier names the table it came
 * from, and this is that idea drawn.
 *
 * ORDER IS ENCODED TWICE, per the rule `Lanes.tsx` already states: the
 * animation AND something static. Reduced motion stills every pulse here, so
 * the four columns are captioned in sequence and the six systems keep the
 * numerals of the walk order. Numbering is usually decoration; this genuinely
 * is a sequence — it is the order `assessRelease()` walks — so it earns it.
 *
 * THE REVEAL IS A BUTTON, NOT A HOVER. Every node is focusable and clicking
 * pins it open, because a hover-only explanation is unreachable by keyboard and
 * untappable on a phone. The card rotates to its back face rather than opening
 * a panel elsewhere: the explanation belongs to the thing, and moving the
 * reader's eye across the diagram to find it would break the one relationship
 * the picture is drawing.
 */
import { FlowMap } from '@fde/uikit';
import { CylinderGlyph, PagesGlyph } from '@veresk/surface';
import type { FlowEdge, FlowNode, FlowStage, FlowWeb } from '@fde/uikit';
import {
  ArmsGlyph,
  DeskGlyph,
  GearSpannerGlyph,
  ScrewdriverGlyph,
  WebGlyph,
  WrenchGlyph,
} from './nerve-glyphs';
import { SYSTEM_FACES } from '../../lib/systems';

/* ── The map, as data ──────────────────────────────────────────────────────
   Every position, edge and word below is a value in one table, because the
   SVG edge layer and the HTML card layer have to agree about where a node is
   and there is no way to check that by eye. Coordinates are in the 1000×640
   viewBox; the cards read the same numbers as percentages.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * THE KINDS THIS MAP HAS. `FlowMap` takes `kind` as a free-form string and
 * styles nothing by it — what kinds exist is this product's vocabulary, so the
 * union and the per-kind card widths in `app.css` both live here.
 */
type Kind = 'you' | 'loop' | 'agents' | 'tool' | 'system' | 'corpus';

const SYSTEM_Y: Record<string, number> = {
  mrd_erp: 58,
  mrd_mes: 148,
  mrd_qms: 238,
  mrd_hcm: 328,
  mrd_reg: 418,
  mrd_tms: 508,
};

const SYSTEM_BACKS: Record<string, string> = {
  mrd_erp: 'Products, formulations, suppliers, and the incoming material lots each batch consumed.',
  mrd_mes: 'The execution record: which line, which equipment, and whether it was qualified that day.',
  mrd_qms: 'Specifications, test results, retests, and the disposition that released the batch.',
  mrd_hcm: 'Training, qualifications and signing authority — and the day each of them lapsed.',
  mrd_reg: 'Market authorisations, and every procedure revision with the dates it was in force.',
  mrd_tms: 'Shipments at lot granularity: the truck, the route, and how cold it was kept.',
};

/** Where the loop sits. The web behind it is built from the same two numbers. */
const LOOP_X = 316;
const LOOP_Y = 320;

/** The web's extent, and how many points make it look like a body. */
const WEB: FlowWeb = { nodeId: 'loop', rx: 152, ry: 116, points: 74 };

/** The clearance a fibre attaches at — the web's radius, not the card's. */
const LOOP_R = 146;

const NODES: FlowNode[] = [
  {
    id: 'you',
    kind: 'you',
    name: 'Your question',
    sub: 'one batch, one market',
    back: 'The question text is the only thing about you that leaves this page.',
    x: 74,
    y: 320,
    r: 68,
  },
  {
    id: 'loop',
    kind: 'loop',
    name: 'the loop',
    sub: 'gpt-5-mini',
    back: 'Reads the question, picks a tool, reads what comes back, writes the file. It never queries a database itself.',
    x: LOOP_X,
    y: LOOP_Y,
    cardDy: 150,
    /* The clearance is the WEB's radius, not the card's, so every axon
       attaches to the edge of the tangle rather than vanishing behind it. */
    r: LOOP_R,
  },
  {
    id: 'agents',
    kind: 'agents',
    name: 'agent-01 … agent-23',
    sub: 'one per affected lot',
    back: 'A supplier question fans out. Each agent sees one lot, so a bad document reaches one row and stops.',
    /* UNDER THE LOOP, because that is whose work it is: the orchestrator holds
       the fan-out, hands each lot to its own agent and assembles the rows back
       into one list. A version of this sat nested under
       `assess_supplier_impact` instead — tidier as a drawing, and it put the
       agents in the column reserved for things the loop CALLS, which they are
       not. The two edges are routed the long way round the loop's label rather
       than through it. */
    x: 330,
    y: 600,
    r: 88,
  },
  {
    id: 'assess_release',
    kind: 'tool',
    name: 'assess_release',
    sub: '29 queries, six systems',
    back: 'One call, not six. A model free to stop after Quality would report five passes and be wrong.',
    x: 600,
    y: 130,
    r: 104,
  },
  {
    id: 'assess_supplier_impact',
    kind: 'tool',
    name: 'assess_supplier_impact',
    sub: 'one supplier, every lot',
    back: 'Walks forward from a disqualified material to the batches that used it, and to where they went.',
    x: 600,
    y: 330,
    r: 104,
  },
  {
    id: 'search_procedures',
    kind: 'tool',
    name: 'search_procedures',
    sub: 'the revision in force',
    back: 'Finds the procedure that governed the act on the day it happened, not the one in force now.',
    x: 600,
    y: 620,
    r: 104,
  },

  /* THE SIX, BUILT FROM `lib/systems.ts` RATHER THAN LISTED AGAIN. The estate
     section below this map draws the same six, and a second copy of the order
     and the hues is a second copy that will one day disagree with the first.
     Only what is true of this DRAWING — where the cylinder sits, and what its
     back face says — is written here. */
  ...SYSTEM_FACES.map((face) => ({
    id: face.db.slice(4),
    kind: 'system' as const,
    step: face.step,
    tone: face.hue,
    name: face.db,
    sub: face.name,
    back: SYSTEM_BACKS[face.db],
    x: 884,
    y: SYSTEM_Y[face.db],
    r: 92,
  })),

  {
    id: 'kb',
    kind: 'corpus',
    name: 'mrd_kb',
    sub: 'Procedures',
    back: 'The written procedures themselves, searched by meaning. A library, not a system of record.',
    x: 884,
    y: 598,
    r: 92,
  },
];

const EDGES: FlowEdge[] = [
  { from: 'you', to: 'loop', at: 0 },
  { from: 'loop', to: 'assess_release', at: 1.0 },
  { from: 'loop', to: 'assess_supplier_impact', at: 1.15 },
  { from: 'loop', to: 'search_procedures', at: 1.3 },

  { from: 'assess_release', to: 'erp', at: 2.0 },
  { from: 'assess_release', to: 'mes', at: 2.2 },
  { from: 'assess_release', to: 'qms', at: 2.4 },
  { from: 'assess_release', to: 'hcm', at: 2.6 },
  { from: 'assess_release', to: 'reg', at: 2.8 },
  { from: 'assess_release', to: 'tms', at: 3.0 },

  /* TWO, NOT THREE, AND THIS WAS WRONG ONCE. A third edge to `mrd_qms` was
     drawn from a sentence in ARCHITECTURE.md rather than from the function:
     `assess-supplier-impact.ts` imports from `departments/erp` and
     `departments/tms` and from nothing else — the disqualification itself is an
     ERP fact. A picture of the topology has to be read off the topology. */
  { from: 'assess_supplier_impact', to: 'erp', at: 2.5 },
  { from: 'assess_supplier_impact', to: 'tms', at: 2.8 },

  { from: 'search_procedures', to: 'kb', at: 2.3 },

  /* THE FAN-OUT, AND IT USED TO DANGLE. The sub-agents hung under the loop on
     one stub edge, which said they existed and nothing about what they do. What
     they actually do has a shape: `assess_supplier_impact` comes back with the
     lots one disqualified supplier reached, the orchestrator hands each lot to
     its own agent, and the rows come back to be assembled into one work list.
     So the fan-out is drawn as what it is — a split and a return. */
  {
    from: 'assess_supplier_impact',
    to: 'agents',
    at: 3.6,
    d: 'M 600 376 C 516 424, 456 556, 420 594',
    note: '23 lots out',
    noteAt: [452, 520],
  },
  {
    from: 'agents',
    to: 'loop',
    at: 4.6,
    d: 'M 296 556 C 246 532, 224 484, 244 430',
    note: '23 rows back',
    noteAt: [138, 512],
  },
];

/**
 * THE GAPS THAT NEVER CLOSE, named as pairs rather than drawn as coordinates.
 * `mrd_erp` and `mrd_mes` are separate databases on separate credentials and no
 * query spans them; the dash between them is the only mark on this map that
 * says so. Deliberately NOT extended to `mrd_kb`, which is not their peer.
 */
const NON_EDGES: Array<[string, string]> = [
  ['erp', 'mes'],
  ['mes', 'qms'],
  ['qms', 'hcm'],
  ['hcm', 'reg'],
  ['reg', 'tms'],
];

const STAGES: FlowStage[] = [
  { title: 'You ask', ids: ['you'] },
  { title: 'The loop decides', ids: ['loop', 'agents'] },
  { title: 'A tool fetches', ids: ['assess_release', 'assess_supplier_impact', 'search_procedures'] },
  { title: 'The systems answer', ids: ['erp', 'mes', 'qms', 'hcm', 'reg', 'tms', 'kb'] },
];

/**
 * Which drawing belongs to which node.
 *
 * The loop has no figure ON THE MAP — the web behind it is its figure, and an
 * icon on top of a tangle would label the same thing twice. In the narrow
 * surface's single column there is no web to stand in for it, so `inList` asks
 * for the reduced one.
 */
function figureFor(node: FlowNode, inList: boolean) {
  switch (node.kind) {
    case 'you':
      return <DeskGlyph />;
    case 'loop':
      return inList ? <WebGlyph /> : null;
    case 'agents':
      return <ArmsGlyph />;
    case 'tool':
      /* One family — a reader should know this whole column is tools before
         reading a word. Which tool is which is the label's job. */
      return node.id === 'assess_release' ? (
        <WrenchGlyph />
      ) : node.id === 'assess_supplier_impact' ? (
        <GearSpannerGlyph />
      ) : (
        <ScrewdriverGlyph />
      );
    case 'system':
      return <CylinderGlyph />;
    case 'corpus':
      return <PagesGlyph />;
    default:
      return null;
  }
}

export function NerveMap() {
  return (
    <section className="py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        The answer is assembled by walking.
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        Nothing here holds the answer on its own. The question reaches a loop, the loop reaches
        tools, and the tools reach seven stores that cannot see each other.{' '}
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
          height={680}
          figure={figureFor}
          stackNote="The seven stores are seven separate databases. Nothing joins one to the next, which is why the answer has to be walked rather than queried."
        />
      </div>

      {/* About the DRAWING, so it is hidden wherever the drawing is. The stack
          makes the same point in its own last line. */}
      <p className="mt-8 hidden max-w-[58ch] text-sm leading-relaxed text-ui-faint sm:block">
        The short dashes down the right-hand column are the point of the drawing: nothing joins one
        system to the next. Colour only appears on the way back, and it is the colour of whichever
        system the fact was read from.
      </p>
    </section>
  );
}
