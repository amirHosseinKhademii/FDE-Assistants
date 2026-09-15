/**
 * Engagement lesson 6 — what leaves the building.
 *
 * A READING OF `docs/steering/DATA-RESIDENCY.md` AND `CONTROLS.md`.
 *
 * THE COLUMN THAT MAKES THIS A DELIVERABLE IS NOT THE CLAIM, IT IS HOW THE
 * CLAIM IS KNOWN. "We verified this on the wire", "the vendor states this" and
 * "this still has to be arranged" are three different answers, and a reviewer
 * will ask which one you mean. A table that presented them identically would be
 * the most confidently misleading page on this site.
 *
 * THE THREE THINGS IT REFUSES TO CLAIM ARE THE MOST TEACHABLE PART. One of them
 * says a default is NOT what everybody assumes it is.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { Caveat, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';

/** The three strengths a claim can have. Nothing else is allowed on this page. */
const STRENGTH = {
  verified: { word: 'verified here', tone: 'var(--color-ui-accent)', glyph: '●' },
  vendor: { word: 'vendor statement', tone: 'var(--color-ui-faint)', glyph: '○' },
  arrange: { word: 'must be arranged', tone: 'var(--color-ui-warn)', glyph: '▲' },
} as const;

function Claim({ how, claim, note }: { how: keyof typeof STRENGTH; claim: string; note: string }) {
  const s = STRENGTH[how];
  return (
    <div
      className="rounded-lg border border-ui-line bg-ui-surface px-4 py-3"
      style={{ borderLeft: `2px solid ${s.tone}` }}
    >
      <p className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: s.tone }}>
        <span aria-hidden>{s.glyph}</span> {s.word}
      </p>
      <p className="mt-1.5 max-w-[62ch] leading-relaxed text-ui-fg">{claim}</p>
      <p className="mt-1 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{note}</p>
    </div>
  );
}

export function Residency() {
  return (
    <LessonPage slug="residency">
      <Step n={1} title="Of 1,069 files, exactly 220 leave the machine">
        <P>
          The three pipelines from lesson 2 are also the residency story, and that is not a coincidence — it
          is the reason the answer is small. The parse handles the overwhelming majority of the volume and
          never leaves the machine at all. Only prose that genuinely needs reading comprehension is sent.
        </P>

        <Figure
          title="What stays, and what goes"
          sub="220 documents, about 900 bytes each, to one host: an Azure AI Foundry resource in Sweden, inside our own tenant."
          source={
            <>
              docs/steering/DATA-RESIDENCY.md, which states 1,069 and 220. The 849 is those two subtracted
              and is labelled on the bar.{' '}
              <span className="text-ui-dim">pnpm steering:derived-compliance-check</span> — captures the
              outgoing bytes and counts them. Free.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'never leave the machine',
                value: 849,
                display: '849 files',
                /* 849 is OURS, not the document's. DATA-RESIDENCY.md states
                   1,069 and 220; this bar is the subtraction, and saying so is
                   the difference between a figure a reader can check and one
                   they have to trust. */
                note: '1,069 − 220, by subtraction — timesheets, rate cards, quotes, design notes, source code',
              },
              { label: 'sent to a model', value: 220, display: '220 files', note: 'closure reports only, one per request, ~900 bytes each' },
            ]}
            max={1069}
            labelWidth={230}
            axis="0 → 1,069 files in the estate"
          />
        </Figure>

        <Key>
          10,688 timesheet lines, 168 rates and 301 quoted lines are handled by code that calls nothing. So
          “nothing may leave our tenant” is a configuration change here, not a blocker — which is a very
          different conversation to have with a customer.
        </Key>
      </Step>

      <Step n={2} title="Every claim carries how it is known">
        <P>
          This is the part worth copying. Each row below is a claim somebody might be asked to stand behind,
          and each one is tagged with the strength of the evidence rather than presented flat.
        </P>

        <div className="my-6 space-y-3">
          <Claim
            how="verified"
            claim="Only 220 documents are sent, one per request — 5,664 captured bytes."
            note="Read off the actual outgoing requests, not off the code that builds them."
          />
          <Claim
            how="verified"
            claim="Exactly one host, inside our own tenant."
            note="Every request captured and its destination checked. One endpoint, one region."
          />
          <Claim
            how="verified"
            claim="store: false, read from the OUTGOING BYTES and not from the source line that sets it."
            note="The same discipline as the compliance gate in the first track: assert it on the wire, because a default can change under you and a source line cannot tell you it did."
          />
          <Claim
            how="verified"
            claim="An Entra token, no static key, nothing beginning sk-."
            note="Checked in the request headers and across the repo's git history."
          />
          <Claim
            how="vendor"
            claim="Microsoft does not train on the data."
            note="Cite it. Do not assert it. This is a contractual statement and no check here can evidence it — which is exactly why it is on a different row from the four above."
          />
          <Claim
            how="arrange"
            claim="Prompts are not retained for abuse monitoring."
            note="NOT TRUE BY DEFAULT. Abuse-monitoring retention is ON, up to 30 days, and store: false does not disable it — it is a different mechanism entirely. The application for Modified Abuse Monitoring should be filed before this runs on real documents, not after."
          />
        </div>

        <Key>
          “We checked” and “the vendor says so” are different answers, and a table that prints them the same
          way is a table that will be quoted as though everything in it were checked.
        </Key>
      </Step>

      <Step n={3} title="Three things the document refuses to claim">
        <P>
          This is what intellectual honesty looks like as a deliverable — and it is the section a reviewer
          reads first.
        </P>

        <div className="my-6 space-y-3">
          {[
            {
              t: 'Abuse-monitoring retention is on by default.',
              b: 'Up to 30 days, not disabled by store: false, different mechanism. Saying so first is worth more than being asked.',
            },
            {
              t: 'The endpoint is reachable from the internet.',
              b: 'publicNetworkAccess: Enabled. Private networking is a change somebody has to make, not a property the deployment already has.',
            },
            {
              t: '“Azure does not train on your data” is a contract, not a measurement.',
              b: 'I can show what our code sends. I cannot show what the provider does with it — and the distinction between those two sentences is the entire value of the table above.',
            },
          ].map((x) => (
            <div key={x.t} className="learn-caveat">
              <p className="max-w-[62ch] font-medium text-ui-fg">{x.t}</p>
              <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{x.b}</p>
            </div>
          ))}
        </div>
      </Step>

      <Step n={4} title="And where a check stops being the answer">
        <P>
          A <Term def="A stated rule about how a system behaves, together with whatever evidences it. Some are evidenced by a check that ran; others need an organisation behind them and cannot be evidenced by code at all.">control</Term>{' '}
          that a command asserts and a control that needs an organisation behind it are not the same kind of
          thing, and conflating them is how “we are compliant” gets said too early.
        </P>
        <P>
          Evidenced by a check that ran today: data protection, access control and segregation, correctness
          and change management, cost and traceability. Not evidenced by anything here: personnel, vendor
          management, incident response, business continuity, and the annual audit that turns any of it into a
          certificate.
        </P>

        <Key>
          The honest answer to “are you compliant?” is a description of which controls are evidenced, by what,
          and what is missing — not yes. A certificate is an organisation's property, and a repo cannot have
          one.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:derived-compliance-check', does: 'Captures the real outgoing requests and asserts the destination, the byte count, store:false and the absence of a static key.', cost: 'free' },
          { cmd: 'az cognitiveservices account list -o table', does: 'What resources exist and in which region — the claim about the host, checked against the cloud rather than against a note.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'Everything here is dated, and a cloud configuration is not.',
            body: 'publicNetworkAccess, region, and the abuse-monitoring position were true when checked. They are settings somebody can change, so the check is the artefact, not the sentence.',
          },
          {
            claim: 'Capturing what we send says nothing about what happens next.',
            body: 'Four of the six claims are verified on the wire. The strongest thing that can be said about the other two is who said them.',
          },
          {
            claim: 'This is one engagement’s deployment, not a pattern.',
            body: 'The 220-of-1,069 figure is a property of a corpus where most files have columns. A corpus that is entirely prose sends all of it.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'data residency', def: 'Which data physically leaves your control, where it goes, and who holds it. Answered here by capturing the requests rather than by reading the code that builds them.' },
          { word: 'abuse monitoring', def: 'Provider-side retention of prompts for misuse detection. On by default, up to 30 days, and not affected by store: false.' },
          { word: 'control', def: 'A stated rule about how a system behaves, plus whatever evidences it. Some are evidenced by a command; some need an organisation.' },
          { word: 'on the wire', def: 'Asserted against the bytes actually sent, rather than against the source line that was supposed to set them.' },
        ]}
      />
    </LessonPage>
  );
}
