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
    label: 'Before any model — a number is looked up, on your side',
    n: '1',
    plain:
      'Nothing has left your network. A requirement number is looked up on your own server, and an unauthenticated request never gets this far.',
    example:
      'POST /api/assess\n{ "ref": "CR-K2-0101" }          <- a number, not a document',
    note: '0 model requests. 0 bytes leave. `authorize()` refuses an unauthenticated request before any database is opened, and `fetchRequirement` reads one row from vst_alm locally.',
    crosses: false,
    hops: [
      {
        where: 'browser',
        title: 'The bid engineer picks a requirement',
        plain:
          'A requirement number leaves the browser. Nothing else — no document, no timesheet, no customer data.',
        payload: 'POST /api/assess\n{ "ref": "CR-K2-0101", "loop": "sdk" }',
        detail:
          'A reference, not a question. The requirement text is not sent from the browser — it is read server-side from the system of record, so what gets assessed is what the customer actually wrote rather than what someone pasted.',
      },
      {
        where: 'yours',
        title: 'The guard runs first',
        plain:
          'Nothing moves. An unauthenticated request is refused here, before any database is opened. Network isolation is a control still to arrange.',
        payload: 'authorize({ configuredKey, presentedKey, isDev })',
        detail:
          'Fail-closed. No key configured means refuse, not allow. Nothing is parsed and nothing is connected to until this passes.',
      },
      {
        where: 'yours',
        title: 'The requirement is read — the one system-of-record touch',
        plain:
          'One row is read from your requirements database, on your own machine. It goes no further than this server.',
        payload: "fetchRequirement('CR-K2-0101')\n  -> new Client({ connectionString: urlFor('vst_alm') })",
        detail:
          'The only read of a system of record on the whole request path; every other query in this walkthrough goes to the derived database. It returns the in-force revision only, because "in force" is a claim and `effective_to is null` is what backs it.',
      },
    ],
  },

  {
    label: 'The requirement’s own words go out — 98 bytes',
    n: '2',
    plain:
      'The requirement’s own words leave, to one host: your Azure AI Foundry resource in Sweden. No documents, no database rows, no timesheets.',
    example:
      '"The steering system shall deliver a peak rack force of at\n least 8000 N at 20 °C and 13.5 V supply."          98 bytes',
    note: '1 model request. The requirement text plus two tool definitions — names, descriptions and argument shapes. No document has been read yet, so none can be sent.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'The requirement and the tool definitions go out',
        plain:
          'The requirement’s own words leave your network, to one host: your Azure AI Foundry resource in Sweden. No documents and no database rows are attached.',
        payload:
          'messages: [ system prompt, the requirement as written ]\ntools:    [ search_documents, find_comparable_work ]\nstore:    false',
        detail:
          'The prompt is an ordered procedure; the tools are names, descriptions and argument shapes. One requirement — 8000 N of rack force, ASIL B, verification by test — and no programme documents, no past jobs, no rates. None of that has been read yet, so none of it can be sent.',
      },
      {
        where: 'back',
        title: 'It asks what the programme says',
        plain:
          'Nothing leaves. This is the model naming a tool; the request is served on your own machine.',
        payload:
          'search_documents({\n  question: "rack force capacity 8000 N verification",\n  doc_type: null,\n  programme: "PRG-KST-K2"\n})',
        detail:
          '`programme` is the argument that matters. The corpus states the same requirement, in the same words, for sixty-seven different cars — without it the search answers for all of them at once and the answer is confidently about the wrong vehicle.',
      },
    ],
  },

  {
    label: 'Five searches — 40 passages out, 1,069 files stay',
    n: '3',
    plain:
      'Up to 10 passages leave per search, about 900 bytes each. This is where the one personal field travels: each closure report names its author.',
    example:
      'requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md:41\n  "… at least 8000 N at the rack …"\n  Prepared by: I. Arnaud      <- 12 people across 220 reports',
    note: '5 model requests. Passages returned: 10, 0, 10, 10, 10 — in 1487, 934, 2092, 1389 and 1523 ms, every search against your own Postgres. The second found nothing and that was returned as nothing.',
    crosses: true,
    hops: [
      {
        where: 'yours',
        title: 'Hybrid search over your Postgres',
        plain:
          'Nothing leaves. Your index is read locally; the 1,069 files stay where they are.',
        payload:
          'vst_derived.document_chunks\n\n  1.  10 passages from 4 files    1487ms\n  2.   0 passages from 0 files     934ms\n  3.  10 passages from 5 files    2092ms\n  4.  10 passages from 4 files    1389ms\n  5.  10 passages from 4 files    1523ms',
        detail:
          'Meaning and keyword together, fused by RRF, over vectors in your own database. Note the second call: zero results, returned as zero. An empty answer is a fact about the corpus and the model is allowed to have it — a search that quietly widened until it found something would be inventing evidence.',
      },
      {
        where: 'crosses',
        title: 'Only the matched passages cross',
        plain:
          'Up to 10 passages leave, to the same one host — about 900 bytes each. The rest of the corpus is not sent, not summarised and not named.',
        payload:
          'role: "tool", name: "search_documents"\ncontent: [ 10 passages — file, line, and the text ]',
        detail:
          'Each passage carries the file it came from and the line it starts on. The other thousand-odd files in the corpus are not sent, not summarised, and not named.',
      },
      {
        where: 'back',
        title: 'It reads two revisions against each other',
        plain:
          'Nothing leaves. This is the model comparing passages it has already been given.',
        payload:
          'CRS-KST-K2-001_RevB.md  ·  CRS-KST-K2-001_RevA.md\nsystem-requirements-PRG-KST-K2.md',
        detail:
          'Searches 4 and 5 pull Rev A and Rev B of the same specification. That is the model checking whether the wording changed — which is where the conflict in the final answer comes from, rather than from a rule somebody wrote down in advance.',
      },
    ],
  },

  {
    label: 'Five labels out, a refusal back',
    n: '4',
    plain:
      'Five short labels leave. No hours, no rates, no customer names. The provider is told to retain nothing — though Azure keeps prompts up to 30 days for abuse monitoring, which is still to be turned off.',
    example:
      'change_class: "validation_only"   asil: "B"\nelement_kind: "mechanical"        tooling_required: false\nsafety_case_impact: false',
    note: '1 model request. `find_comparable_work` matched 0 of 203 jobs with attributable hours and returned no price, in 2455 ms. The floor is 3 — below it there is no median worth quoting.',
    crosses: true,
    hops: [
      {
        where: 'back',
        title: 'It classifies the work and asks for comparable jobs',
        plain:
          'Five short labels leave — the kind of change, the part, the safety level. No hours, no rates, no customer names.',
        payload:
          'find_comparable_work({\n  change_class:        "validation_only",\n  element_kind:        "mechanical",\n  asil:                "B",\n  safety_case_impact:  false,\n  tooling_required:    false\n})',
        detail:
          'The model does not estimate. It describes the work in the five terms the history is indexed by, and the tool decides whether there is enough of it to answer.',
      },
      {
        where: 'yours',
        title: 'Four derived tables, and a count',
        plain:
          'Nothing leaves. Your timesheets and rate cards are read locally and never sent; only a count comes back.',
        payload:
          'vst_derived  derived_effort · effort_split_lines\n             rate_card_lines · extracted_facts\n\n0 of 203 jobs with attributable hours match    2455ms',
        detail:
          'The systems of record are not opened here. The work of reading them happened offline in `derived:grade`, which is what makes a per-request answer take two seconds instead of twenty.',
      },
      {
        where: 'crosses',
        title: 'The refusal crosses — with its arithmetic',
        plain:
          'Counts leave — how many past jobs matched — and no money and no hours. The provider is told to retain nothing, though prompts are kept up to 30 days for abuse monitoring, which is an open item.',
        payload:
          '"Only 0 past job(s) match … out of 203 with attributable\n hours. Fewer than 3 is not enough for a median to mean\n anything, so there is no price.\n\n What each part of the filter costs you —\n   safety_case_impact: 146 on its own, 0 without it\n   asil:                43 on its own, 0 without it\n   change_class:        19 on its own, 0 without it\n   element_kind:        17 on its own, 0 without it\n\n Those are COUNTS, not prices."',
        detail:
          'The tool will not take a median of two jobs, and it says why in terms the reader can check. It also refuses to hand back a cheaper number by dropping a filter — a median over a wider set is a different number about different work.',
      },
    ],
  },

  {
    label: 'The answer, checked against the files and filed',
    n: '5',
    plain:
      'Nothing further leaves. The answer is checked, then written to your own database on a connection that cannot reach a system of record.',
    example:
      '"finding": "change_needed",  "cost": { "eur": null }\ninsert into assess_history …        <- your database',
    note: '0 further model requests. 6 citations were checked against the files they name — 3 exact, 5 corrected, 0 unresolved — then the answer was validated and written to your own database.',
    crosses: false,
    hops: [
      {
        where: 'back',
        title: 'The assessment comes back as structured data',
        plain:
          'The answer comes back. Nothing further leaves after this point.',
        payload:
          '{\n  "requirement_ref": "CR-K2-0101",\n  "finding": "change_needed",\n  "citations": [ 6 — file, line, quote ],\n  "conflicts": [{ "about": "measurement point for the\n      required 8000 N (at the rack vs at the motor)" }],\n  "unverified_claims": [ "No supplier test report …" ],\n  "cost": { "comparable_jobs": 0, "eur": null,\n            "refused_because": "…" },\n  "decisions_for_human": [ … ]\n}',
        detail:
          'Note what the schema has no field for: there is no price unless the tool produced one, and `refused_because` is where the absence has to be explained. It is strict, so a number cannot be smuggled in as an extra key.',
      },
      {
        where: 'yours',
        title: 'Every quoted line is checked against the file',
        plain:
          'Nothing leaves. Files are opened on your own machine to correct the line numbers.',
        payload:
          'resolve-citations.ts  ->  CORPUS_DIR\n\n  3 exact  ·  5 corrected  ·  0 unresolved',
        detail:
          'The only filesystem read in a request, and it runs after the model has finished. A retrieved passage knows the line it STARTS on; the sentence quoted from it may be eleven lines further down. Five of eight line numbers on this run were wrong and were repaired by finding the quote. A value the model cannot know is a value it will approximate.',
      },
      {
        where: 'yours',
        title: 'Validated, then recorded',
        plain:
          'Nothing leaves. The answer is written to your own database, on a connection that cannot reach a system of record.',
        payload:
          'shape -> coherence -> insert into assess_history\n  connection: derivedUrl(), never urlFor()',
        detail:
          'JSON Schema checks the shape; a second layer checks sense — an unresolved conflict with nobody named to decide it is rejected, because that is the system quietly picking a side. The write resolves a different connection entirely, so it cannot reach a system of record even by mistake.',
      },
      {
        where: 'browser',
        title: 'The assessment appears',
        plain:
          'Nothing leaves. The reader sees the result; one personal field travelled in it — the author’s name on each report.',
        payload: 'event: answer',
        detail:
          'Tool steps stream as they happen, because a seventy-seven-second walk with nothing on screen looks broken. The assessment itself is sent once, whole, after it has passed validation.',
      },
    ],
  },
];

/**
 * The indexing pass — the one time the whole corpus is read out loud.
 *
 * SEPARATE FROM `ASSESS_TURNS` BECAUSE IT IS NOT PART OF A QUESTION, and that
 * is exactly why the page owed it a section. The walk above is scrupulous about
 * what leaves per request and it was, for a while, the only thing said — which
 * left a reader to assume the 1,069 files were never sent anywhere. They are:
 * once, to be embedded, before any question is asked.
 *
 * `EMBEDDINGS` defaults to `hosted`, so this is the default configuration and
 * not an option somebody turned on. The endpoint is the customer's own Azure AI
 * Foundry resource — the same one the chat model is deployed in — so nothing
 * here reaches a third party. Saying so plainly is worth more than the smaller
 * claim it replaces, because the smaller claim was not true.
 */
export const INDEX_TURNS: Turn[] = [
  {
    label: 'Once, before any question is asked',
    n: '1',
    plain:
      'Every file in the corpus is read on your own machine and cut into passages. Nothing has left yet.',
    example:
      '1,069 files  ->  3,854 passages\naverage 137 tokens each, longest 1,520 characters',
    note: '0 model requests. Closure reports, requirements and the EPS source, split so a clause or a function keeps its context.',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'The corpus is read and split',
        plain: 'Nothing leaves. Files are read from disk and cut into passages, locally.',
        payload: 'docs/steering/corpus/  ->  3,854 passages',
        detail:
          'Prose is split by heading and code by function, so a passage is a unit somebody could actually cite rather than a fixed number of characters.',
      },
    ],
  },
  {
    label: 'Each passage is embedded — this is the part that is sent',
    n: '2',
    plain:
      'The text of all 3,854 passages goes to your own Azure AI Foundry resource, once. The passage text is sent; a list of numbers comes back.',
    example:
      'text-embedding-3-small   1536 numbers per passage\n3,854 passages, one time, EMBEDDINGS=hosted (the default)',
    note: 'This is the only time the full corpus text crosses, and it is not during a question. Set EMBEDDINGS=local to do it on your own machine instead, at 384 dimensions.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'Passage text out, vectors back',
        plain:
          'All 3,854 passages leave — to the same resource the chat model lives in, in your tenant, in Sweden. No third party.',
        payload:
          'POST /embeddings\n{ "model": "text-embedding-3-small",\n  "input": [ "\u2026 at least 8000 N at the rack \u2026", \u2026 ] }',
        detail:
          'The same Foundry resource as every other call on this page. It is a deployment in your own subscription rather than a shared public endpoint, which is why this is a statement about where your data sits rather than a promise from a supplier.',
      },
    ],
  },
  {
    label: 'Stored as an index you own',
    n: '3',
    plain: 'Nothing leaves. The vectors land in your own Postgres, beside the text they came from.',
    example: 'vst_derived.document_chunks   3,854 rows',
    note: '0 model requests. Rebuildable from the files at any time, which is what makes the embedding step repeatable rather than a one-way door.',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'Vectors land in your database',
        plain: 'Nothing leaves. The index is yours and can be rebuilt or deleted at will.',
        payload: 'insert into document_chunks (text, embedding, \u2026)',
        detail:
          'Deleting the index does not lose anything: the corpus on disk is the source, and `pnpm steering:index` rebuilds it.',
      },
    ],
  },
];
