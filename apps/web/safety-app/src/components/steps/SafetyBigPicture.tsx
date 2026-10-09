/**
 * Who holds what, and where the complaints leave our machines: the one bold
 * drawing on `/steps`. The figure is `@veresk/learn/steps`' `BigPicture`; this
 * file is only its content, which is Calder Safety's.
 *
 * WHAT CROSSES THE LINE is stated from `pages/flow-turns.ts`, which states it
 * from a recorded run: the vehicle, the components, the date filed and the
 * narrative. The VIN, the state and the mileage are stored and filtered on, and
 * are not in anything a tool returns.
 */
import { BigPicture, type FlowItem } from '@veresk/learn/steps';
import { UNITS } from '../../lib/estate.generated';

export function SafetyBigPicture({ passages }: { passages: number }) {
  const flow: FlowItem[] = [
    {
      kind: 'node',
      side: 'theirs',
      name: 'NHTSA’s files',
      who: 'the US government publishes them',
      holds: `Three flat files: ${UNITS.complaints.toLocaleString('en-GB')} complaints, ${UNITS.recalls.toLocaleString('en-GB')} recalls, ${UNITS.investigations} investigations. Public and free.`,
    },
    { kind: 'arrow', label: 'downloaded once' },
    {
      kind: 'node',
      side: 'ours',
      name: 'Our pipeline',
      who: 'we build it · runs on a laptop',
      holds: 'Reads, cuts and embeds every complaint. The embedding model runs here too, so nothing is sent away to be read.',
    },
    { kind: 'arrow', label: 'passages + numbers' },
    {
      kind: 'node',
      side: 'ours',
      name: 'Our index',
      who: 'ours · on rented Postgres',
      holds: `One table of ${passages.toLocaleString('en-GB')} passages, each searchable by meaning and by keyword.`,
    },
    { kind: 'arrow', label: 'five tools' },
    {
      kind: 'node',
      side: 'ours',
      name: 'The loop',
      who: 'we build it',
      holds: 'Runs the tools the model asks for and checks every answer against the contract. It holds the database connection; the model never does.',
    },
    { kind: 'arrow', label: 'question + what the tools found', line: true },
    {
      kind: 'node',
      side: 'theirs',
      name: 'The model',
      who: 'Google’s Gemini · not ours',
      holds: 'Chooses which tool to ask for and writes the answer. Sees the complaints that answer the question — never a VIN, a state or a mileage.',
    },
  ];

  return (
    <BigPicture
      flow={flow}
      legend={{ dashed: 'Dashed line: where the complaints leave our control' }}
      note={
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
      }
    />
  );
}
