/**
 * Rename introspected snake_case FIELDS to camelCase and pin the real column
 * name with `@map`, leaving the database untouched.
 *
 * WHY THIS RUNS AFTER `db pull` AND NOT INSTEAD OF IT. fde-assistants-2d owns
 * the DDL; this package introspects it and never pushes. Introspection names a
 * field after its column, so `cases.case_id` arrives as `case_id` — correct,
 * and unreadable in application code that already speaks camelCase everywhere
 * else. `@map` is the seam Prisma provides for exactly this: the field is
 * `caseId`, the column is still `case_id`, and nothing about the estate changes.
 *
 * IT IS IDEMPOTENT AND RE-INTROSPECTION-SAFE, which is the whole reason it is
 * worth automating rather than doing by hand once. Prisma's re-introspection
 * PRESERVES field names it can match through an existing `@map`, so after this
 * has run once, the next `db pull` keeps the camelCase names and only adds
 * whatever 2d has newly created. Run this after every pull.
 *
 * RELATION FIELDS ARE RENAMED BUT NOT MAPPED. `pick_tasks PickTask[]` is not a
 * column, it is Prisma's name for the other side of a foreign key, so it gets
 * the camelCase name and no `@map` — a `@map` there would be a lie about a
 * column that does not exist.
 *
 * REFERENCES ARE REWRITTEN WITH THE OWNING MODEL IN HAND. `references: [x]`
 * names a field on the RELATED model, not this one, so the rename map has to be
 * keyed by model and resolved through the relation field's type. Rewriting
 * these with a global search-and-replace is how you get a schema that validates
 * and points at the wrong column.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRISMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma');

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const FIELD = /^(\s+)([A-Za-z_][A-Za-z0-9_]*)(\s+)([A-Za-z_][A-Za-z0-9_]*)(\[\]|\?)?(.*)$/;
const MODEL_OPEN = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;

/**
 * The models declared in this file.
 *
 * NEEDED BECAUSE "THE TYPE STARTS WITH A CAPITAL" IS NOT A TEST FOR A RELATION,
 * which is a bug this script shipped with and which cost a debugging session:
 * `String`, `Int`, `DateTime`, `Boolean` and `Decimal` all start with a capital,
 * so every scalar column was classified as a relation and NONE of them got its
 * `@map`. The schema still validated, Prisma still generated, and the first
 * query failed at runtime with `The column cases.caseId does not exist`. A rename
 * without its `@map` is not a compile error anywhere — it is a lie the database
 * settles later.
 */
function modelNames(text) {
  const names = new Set();
  for (const line of text.split('\n')) {
    const open = line.match(MODEL_OPEN);
    if (open) names.add(open[1]);
  }
  return names;
}

/** Pass 1 — what each model's fields are called, and what they will be called. */
function planRenames(text) {
  const models = modelNames(text);
  const plan = new Map(); // model -> Map(oldField -> {newField, type, isRelation})
  let model = null;
  for (const line of text.split('\n')) {
    const open = line.match(MODEL_OPEN);
    if (open) {
      model = open[1];
      plan.set(model, new Map());
      continue;
    }
    if (line.trim() === '}') { model = null; continue; }
    if (!model || line.trim().startsWith('//') || line.trim().startsWith('@@')) continue;

    const field = line.match(FIELD);
    if (!field) continue;
    const [, , name, , type] = field;
    if (!name.includes('_')) continue;
    // A relation field names another MODEL. Anything else is a column, even
    // though `String` and `DateTime` also start with a capital.
    const isRelation = models.has(type);
    plan.get(model).set(name, { newField: camel(name), type, isRelation });
  }
  return plan;
}

/** The type of a relation field, so `references:` can be resolved to its model. */
function relationTargets(text) {
  const models = modelNames(text);
  const targets = new Map(); // model -> Map(fieldName -> relatedModel)
  let model = null;
  for (const line of text.split('\n')) {
    const open = line.match(MODEL_OPEN);
    if (open) { model = open[1]; targets.set(model, new Map()); continue; }
    if (line.trim() === '}') { model = null; continue; }
    if (!model) continue;
    const field = line.match(FIELD);
    if (!field) continue;
    const [, , name, , type] = field;
    if (models.has(type)) targets.get(model).set(name, type);
  }
  return targets;
}

function rewriteList(list, renames) {
  return list
    .split(',')
    .map((raw) => {
      const name = raw.trim();
      const hit = renames?.get(name);
      return hit ? hit.newField : name;
    })
    .join(', ');
}

function humanise(text) {
  const plan = planRenames(text);
  const targets = relationTargets(text);
  const out = [];
  let model = null;

  for (const line of text.split('\n')) {
    const open = line.match(MODEL_OPEN);
    if (open) { model = open[1]; out.push(line); continue; }
    if (line.trim() === '}') { model = null; out.push(line); continue; }
    if (!model) { out.push(line); continue; }

    const renames = plan.get(model);

    // Block attributes: @@index / @@unique / @@id name fields of THIS model.
    const block = line.match(/^(\s+@@(?:index|unique|id)\()\[([^\]]*)\](.*)$/);
    if (block) {
      out.push(`${block[1]}[${rewriteList(block[2], renames)}]${block[3]}`);
      continue;
    }

    const field = line.match(FIELD);
    if (!field) { out.push(line); continue; }

    let [, indent, name, gap, type, modifier = '', rest = ''] = field;
    const hit = renames.get(name);

    // `fields:` are this model's; `references:` are the related model's.
    const relatedModel = targets.get(model)?.get(name);
    rest = rest.replace(/fields:\s*\[([^\]]*)\]/, (_, l) => `fields: [${rewriteList(l, renames)}]`);
    if (relatedModel) {
      const theirs = plan.get(relatedModel);
      rest = rest.replace(
        /references:\s*\[([^\]]*)\]/,
        (_, l) => `references: [${rewriteList(l, theirs)}]`,
      );
    }

    if (hit) {
      name = hit.newField;
      // A column gets a @map; a relation field has no column to map to.
      if (!hit.isRelation && !rest.includes('@map(')) {
        rest = `${rest} @map("${field[2]}")`;
      }
      // Keep the columns roughly aligned without trying to be a formatter —
      // `prisma format` runs after this and owns the final whitespace.
      gap = ' ';
    }
    out.push(`${indent}${name}${gap}${type}${modifier}${rest}`);
  }
  return out.join('\n');
}

/**
 * Re-apply the header comment that `prisma db pull` throws away.
 *
 * Introspection rewrites the whole file and keeps only what it can express as
 * schema — `@map`, model names, the generator block's settings. Every `//`
 * comment is lost, which for a file whose whole point is a documented
 * architectural constraint is the wrong thing to lose. Re-applying it here makes
 * the pull lossless in the only sense that matters.
 */
function withHeader(text) {
  const header = readFileSync(join(PRISMA_DIR, 'headers', '_shared.txt'), 'utf8').trimEnd();
  const body = text.startsWith('// ──') ? text.slice(text.indexOf('generator')) : text;
  return `${header}\n\n${body.trimStart()}`;
}

let changed = 0;
for (const file of readdirSync(PRISMA_DIR).filter((f) => f.endsWith('.prisma'))) {
  const path = join(PRISMA_DIR, file);
  const before = readFileSync(path, 'utf8');
  const after = withHeader(humanise(before));
  if (after !== before) { writeFileSync(path, after); changed++; }
  console.log(`  ${after === before ? 'unchanged' : 'humanised'}  ${file}`);
}
console.log(`\nprisma-humanise: ${changed} schema file(s) rewritten\n`);
