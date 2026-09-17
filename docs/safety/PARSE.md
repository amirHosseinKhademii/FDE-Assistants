# Inside the parser — what the code actually does

*The under-the-hood companion to [`INGESTION.md`](INGESTION.md) §3.1. Written
before the code, so the code has to match something already agreed.*

**One sentence:** read 100,980 lines, glue together the ones describing the same
complaint, and write out 70,194 objects that each have *text to search* and
*fields to filter on*.

---

## The whole thing, in shape

```ts
const byOdi = new Map<string, Doc>();      // 1. somewhere to collect

for await (const line of lines(file)) {    // 2. one line at a time
  const f = line.split('\t');              // 3. 51 fields, by position
  if (f.length !== 51) { ragged++; continue; }

  const odi = f[1];
  const existing = byOdi.get(odi);
  if (existing) existing.components.push(f[11]);   // 4. same person again
  else byOdi.set(odi, newDoc(f));                  //    first time we've seen them
}

writeFileSync('documents.json', JSON.stringify([...byOdi.values()]));
```

Everything below is one of those five numbered lines, explained.

---

## 1 · A `Map`, because the file is not sorted

Rows for the same complaint are **adjacent in practice but not guaranteed to
be**. A `Map` keyed by `ODINO` does not care about order: first sighting creates
the document, every later sighting adds its component.

```ts
type Doc = {
  id: string;
  text: string;
  meta: { odino: string; make: string; model: string; year: number;
          filed: string; components: string[];
          crash: boolean; fire: boolean; injuries: number; deaths: number;
          miles: number | null; state: string; vin11: string };
};
```

> **Why a `Map` and not a database yet.** 70,194 objects is about 60 MB in
> memory. A database at this stage would mean we could not look at the output
> in a text editor, which is the entire point of stage 3.1.

---

## 2 · One line at a time, not all at once

```ts
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

async function* lines(path: string) {
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,          // treat \r\n as one break
  });
  for await (const line of rl) if (line.length) yield line;
}
```

Our slice is 79 MB and would load fine. **The full file is 1.5 GB and would
not.** Streaming costs nothing here and means the same code works if the slice
widens — and `PLAN.md` §9.1 says it might.

`crlfDelay: Infinity` is not decoration: these files are Windows-origin and a
stray `\r` left on the end of field 51 would silently become part of its value.

---

## 3 · `split('\t')` — and deliberately NOT a CSV library

```ts
const f = line.split('\t');
if (f.length !== 51) { ragged++; continue; }   // never fires; see below
```

**This is the decision that already cost us once.** A CSV reader with quote
handling turned on merges records at unbalanced `"` — and 708 lines contain an
odd number of them, because people write `THE "SERVICE ENGINE" LIGHT CAME ON`.
`CORPUS.md` §3 is the full story.

NHTSA's file characteristics say *"TAB delimited"* and name **no quote
character**. So: split on tab, and treat `"` as an ordinary letter.

The `!== 51` guard should never fire. It stays because a guard that never fires
is cheap, and a silently short row would shift every field after the gap.

### Naming the columns once

```ts
const F = { ODINO: 1, MFR: 2, MAKE: 3, MODEL: 4, YEAR: 5, CRASH: 6,
            FAILDATE: 7, FIRE: 8, INJURED: 9, DEATHS: 10, COMPDESC: 11,
            CITY: 12, STATE: 13, VIN: 14, LDATE: 16, MILES: 17,
            CDESCR: 19 } as const;
```

Transcribed from `CMPL.txt`, the data dictionary, **which is 1-indexed while
JavaScript is 0-indexed** — so every number here is the dictionary's minus one.
That off-by-one is the single most likely bug in this file, and it would not
error: narratives would simply arrive in the `MILES` field.

---

## 4 · Merging the repeats

```ts
const existing = byOdi.get(odi);
if (existing) {
  if (!existing.meta.components.includes(comp)) existing.meta.components.push(comp);
  return;                        // narrative already captured — it is identical
}
```

NHTSA writes **one row per component**. ODI `11341276` is one person and five
rows:

```
11341276  STRUCTURE:BODY                                   ┐
11341276  ELECTRICAL SYSTEM                                │  same narrative,
11341276  POWER TRAIN                                      │  five times
11341276  ENGINE                                           │
11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY ┘
```

We keep the **first** row's narrative and collect the components. `includes()`
guards against a component repeating, which the file does not do today but costs
one comparison to be safe about.

> **What this buys:** without it, that person occupies five of the six result
> slots and crowds out four others. And every count we publish is 44% too high.

---

## 5 · Building the text — the highest-leverage line in the pipeline

```ts
const header = `${year} ${make} ${model} | ${components.join(', ')} | filed ${filed}`;
doc.text = `${header}\n${narrative}`;
```

**The narrative never says "F-150".** It says *"THE GEAR WILL NOT GO INTO
PARK…"*. Without the header, a question about *"2020 F-150 transmission"*
matches nothing on the meaning arm.

```
2020 FORD F-150 | POWER TRAIN | filed 2020-09-08
THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START. ALSO, THE DISPLAY
INDICATES I AM IN THE WRONG GEAR DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE…
```

> Stage 3.2 barely runs on this corpus — only 114 investigations get chunked. So
> **the parser, not the chunker, decides what can be found.** This one line of
> string concatenation is where that happens.

**And note what is NOT in the text.** `deaths`, `crash`, `miles` stay in `meta`.
Writing "deaths 0" into the text would make every complaint match a question
about fatalities.

---

## 6 · Dates — converted once, in one function

```ts
/** NHTSA flat files: YYYYMMDD. The API uses two OTHER formats — see CORPUS.md §3. */
function isoDate(raw: string): string | null {
  if (!/^\d{8}$/.test(raw)) return null;
  const [y, m, d] = [raw.slice(0, 4), raw.slice(4, 6), raw.slice(6)];
  return `${y}-${m}-${d}`;
}
```

Every date becomes `YYYY-MM-DD` at the boundary, so nothing downstream has to
know what shape it arrived in. Eval case **REC-008** exists to catch this going
wrong, because a mis-parsed date shifts every before/after answer and **nothing
errors**.

Returning `null` rather than throwing: a missing `FAILDATE` is normal — people
do not always remember when it happened — and is not a parse failure.

---

## 7 · Numbers that are sometimes not numbers

```ts
const int = (s: string) => (/^\d+$/.test(s) ? Number(s) : null);
const yn  = (s: string) => s.trim().toUpperCase() === 'Y';
```

`MILES` is blank often. `DEATHS` is `"0"`, not `0`. `CRASH` is `"Y"` or `"N"` —
and **`Number("")` is `0`**, which would quietly turn "we don't know the
mileage" into "zero miles". Hence the regex test before the conversion.

---

## 8 · The three checks, printed at the end

```
parsed 100,980 lines → 70,194 documents   ragged rows: 0
raw file says (awk, no parser): 100,980 lines, 51 fields on every one   ✓
ODI 11353867 present: yes — "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08…"
```

**The second check is the important one.** It compares the parser's count
against `awk` over the raw file — *a different tool, with no parser in the
path*. A parser confirming its own output proves nothing, which is exactly how
the quoting bug survived long enough to be written into a document as a property
of the data.

---

## What it does not do

No embedding. No database. No network. No model. One file in, one file out —
and the file it writes is plain JSON you can open and read.

---

## The output

```json
{
  "id": "11353867",
  "text": "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08\nTHE GEAR WILL NOT GO INTO PARK…",
  "meta": {
    "odino": "11353867", "make": "FORD", "model": "F-150", "year": 2020,
    "filed": "2020-09-08", "components": ["POWER TRAIN"],
    "crash": false, "fire": false, "injuries": 0, "deaths": 0,
    "miles": 2800, "state": "TX", "vin11": "1FTEW1E43LF"
  }
}
```

70,194 of those, in one array, ready for stage 3.2 — which will look at them and
decide that 70,194 of them need no chunking at all.
