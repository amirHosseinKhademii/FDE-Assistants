/**
 * `mrd_hcm` — hop 4. The person who signed, and their standing ON THE DAY.
 *
 * THIS IS WHERE THE HEADLINE FINDING LIVES, AND IT IS INVISIBLE FROM ANYWHERE
 * ELSE. Every other silo says the batch is fine. Eva Vos is a registered QP
 * whose authority was never revoked — everything about her APPOINTMENT is in
 * order. What had lapsed is one recurring training record, eleven days before
 * she certified. Nothing in the quality system can see that, and nothing in the
 * HR system knows it matters; it only becomes a finding when hop 5 supplies the
 * rule.
 *
 * SO THE `asOf` ARGUMENT IS NOT OPTIONAL AND MUST NOT DEFAULT TO TODAY. A
 * training record that expired in August and was renewed in October is CURRENT
 * today and was LAPSED on the day of the act. Asking "is this person qualified"
 * returns the reassurance; asking "were they qualified on 2026-09-04" returns
 * the finding.
 */
import type { DbHandle } from '../utils/handle';
import { asOfDay, hadLapsedBy } from '../utils/dates';

const DB = 'mrd_hcm';

export interface Person {
  employeeId: string;
  fullName: string;
  title: string;
  departmentId: string;
  /** A position whose holder signs things — the flag that turns paperwork into a blocker. */
  gmpCritical: boolean;
  status: string;
}

export interface Qualification {
  kind: string;
  authority: string;
  registerNo: string | null;
  validUntil: Date | null;
}

export interface TrainingRecord {
  curriculumId: string;
  completedOn: Date;
  expiresOn: Date;
}

/** A training record judged against the date of the act, not against today. */
export interface CheckedTraining extends TrainingRecord {
  /** THE FINDING. `true` means it had already expired when the act was performed. */
  lapsedAtAct: boolean;
}

export interface SignatureAuthority {
  act: string;
  grantedOn: Date;
  revokedOn: Date | null;
}

/** An authority judged against the date of the act, not against today. */
export interface CheckedAuthority extends SignatureAuthority {
  /**
   * THE FINDING. False means the person performed the act OUTSIDE the window in
   * which they were permitted to — before it was granted, or after it was
   * revoked. Not the same failure as lapsed training and not interchangeable
   * with it: training is a competence that expires, authority is a permission
   * that is conferred. Someone can hold current training and no authority, and
   * the reverse.
   */
  heldAtAct: boolean;
}

export async function fetchPerson(h: DbHandle, employeeId: string): Promise<Person | undefined> {
  const r = await h.one(
    DB,
    `select e.*, p.title, p.gmp_critical
       from employees e join positions p on p.position_id = e.position_id
      where e.employee_id = $1`,
    [employeeId],
  );
  if (!r) return undefined;
  return {
    employeeId: r.employee_id,
    fullName: r.full_name,
    title: r.title,
    departmentId: r.department_id,
    gmpCritical: r.gmp_critical,
    status: r.status,
  };
}

export async function fetchTrainingRecords(h: DbHandle, employeeId: string): Promise<TrainingRecord[]> {
  const rows = await h.query(
    DB,
    'select * from training_records where employee_id = $1 order by curriculum_id',
    [employeeId],
  );
  return rows.map((r) => ({
    curriculumId: r.curriculum_id,
    completedOn: r.completed_on,
    expiresOn: r.expires_on,
  }));
}

export async function fetchQualifications(h: DbHandle, employeeId: string): Promise<Qualification[]> {
  const rows = await h.query(DB, 'select * from qualifications where employee_id = $1', [employeeId]);
  return rows.map((r) => ({
    kind: r.kind,
    authority: r.authority,
    registerNo: r.register_no ?? null,
    validUntil: r.valid_until ?? null,
  }));
}

/**
 * Was this person permitted to perform this act on this date?
 *
 * Separate from training on purpose: authority is granted and revoked, training
 * expires and is renewed. Eva Vos passes this check and fails the other one, and
 * an answer that collapsed them would say the wrong thing about why.
 */
export async function fetchSignatureAuthority(
  h: DbHandle,
  employeeId: string,
): Promise<SignatureAuthority[]> {
  const rows = await h.query(DB, 'select * from signature_authority where employee_id = $1', [employeeId]);
  return rows.map((r) => ({ act: r.act, grantedOn: r.granted_on, revokedOn: r.revoked_on ?? null }));
}

/** Everything hop 4 knows about one person on one day, in one call. */
export interface HcmFacts {
  person: Person;
  /** The day every judgement in this bundle was made against. */
  asOf: Date;
  qualifications: Qualification[];
  training: CheckedTraining[];
  /**
   * What this person was PERMITTED to do on `asOf`.
   *
   * COSTS ONE EXTRA QUERY PER CERTIFIER, and `db:trace`'s fetch count moves 26
   * to 27 because of it. Worth it: without this the walk checks whether a
   * signer was competent and never whether they were allowed, which is half of
   * the question Annex 16 asks.
   */
  authority: CheckedAuthority[];
}

export async function fetchHcmFacts(
  h: DbHandle,
  employeeId: string,
  asOf: Date,
): Promise<HcmFacts | undefined> {
  const person = await fetchPerson(h, employeeId);
  if (!person) return undefined;

  const training = await fetchTrainingRecords(h, employeeId);
  const qualifications = await fetchQualifications(h, employeeId);
  const authority = await fetchSignatureAuthority(h, employeeId);
  const day = asOfDay(asOf);

  return {
    person,
    asOf,
    qualifications,
    training: training.map((t) => ({ ...t, lapsedAtAct: hadLapsedBy(t.expiresOn, asOf) })),
    authority: authority.map((a) => ({
      ...a,
      // A window, open at the top when never revoked — the same coalescing the
      // SOP revisions need, and wrong in the same way if forgotten.
      heldAtAct: asOfDay(a.grantedOn) <= day && (!a.revokedOn || asOfDay(a.revokedOn) >= day),
    })),
  };
}
