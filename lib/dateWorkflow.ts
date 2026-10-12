import { format, isValid } from "date-fns";

export interface DateFieldConfig {
  key: string;
  label: string;
  shortLabel: string;
}

export const WORKFLOW_DATE_SEQUENCE: DateFieldConfig[] = [
  { key: "sourceDate", label: "Source Date", shortLabel: "Source" },
  { key: "comparativeDate", label: "Comparative Date (CS Date)", shortLabel: "CS" },
  { key: "prDate", label: "Purchase Requisition Date (PR Date)", shortLabel: "PR" },
  { key: "poDate", label: "Purchase Order Date (PO Date)", shortLabel: "PO" },
  { key: "materialDispatchDate", label: "Material Dispatch Date (MDD)", shortLabel: "MDD" },
  { key: "materialReceivedDate", label: "Material Received Date (MRD)", shortLabel: "MRD" },
  { key: "workCompletionDate", label: "Work Completion Date (WCD)", shortLabel: "WCD" },
  { key: "prlDate", label: "Payment Request Letter Date (PRL)", shortLabel: "PRL" },
  { key: "paymentApprovalDate", label: "Payment Approval Date (PAR)", shortLabel: "PAR" },
  { key: "paymentDoneDate", label: "Payment Done Date (PDD)", shortLabel: "PDD" },
  { key: "sourceCancellationDate", label: "Cancellation Date", shortLabel: "Cancellation" },
];

/**
 * Normalizes any date value (string, Date, number) to midnight local timestamp for calendar-day comparisons.
 * Returns null if the value is missing or invalid.
 */
export function toDateOnlyMs(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Formats any date value into YYYY-MM-DD string for HTML date input attributes.
 */
export function toInputDateStr(val: any): string | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return undefined;
  try {
    return format(d, "yyyy-MM-dd");
  } catch {
    return undefined;
  }
}

/**
 * Formats any date value into readable DD-MM-YYYY format for display messages.
 */
export function toDisplayDateStr(val: any): string {
  if (val === undefined || val === null || val === "") return "";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  try {
    return format(d, "dd-MM-yyyy");
  } catch {
    return String(val);
  }
}

export interface DateValidationError {
  field: string;
  message: string;
  precedingField?: string;
  precedingDate?: string;
}

export interface DateValidationResult {
  isValid: boolean;
  errors: DateValidationError[];
  firstError?: string;
}

/**
 * Comprehensive procurement workflow date validation.
 * Verifies that each entered date respects the sequential order of procurement operations:
 *   Source Date <= CS Date <= PR Date <= PO Date
 *   PO Date <= Material Dispatch Date <= Material Received Date <= Work Completion Date
 *   PO Date <= PRL Date <= Payment Approval Date <= Payment Done Date
 *   Source Date <= Cancellation Date
 */
export function validateWorkflowDates(data: Record<string, any>): DateValidationResult {
  const errors: DateValidationError[] = [];

  const sourceMs = toDateOnlyMs(data.sourceDate);
  const csMs = toDateOnlyMs(data.comparativeDate);
  const prMs = toDateOnlyMs(data.prDate);
  const poMs = toDateOnlyMs(data.poDate);
  const mddMs = toDateOnlyMs(data.materialDispatchDate);
  const mrdMs = toDateOnlyMs(data.materialReceivedDate);
  const wcdMs = toDateOnlyMs(data.workCompletionDate);
  const prlMs = toDateOnlyMs(data.prlDate);
  const parMs = toDateOnlyMs(data.paymentApprovalDate);
  const pddMs = toDateOnlyMs(data.paymentDoneDate);
  const cancelMs = toDateOnlyMs(data.sourceCancellationDate);

  // 1. Comparative Date (CS)
  if (csMs !== null) {
    if (sourceMs !== null && csMs < sourceMs) {
      errors.push({
        field: "comparativeDate",
        message: `CS Date (${toDisplayDateStr(data.comparativeDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 2. PR Date
  if (prMs !== null) {
    if (csMs !== null && prMs < csMs) {
      errors.push({
        field: "prDate",
        message: `PR Date (${toDisplayDateStr(data.prDate)}) cannot be earlier than CS Date (${toDisplayDateStr(data.comparativeDate)}).`,
        precedingField: "comparativeDate",
        precedingDate: toDisplayDateStr(data.comparativeDate),
      });
    } else if (sourceMs !== null && prMs < sourceMs) {
      errors.push({
        field: "prDate",
        message: `PR Date (${toDisplayDateStr(data.prDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 3. PO Date
  if (poMs !== null) {
    if (prMs !== null && poMs < prMs) {
      errors.push({
        field: "poDate",
        message: `PO Date (${toDisplayDateStr(data.poDate)}) cannot be earlier than PR Date (${toDisplayDateStr(data.prDate)}).`,
        precedingField: "prDate",
        precedingDate: toDisplayDateStr(data.prDate),
      });
    } else if (csMs !== null && poMs < csMs) {
      errors.push({
        field: "poDate",
        message: `PO Date (${toDisplayDateStr(data.poDate)}) cannot be earlier than CS Date (${toDisplayDateStr(data.comparativeDate)}).`,
        precedingField: "comparativeDate",
        precedingDate: toDisplayDateStr(data.comparativeDate),
      });
    } else if (sourceMs !== null && poMs < sourceMs) {
      errors.push({
        field: "poDate",
        message: `PO Date (${toDisplayDateStr(data.poDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 4. Material Dispatch Date (MDD)
  if (mddMs !== null) {
    if (poMs !== null && mddMs < poMs) {
      errors.push({
        field: "materialDispatchDate",
        message: `Material Dispatch Date (${toDisplayDateStr(data.materialDispatchDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && mddMs < sourceMs) {
      errors.push({
        field: "materialDispatchDate",
        message: `Material Dispatch Date (${toDisplayDateStr(data.materialDispatchDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 5. Material Received Date (MRD)
  if (mrdMs !== null) {
    if (mddMs !== null && mrdMs < mddMs) {
      errors.push({
        field: "materialReceivedDate",
        message: `Material Received Date (${toDisplayDateStr(data.materialReceivedDate)}) cannot be earlier than Material Dispatch Date (${toDisplayDateStr(data.materialDispatchDate)}).`,
        precedingField: "materialDispatchDate",
        precedingDate: toDisplayDateStr(data.materialDispatchDate),
      });
    } else if (poMs !== null && mrdMs < poMs) {
      errors.push({
        field: "materialReceivedDate",
        message: `Material Received Date (${toDisplayDateStr(data.materialReceivedDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && mrdMs < sourceMs) {
      errors.push({
        field: "materialReceivedDate",
        message: `Material Received Date (${toDisplayDateStr(data.materialReceivedDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 6. Work Completion Date (WCD)
  if (wcdMs !== null) {
    if (mrdMs !== null && wcdMs < mrdMs) {
      errors.push({
        field: "workCompletionDate",
        message: `Work Completion Date (${toDisplayDateStr(data.workCompletionDate)}) cannot be earlier than Material Received Date (${toDisplayDateStr(data.materialReceivedDate)}).`,
        precedingField: "materialReceivedDate",
        precedingDate: toDisplayDateStr(data.materialReceivedDate),
      });
    } else if (mddMs !== null && wcdMs < mddMs) {
      errors.push({
        field: "workCompletionDate",
        message: `Work Completion Date (${toDisplayDateStr(data.workCompletionDate)}) cannot be earlier than Material Dispatch Date (${toDisplayDateStr(data.materialDispatchDate)}).`,
        precedingField: "materialDispatchDate",
        precedingDate: toDisplayDateStr(data.materialDispatchDate),
      });
    } else if (poMs !== null && wcdMs < poMs) {
      errors.push({
        field: "workCompletionDate",
        message: `Work Completion Date (${toDisplayDateStr(data.workCompletionDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && wcdMs < sourceMs) {
      errors.push({
        field: "workCompletionDate",
        message: `Work Completion Date (${toDisplayDateStr(data.workCompletionDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 7. Payment Request Letter Date (PRL)
  if (prlMs !== null) {
    if (poMs !== null && prlMs < poMs) {
      errors.push({
        field: "prlDate",
        message: `PRL Date (${toDisplayDateStr(data.prlDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && prlMs < sourceMs) {
      errors.push({
        field: "prlDate",
        message: `PRL Date (${toDisplayDateStr(data.prlDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 8. Payment Approval Date (PAR)
  if (parMs !== null) {
    if (prlMs !== null && parMs < prlMs) {
      errors.push({
        field: "paymentApprovalDate",
        message: `Payment Approval Date (${toDisplayDateStr(data.paymentApprovalDate)}) cannot be earlier than PRL Date (${toDisplayDateStr(data.prlDate)}).`,
        precedingField: "prlDate",
        precedingDate: toDisplayDateStr(data.prlDate),
      });
    } else if (poMs !== null && parMs < poMs) {
      errors.push({
        field: "paymentApprovalDate",
        message: `Payment Approval Date (${toDisplayDateStr(data.paymentApprovalDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && parMs < sourceMs) {
      errors.push({
        field: "paymentApprovalDate",
        message: `Payment Approval Date (${toDisplayDateStr(data.paymentApprovalDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 9. Payment Done Date (PDD)
  if (pddMs !== null) {
    if (parMs !== null && pddMs < parMs) {
      errors.push({
        field: "paymentDoneDate",
        message: `Payment Done Date (${toDisplayDateStr(data.paymentDoneDate)}) cannot be earlier than Payment Approval Date (${toDisplayDateStr(data.paymentApprovalDate)}).`,
        precedingField: "paymentApprovalDate",
        precedingDate: toDisplayDateStr(data.paymentApprovalDate),
      });
    } else if (prlMs !== null && pddMs < prlMs) {
      errors.push({
        field: "paymentDoneDate",
        message: `Payment Done Date (${toDisplayDateStr(data.paymentDoneDate)}) cannot be earlier than PRL Date (${toDisplayDateStr(data.prlDate)}).`,
        precedingField: "prlDate",
        precedingDate: toDisplayDateStr(data.prlDate),
      });
    } else if (poMs !== null && pddMs < poMs) {
      errors.push({
        field: "paymentDoneDate",
        message: `Payment Done Date (${toDisplayDateStr(data.paymentDoneDate)}) cannot be earlier than PO Date (${toDisplayDateStr(data.poDate)}).`,
        precedingField: "poDate",
        precedingDate: toDisplayDateStr(data.poDate),
      });
    } else if (sourceMs !== null && pddMs < sourceMs) {
      errors.push({
        field: "paymentDoneDate",
        message: `Payment Done Date (${toDisplayDateStr(data.paymentDoneDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 10. Cancellation Date
  if (cancelMs !== null) {
    if (sourceMs !== null && cancelMs < sourceMs) {
      errors.push({
        field: "sourceCancellationDate",
        message: `Cancellation Date (${toDisplayDateStr(data.sourceCancellationDate)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
  }

  // 11. Pending From Date
  const pendingMs = toDateOnlyMs(data.pendingFrom);
  const todayMs = toDateOnlyMs(new Date());
  if (pendingMs !== null) {
    if (sourceMs !== null && pendingMs < sourceMs) {
      errors.push({
        field: "pendingFrom",
        message: `Pending From Date (${toDisplayDateStr(data.pendingFrom)}) cannot be earlier than Source Date (${toDisplayDateStr(data.sourceDate)}).`,
        precedingField: "sourceDate",
        precedingDate: toDisplayDateStr(data.sourceDate),
      });
    }
    if (todayMs !== null && pendingMs > todayMs) {
      errors.push({
        field: "pendingFrom",
        message: `Pending From Date (${toDisplayDateStr(data.pendingFrom)}) cannot be in the future.`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    firstError: errors.length > 0 ? errors[0].message : undefined,
  };
}

/**
 * Returns the minimum valid date string (YYYY-MM-DD) for a given date field
 * based on preceding dates that have been filled in.
 */
export function getWorkflowDateMinBound(data: Record<string, any>, field: string): string | undefined {
  switch (field) {
    case "comparativeDate":
      return toInputDateStr(data.sourceDate);

    case "prDate":
      return toInputDateStr(data.comparativeDate || data.sourceDate);

    case "poDate":
      return toInputDateStr(data.prDate || data.comparativeDate || data.sourceDate);

    case "materialDispatchDate":
      return toInputDateStr(data.poDate || data.sourceDate);

    case "materialReceivedDate":
      return toInputDateStr(data.materialDispatchDate || data.poDate || data.sourceDate);

    case "workCompletionDate":
      return toInputDateStr(data.materialReceivedDate || data.materialDispatchDate || data.poDate || data.sourceDate);

    case "prlDate":
      return toInputDateStr(data.poDate || data.sourceDate);

    case "paymentApprovalDate":
      return toInputDateStr(data.prlDate || data.poDate || data.sourceDate);

    case "paymentDoneDate":
      return toInputDateStr(data.paymentApprovalDate || data.prlDate || data.poDate || data.sourceDate);

    case "sourceCancellationDate":
      return toInputDateStr(data.sourceDate);

    case "pendingFrom":
      return toInputDateStr(data.sourceDate);

    default:
      return undefined;
  }
}

/**
 * Returns the maximum valid date string (YYYY-MM-DD) for a given date field
 * based on subsequent dates that have already been entered.
 */
export function getWorkflowDateMaxBound(data: Record<string, any>, field: string): string | undefined {
  switch (field) {
    case "comparativeDate":
      return toInputDateStr(data.prDate || data.poDate || data.materialDispatchDate || data.materialReceivedDate || data.workCompletionDate || data.prlDate || data.paymentApprovalDate || data.paymentDoneDate);

    case "prDate":
      return toInputDateStr(data.poDate || data.materialDispatchDate || data.materialReceivedDate || data.workCompletionDate || data.prlDate || data.paymentApprovalDate || data.paymentDoneDate);

    case "poDate":
      return toInputDateStr(data.materialDispatchDate || data.materialReceivedDate || data.workCompletionDate || data.prlDate || data.paymentApprovalDate || data.paymentDoneDate);

    case "materialDispatchDate":
      return toInputDateStr(data.materialReceivedDate || data.workCompletionDate);

    case "materialReceivedDate":
      return toInputDateStr(data.workCompletionDate);

    case "prlDate":
      return toInputDateStr(data.paymentApprovalDate || data.paymentDoneDate);

    case "paymentApprovalDate":
      return toInputDateStr(data.paymentDoneDate);

    case "pendingFrom":
      return toInputDateStr(new Date());

    default:
      return undefined;
  }
}

/**
 * Automatically derives the expected Pending From date based on the active workflow stage.
 * In a healthy workflow, each stage starts pending from the completion date of the previous milestone.
 */
export function deriveStagePendingFrom(data: Record<string, any>): string | undefined {
  if (data.sourceCancellationDate || data.paymentDoneDate) {
    return undefined; // Completed or Cancelled requests do not have pending stage
  }
  if (data.paymentApprovalDate) return toInputDateStr(data.paymentApprovalDate);
  if (data.prlDate) return toInputDateStr(data.prlDate);
  if (data.workCompletionDate) return toInputDateStr(data.workCompletionDate);
  if (data.materialReceivedDate) return toInputDateStr(data.materialReceivedDate);
  if (data.materialDispatchDate) return toInputDateStr(data.materialDispatchDate);
  if (data.poDate) return toInputDateStr(data.poDate);
  if (data.prDate) return toInputDateStr(data.prDate);
  if (data.comparativeDate) return toInputDateStr(data.comparativeDate);
  return toInputDateStr(data.sourceDate) || toInputDateStr(new Date());
}

/**
 * Helper to sanitize dates during bulk import.
 * If imported records have slight timestamp inversions due to export/import formatting,
 * normalizes them sequentially so workflow integrity is maintained.
 */
export function sanitizeImportDates(data: Record<string, any>): {
  sanitized: Record<string, any>;
  warnings: string[];
} {
  const sanitized = { ...data };
  const warnings: string[] = [];

  const sourceMs = toDateOnlyMs(sanitized.sourceDate);

  const clampForward = (currentField: string, prevField: string, currentVal: any, prevVal: any, label: string) => {
    const curMs = toDateOnlyMs(currentVal);
    const prevMs = toDateOnlyMs(prevVal);
    if (curMs !== null && prevMs !== null && curMs < prevMs) {
      warnings.push(`${label} was earlier than ${prevField}; adjusted to match.`);
      sanitized[currentField] = prevVal;
    }
  };

  if (sanitized.comparativeDate && sourceMs !== null) {
    clampForward("comparativeDate", "Source Date", sanitized.comparativeDate, sanitized.sourceDate, "Comparative Date");
  }

  if (sanitized.prDate) {
    const prev = sanitized.comparativeDate || sanitized.sourceDate;
    if (prev) clampForward("prDate", sanitized.comparativeDate ? "CS Date" : "Source Date", sanitized.prDate, prev, "PR Date");
  }

  if (sanitized.poDate) {
    const prev = sanitized.prDate || sanitized.comparativeDate || sanitized.sourceDate;
    if (prev) clampForward("poDate", sanitized.prDate ? "PR Date" : "Source Date", sanitized.poDate, prev, "PO Date");
  }

  if (sanitized.materialDispatchDate) {
    const prev = sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("materialDispatchDate", "PO Date", sanitized.materialDispatchDate, prev, "Material Dispatch Date");
  }

  if (sanitized.materialReceivedDate) {
    const prev = sanitized.materialDispatchDate || sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("materialReceivedDate", sanitized.materialDispatchDate ? "Material Dispatch Date" : "PO Date", sanitized.materialReceivedDate, prev, "Material Received Date");
  }

  if (sanitized.workCompletionDate) {
    const prev = sanitized.materialReceivedDate || sanitized.materialDispatchDate || sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("workCompletionDate", "Material Received Date", sanitized.workCompletionDate, prev, "Work Completion Date");
  }

  if (sanitized.prlDate) {
    const prev = sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("prlDate", "PO Date", sanitized.prlDate, prev, "PRL Date");
  }

  if (sanitized.paymentApprovalDate) {
    const prev = sanitized.prlDate || sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("paymentApprovalDate", sanitized.prlDate ? "PRL Date" : "PO Date", sanitized.paymentApprovalDate, prev, "Payment Approval Date");
  }

  if (sanitized.paymentDoneDate) {
    const prev = sanitized.paymentApprovalDate || sanitized.prlDate || sanitized.poDate || sanitized.sourceDate;
    if (prev) clampForward("paymentDoneDate", sanitized.paymentApprovalDate ? "Payment Approval Date" : "PRL Date", sanitized.paymentDoneDate, prev, "Payment Done Date");
  }

  if (sanitized.sourceCancellationDate && sourceMs !== null) {
    clampForward("sourceCancellationDate", "Source Date", sanitized.sourceCancellationDate, sanitized.sourceDate, "Cancellation Date");
  }

  return { sanitized, warnings };
}
