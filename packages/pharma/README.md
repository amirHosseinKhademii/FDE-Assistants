# @meridian/pharma

The second domain. **Step 1 only: six databases and the data that ties them
together.** No tools, no prompt, no app — see
[`docs/PHARMA-PLAN.md`](../../docs/PHARMA-PLAN.md) for what comes next and
[`docs/pharma/cases/release-001.md`](../../docs/pharma/cases/release-001.md)
for the question this data exists to answer.

## Why six databases and not six schemas

Because Postgres then *enforces* the property the whole exercise depends on:
**nothing can join across two systems.** An assistant answering a batch-release
question has to fetch from each system and stitch in code, which is what an
integration at a customer actually is. One clever `JOIN` would let us fake our
way past the entire problem.

The price is that no foreign key can span two databases, so coherence is the
generator's job — which is why `db:check` exists and why it carries a negative
control.

```
mrd_reg   standards & policies        SOPs with revision windows, GMP clauses
mrd_hcm   personnel & departments     people, training with expiry, authority
mrd_erp   products & materials        products, lots, suppliers, consumption
mrd_mes   facilities & manufacturing  sites, lines, equipment, batch records
mrd_qms   quality                     specs, tests, OOS, dispositions, CAPAs
mrd_tms   distribution & fleet        shipments, trucks, telematics
```

47 tables, 4,663 rows, one Neon branch.

## Layout

TypeScript, built with `tsc`, same shape as `packages/insurance` — the `.mjs`
first draft was quicker to write and would have had to be rewritten the moment
this package grew tools and a schema.

```
src/config/connections.ts   one base URL in, six named databases out
src/db/rows.ts              47 row interfaces, transcribed from the DDL
src/db/{create,migrate,seed,check,drop,trace}.ts
src/db/probe-grounding.ts   can @fde/grounding write to a second estate?
src/seed/{rng,world,operations}.ts
db/schema/*.sql             the DDL — OUTSIDE src/, because tsc copies nothing
```

## Commands

All six URLs are derived from a single `PHARMA_DATABASE_URL` in the repo-root
`.env` — see `db/connections.mjs`.

```bash
pnpm db:create     # CREATE DATABASE ×6, on the NON-POOLED endpoint
pnpm db:migrate    # apply db/schema/*.sql
pnpm db:seed       # build the world in memory, load it
pnpm db:check      # 21 assertions — see below
pnpm db:drop --yes # tear down the six, and refuse to touch anything else
pnpm db:reset      # all of the above, in order
```

`db:create` must use the non-pooled endpoint: `CREATE DATABASE` is not
transactional and pgbouncer rejects it with an error that says nothing about
poolers.

## What `db:check` asserts

1. **35 cross-database soft keys**, every value, none of which Postgres can see.
2. **Eight planted traps**, re-derived from the loaded rows rather than from the
   constants that planted them.
3. **Role coherence** — that QP certifications were made by registered,
   authorised QPs, that nobody verified their own work, and so on. This section
   exists because everything else passed while a *Production Operator* held a QP
   registration and certified a batch for EU release. Every reference resolved;
   the person they described could not exist. **Referential integrity is not
   coherence.**
4. **A negative control** — a planted `EMP-9999` the walk must catch, because a
   reference checker looking in the wrong place reports zero and reads exactly
   like a clean estate.
5. **Determinism** — two builds of the world hash identically.

## What the types are actually for

Two things, and neither is decoration:

- **`rows.ts` catches a row written with a mistyped or missing column** — the
  one bug this seed genuinely suffers, which SQL would otherwise only report at
  insert time and only for the first offending batch.
- **`DateLike` and `Numeric` carry the database's awkwardness instead of hiding
  it.** A `date` is written as a string and read back as a `Date`; a `numeric`
  is written as a number and read back as a **string**, because a float cannot
  hold an arbitrary-precision decimal. Typing those `string` and `number` would
  compile and then compare a string to a number at runtime — which is exactly
  how a dissolution result of `'71.4'` sails through a `< 80` check.

The conversion also surfaced a runtime bug the types could not: the shared
tsconfig sets `allowSyntheticDefaultImports` (a type-level permission) without
`esModuleInterop` (the runtime shim), so `import pg from 'pg'` typechecks and is
`undefined` when it runs. Named imports throughout.

## Determinism

Seeded PRNG, a frozen epoch (`EPOCH` in `db/seed/rng.mjs`), and no `Date.now()`,
`Math.random()` or `new Date()` in the generator. Same seed, byte-identical
world. The acceptance case is only derivable because of this.
