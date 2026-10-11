/**
 * Grades one BRF extraction against the answer key in brf-golden.json.
 *
 * Pure functions, no model and no PDF, so the same grader can score a live
 * run (brf-run.ts) or an older saved reply. Numbers match by their digits
 * (spaces, dots, signs and units ignored). Text fields match by keyword groups.
 * A figure is "ok" only when the value matches AND the page is the golden page
 * or one of its alt_pages. Meta fields (org_nr, year) have no page in the reply,
 * so only their value is graded.
 */
import type { BrfFigures } from '../brf/schema';
import { digitsOf } from '../brf/schema';

export const GRADED_FIELDS = [
  'debt_per_sqm',
  'annual_fee_per_sqm',
  'interest_cost',
  'planned_maintenance',
  'auditor_remarks',
] as const;
export const META_FIELDS = ['org_nr', 'year'] as const;
export type GradedField = (typeof GRADED_FIELDS)[number];
export type MetaField = (typeof META_FIELDS)[number];
export type FieldName = GradedField | MetaField;

export interface GoldenField {
  value: string | number;
  page: number;
  alt_pages?: number[];
  keywords?: string[][];
  unsure?: boolean;
  note: string;
}

export interface GoldenDoc {
  description: string;
  fields: Record<FieldName, GoldenField>;
}

export interface GoldenFile {
  version: number;
  about: string;
  documents: Record<string, GoldenDoc>;
}

/** ok: value and page right. page: value right, page wrong. value: value wrong. missing: no value given. */
export type Verdict = 'ok' | 'page' | 'value' | 'missing';

export interface FieldScore {
  field: FieldName;
  verdict: Verdict;
  got: string | null;
  gotPage: number | null;
  want: string | number;
  wantPage: number;
  unsure: boolean;
}

/** Lower case, accents removed, so "anmärkning" and "anmarkning" match. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function valueMatches(field: FieldName, golden: GoldenField, got: string | number | null): boolean {
  if (got === null || got === undefined || got === '') return false;
  if (typeof golden.value === 'number') {
    return digitsOf(String(got)) === digitsOf(String(golden.value));
  }
  if (golden.keywords) {
    const g = fold(String(got));
    return golden.keywords.every((group) => group.some((k) => g.includes(fold(k))));
  }
  return digitsOf(String(golden.value)).length > 0
    ? digitsOf(String(got)) === digitsOf(String(golden.value))
    : fold(String(got)) === fold(String(golden.value));
}

/** Grade a reply. figures may be null (a reply that failed the schema), which grades every field missing. */
export function scoreFigures(figures: BrfFigures | null, golden: GoldenDoc): FieldScore[] {
  const names: FieldName[] = [...META_FIELDS, ...GRADED_FIELDS];
  return names.map((field) => {
    const g = golden.fields[field];
    const raw = figures ? figures[field] : undefined;
    const isMeta = (META_FIELDS as readonly string[]).includes(field);
    let got: string | number | null;
    let gotPage: number | null = null;
    if (isMeta) {
      got = (raw as string | number | null | undefined) ?? null;
    } else {
      const fig = raw as { value: string | null; page: number | null } | undefined;
      got = fig?.value ?? null;
      gotPage = fig?.page ?? null;
    }
    let verdict: Verdict;
    if (got === null) verdict = 'missing';
    else if (!valueMatches(field, g, got)) verdict = 'value';
    else if (isMeta) verdict = 'ok';
    else if (gotPage === g.page || (g.alt_pages ?? []).includes(gotPage ?? -1)) verdict = 'ok';
    else verdict = 'page';
    return {
      field,
      verdict,
      got: got === null ? null : String(got),
      gotPage,
      want: g.value,
      wantPage: g.page,
      unsure: g.unsure === true,
    };
  });
}

export function countOk(scores: FieldScore[], fields: readonly FieldName[] = GRADED_FIELDS): number {
  return scores.filter((s) => fields.includes(s.field) && s.verdict === 'ok').length;
}
