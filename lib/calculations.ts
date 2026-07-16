import { differenceInDays, parseISO, isValid } from "date-fns";
import type { CurrentStage, SLAStatus } from "@/types";

// SLA thresholds in days for each stage
export const SLA_THRESHOLDS = {
  CS: 7,
  PR: 14,
  PO: 7,
  PAR: 5,
  PDD: 10,
  MDD: 7,
  MRD: 5,
  WCD: 30,
} as const;

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
  if (currentStage === "CANCELLED") return "COMPLETED";
  if (!pendingDays) return "ON_TRACK";

  const threshold = SLA_THRESHOLDS[currentStage as keyof typeof SLA_THRESHOLDS];
  if (!threshold) return "ON_TRACK";

  const ratio = pendingDays / threshold;
  if (ratio >= 1) return "OVERDUE";
  if (ratio >= 0.75) return "AT_RISK";
  return "ON_TRACK";
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
  const slaStatus = calcSLAStatus(
    data.currentStage ?? "CS",
    pendingDays
  );

  return { daysForCS, daysForPR, daysForPO, daysForPayment, noOfDays, pendingDays, slaStatus };
}
