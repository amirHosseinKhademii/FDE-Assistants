/**
 * The anatomy of one answer — you, the loop, the five tools, one store.
 *
 * ── A SIBLING OF PHARMA'S NERVE MAP, AND A DIFFERENT SHAPE ON PURPOSE ─────
 *
 * That drawing exists to show six systems of record that CANNOT be joined:
 * separate databases on separate credentials, drawn as a strict star with
 * dashes between them that never close, because "where did this lot go" costs a
 * person twelve minutes today.
 *
 * Calder's problem is the opposite and the drawing has to say so. There is ONE
 * store. Everything is in it. Nothing here is hard because the data is scattered
 * — it is hard because 73,334 documents written by the public and by lawyers all
 * look equally relevant to a keyword, and the questions people ask are not
 * really searches.
 *
 * So the interesting column is not the stores. It is the TOOLS: five ways of
 * asking, four of which stage 3 had no way to express.
 *
 * ── THE MODEL NEVER REACHES THE STORE, AND THE PICTURE MUST SHOW IT ──────
 *
 * The single most misunderstood thing about this machine is that the model
 * queries the database. It cannot — no connection, no credentials, no ability to
 * run anything. It emits a request; our code honours it. So there is no line
 * from the model to the store at any point, and the tools column sits between
 * them as the only crossing.
 *
 * ── COLOUR MEANS PROVENANCE ──────────────────────────────────────────────
 *
 * Outbound is neutral, because a question has no source. What comes back takes
 * the tone of the thing it came from — recalls in one, complaints in the other.
 * Every citation on the desk names the document it came from, and this is that
 * idea drawn.
 *
 * ── THE REVEAL IS A BUTTON, NOT A HOVER ──────────────────────────────────
 *
 * A hover-only explanation is unreachable by keyboard and invisible on a phone.
 * Every node is focusable and clicking pins it open.
 *
 * ── AND ORDER IS ENCODED TWICE ───────────────────────────────────────────
 *
 * The pulse animates left to right, and the columns are captioned in sequence.
 * Reduced motion stills every pulse, so the captions carry it alone.
 */
import { useState } from 'react';
import { UNITS } from '../lib/estate.generated';

type Reach = 'recalls' | 'complaints' | 'both';

/** The five, and which part of the store each one reaches. */
const TOOLS: readonly { name: string; does: string; why: string; reach: Reach }[] = [
  {
    name: 'get_recall',
    does: 'I know the campaign number',
    why: 'A question with one exact answer is a lookup, not a search. Written into the plan before any data was loaded, and it survived exactly as specified.',
    reach: 'recalls',
  },
  {
    name: 'find_recalls',
    does: 'I know the vehicle — is there a campaign?',
    why: 'It is allowed to find nothing, and when it does it says what IS recalled on that vehicle. That is the difference between “I found nothing” and “I checked, and it is not there”.',
    reach: 'recalls',
  },
  {
    name: 'search_complaints',
    does: 'I want to read complaints',
    why: 'Narrows first, then searches inside. The complaint that answers the F-150 question sat at rank 3,026 when the whole corpus was searched at once; filtered, it comes back first.',
    reach: 'complaints',
  },
  {
    name: 'count_complaints',
    does: 'I want how many',
    why: 'Retrieval returns examples; counting is an aggregate. No six passages contain a total, and a model asked to count from examples produces a number that sounds right.',
    reach: 'complaints',
  },
  {
    name: 'complaints_citing',
    does: 'I want the complaints that name this campaign',
    why: 'Evidence by reference rather than by similarity — the person filing had the campaign number in front of them. It finds one complaint the vehicle filter cannot reach, because NHTSA filed it under the wrong model.',
    reach: 'complaints',
  },
];

const ACTORS: readonly { id: string; label: string; sub: string; why: string }[] = [
  {
    id: 'you',
    label: 'a question',
    sub: 'typed as ordinary words',
    why: 'Nothing about it is structured. “We run 2020 F-150s, is the park problem known and is the fix holding” names a vehicle, a symptom and a time, and none of those arrive labelled.',
  },
  {
    id: 'loop',
    label: 'the loop',
    sub: 'our code, on our machine',
    why: 'It sends the question and the menu of tools, runs whatever the model asks for, hands back the result, and repeats until an answer arrives instead of a request. It also checks that answer against nine rules before anybody sees it.',
  },
  {
    id: 'model',
    label: 'the model',
    sub: 'chooses, never reaches',
    why: 'It has no connection, no credentials and no way to run anything. All it can do is produce text — and one shape of text is a request. It is not doing the work; it is deciding what work to ask for.',
  },
];

const STORE: readonly { id: Reach; label: string; n: number; why: string }[] = [
  {
    id: 'recalls',
    label: 'recall campaigns',
    n: UNITS.recalls,
    why: 'What manufacturers admitted. Each one names the makes, models, years and component it covers — which is why an absence here is a fact about the corpus rather than an impression of it.',
  },
  {
    id: 'complaints',
    label: 'complaints',
    n: UNITS.complaints,
    why: 'What people filed, in their own words, about their own vehicles. Written by the public — 23% of them in capitals — and the only place the question “is the fix holding” has any evidence at all.',
  },
];

export function Brain() {
  const [open, setOpen] = useState<string | null>(null);
  const pin = (id: string) => setOpen((cur) => (cur === id ? null : id));
  const detail =
    [...ACTORS, ...TOOLS.map((t) => ({ id: t.name, why: t.why })), ...STORE].find(
      (n) => n.id === open,
    )?.why ?? null;

  return (
    <section className="lift-in border-t border-ui-line pt-10 pb-14" style={{ animationDelay: '160ms' }}>
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        What actually happens when somebody asks
      </h2>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
        Four columns, left to right. The model is in the middle and it{' '}
        <span className="text-ui-fg">never touches the store</span> — the tools
        are the only crossing, and that is the whole design.
      </p>

      <div className="cal-brain">
        <div className="cal-brain-col">
          <p className="cal-brain-cap">1 · asked</p>
          {ACTORS.slice(0, 1).map((a) => (
            <Node key={a.id} id={a.id} label={a.label} sub={a.sub} open={open} onPin={pin} />
          ))}
        </div>

        <Arm />

        <div className="cal-brain-col">
          <p className="cal-brain-cap">2 · decided</p>
          {ACTORS.slice(1).map((a) => (
            <Node key={a.id} id={a.id} label={a.label} sub={a.sub} open={open} onPin={pin} />
          ))}
        </div>

        <Arm />

        <div className="cal-brain-col cal-brain-col--tools">
          <p className="cal-brain-cap">3 · asked for</p>
          {TOOLS.map((t) => (
            <Node
              key={t.name}
              id={t.name}
              label={t.name}
              sub={t.does}
              tone={t.reach}
              mono
              open={open}
              onPin={pin}
            />
          ))}
        </div>

        <Arm />

        <div className="cal-brain-col">
          <p className="cal-brain-cap">4 · read</p>
          {STORE.map((s) => (
            <Node
              key={s.id}
              id={s.id}
              label={s.label}
              sub={`${s.n.toLocaleString('en-GB')} documents`}
              tone={s.id}
              open={open}
              onPin={pin}
            />
          ))}
          <p className="cal-brain-one">
            one database · one connection · everything in it
          </p>
        </div>
      </div>

      {detail && <p className="cal-brain-detail">{detail}</p>}

      <p className="mt-6 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        Meridian Pharma's version of this drawing shows six systems that cannot
        be joined. Here there is one, and everything is in it — which is why the
        interesting column is the third. Four of those five ways of asking did
        not exist until the search was measured and found to be answering the
        wrong question.
      </p>
    </section>
  );
}

function Arm() {
  return (
    <div className="cal-brain-arm" aria-hidden>
      <span />
    </div>
  );
}

function Node({
  id,
  label,
  sub,
  tone,
  mono = false,
  open,
  onPin,
}: {
  id: string;
  label: string;
  sub: string;
  tone?: Reach;
  mono?: boolean;
  open: string | null;
  onPin: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="cal-node"
      data-open={open === id}
      data-tone={tone ?? 'none'}
      aria-expanded={open === id}
      onClick={() => onPin(id)}
    >
      <span className={mono ? 'cal-node-l cal-node-l--mono' : 'cal-node-l'}>{label}</span>
      <span className="cal-node-s">{sub}</span>
    </button>
  );
}
