/**
 * Three trust domains, and the two channels between them.
 *
 * THE DIAGRAM'S ONLY JOB is to make "whose machine is this running on"
 * answerable at a glance, before a word is read. So the drawing has exactly
 * three boxes — one per domain — and colour carries domain membership and
 * nothing else. A node cannot pick its own colour; it inherits the lane's, so
 * nothing can end up drawn on the wrong side of the boundary by accident.
 *
 * WHY THE PACKETS MOVE. Direction is the question the page exists to answer,
 * and an arrowhead answers it far less immediately than something actually
 * travelling. It is encoded twice — the animation AND a static glyph — because
 * reduced motion stills the first, and a diagram that goes ambiguous for one
 * reader is broken rather than plainer.
 *
 * WHAT IS DELIBERATELY NOT DRAWN: any line from a system of record to Azure.
 * There isn't one, and the absence is the whole point. Every arrow out of this
 * network starts at the agent loop, which is the one place that decides what a
 * finding is — so the only thing that can cross is something already reduced to
 * a conclusion.
 */
import { Mono } from '@fde/uikit';

interface Node {
  name: string;
  sub: string;
}

function Lane({
  tone,
  label,
  where,
  nodes,
  columns = 3,
}: {
  tone: string;
  label: string;
  where: string;
  nodes: Node[];
  columns?: number;
}) {
  return (
    <div className={`lane px-5 py-4 ${tone}`}>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[0.9375rem] font-medium">{label}</h3>
        <Mono className="text-xs text-ui-faint">{where}</Mono>
      </div>
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${columns > 2 ? '11rem' : '14rem'}, 1fr))` }}
      >
        {nodes.map((n) => (
          <div key={n.name} className="node px-3.5 py-3">
            <p className="text-[0.8125rem] font-medium text-ui-fg">{n.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-ui-dim">{n.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The gap between two lanes, and what travels across it.
 *
 * Both directions are always shown. A channel drawn one-way invites the reading
 * that the other direction does not exist, and "what comes BACK from the model"
 * is half of what a reviewer is here to establish.
 */
function Channel({
  tone,
  out,
  back,
}: {
  tone: string;
  out: string;
  back: string;
}) {
  return (
    <div className={`grid gap-2 py-3 ${tone}`}>
      <Leg dir="right" label={out} />
      <Leg dir="left" label={back} />
    </div>
  );
}

/**
 * One direction of a channel: an arrow, the wire, and what travels on it.
 *
 * THE LABEL IS `shrink-0` AND THAT PUSHED THE PAGE SIDEWAYS ON A PHONE. "server-
 * sent events — tool steps, then the answer" is wider than a 390px viewport on
 * its own, so a row of [arrow][flexible wire][unshrinkable label] could not fit
 * however much the wire gave up, and the whole document gained a horizontal
 * scrollbar. On a security page that is worse than untidy: the reader's first
 * impression of a diagram about containment is a thing that will not stay in
 * its box.
 *
 * So below `sm` the label goes on its own line under the wire, where it has the
 * full width and wraps like prose. From `sm` up the original single row returns,
 * because reading the label AS the thing on the wire is the better rendering
 * whenever there is room for it.
 */
function Leg({ dir, label }: { dir: 'right' | 'left'; label: string }) {
  const right = dir === 'right';
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr_auto]">
      <span className="text-xs opacity-80" aria-hidden>
        {right ? '↓' : '↑'}
      </span>
      <div className="relative h-px overflow-visible">
        <span className="wire absolute inset-0 block" aria-hidden />
        <span className={`packet ${right ? 'packet--right' : 'packet--left'}`} aria-hidden />
      </div>
      <Mono className="col-start-2 text-[0.6875rem] break-words opacity-90 sm:col-start-3 sm:shrink-0">
        {label}
      </Mono>
    </div>
  );
}

export function Lanes() {
  return (
    <div className="grid">
      <Lane
        tone="text-flow-person"
        label="The reviewer's browser"
        where="their laptop"
        columns={2}
        nodes={[
          { name: 'The question', sub: 'A batch and a market, as a sentence.' },
          { name: 'The dossier', sub: 'Streamed back as it is assembled.' },
        ]}
      />

      <Channel
        tone="text-flow-person"
        out="POST /api/ask — the question, over TLS"
        back="server-sent events — tool steps, then the answer"
      />

      <Lane
        tone="text-flow-internal"
        label="Your network"
        where="your servers, your databases"
        nodes={[
          { name: 'The guard', sub: 'Fail-closed on an API key. No key configured means refuse.' },
          { name: 'The agent loop', sub: 'Holds the conversation. The only thing that talks to the model.' },
          { name: 'Six systems of record', sub: 'ERP · MES · QMS · HCM · REG · TMS. Reads only.' },
          { name: 'The passage index', sub: 'Your procedures, chunked and embedded, in your Postgres.' },
          { name: 'The question log', sub: 'What was asked and answered, for the reviewer to return to.' },
          { name: 'The answer contract', sub: 'Validates shape, then coherence, before anything is shown.' },
        ]}
      />

      <Channel
        tone="text-flow-model"
        out="the question · findings · matched passages · store: false"
        back="a tool to call, or the finished answer"
      />

      <Lane
        tone="text-flow-model"
        label="Azure OpenAI"
        where="swedencentral · one host, one region"
        columns={2}
        nodes={[
          { name: 'gpt-5-mini', sub: 'Decides which tool to call, then writes the answer.' },
          {
            name: 'text-embedding-3-small',
            sub: 'Indexing only, never during a question. Replaceable with a local model.',
          },
        ]}
      />
    </div>
  );
}
