import { differenceInDays, parseISO, isValid } from "date-fns";
import type { CurrentStage, SLAStatus } from "@/types";

// SLA thresholds in days for each stage.
// PRL default is 5 days — configurable per business requirement.
export const SLA_THRESHOLDS: Record<string, number> = {
  CS:  7,
  PR:  14,
  PO:  7,
  MDD: 7,
  MRD: 5,
  WCD: 30,
  PRL: 5,   // Default — confirm actual company SLA before finalising
  PAR: 5,
  PDD: 10,
} as const;

// Ordered list of stages for UI display and progression logic
// CS → PR → PO → MDD → MRD → WCD → PRL → PAR → PDD → COMPLETED
export const STAGE_ORDER: CurrentStage[] = [
  "CS", "PR", "PO", "MDD", "MRD", "WCD", "PRL", "PAR", "PDD", "COMPLETED",
];

export function calcDaysBetween(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): number | null {
  if (!start || !end) return null;
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) return null;
  return Math.max(0, differenceInDays(endDate, startDate));
}

export function calcDaysFromToday(
  start: Date | string | null | undefined
): number | null {
  if (!start) return null;
  const startDate = typeof start === "string" ? parseISO(start) : start;
  if (!isValid(startDate)) return null;
  return Math.max(0, differenceInDays(new Date(), startDate));
}

export function calcDaysForCS(
  sourceDate: Date | null,
  comparativeDate: Date | null
): number | null {
  return calcDaysBetween(sourceDate, comparativeDate);
}

export function calcDaysForPR(
  comparativeDate: Date | null,
  prDate: Date | null
): number | null {
  return calcDaysBetween(comparativeDate, prDate);
}

export function calcDaysForPO(
  prDate: Date | null,
  poDate: Date | null
): number | null {
  return calcDaysBetween(prDate, poDate);
}

export function calcDaysForPayment(
  prlDate: Date | null,
  paymentDate: Date | null
): number | null {
  return calcDaysBetween(prlDate, paymentDate);
}

export function calcNoOfDays(sourceDate: Date | null): number | null {
  return calcDaysFromToday(sourceDate);
}

export function calcPendingDays(
  pendingFrom: Date | null
): number | null {
  return calcDaysFromToday(pendingFrom);
}

export function calcSLAStatus(
  currentStage: CurrentStage,
  pendingDays: number | null
): SLAStatus {
  if (currentStage === "COMPLETED") return "COMPLETED";
  // CANCELLED is treated as closed — not overdue
  if (currentStage === "CANCELLED") return "COMPLETED";
  if (!pendingDays) return "ON_TRACK";

  const threshold = SLA_THRESHOLDS[currentStage];
  if (!threshold) return "ON_TRACK";

  const ratio = pendingDays / threshold;
  if (ratio >= 1) return "OVERDUE";
  if (ratio >= 0.75) return "AT_RISK";
  return "ON_TRACK";
}

/**
 * Derives the correct currentStage from actual filled-in data rather than
 * relying purely on date existence. Uses a combination of dates AND status
 * fields so that, for example, a prDate alone doesn't advance to PO until
 * prStatus is also APPROVED.
 *
 * Stage progression (each step requires its prerequisite to be complete):
 *   CS  → comparativeDate set AND csStatus = COMPLETED
 *   PR  → prDate set AND prStatus = APPROVED
 *   PO  → poDate set AND poStatus = COMPLETED
 *   MDD → materialDispatchDate set
 *   MRD → materialReceivedDate set
 *   WCD → workCompletionDate set
 *   PRL → prlDate set
 *   PAR → paymentApprovalDate set
 *   PDD → paymentDoneDate set → COMPLETED
 *
 * CANCELLED overrides all other stages and is always preserved from existing value.
 */
export function deriveCurrentStage(data: {
  currentStage?: CurrentStage | null;
  csStatus?: string | null;
  comparativeDate?: Date | null;
  prStatus?: string | null;
  prDate?: Date | null;
  poStatus?: string | null;
  poDate?: Date | null;
  materialDispatchDate?: Date | null;
  materialReceivedDate?: Date | null;
  workCompletionDate?: Date | null;
  prlDate?: Date | null;
  paymentApprovalDate?: Date | null;
  paymentDoneDate?: Date | null;
  sourceCancellationDate?: Date | null;
}): CurrentStage {
  // CANCELLED is terminal when sourceCancellationDate is set
  if (data.sourceCancellationDate) return "CANCELLED";

  // Walk the stage chain: each stage is "done" when both its date AND
  // its status (where applicable) confirm completion.
  if (data.paymentDoneDate) return "COMPLETED";
  if (data.paymentApprovalDate) return "PDD";
  if (data.prlDate) return "PAR";
  if (data.workCompletionDate) return "PRL";
  if (data.materialReceivedDate) return "WCD";
  if (data.materialDispatchDate) return "MRD";
  // PO → MDD requires both poDate and poStatus COMPLETED
  if (data.poDate && (data.poStatus === "COMPLETED" || data.poStatus === "IN_PROGRESS")) return "MDD";
  if (data.poDate) return "PO"; // poDate set but not yet completed
  // PR → PO requires both prDate and prStatus APPROVED or COMPLETED
  if (data.prDate && (data.prStatus === "APPROVED" || data.prStatus === "COMPLETED")) return "PO";
  if (data.prDate) return "PR"; // prDate set but not yet approved
  // CS → PR requires both comparativeDate and csStatus COMPLETED
  if (data.comparativeDate && data.csStatus === "COMPLETED") return "PR";
  if (data.comparativeDate) return "CS"; // comparative started but CS not yet done

  return "CS";
}

export function calculateAllFields(data: {
  sourceDate?: Date | null;
  comparativeDate?: Date | null;
  prDate?: Date | null;
  poDate?: Date | null;
  prlDate?: Date | null;
  paymentDoneDate?: Date | null;
  pendingFrom?: Date | null;
  currentStage?: CurrentStage;
  // For stage derivation
  csStatus?: string | null;
  prStatus?: string | null;
  poStatus?: string | null;
  materialDispatchDate?: Date | null;
  materialReceivedDate?: Date | null;
  workCompletionDate?: Date | null;
  paymentApprovalDate?: Date | null;
  sourceCancellationDate?: Date | null;
  existingStage?: CurrentStage | null;
}) {
  const daysForCS = calcDaysForCS(
    data.sourceDate ?? null,
    data.comparativeDate ?? null
  );
  const daysForPR = calcDaysForPR(
    data.comparativeDate ?? null,
    data.prDate ?? null
  );
  const daysForPO = calcDaysForPO(
    data.prDate ?? null,
    data.poDate ?? null
  );
  const daysForPayment = calcDaysForPayment(
    data.prlDate ?? null,
    data.paymentDoneDate ?? null
  );
  const noOfDays = calcNoOfDays(data.sourceDate ?? null);
  const pendingDays = calcPendingDays(data.pendingFrom ?? null);

  // Derive stage from actual data (use existingStage to preserve CANCELLED)
  const derivedStage = deriveCurrentStage({
    currentStage: data.existingStage ?? data.currentStage ?? "CS",
    csStatus: data.csStatus,
    comparativeDate: data.comparativeDate,
    prStatus: data.prStatus,
    prDate: data.prDate,
    poStatus: data.poStatus,
    poDate: data.poDate,
    materialDispatchDate: data.materialDispatchDate,
    materialReceivedDate: data.materialReceivedDate,
    workCompletionDate: data.workCompletionDate,
    prlDate: data.prlDate,
    paymentApprovalDate: data.paymentApprovalDate,
    paymentDoneDate: data.paymentDoneDate,
    sourceCancellationDate: data.sourceCancellationDate,
  });

  const slaStatus = calcSLAStatus(derivedStage, pendingDays);

  return { daysForCS, daysForPR, daysForPO, daysForPayment, noOfDays, pendingDays, slaStatus, derivedStage };
}
