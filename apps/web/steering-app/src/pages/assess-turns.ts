/**
 * One requirement, hop by hop — the words, not the drawing.
 *
 * SIBLING OF PHARMA'S `release-turns.ts`, and it draws with the same
 * `Journey` component from `@veresk/surface`. The shell takes turns as data so
 * each engagement supplies its own; nothing about steering reaches the drawing.
 *
 * EVERY PAYLOAD BELOW IS REAL. The run is CR-K2-0101, captured by
 * `pnpm steering:worked-example` on 2026-09-14 and stored verbatim in
 * `lib/worked-example.generated.ts` — 7 turns, 6 tool calls, 76,758 ms,
 * agents-sdk, 0 schema retries. The six timings are that run's. Tool and
 * argument names come from `search-documents.tool.ts` and
 * `find-comparable-work.tool.ts`. The refusal text is the tool's own, not a
 * paraphrase. A diagram with invented field names is one a reviewer disproves
 * with a single grep, and then nothing else on the page survives either.
 *
 * THE INTERESTING DIFFERENCE FROM PHARMA, and the reason this file is not a
 * copy of that one: pharma's walk reads twenty-nine times across six systems of
 * record and sends a handful of findings. Steering reads a system of record
 * EXACTLY ONCE — `fetchRequirement` opens `vst_alm` to get the requirement
 * being assessed — and everything the model then sees comes from the derived
 * database. Not because the systems of record are off limits, but because the
 * work of reading them already happened, offline, in `derived:grade`.
 *
 * AND THE ANSWER IS A REFUSAL. The pricing tool found 0 comparable jobs out of
 * 203 and declined to produce a number. That is the honest specimen to put on
 * this page: 23 of the 24 requirements in the K2 bid end the same way, and a
 * walkthrough that showed the one priced requirement would be advertising the
 * exception.
 */
import type { Turn } from '@veresk/surface';

export const ASSESS_TURNS: Turn[] = [
  {
    label: 'Before any model is involved',
    note: 'A request that is not allowed never reaches a database, let alone a model.',
    crosses: false,
    hops: [
      {
        where: 'browser',
        title: 'The bid engineer picks a requirement',
        payload: 'POST /api/assess\n{ "ref": "CR-K2-0101", "loop": "sdk" }',
        detail:
          'A reference, not a question. The requirement text is not sent from the browser — it is read server-side from the system of record, so what gets assessed is what the customer actually wrote rather than what someone pasted.',
      },
      {
        where: 'yours',
        title: 'The guard runs first',
        payload: 'authorize({ configuredKey, presentedKey, isDev })',
        detail:
          'Fail-closed. No key configured means refuse, not allow. Nothing is parsed and nothing is connected to until this passes.',
      },
      {
        where: 'yours',
        title: 'The requirement is read — the one system-of-record touch',
        payload: "fetchRequirement('CR-K2-0101')\n  -> new Client({ connectionString: urlFor('vst_alm') })",
        detail:
          'The only read of a system of record on the whole request path; every other query in this walkthrough goes to the derived database. It returns the in-force revision only, because "in force" is a claim and `effective_to is null` is what backs it.',
      },
    ],
  },

  {
    label: 'Turn 1 — what should I do?',
    note: 'The model is given the requirement and the tools it may call. Nothing else from your systems yet.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'The requirement and the tool definitions go out',
        payload:
          'messages: [ system prompt, the requirement as written ]\ntools:    [ search_documents, find_comparable_work ]\nstore:    false',
        detail:
          'The prompt is an ordered procedure; the tools are names, descriptions and argument shapes. One requirement — 8000 N of rack force, ASIL B, verification by test — and no programme documents, no past jobs, no rates. None of that has been read yet, so none of it can be sent.',
      },
      {
        where: 'back',
        title: 'It asks what the programme says',
        payload:
          'search_documents({\n  question: "rack force capacity 8000 N verification",\n  doc_type: null,\n  programme: "PRG-KST-K2"\n})',
        detail:
          '`programme` is the argument that matters. The corpus states the same requirement, in the same words, for sixty-seven different cars — without it the search answers for all of them at once and the answer is confidently about the wrong vehicle.',
      },
    ],
  },

  {
    label: 'Turns 2–6 — reading the programme',
    note: 'Five searches, one of which finds nothing. All of them run against your own index.',
    crosses: true,
    hops: [
      {
        where: 'yours',
        title: 'Hybrid search over your Postgres',
        payload:
          'vst_derived.document_chunks\n\n  1.  10 passages from 4 files    1487ms\n  2.   0 passages from 0 files     934ms\n  3.  10 passages from 5 files    2092ms\n  4.  10 passages from 4 files    1389ms\n  5.  10 passages from 4 files    1523ms',
        detail:
          'Meaning and keyword together, fused by RRF, over vectors in your own database. Note the second call: zero results, returned as zero. An empty answer is a fact about the corpus and the model is allowed to have it — a search that quietly widened until it found something would be inventing evidence.',
      },
      {
        where: 'crosses',
        title: 'Only the matched passages cross',
        payload:
          'role: "tool", name: "search_documents"\ncontent: [ 10 passages — file, line, and the text ]',
        detail:
          'Each passage carries the file it came from and the line it starts on. The other thousand-odd files in the corpus are not sent, not summarised, and not named.',
      },
      {
        where: 'back',
        title: 'It reads two revisions against each other',
        payload:
          'CRS-KST-K2-001_RevB.md  ·  CRS-KST-K2-001_RevA.md\nsystem-requirements-PRG-KST-K2.md',
        detail:
          'Searches 4 and 5 pull Rev A and Rev B of the same specification. That is the model checking whether the wording changed — which is where the conflict in the final answer comes from, rather than from a rule somebody wrote down in advance.',
      },
    ],
  },

  {
    label: 'Turn 7 — what has this cost us before?',
    note: 'The pricing tool is asked, and refuses. That is the system working.',
    crosses: true,
    hops: [
      {
        where: 'back',
        title: 'It classifies the work and asks for comparable jobs',
        payload:
          'find_comparable_work({\n  change_class:        "validation_only",\n  element_kind:        "mechanical",\n  asil:                "B",\n  safety_case_impact:  false,\n  tooling_required:    false\n})',
        detail:
          'The model does not estimate. It describes the work in the five terms the history is indexed by, and the tool decides whether there is enough of it to answer.',
      },
      {
        where: 'yours',
        title: 'Four derived tables, and a count',
        payload:
          'vst_derived  derived_effort · effort_split_lines\n             rate_card_lines · extracted_facts\n\n0 of 203 jobs with attributable hours match    2455ms',
        detail:
          'The systems of record are not opened here. The work of reading them happened offline in `derived:grade`, which is what makes a per-request answer take two seconds instead of twenty.',
      },
      {
        where: 'crosses',
        title: 'The refusal crosses — with its arithmetic',
        payload:
          '"Only 0 past job(s) match … out of 203 with attributable\n hours. Fewer than 3 is not enough for a median to mean\n anything, so there is no price.\n\n What each part of the filter costs you —\n   safety_case_impact: 146 on its own, 0 without it\n   asil:                43 on its own, 0 without it\n   change_class:        19 on its own, 0 without it\n   element_kind:        17 on its own, 0 without it\n\n Those are COUNTS, not prices."',
        detail:
          'The tool will not take a median of two jobs, and it says why in terms the reader can check. It also refuses to hand back a cheaper number by dropping a filter — a median over a wider set is a different number about different work.',
      },
    ],
  },

  {
    label: 'The answer, and the last thing that is still wrong',
    note: 'Everything from here is yours again. One step happens AFTER the model has finished.',
    crosses: false,
    hops: [
      {
        where: 'back',
        title: 'The assessment comes back as structured data',
        payload:
          '{\n  "requirement_ref": "CR-K2-0101",\n  "finding": "change_needed",\n  "citations": [ 6 — file, line, quote ],\n  "conflicts": [{ "about": "measurement point for the\n      required 8000 N (at the rack vs at the motor)" }],\n  "unverified_claims": [ "No supplier test report …" ],\n  "cost": { "comparable_jobs": 0, "eur": null,\n            "refused_because": "…" },\n  "decisions_for_human": [ … ]\n}',
        detail:
          'Note what the schema has no field for: there is no price unless the tool produced one, and `refused_because` is where the absence has to be explained. It is strict, so a number cannot be smuggled in as an extra key.',
      },
      {
        where: 'yours',
        title: 'Every quoted line is checked against the file',
        payload:
          'resolve-citations.ts  ->  CORPUS_DIR\n\n  3 exact  ·  5 corrected  ·  0 unresolved',
        detail:
          'The only filesystem read in a request, and it runs after the model has finished. A retrieved passage knows the line it STARTS on; the sentence quoted from it may be eleven lines further down. Five of eight line numbers on this run were wrong and were repaired by finding the quote. A value the model cannot know is a value it will approximate.',
      },
      {
        where: 'yours',
        title: 'Validated, then recorded',
        payload:
          'shape -> coherence -> insert into assess_history\n  connection: derivedUrl(), never urlFor()',
        detail:
          'JSON Schema checks the shape; a second layer checks sense — an unresolved conflict with nobody named to decide it is rejected, because that is the system quietly picking a side. The write resolves a different connection entirely, so it cannot reach a system of record even by mistake.',
      },
      {
        where: 'browser',
        title: 'The assessment appears',
        payload: 'event: answer',
        detail:
          'Tool steps stream as they happen, because a seventy-seven-second walk with nothing on screen looks broken. The assessment itself is sent once, whole, after it has passed validation.',
      },
    ],
  },
];
