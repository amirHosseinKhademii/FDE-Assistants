# Inside the index — the first stage that leaves this machine

*The under-the-hood companion to [`INGESTION.md`](INGESTION.md) §3.4, in the
same shape as [`PARSE.md`](PARSE.md), [`CHUNK.md`](CHUNK.md) and
[`EMBED.md`](EMBED.md). Written before the code.*

**One sentence:** 73,442 passages and their vectors move from a 641 MB file on
disk into one Postgres table that can be searched two different ways.

---

## What an index is, plainly

Stage 3.3 produced 73,442 lists of 384 numbers. Finding the closest one to a
question means comparing against all of them — which is fine once and hopeless
at every question.

A **vector index** is a data structure that finds near neighbours without
checking everything. Putting the passages in Postgres also means the text sits
next to the numbers, so the same row can be searched by **meaning** and by
**keyword**, which is what stage 3.5 needs.

---

## BEFORE → AFTER

```
BEFORE   /home/byron/nhtsa/vectors.ndjson
         641 MB, 73,442 lines, one JSON object each

AFTER    SAFETY_DATABASE_URL · table `document_chunks`
         73,442 rows, ~140 MB
```

---

## The table, and the two indexes over the same words

```sql
CREATE TABLE document_chunks (
  id        uuid PRIMARY KEY,
  content   text,          -- the passage, for reading and quoting
  vector    vector(384),   -- for MEANING   → stage 3.5 arm A
  metadata  jsonb          -- for FILTERING → make, year, deaths
);

ALTER TABLE document_chunks ADD COLUMN content_ts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX document_chunks_fts_idx ON document_chunks USING gin (content_ts);
```

> **`content_ts` is a GENERATED column, not a trigger.** Postgres recomputes it
> whenever `content` changes, so it cannot drift out of step with the text it
> describes. A trigger can be dropped; a generated column cannot be forgotten.

**This one table is the whole hybrid idea.** `vector` and `content_ts` are two
indexes over the *same* words, kept because they fail at different things — and
this corpus is full of what the vector arm is worst at: `20V197000`,
`11353867`, `P0219A`, `PRNDL`.

---

## `addVectors`, not `addDocuments` — this is the important line

`@fde/grounding`'s `ingestDocuments` calls **`store.addDocuments(docs)`**, which
embeds as it inserts. That is right when you have documents and no vectors.

**We have 73,442 vectors that cost 36.6 minutes.** Calling `addDocuments` would
silently compute them again.

```ts
await store.addVectors(vectors, documents);   // yes — insert what we made
await store.addDocuments(documents);          // NO — re-embeds, 36.6 min
```

The waste would not error, would not look wrong, and would be invisible in the
row count. It is the same class as a green check covering an assertion that
never ran.

---

## Streamed in, because 641 MB will not fit in a string

Stage 3.3 learned this the hard way: `JSON.stringify` over the corpus builds a
637 MB string against V8's 512 MB limit, and 37.9 minutes of work went with it.

**Reading has the same shape.** `JSON.parse(readFileSync(...))` on a 641 MB file
would build that string on the way in. So this stage reads NDJSON **line by
line** and inserts in batches:

```ts
for await (const line of lines(VECTORS_NDJSON)) {
  batch.push(JSON.parse(line));
  if (batch.length === 500) await flush();
}
```

---

## What can go wrong here that could not go wrong before

**This is the first stage that touches something outside this machine**, so it
is the first that can fail for reasons that have nothing to do with our code.

**1 · Neon suspends an idle connection and `pg` waits forever.** Already fixed —
`PG_OPTIONS` in `packages/grounding/src/pg-resilience.ts` sets `keepAlive` and
timeouts, because a pooler that stops answering without a FIN leaves the process
in `ep_poll` indefinitely. It cost an hour of confusion on the steering
engagement. Batches leave gaps; gaps are when this bites.

**2 · Storage — and the prediction was wrong by more than half.** Extrapolating
from steering (3,854 chunks in 7,536 kB, ~2,002 bytes a row) predicted **~140 MB**
for 73,442 rows. The load actually produced **287 MB**, because the estimate
omitted `content_ts` and its GIN index — the keyword arm's price, about a
quarter of the table.

**And there are three different numbers for "how big is it", which matters when
you reload.** Measured on the loaded table:

```
pg_total_relation_size('document_chunks')    287 MB   the table and its indexes
pg_database_size(current_database())         295 MB   what Postgres reports
pg_cluster_size()                            318 MB   WHAT NEON BILLS  ← the quota
```

`pg_cluster_size()` comes from the `neon` extension (`create extension neon`)
and is the only one of the three the **512 MB** limit is read from. Postgres's
number is the easy one to reach and the wrong one to plan with — 194 MB of real
headroom, not 217 MB.

**3 · The extension is not installed.** `SAFETY_DATABASE_URL` is empty and has
no `vector`. `PGVectorStore.initialize` creates it, which needs the role to be
allowed to — on Neon it is.

**4 · A partial load looks exactly like a complete one.** If the process dies at
row 40,000, the table has 40,000 rows and no error anywhere. Hence check 1.

**5 · Running it twice.** The load appends, so a second run without an empty
table gives 146,884 rows — every passage twice, no error. `loadIntoStore`
therefore **empties the table first**, and does it with `truncate` rather than
`delete`:

```
delete    marks 73,442 rows dead and returns none of their 287 MB until
          autovacuum decides to. The reload then asks for a SECOND 287 MB.
truncate  returns the space at once, and the reload writes into it.
```

That distinction is invisible on a laptop and decisive on a 512 MB quota. It is
also *asserted rather than assumed*: the loader reads `pg_cluster_size()` after
truncating and **refuses to start** if the freed space has not come back to the
quota, because a load that runs out of room mid-way looks exactly like the
dropped connection point 1 is about.

---

## The checks

```
73,442 rows in document_chunks

ok  the row count matches the file, counted with wc -l and not by the loader
ok  one dimension group: 384. Not two.
ok  ODI 11353867 is in the table and its text is intact
ok  content_ts is populated — the keyword arm has something to search
ok  every row carries a distinct chunkId — what fusion deduplicates on
```

**Check 2 is the one with history.** `PGVectorStore` creates an
**unconstrained** `vector` column, so rows of different dimensions insert
happily and fail only at query time, somewhere else, later. Insurance hit this
when `EMBEDDINGS` changed underneath an existing index; pharma hit it again on
the deployed app with `different vector dimensions 1536 and 384`. One group or
the load is wrong.

**And check 1 uses `wc -l`**, not the loader's own tally — the same rule as
stage 3.1's `awk` cross-check. A loader confirming its own row count proves
nothing.

**Check 5 was added after it had already cost something.** The metadata this
loader writes is not only for citations — `@fde/grounding` fuses the two search
arms by `metadata.chunkId`, and when it is missing, falls back to the first 120
characters of the text. Every passage here opens with a header stage 3.1
generated, so **977 rows shared a prefix and 174 shared one identically**;
those distinct complaints fused into a single entry and their scores *added*.
Search returned the wrong order, silently. The full account is in
[`INGESTION.md`](INGESTION.md) §3.6; the line that fixes it is
`chunkId: rec.id`, and check 5 asks Postgres — not the loader — whether it is
there.

> **The metadata a stage writes is an interface, not a convenience.** Nothing
> in `index-store.ts` reads `chunkId`. Something two stages downstream does, and
> its fallback was reasonable, undocumented at the call site, and wrong for this
> corpus.

---

## What it does not do

No searching. No model. Stage 3.5 is the first question asked of this table.
