# Retrieval, measured — the policy index and the gate CORPUS.md §5 asked for

*Built and run 2026-09-27. CORPUS.md §5 froze the corpus at twelve documents
until a number said whether it was too easy: "the gate for growing it is a
measurement, not a target." This is that number, and the index behind it.
Steering's [`../../steering/evals/RETRIEVAL.md`](../../steering/evals/RETRIEVAL.md)
is the precedent for the form.*

---

## 1 · The number — MEASURED

```
  arm        cases   recall@6   MRR     + absence
  baseline   15/16   0.938      0.690   T4 asserted separately — passes

  hybridSearch (dense bge-small + full-text, RRF), exactly as search_policy calls it,
  as the read-only role, over 12 documents and 83 passages
```

```bash
pnpm commerce:retrieval-eval     # 17 cases; free — local embeddings, a read-only role
pnpm commerce:kb-check           # the index as the MCP server sees it
pnpm commerce:corpus-check       # the corpus, and the index against it
```

Recall is **reported, not gated**: the run fails only if the scorer's own checks
or the T4 absence assertion fail. Cases are in [`retrieval.jsonl`](retrieval.jsonl),
each grounded in a clause the hand-worked key relies on (`WALKTHROUGH.md`,
`cases.jsonl`), with the query phrased as the symptom a specialist would type —
not the answer (nobody searches for "route walk").

## 2 · What the number does and does not license

**0.938 is near-perfect, and on twelve documents that is expected.** CORPUS.md §5
said what follows from it: if recall@k is near-perfect *the corpus is too easy*,
and filler becomes a **treatment with an expected effect that can be measured** —
not a target to hit. That is now the accurate statement, and it is a decision,
not a consequence: **PROPOSED, not taken** — growing the corpus is Byron's call,
and if it is taken this eval is the before-number.

**It does not license a reranker.** Steering's reranker bought +12.5 points on a
922-document corpus where the baseline was 0.813. Here there is one miss to buy.

### The one miss — and it is on a trap

```
  MISS  ret-ret-007   "what does the product warranty cover and how long does the
                        customer have to claim"   expect POL-RET-001 Rev 3#7
        top 6: FRD-005#5 · FRD-005#2 · FRD-005#4 · FRD-005#3 · NEXDROP#4 · FRD-005#6
```

`POL-RET-001 Rev 3 §7` is **the only citation `cov-dmg-009` tolerates** (T4, the
marketplace speakers' warranty — `evals/README.md` gaps). It is two sentences —
*"This policy covers goods sold by Thornbury Goods. It does not address gift
cards, digital content, or services."* — and **the word "warranty" appears
nowhere in the corpus** (grep, MEASURED). So the clause that lets the model say
"this isn't ours" is unreachable from the question a customer actually asks.

**Not tuned away.** Rewording the query until it hits would measure the query,
not the index. What it means for the eval: an assistant answering cov-dmg-009
correctly will usually do so with **zero** citations — which the key already
allows ("an empty list passes"). If that is wanted to change, it is a corpus
decision (§4 of CORPUS.md forbids a marketplace document; a sentence in §7 about
manufacturers' guarantees would not be one) — **PROPOSED, not taken.**

## 3 · T4 is an absence, and it is asserted as one

`ret-t4-001` (*"warranty claim on an item that was sold by a third-party
marketplace seller"*) has `"absent": true` and is **excluded from recall** — there
is nothing to recall. It is asserted instead: `k` passages still come back (no
score cutoff — the model must read junk and conclude "undetermined"), and **no
returned passage may claim to address a third-party seller.** MEASURED top 6:
BUL-HV-2025-01#3 · POL-DOA-002 Rev 1#6 · #3 · BUL-HV-2025-01#1 · POL-FRD-005 Rev 1#3
· POL-RET-001 Rev 3#5 — junk, correctly.

**Sabotaged twice, and the first plant taught something.** A marketplace passage
planted with **no vector** did NOT turn the check red: only the keyword arm can
find it, and reciprocal-rank fusion ranks a one-arm hit below passages both arms
agree on. The realistic plant — the same text, **embedded** like every real
passage — ranked **first** and turned it red by name (`CLAIMS TO ADDRESS IT:
policy:PLANT#1`). A plant has to be what the real mistake would be.

## 4 · How the index is built and who can read it — MEASURED

| | |
|---|---|
| database | `thb_kb` on the commerce Neon project — its own database, **not** one of the five (the index is ours; the five are the customer's). `commerce:db-reset` leaves it alone |
| table | `policy_chunks_local` — bge-small (`Xenova/bge-small-en-v1.5`), **384** dimensions; `_local` so a hosted index can never mix in |
| build | `pnpm commerce:kb-build` = provision → `corpus:load` → `ingest` → provision (grant). Holds the estate admin URL; it is a build step |
| read | role **`thb_kb_reader`**, URL in **`COMMERCE_KB_URL`** (written to `.env` by `kb-provision`, never printed). Created over SQL — **Neon accepted `CREATE ROLE … LOGIN PASSWORD`** from `neondb_owner` (CREATEROLE, member of `neon_superuser`) on PG 18.6 |
| grants | CONNECT on thb_kb · USAGE on `public` · SELECT on `policy_chunks_local`. `REVOKE ALL ON DATABASE thb_kb FROM PUBLIC` removes the default CONNECT/TEMP |

`kb-check`, as the reader: INSERT, CREATE TABLE and CREATE TEMP TABLE all refused
with `42501`; no role attributes, no memberships; **it can CONNECT to `thb_shop`
(PUBLIC keeps CONNECT on the estate's databases) but reads nothing** — `42501` on
`orders`; stored dimension = query-embedder dimension = 384; loading `query.ts`
pulls in no estate code (696 modules, none of `config/connections` or `db/`);
full-text arm live; no score cutoff; `audience` and `status` facets arrive.

**Every check was sabotaged and watched to go red — exactly one check each:**

```
  db    reader granted INSERT                → INSERT refused            ✗
  db    reader granted CREATE on schema      → CREATE TABLE refused      ✗
  db    reader granted TEMP                  → CREATE TEMP TABLE refused ✗
  db    reader given CREATEDB                → no attributes/memberships ✗
  db    reader granted SELECT on thb_shop    → cannot reach the estate   ✗
  code  KB_DIMENSIONS = 1536                 → dimensions agree          ✗
  code  ingest table spelled as a literal    → one table name            ✗
  code  query.ts imports the estate config   → no estate code loaded     ✗
  code  keyword arm at a missing table       → full-text arm live        ✗
  code  a score cutoff added                 → no score cutoff           ✗
  code  the audience facet dropped           → facets arrive             ✗
```

> **▲ And the check found a defect in itself.** The first `kb-check` ran its write
> probes bare. When the INSERT sabotage granted the privilege, the probe
> **succeeded and stayed**: a row reading "planted", with no vector, sat in the
> index the model searches until the dimension check reported a vector of length
> 0 on every later run. The probes now run inside a transaction that is always
> rolled back, and a re-run of that sabotage leaves 83 rows, 83 with a vector.
> **A write probe that can commit is itself the defect it is looking for.**

## 5 · For Step 9 — how `search_policy` should consume it

```ts
import { searchPolicy } from '@thornbury/commerce/kb';   // → dist/grounding/query.js
const { hits, fullText } = await searchPolicy({
  connectionString: process.env.COMMERCE_KB_URL!,        // the READER — never ECOMMERCE_*
  query, k: 6,
});
```

- **`query.ts` reads no environment and imports no estate code** — checked, not
  claimed. Everything the two sides must agree on (table, model, prefix,
  dimension) is in `kb.ts`.
- **Each hit:** `citation` in the key's exact shape (`policy:CON-CAR-NEXDROP-2025#2`),
  `revisionId`, `docId`, `section`, `sectionTitle`, **`subsections`** (the `**4.1**`
  sub-rules the passage contains, so a caller can cite `#4.1`), `audience`
  (`published` | `internal`), `status` (`current` | `superseded` | `retired`),
  `docType`, `effectiveFrom/To`, `carrier`, `text`, `score` (relative RRF, 1 = best
  in this result — not a probability).
- **Return `fullText` to the caller.** `hybridSearch` swallows a keyword failure
  and carries on dense-only.
- **PROPOSED, not done here:** the MCP package needs `"@thornbury/commerce":
  "workspace:*"` (one `pnpm install` to link) and `pnpm --filter @thornbury/commerce
  build` so `dist/` exists; the `./kb` export and `typesVersions` entry (for
  `moduleResolution: node10`) are already in `apps/ai/commerce/package.json`. No
  turbo task reads `COMMERCE_KB_URL` today, so `turbo.json`'s `globalEnv` was not
  touched — add it if the MCP server is ever run under a turbo task.

---

> **▲ 2026-09-27 — a seventeenth case, from Step 9's live check, and it is a miss.**
> `ret-t2-005` asks the T2 question the way an adviser would — *"how long does a
> customer have to return an electronics item"* — without naming a document.
> Every other T2 case names the document it expects, which is why they all hit.
> **MEASURED:** the top six are all 14-day electronics sources (Rev 2 superseded,
> the internal bulletin, the retired note); the current published Rev 3 is
> absent, reachable with `audience: published`. Recall 1/2 on that case; overall
> **15/17 fully recalled · recall@6 0.912 · MRR 0.678** (was 15/16 · 0.938 ·
> 0.690). Not tuned: this is T2's trap reproduced by retrieval, and whether the
> answer contract or a second, filtered search is the right defence belongs to
> the judgment layer.

