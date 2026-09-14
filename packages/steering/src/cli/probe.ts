/** A scratch row-count report. Offline, free. Kept because "how big is it" is
 *  the first question anybody asks of a seeded estate. */
import { buildEstate, tablesOf } from '../db/seed/estate';
const e = buildEstate();
let total = 0;
for (const [sys, table, rows] of tablesOf(e)) {
  total += rows.length;
  console.log(`${sys.padEnd(5)} ${table.padEnd(32)} ${String(rows.length).padStart(6)}`);
}
console.log('TOTAL'.padEnd(38), String(total).padStart(6));
