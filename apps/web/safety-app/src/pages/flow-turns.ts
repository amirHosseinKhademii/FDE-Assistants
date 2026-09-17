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
 * where this corpus first leaves the machine, and that was worth deciding
 * before it was built rather than after.
 *
 * ── TURN 3 USED TO SAY "NOT BUILT". IT RUNS NOW ───────────────────────────
 *
 * Every payload in it is from a recorded run. And one claim it used to make has
 * been corrected: it said the passages crossing to the model carry a partial
 * VIN. THEY DO NOT. That figure was about the VIN FIELD on the stored row —
 * which is filtered on and never returned. What crosses is the vehicle, the
 * components, the filed date and the narrative.
 *
 * ── AND TURN 4 IS NEW, BECAUSE THERE IS NOW SOMETHING KEPT ────────────────
 *
 * The desk files a row per question. It is the first thing on this engagement
 * that writes anything, so it gets a turn of its own rather than a footnote.
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
label: 'ask',
    n: '3',
    note: 'The step where this corpus leaves the machine. It exists now, and what it sends was decided before it was written.',
    plain: 'Somebody asks a question, and the complaints that answer it are put in front of a model — and that model is somebody else’s.',
    example: 'one question · one to seven tool calls · 4 to 131 seconds',
    crosses: true,
    hops: [
      {
        where: 'browser',
        title: 'somebody asks',
        payload: '"are there complaints about deaths on the Tesla Model 3?"',
        plain: 'A question typed in ordinary words. Nothing personal in it.',
        detail:
          'Anyone can ask, at /desk. The question itself names a vehicle and a symptom and nothing about the person asking — we set no cookie, take no account and keep no address.',
      },
      {
        where: 'crosses',
        title: 'the question and the tool descriptions',
        payload:
          'system   who you are, and the rules you answer under\n' +
          'user     the question, as typed\n' +
          'tools    five names, five descriptions, five argument shapes',
        plain: 'The question goes to the model. No complaint does, yet.',
        detail:
          'The smallest crossing of the three. Not one document from the corpus is in it — at this point the model has been told what it may ask for and nothing about what the answer might be.',
      },
      {
        where: 'yours',
        title: 'the tools run here',
        payload: 'select … from documents where … · on our own connection',
        plain: 'The model asked for a tool. Our code ran it, on our machine.',
        detail:
          'The model has no connection, no credentials and no way to run anything. It produced text asking for this; our code decided whether to honour it. Every query in an answer runs here.',
      },
      {
        where: 'crosses',
        title: 'and then the narratives',
        payload:
          'ODI 11302656   ...autopilot and/or lane-assist features failed\n' +
          'ODI 11533202   ...fatal accident and fire\n' +
          'ODI 11364724   ...an upper ball joint failure',
        plain: 'What people wrote about their own crashes goes to a model we do not run.',
        detail:
          'THIS IS THE HOP THAT MATTERS, and the page will not pretend otherwise: the corpus reaches the model, because that is how the question gets answered. WHAT CROSSES IS THE VEHICLE, THE COMPONENTS, THE DATE FILED AND THE NARRATIVE. The VIN, the state and the mileage are parsed, stored and filtered on — and are not in what the tools return. The narrative itself is a member of the public’s own words, so it holds whatever they chose to type. Already public makes this defensible; it does not make it automatic, and a free tier that trained on what it was sent would be the wrong place to send it.',
      },
      {
        where: 'back',
        title: 'an answer, in boxes rather than prose',
        payload:
          'answer    the prose\n' +
          'counts    every number, with the tool call behind it\n' +
          'cites     every claim, with the document behind it\n' +
          'escalate  when a person has to decide',
        plain: 'The answer comes back as separate fields, then is checked before anybody sees it.',
        detail:
          'Every claim carries the filing it rests on, so a reader can check it against nhtsa.gov rather than against us. Nine rules run before it is shown, and nothing is ever quietly repaired.',
      },
    ],
  },

  {
    label: 'keep',
    n: '4',
    note: 'One row per question asked at the desk, so the same question answered twice can be seen to differ.',
    plain: 'We keep what was asked and what came back — because this is the first part that does not do the same thing twice.',
    example: 'question · tools, in order · answer · engine · how long it took',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'the question and the answer, filed',
        payload:
          'safety_ask_history\n' +
          '  question · tools[] · answer · engine · model · ms · escalated',
        plain: 'A row on our own database. Nothing about who asked.',
        detail:
          'Written AFTER the answer has been sent, so nobody waits on it, and it never throws — losing a row is an annoyance, losing the answer somebody waited eighty seconds for is not. It records no address, no account and no session: there is nothing in the row that identifies who typed the question.',
      },
      {
        where: 'yours',
        title: 'the tool names, in the order they were called',
        payload: 'find_recalls → get_recall → count_complaints → search_complaints',
        plain: 'What it asked for, not just what it said.',
        detail:
          'The reason the row is worth keeping at all. Two runs of one question can reach the same words by different routes, and this is the only place that difference survives — which is the distinction this whole engagement exists to insist on.',
      },
    ],
  },
];
