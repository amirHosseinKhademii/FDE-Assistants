/**
 * Who holds what, and where the complaints leave our machines.
 *
 * THE ONE BOLD DRAWING on `/steps`, in the same form as Thornbury's
 * (`apps/web/commerce-app/src/components/BigPicture.tsx`): five boxes in the
 * order the data travels. Ours are indigo, everybody else's are grey, and the
 * dashed line is between our loop and the hosted model — the one place where
 * what members of the public wrote about their own crashes is sent to a model
 * we do not run. On a phone it becomes a column and the arrows point down.
 *
 * WHAT CROSSES THE LINE is stated from `pages/flow-turns.ts`, which states it
 * from a recorded run: the vehicle, the components, the date filed and the
 * narrative. The VIN, the state and the mileage are stored and filtered on, and
 * are not in anything a tool returns.
 */
import { UNITS } from '../../lib/estate.generated';

export function BigPicture({ passages }: { passages: number }) {
  return (
    <>
      <div className="cal-map mt-8" role="list">
        <Node
          side="theirs"
          name="NHTSA’s files"
          who="the US government publishes them"
          holds={`Three flat files: ${UNITS.complaints.toLocaleString('en-GB')} complaints, ${UNITS.recalls.toLocaleString('en-GB')} recalls, ${UNITS.investigations} investigations. Public and free.`}
        />
        <Arrow label="downloaded once" />
        <Node
          side="ours"
          name="Our pipeline"
          who="we build it · runs on a laptop"
          holds="Reads, cuts and embeds every complaint. The embedding model runs here too, so nothing is sent away to be read."
        />
        <Arrow label="passages + numbers" />
        <Node
          side="ours"
          name="Our index"
          who="ours · on rented Postgres"
          holds={`One table of ${passages.toLocaleString('en-GB')} passages, each searchable by meaning and by keyword.`}
        />
        <Arrow label="five tools" />
        <Node
          side="ours"
          name="The loop"
          who="we build it"
          holds="Runs the tools the model asks for and checks every answer against the contract. It holds the database connection; the model never does."
        />
        <Arrow label="question + what the tools found" line />
        <Node
          side="theirs"
          name="The model"
          who="Google’s Gemini · not ours"
          holds="Chooses which tool to ask for and writes the answer. Sees the complaints that answer the question — never a VIN, a state or a mileage."
        />
      </div>

      <div className="cal-map-key mt-5">
        <span>
          <span className="cal-swatch" data-side="ours" />
          What we build and run
        </span>
        <span>
          <span className="cal-swatch" />
          Somebody else’s
        </span>
        <span>Dashed line: where the complaints leave our control</span>
      </div>

      <div className="cal-prose mt-6 max-w-[66ch]">
        <p>
          <strong>Why the line is where it is.</strong> Every complaint was typed
          by a member of the public about their own vehicle, and some name a
          family member. Turning all of them into numbers could have meant
          sending all of them to somebody else’s model; it doesn’t, because the
          embedding model runs on our own machine. So the only complaints that
          ever reach a model we don’t run are the handful that answer the
          question being asked — and the fields that identify a person are
          filtered on, never sent.
        </p>
      </div>
    </>
  );
}

function Node({ side, name, who, holds }: { side: 'ours' | 'theirs'; name: string; who: string; holds: string }) {
  return (
    <div className="cal-node" data-side={side} role="listitem">
      <span className="cal-node-name">{name}</span>
      <span className="cal-node-who">{who}</span>
      <span className="cal-node-holds">{holds}</span>
    </div>
  );
}

function Arrow({ label, line = false }: { label: string; line?: boolean }) {
  return (
    <div className="cal-arrow" data-line={line} aria-hidden>
      <span className="cal-arrow-head" />
      <span>{label}</span>
    </div>
  );
}
