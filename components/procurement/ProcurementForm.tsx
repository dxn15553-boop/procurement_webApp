"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { procurementSchema, type ProcurementInput } from "@/lib/validations";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateSourceNo, formatDate } from "@/lib/utils";
import { SLA_THRESHOLDS } from "@/lib/calculations";
import { differenceInDays, parseISO } from "date-fns";
import { Save, RefreshCw, AlertCircle } from "lucide-react";

interface Dept { id: string; name: string; }
interface Vendor { id: string; name: string; }

interface ProcurementFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<ProcurementInput>;
  requestId?: string;
  readOnly?: boolean;
}

const STAGES = ["CS", "PR", "PO", "PAR", "PDD", "MDD", "MRD", "WCD", "COMPLETED", "CANCELLED"] as const;
const CS_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const PR_STATUSES = ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"] as const;

export function ProcurementForm({ mode = "create", defaultValues, requestId, readOnly = false }: ProcurementFormProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-calculated display values
  const [calcValues, setCalcValues] = useState({
    daysForCS: null as number | null,
    daysForPR: null as number | null,
    noOfDays: null as number | null,
    pendingDays: null as number | null,
    slaStatus: "ON_TRACK" as string,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProcurementInput>({
    resolver: zodResolver(procurementSchema),
    defaultValues: {
      sourceNo: generateSourceNo(),
      csStatus: "PENDING",
      prStatus: "PENDING",
      currentStage: "CS",
      ...defaultValues,
    },
  });

  const sourceDate = watch("sourceDate");
  const comparativeDate = watch("comparativeDate");
  const prDate = watch("prDate");
  const pendingFrom = watch("pendingFrom");
  const currentStage = watch("currentStage");

  // Fetch departments and vendors
  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
    ]).then(([deptData, vendorData]) => {
      setDepartments(deptData.departments ?? []);
      setVendors(vendorData.vendors ?? []);
    });
  }, []);

  // Auto-calculate fields
  const recalculate = useCallback(() => {
    let daysForCS: number | null = null;
    let daysForPR: number | null = null;
    let noOfDays: number | null = null;
    let pendingDays: number | null = null;

    if (sourceDate && comparativeDate) {
      try {
        daysForCS = Math.max(0, differenceInDays(parseISO(comparativeDate), parseISO(sourceDate)));
      } catch { /* ignore */ }
    }
    if (comparativeDate && prDate) {
      try {
        daysForPR = Math.max(0, differenceInDays(parseISO(prDate), parseISO(comparativeDate)));
      } catch { /* ignore */ }
    }
    if (sourceDate) {
      try {
        noOfDays = Math.max(0, differenceInDays(new Date(), parseISO(sourceDate)));
      } catch { /* ignore */ }
    }
    if (pendingFrom) {
      try {
        pendingDays = Math.max(0, differenceInDays(new Date(), parseISO(pendingFrom)));
      } catch { /* ignore */ }
    }

    // SLA status
    let slaStatus = "ON_TRACK";
    if (currentStage && currentStage !== "COMPLETED" && currentStage !== "CANCELLED") {
      const threshold = SLA_THRESHOLDS[currentStage as keyof typeof SLA_THRESHOLDS];
      if (threshold && pendingDays != null) {
        const ratio = pendingDays / threshold;
        if (ratio >= 1) slaStatus = "OVERDUE";
        else if (ratio >= 0.75) slaStatus = "AT_RISK";
      }
    }

    setCalcValues({ daysForCS, daysForPR, noOfDays, pendingDays, slaStatus });
  }, [sourceDate, comparativeDate, prDate, pendingFrom, currentStage]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const onSubmit = async (data: ProcurementInput) => {
    setIsLoading(true);
    try {
      const url = mode === "edit" ? `/api/requests/${requestId}` : "/api/requests";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message ?? "Failed to save request");
        return;
      }

      toast.success(mode === "edit" ? "Request updated successfully!" : "Request created successfully!");
      router.push(mode === "edit" ? `/manager/requests/${requestId}` : "/team/requests");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const slaStatusColors: Record<string, string> = {
    ON_TRACK: "text-emerald-600 bg-emerald-50",
    AT_RISK: "text-amber-600 bg-amber-50",
    OVERDUE: "text-red-600 bg-red-50",
    COMPLETED: "text-blue-600 bg-blue-50",
  };

  const inputClass = "w-full px-4 py-2 text-sm border border-white/60 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide";
  const calcClass = "w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg bg-muted/30 text-muted-foreground cursor-default";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section: Source Info */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
          Source Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Source No *</label>
            <input {...register("sourceNo")} disabled={readOnly} className={inputClass} />
            {errors.sourceNo && <p className="text-xs text-destructive mt-1">{errors.sourceNo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Source Date *</label>
            <input type="date" {...register("sourceDate")} disabled={readOnly} className={inputClass} />
            {errors.sourceDate && <p className="text-xs text-destructive mt-1">{errors.sourceDate.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Department *</label>
            <select {...register("departmentId")} disabled={readOnly} className={inputClass}>
              <option value="">Select department...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.departmentId && <p className="text-xs text-destructive mt-1">{errors.departmentId.message}</p>}
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Source Description *</label>
            <textarea {...register("sourceDescription")} disabled={readOnly} rows={2} className={inputClass} />
            {errors.sourceDescription && <p className="text-xs text-destructive mt-1">{errors.sourceDescription.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Vendor</label>
            <select {...register("vendorId")} disabled={readOnly} className={inputClass}>
              <option value="">Select vendor...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Comparative Statement */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</span>
          Comparative Statement (CS)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Comparative Date</label>
            <input type="date" {...register("comparativeDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for CS <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForCS != null ? `${calcValues.daysForCS} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>CS Status</label>
            <select {...register("csStatus")} disabled={readOnly} className={inputClass}>
              {CS_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section: PR */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">3</span>
          Purchase Requisition (PR)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>PR Number</label>
            <input {...register("prNumber")} disabled={readOnly} className={inputClass} placeholder="PR-YYYY-XXXX" />
          </div>
          <div>
            <label className={labelClass}>PR Date</label>
            <input type="date" {...register("prDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for PR <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForPR != null ? `${calcValues.daysForPR} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>PR Status</label>
            <select {...register("prStatus")} disabled={readOnly} className={inputClass}>
              {PR_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section: PO & PRL */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">4</span>
          Purchase Order & PRL
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>PO Number</label>
            <input {...register("poNumber")} disabled={readOnly} className={inputClass} placeholder="PO-YYYY-XXXX" />
          </div>
          <div>
            <label className={labelClass}>PO Date</label>
            <input type="date" {...register("poDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PRL No</label>
            <input {...register("prlNo")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PRL Date</label>
            <input type="date" {...register("prlDate")} disabled={readOnly} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Section: Dates */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-bold">5</span>
          Milestone Dates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Material Dispatch Date</label>
            <input type="date" {...register("materialDispatchDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Material Received Date</label>
            <input type="date" {...register("materialReceivedDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Completion Date</label>
            <input type="date" {...register("workCompletionDate")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Source Cancellation Date</label>
            <input type="date" {...register("sourceCancellationDate")} disabled={readOnly} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Section: Status & Handler */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">6</span>
          Status & Handler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Name of Handler *</label>
            <input {...register("nameOfHandler")} disabled={readOnly} className={inputClass} />
            {errors.nameOfHandler && <p className="text-xs text-destructive mt-1">{errors.nameOfHandler.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Current Status by Handler</label>
            <input {...register("currentStatusByHandler")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Current Stage</label>
            <select {...register("currentStage")} disabled={readOnly} className={inputClass}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Pending From</label>
            <input type="date" {...register("pendingFrom")} disabled={readOnly} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pending Days <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.pendingDays != null ? `${calcValues.pendingDays} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>No. of Days <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.noOfDays != null ? `${calcValues.noOfDays} days` : "—"}</div>
          </div>
        </div>
      </div>

      {/* SLA Status Banner */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${slaStatusColors[calcValues.slaStatus] ?? "bg-muted text-muted-foreground"}`}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">SLA Status: {calcValues.slaStatus.replace("_", " ")}</p>
          <p className="text-xs opacity-80">
            {calcValues.slaStatus === "ON_TRACK" && "This request is within acceptable SLA thresholds."}
            {calcValues.slaStatus === "AT_RISK" && "This request is nearing the SLA deadline. Take action soon."}
            {calcValues.slaStatus === "OVERDUE" && "This request has exceeded the SLA deadline."}
            {calcValues.slaStatus === "COMPLETED" && "This request has been completed."}
          </p>
        </div>
      </div>

      {/* Submit */}
      {!readOnly && (
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isLoading ? "Saving..." : mode === "edit" ? "Update Request" : "Submit Request"}
          </button>
        </div>
      )}
    </form>
  );
}
