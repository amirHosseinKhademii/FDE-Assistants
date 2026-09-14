/**
 * `mrd_mes` — hop 2. The run that physically made the lot.
 *
 * KEYED BY `workOrderRef`, WHICH CAME OUT OF HOP 1. There is no foreign key
 * from a lot to its work order and there cannot be one: different database.
 * That arrow is followed here, in application code, which is the whole shape of
 * this walk.
 *
 * THE ONE REAL CROSS-CHECK IN THIS SILO IS AS-OF, NOT LOOKUP. "Was this machine
 * qualified?" answers yes for a machine that was requalified a month after the
 * run — which is the reassurance, not the finding. The question is "was it
 * qualified ON THE DAY THE STEP RAN", and that is a date-range lookup. It is
 * the same rule `mrd_reg` lives by at hop 5, applied to a machine instead of a
 * procedure.
 */
import type { DbHandle } from '../utils/handle';
import { asOfDay } from '../utils/dates';

const DB = 'mrd_mes';

export interface WorkOrder {
  workOrderId: string;
  lineId: string;
  actualStart: Date;
  actualEnd: Date;
  status: string;
  /** Soft key → `mrd_reg.sop_revisions` — an EXACT revision, captured when the order was issued. */
  governingSopRef: string;
  /** Soft key → `mrd_hcm.employees`. */
  signedByRef: string | null;
  /** The date the `mrd_reg` as-of lookup at hop 5 is run against. */
  signedOn: Date | null;
}

export interface ProcessStep {
  stepId: string;
  seq: number;
  name: string;
  startedAt: Date;
  equipmentRef: string | null;
  performedByRef: string;
  verifiedByRef: string;
}

/** A step plus the standing of the equipment it used, on the day it used it. */
export interface CheckedStep extends ProcessStep {
  /**
   * THE FINDING. `true` qualified on the day, `false` not, `null` no equipment
   * involved in this step — three states, because "no machine" and "unqualified
   * machine" are not the same answer and must not print the same.
   */
  equipmentQualifiedOnDay: boolean | null;
}

export interface Deviation {
  deviationId: string;
  /** The day it was raised. Every citation to a deviation is judged as of this. */
  raisedOn: Date;
  severity: string;
  status: string;
  description: string;
}

export async function fetchWorkOrder(h: DbHandle, workOrderId: string): Promise<WorkOrder | undefined> {
  const r = await h.one(DB, 'select * from work_orders where work_order_id = $1', [workOrderId]);
  if (!r) return undefined;
  return {
    workOrderId: r.work_order_id,
    lineId: r.line_id,
    actualStart: r.actual_start,
    actualEnd: r.actual_end,
    status: r.status,
    governingSopRef: r.governing_sop_ref,
    signedByRef: r.signed_by_ref ?? null,
    signedOn: r.signed_on ?? null,
  };
}

export async function fetchProcessSteps(h: DbHandle, workOrderId: string): Promise<ProcessStep[]> {
  const rows = await h.query(DB, 'select * from process_steps where work_order_id = $1 order by seq', [
    workOrderId,
  ]);
  return rows.map((r) => ({
    stepId: r.step_id,
    seq: r.seq,
    name: r.name,
    startedAt: r.started_at,
    equipmentRef: r.equipment_ref ?? null,
    performedByRef: r.performed_by_ref,
    verifiedByRef: r.verified_by_ref,
  }));
}

export async function fetchDeviations(h: DbHandle, workOrderId: string): Promise<Deviation[]> {
  const rows = await h.query(DB, 'select * from deviations where work_order_id = $1', [workOrderId]);
  return rows.map((r) => ({
    deviationId: r.deviation_id,
    raisedOn: r.raised_on,
    severity: r.severity,
    status: r.status,
    description: r.description,
  }));
}

/**
 * Was this machine qualified on this date?
 *
 * `IQ` is excluded because installation qualification is a one-off event, not a
 * standing the machine holds; only `OQ`/`PQ`/requalification carry a validity
 * window that a run can fall inside or outside of.
 */
export async function isEquipmentQualifiedOn(
  h: DbHandle,
  equipmentId: string,
  onDate: Date | string,
): Promise<boolean> {
  const r = await h.one(
    DB,
    `select * from equipment_qualification
      where equipment_id = $1 and kind <> 'IQ'
        and $2::date between performed_on and valid_until limit 1`,
    [equipmentId, asOfDay(onDate)],
  );
  return !!r;
}

/** Everything hop 2 knows, in one call. See `erp.ts` on why the bundle exists. */
export interface MesFacts {
  workOrder: WorkOrder;
  steps: CheckedStep[];
  deviations: Deviation[];
}

export async function fetchMesFacts(h: DbHandle, workOrderId: string): Promise<MesFacts | undefined> {
  const workOrder = await fetchWorkOrder(h, workOrderId);
  if (!workOrder) return undefined;

  const steps = await fetchProcessSteps(h, workOrder.workOrderId);
  const deviations = await fetchDeviations(h, workOrder.workOrderId);

  const checked: CheckedStep[] = [];
  for (const step of steps) {
    checked.push({
      ...step,
      equipmentQualifiedOnDay: step.equipmentRef
        ? await isEquipmentQualifiedOn(h, step.equipmentRef, step.startedAt)
        : null,
    });
  }

  return { workOrder, steps: checked, deviations };
}
