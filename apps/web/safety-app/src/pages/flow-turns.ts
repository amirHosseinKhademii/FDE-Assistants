/**
 * The walk, as three turns.
 *
 * ── WHAT MAKES THIS WALK DIFFERENT FROM THE OTHER TWO ──────────────────────
 *
 * Pharma's reads twenty-nine times across six systems of record. Vantis' reads
 * one system of record exactly once and works from a derived database. Both
 * describe a corpus somebody here wrote, so the residency section of each is
 * true and weightless: nothing could leak because nothing was real.
 *
 * Here the narratives are filed by members of the public about their own cars.
 * 99% carry a truncated VIN and 41 filings report a death. So the interesting
 * column on this page is not which store was read — it is `crosses`, and the
 * honest answer changes between turn 2 and turn 3.
 *
 * ── TURN 1 IS A FILE DOWNLOAD, NOT AN API CALL ─────────────────────────────
 *
 * It was drawn as `complaintsByVehicle?make=…` while the corpus was being
 * surveyed one vehicle at a time. Ingestion does not work that way: the slice
 * is three flat files off `static.nhtsa.gov`, tab-delimited, no header row, cut
 * to model years 2019 and 2020 after they land. That makes the outbound request
 * MORE anonymous, not less — a plain GET for a public file, carrying no query,
 * no vehicle and nothing about Calder.
 *
 * ── TURN 3 IS MARKED AS NOT BUILT, AND STAYS THAT WAY UNTIL IT IS ──────────
 *
 * The desk does not exist: the answer contract is written after an answer key
 * has been made by hand from the raw files, which is step 4 of a build that is
 * at step 0. Describing the request it WOULD make is useful — it is the step
 * where this corpus first leaves the machine, and that is worth deciding before
 * it is built rather than after. Describing it as though it runs would not be.
 */
import type { Turn } from '@veresk/surface';
import { ROWS, UNITS } from '../lib/estate.generated';

export const FLOW_TURNS: Turn[] = [
  {
    label: 'fetch',
    n: '1',
    note: 'Three public files onto disk, then frozen. Runs offline, once, and not while anybody is waiting.',
    plain: 'We download the US safety regulator’s own published files — every complaint, recall and investigation it holds — and keep a dated copy.',
    example: 'model years 2019 + 2020 · every make · nationwide',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        // `crosses` is right — this leaves Calder's network. The DEFAULT LABEL
        // is not: at this point in the story no model exists, and what crossed
        // was a request to a federal agency. `where` encodes whether it left;
        // `label` names who received it.
        label: 'crosses to NHTSA',
        title: 'a request for a file',
        payload: 'GET static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip',
        detail:
          'The most anonymous request on this site. No query string, no vehicle, no account and no key — the same URL anybody would use. Nothing about Calder or its customers exists at this point in the pipeline, so nothing about them can be sent.',
      },
      {
        where: 'back',
        label: 'from NHTSA',
        title: 'every complaint since 1995',
        payload: '355 MB zipped · 1.5 GB of tab-delimited text · no header row',
        detail:
          'A US federal agency, and the data is public domain. This hop crosses a boundary and carries nothing outbound, which is the opposite of every other crossing on this site. The file has no header row, so a column is knowable only by position — and a mis-aligned column would put narratives in a date field without erroring.',
      },
      {
        where: 'yours',
        title: 'cut to the slice, and frozen',
        payload: `CMPL_SLICE.tsv · ${ROWS.complaints.toLocaleString('en-GB')} rows · ${UNITS.complaints.toLocaleString('en-GB')} complaints`,
        detail:
          'Stored exactly as returned, including the 23% of narratives filed in capitals. The snapshot is dated and never refreshed in place: the source file changes daily, and an answer key written against moving data rots underneath the eval baseline it exists to hold still for.',
      },
    ],
  },

  {
    label: 'index',
    n: '2',
    note: 'Turning narratives into something searchable. Also offline — and this is the step where “local” stops being a cost decision.',
    plain: 'Each complaint is turned into numbers so that a later question can find it. The model that does that runs on this machine.',
    example: 'bge-small · 384 dimensions · on this machine',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'one complaint, one passage',
        payload: '709 characters on average — smaller than a chunk',
        detail:
          'Chunking is probably the wrong verb here. A complaint is already about the length a chunker aims for, and cutting one in half would separate the fault from what the person did about it. The ODI number travels with the passage, which matters more on this engagement than usual: a citation here is a filing a reader can look up themselves.',
      },
      {
        where: 'yours',
        title: 'embedded locally',
        payload: 'bge-small, 384 dims',
        detail: `THIS IS A DATA DECISION, NOT A COST ONE. Embedding touches every passage, so a hosted embedder means sending all ${UNITS.complaints.toLocaleString('en-GB')} narratives to a third party to be read. Local means they never leave. It costs nothing to choose: measured on the sibling engagement, local bge-small scored recall@k 0.813 against the paid hosted model’s 0.813 — the same, so there is no accuracy argument on the other side.`,
      },
      {
        where: 'yours',
        title: 'stored',
        payload: 'postgres + pgvector',
        detail:
          'One table, in a database Calder controls. Nothing about this step reaches a third party.',
      },
    ],
  },

  {
    label: 'ask — NOT BUILT',
    n: '3',
    note: 'The step where this corpus would first leave the machine. It does not exist yet, and what it sends is a decision to take before writing it, not after.',
    plain: 'When somebody asks a question, the passages that answer it are put in front of a model — and that model is somebody else’s.',
    example: 'not implemented — see docs/safety/PLAN.md §8, step 5',
    crosses: true,
    hops: [
      {
        where: 'browser',
        title: 'the analyst asks',
        payload: '"is the sliding-door problem a known defect, and is the remedy holding?"',
        detail:
          'A question about a vehicle, typed by an employee of the customer. Nothing personal in itself.',
      },
      {
        where: 'yours',
        title: 'search picks the passages',
        payload: `6 of ${UNITS.complaints.toLocaleString('en-GB')} passages`,
        detail:
          'Chosen here, by the local index. Up to this point every byte has stayed on machines Calder controls.',
      },
      {
        where: 'crosses',
        title: 'the passages go to the model provider',
        payload: 'the narratives themselves, verbatim',
        detail:
          'THIS IS THE HOP THAT MATTERS. Those passages are what members of the public wrote about their own cars — 99% carry a partial VIN, and some describe the crash, the fire or the death it happened in. They are already public, which makes this defensible; it does not make it automatic, and a free tier that trains on what it is sent would be the wrong place to send them.',
      },
      {
        where: 'back',
        title: 'an answer, with identifiers',
        payload: 'finding + ODI numbers + an escalation',
        detail:
          'Every claim carries the filing it rests on, so the reader can check it against nhtsa.gov rather than against us. Where two records disagree it says so and names who must decide.',
      },
    ],
  },
];
