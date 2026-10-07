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
import { Save, RefreshCw, AlertCircle, Sparkles, Loader2 } from "lucide-react";

interface Dept { id: string; name: string; }
interface Vendor { id: string; name: string; }

interface ProcurementFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<ProcurementInput>;
  requestId?: string;
  readOnly?: boolean;
}

const STAGES = ["CS", "PR", "PO", "MDD", "MRD", "WCD", "PRL", "PAR", "PDD", "COMPLETED", "CANCELLED"] as const;
const CS_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const PR_STATUSES = ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"] as const;

export function ProcurementForm({ mode = "create", defaultValues, requestId, readOnly = false }: ProcurementFormProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [handlers, setHandlers] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-calculated display values
  const [calcValues, setCalcValues] = useState({
    daysForCS: null as number | null,
    daysForPR: null as number | null,
    daysForPO: null as number | null,
    daysForPayment: null as number | null,
    noOfDays: null as number | null,
    pendingDays: null as number | null,
    slaStatus: "ON_TRACK" as string,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors, isDirty },
  } = useForm<ProcurementInput>({
    resolver: zodResolver(procurementSchema),
    defaultValues: {
      sourceNo: "",
      csStatus: "PENDING",
      prStatus: "PENDING",
      poStatus: "PENDING",
      paymentStatus: "PENDING",
      currentStage: "CS",
      ...defaultValues,
    },
  });

  const allValues = watch();
  const watchedSourceNo = watch("sourceNo");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Check duplicate Source No in real-time
  const checkDuplicateSourceNo = useCallback(async (sourceNoToCheck: string): Promise<boolean> => {
    const cleanNo = (sourceNoToCheck || "").trim();
    if (!cleanNo) {
      setDuplicateError(null);
      return false;
    }

    try {
      setIsCheckingDuplicate(true);
      const res = await fetch(`/api/requests/check-duplicate?sourceNo=${encodeURIComponent(cleanNo)}&excludeId=${requestId || ""}`);
      const data = await res.json();
      if (data.exists) {
        setDuplicateError(data.message || `Source No "${cleanNo}" is already in use. Duplicate numbers are not accepted.`);
        return true;
      } else {
        setDuplicateError(null);
        return false;
      }
    } catch {
      return false;
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [requestId]);

  // Debounced check as user types sourceNo
  useEffect(() => {
    if (!watchedSourceNo || !watchedSourceNo.trim()) {
      setDuplicateError(null);
      return;
    }
    const timer = setTimeout(() => {
      checkDuplicateSourceNo(watchedSourceNo);
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedSourceNo, checkDuplicateSourceNo]);

  // Load Draft from LocalStorage on mount
  useEffect(() => {
    if (mode === "create") {
      const draft = localStorage.getItem("procurementFormDraft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          Object.keys(parsed).forEach((key) => {
            // Never restore sourceNo from draft so it's always blank by default on new requests
            if (key === "sourceNo") return;

            if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== "") {
              setValue(key as keyof ProcurementInput, parsed[key], { shouldValidate: false, shouldDirty: true });
            }
          });
          toast.info("Draft restored", {
            description: "Your previous unsubmitted changes have been loaded.",
            icon: <RefreshCw className="w-4 h-4" />
          });
        } catch { /* ignore parsing errors */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, setValue]);

  // Save Draft to LocalStorage when form values change
  useEffect(() => {
    if (mode === "create" && isDirty) {
      const handler = setTimeout(() => {
        localStorage.setItem("procurementFormDraft", JSON.stringify(allValues));
      }, 1500); // 1.5s debounce
      return () => clearTimeout(handler);
    }
  }, [allValues, mode, isDirty]);

  const sourceDate = watch("sourceDate");
  const comparativeDate = watch("comparativeDate");
  const prDate = watch("prDate");
  const poDate = watch("poDate");
  const prlDate = watch("prlDate");
  const paymentApprovalDate = watch("paymentApprovalDate");
  const paymentDoneDate = watch("paymentDoneDate");
  const materialDispatchDate = watch("materialDispatchDate");
  const materialReceivedDate = watch("materialReceivedDate");
  const workCompletionDate = watch("workCompletionDate");
  const sourceCancellationDate = watch("sourceCancellationDate");
  const pendingFrom = watch("pendingFrom");
  const currentStage = watch("currentStage");
  const isCancelled = currentStage === "CANCELLED" || !!sourceCancellationDate;
  const effectiveReadOnly = readOnly || isCancelled;

  // Fetch departments and vendors
  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([deptData, vendorData, userData]) => {
      setDepartments(deptData.departments ?? []);
      setVendors(vendorData.vendors ?? []);
      setHandlers(userData.users ?? []);
    });
  }, []);

  // Auto-calculate fields
  const recalculate = useCallback(() => {
    let daysForCS: number | null = null;
    let daysForPR: number | null = null;
    let daysForPO: number | null = null;
    let daysForPayment: number | null = null;
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
    if (prDate && poDate) {
      try {
        daysForPO = Math.max(0, differenceInDays(parseISO(poDate), parseISO(prDate)));
      } catch { /* ignore */ }
    }
    if (prlDate && paymentDoneDate) {
      try {
        daysForPayment = Math.max(0, differenceInDays(parseISO(paymentDoneDate), parseISO(prlDate)));
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

    setCalcValues({ daysForCS, daysForPR, daysForPO, daysForPayment, noOfDays, pendingDays, slaStatus });
  }, [sourceDate, comparativeDate, prDate, poDate, prlDate, paymentDoneDate, pendingFrom, currentStage]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Auto-update statuses based on dates
  useEffect(() => {
    if (comparativeDate) setValue("csStatus", "COMPLETED", { shouldDirty: true });
    if (prDate || watch("prNumber")) setValue("prStatus", "APPROVED", { shouldDirty: true });
    if (poDate || watch("poNumber")) setValue("poStatus", "COMPLETED", { shouldDirty: true });
    if (paymentDoneDate) setValue("paymentStatus", "COMPLETED", { shouldDirty: true });
  }, [comparativeDate, prDate, poDate, paymentDoneDate, setValue]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Auto-update currentStage based on milestone dates in the correct order:
  // CS → PR → PO → MDD → MRD → WCD → PRL → PAR → PDD → COMPLETED
  useEffect(() => {
    let autoStage = "CS";
    if (sourceCancellationDate) autoStage = "CANCELLED";
    else if (paymentDoneDate) autoStage = "COMPLETED";
    else if (paymentApprovalDate) autoStage = "PDD";
    else if (prlDate) autoStage = "PAR";
    else if (workCompletionDate) autoStage = "PRL";
    else if (materialReceivedDate) autoStage = "WCD";
    else if (materialDispatchDate) autoStage = "MRD";
    else if (poDate) autoStage = "MDD";
    else if (prDate) autoStage = "PO";
    else if (comparativeDate) autoStage = "PR";

    if (autoStage !== currentStage) {
      setValue("currentStage", autoStage, { shouldDirty: true, shouldValidate: true });
      setValue("pendingFrom", new Date().toISOString().split("T")[0], { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceCancellationDate,
    paymentDoneDate,
    paymentApprovalDate,
    prlDate,
    workCompletionDate,
    materialReceivedDate,
    materialDispatchDate,
    poDate,
    prDate,
    comparativeDate,
    setValue,
  ]);

  const onSubmit = async (data: ProcurementInput) => {
    setIsLoading(true);

    // Validate Duplicate Source No
    const isDup = await checkDuplicateSourceNo(data.sourceNo);
    if (isDup) {
      toast.error("Duplicate Source Number Detected", {
        description: `Source No "${data.sourceNo}" already exists in the system. Duplicate source numbers are not accepted.`,
        icon: <AlertCircle className="w-4 h-4 text-red-500" />
      });
      setIsLoading(false);
      return;
    }

    // Validate Handler
    if (!data.handlerId) {
      toast.error("Please select a handler.");
      setIsLoading(false);
      return;
    }
    const selectedHandler = handlers.find(h => h.id === data.handlerId);
    if (selectedHandler) {
      data.nameOfHandler = selectedHandler.name; // Keep backward compatibility
    }

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
        toast.error("Failed to save request", {
          description: err.error?.message ?? "Please verify your input and try again.",
          icon: <AlertCircle className="w-4 h-4" />
        });
        return;
      }

      if (mode === "create") {
        localStorage.removeItem("procurementFormDraft");
      }

      toast.success(
        mode === "edit" ? "Request Updated" : "Request Created",
        {
          description: `Source No ${data.sourceNo} was saved successfully!`,
          icon: <Save className="w-4 h-4" />
        }
      );
      router.push(mode === "edit" ? `/manager/requests/${requestId}` : "/team/requests");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const [isFetchingSource, setIsFetchingSource] = useState(false);

  const handleFetchSource = async (customNo?: string) => {
    const rawNo = customNo || watch("sourceNo");
    if (!rawNo || !rawNo.trim()) {
      toast.error("Please enter a Source No first (e.g. SRC-2026-0004 or 0004)");
      return;
    }

    setIsFetchingSource(true);
    try {
      const res = await fetch(`/api/source-lookup/${encodeURIComponent(rawNo.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        toast.error(data.message || `No Source Request found matching "${rawNo}".`);
        return;
      }

      setValue("sourceNo", data.sourceNo, { shouldValidate: true, shouldDirty: true });
      if (data.sourceDate) {
        setValue("sourceDate", data.sourceDate, { shouldValidate: true, shouldDirty: true });
      }
      if (data.departmentId) {
        setValue("departmentId", data.departmentId, { shouldValidate: true, shouldDirty: true });
      }
      if (data.handlerId) {
        setValue("handlerId", data.handlerId, { shouldValidate: true, shouldDirty: true });
      }
      if (data.handlerName) {
        setValue("nameOfHandler", data.handlerName, { shouldValidate: true, shouldDirty: true });
      }
      if (data.sourceDescription) {
        setValue("sourceDescription", data.sourceDescription, { shouldValidate: true, shouldDirty: true });
      }

      // Check if this source request already exists in Procurement
      const isDup = await checkDuplicateSourceNo(data.sourceNo);
      if (isDup && mode === "create") {
        toast.warning(`Source Request "${data.sourceNo}" already exists in Procurement! Duplicate entries cannot be created.`);
      } else {
        toast.success(`Source details for ${data.sourceNo} loaded!`, {
          description: `Department: ${data.departmentName || 'Identified'} | Handler: ${data.handlerName || 'Assigned'}`
        });
      }
    } catch {
      toast.error("Failed to connect to Source database.");
    } finally {
      setIsFetchingSource(false);
    }
  };

  const slaStatusColors: Record<string, string> = {
    ON_TRACK: "text-emerald-600 bg-emerald-50",
    AT_RISK: "text-amber-600 bg-amber-50",
    OVERDUE: "text-red-600 bg-red-50",
    COMPLETED: "text-blue-600 bg-blue-50",
  };

  const inputClass = "w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 text-slate-900";
  const labelClass = "block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider";
  const calcClass = "w-full px-4 py-3 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500 cursor-default font-medium";

  const onSubmitError = (errors: any) => {
    const firstError = Object.values(errors)[0] as any;
    toast.error(firstError?.message || "Please fix form errors before saving.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onSubmitError)} className="space-y-6">
      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-900">Procurement Request Cancelled</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              This request was marked as cancelled. Further stage advancement and operational updates are locked.
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={effectiveReadOnly} className="space-y-6 border-0 p-0 m-0 min-w-0">
        {/* Section: Source Info */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">1</span>
          Source Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Source No *</label>
              <button
                type="button"
                onClick={() => handleFetchSource()}
                disabled={isFetchingSource || readOnly}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                title="Fetch details from Source App database"
              >
                {isFetchingSource ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-indigo-500" />}
                <span>{isFetchingSource ? "Fetching..." : "Fetch Source Info"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                {...register("sourceNo")}
                onBlur={(e) => {
                  checkDuplicateSourceNo(e.target.value);
                }}
                disabled={readOnly || isCancelled}
                className={`${inputClass} uppercase pr-20 ${duplicateError ? "border-red-500 ring-2 ring-red-500/20" : ""}`}
                placeholder="E.G. SRC-2026-0004..."
              />
              <button
                type="button"
                onClick={() => handleFetchSource()}
                disabled={isFetchingSource || readOnly}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all border border-indigo-200/60 disabled:opacity-50 cursor-pointer"
              >
                {isFetchingSource ? "..." : "Fetch"}
              </button>
            </div>
            {duplicateError && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{duplicateError}</span>
              </div>
            )}
            {errors.sourceNo && !duplicateError && <p className="text-xs text-destructive mt-1">{errors.sourceNo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Source Date</label>
            <input type="date" {...register("sourceDate")} disabled={readOnly || isCancelled} className={inputClass} />
            {errors.sourceDate && <p className="text-xs text-destructive mt-1">{errors.sourceDate.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Department *</label>
            <select {...register("departmentId")} disabled={readOnly || isCancelled} className={inputClass}>
              <option value="">select department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              )
              )}

            </select>
            {errors.departmentId && <p className="text-xs text-destructive mt-1"> {errors.departmentId.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Handler *</label>
            <select
              {...register("handlerId")}
              disabled={readOnly || isCancelled}
              className={inputClass}
            >
              <option value="">Select handler...</option>
              {handlers.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {errors.handlerId && <p className="text-xs text-destructive mt-1">{errors.handlerId.message}</p>}
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <label className={labelClass}>Source Description *</label>
            <textarea {...register("sourceDescription")} disabled={readOnly || isCancelled} rows={2} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
            {errors.sourceDescription && <p className="text-xs text-destructive mt-1">{errors.sourceDescription.message}</p>}
          </div>
        </div>
      </div>

      {/* Section: Comparative Statement */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">2</span>
          Comparative Statement (CS)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <label className={labelClass}>Comparative Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("comparativeDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for CS <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForCS != null ? `${calcValues.daysForCS} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>CS Status</label>
            <input type="text" {...register("csStatus")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="e.g. PENDING, IN PROGRESS" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
          <div>
            <label className={labelClass}>Vendor Name</label>
            <input
              type="text"
              {...register("vendorId")}
              disabled={readOnly || isCancelled}
              className={`${inputClass} uppercase`}
              onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}
              placeholder="ENTER VENDOR NAME..."
            />
            {errors.vendorId && <p className="text-xs text-destructive mt-1">{errors.vendorId.message}</p>}
          </div>
        </div>
      </div>

      {/* Section: PR */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">3</span>
          Purchase Requisition (PR)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>PR Number</label>
            <input
              {...register("prNumber")}
              disabled={readOnly || isCancelled}
              className={`${inputClass} uppercase ${errors.prNumber ? "border-red-500" : ""}`}
              onInput={(e) => {
                let val = e.currentTarget.value.toUpperCase();
                let cleanVal = "";
                for (let i = 0; i < val.length; i++) {
                  if (i < 3) {
                    if (/[A-Z]/.test(val[i])) cleanVal += val[i];
                  } else if (i < 11) {
                    if (/[0-9]/.test(val[i])) cleanVal += val[i];
                  }
                }
                e.currentTarget.value = cleanVal;
                setValue("prNumber", cleanVal);
                trigger("prNumber");
              }}
              placeholder="PIF26070088"
            />
            {errors.prNumber && <p className="text-red-500 text-xs mt-1">{errors.prNumber.message}</p>}
          </div>
          <div>
            <label className={labelClass}>PR Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("prDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for PR <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForPR != null ? `${calcValues.daysForPR} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>PR Status</label>
            <input type="text" {...register("prStatus")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="e.g. PENDING, IN PROGRESS" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* Section: PO */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">4A</span>
          Purchase Order (PO)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>PO Number</label>
            <input
              {...register("poNumber")}
              disabled={readOnly || isCancelled}
              className={`${inputClass} uppercase ${errors.poNumber ? "border-red-500" : ""}`}
              onInput={(e) => {
                let val = e.currentTarget.value.toUpperCase();
                let cleanVal = "";
                for (let i = 0; i < val.length; i++) {
                  if (i < 2) {
                    if (/[A-Z]/.test(val[i])) cleanVal += val[i];
                  } else if (i < 10) {
                    if (/[0-9]/.test(val[i])) cleanVal += val[i];
                  }
                }
                e.currentTarget.value = cleanVal;
                setValue("poNumber", cleanVal);
                trigger("poNumber");
              }}
              placeholder="DF26040022"
            />
            {errors.poNumber && <p className="text-red-500 text-xs mt-1">{errors.poNumber.message}</p>}
          </div>
          <div>
            <label className={labelClass}>PO Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("poDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for PO <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForPO != null ? `${calcValues.daysForPO} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>PO Status</label>
            <input type="text" {...register("poStatus")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="e.g. PENDING, IN PROGRESS" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* Section: PRL */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">4B</span>
          Payment Release (PRL)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>PRL No</label>
            <input {...register("prlNo")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
          <div>
            <label className={labelClass}>PRL Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("prlDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment Approval Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("paymentApprovalDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment Done Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("paymentDoneDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for Payment <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForPayment != null ? `${calcValues.daysForPayment} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>Payment Status</label>
            <input type="text" {...register("paymentStatus")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="e.g. PENDING, IN PROGRESS" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* Section: Dates */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">5</span>
          Milestone Dates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Material Dispatch Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("materialDispatchDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Material Received Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("materialReceivedDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Completion Date</label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("workCompletionDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Source Cancellation Date
              <span className="text-rose-500 font-bold ml-1 text-[11px]">(⚠️ Cancels Request)</span>
            </label>
            <input type="date" min={watch("sourceDate") || undefined} {...register("sourceCancellationDate")} disabled={readOnly} className={`${inputClass} ${watch("sourceCancellationDate") ? "border-rose-400 bg-rose-50/50" : ""}`} title="Only set if source request was cancelled" />
          </div>
        </div>
      </div>

      {/* Section: Status Information */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">6</span>
          Status Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Current Status by Handler</label>
            <input {...register("currentStatusByHandler")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
          <div>
            <label className={labelClass}>Current Stage</label>
            <input type="text" {...register("currentStage")} disabled={readOnly} className={`${inputClass} uppercase`} placeholder="e.g. CS, PR, PO" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
          <div>
            <label className={labelClass}>Pending From</label>
            <input type="date" {...register("pendingFrom")} disabled={readOnly || isCancelled} className={inputClass} />
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

      </fieldset>

      {/* Submit */}
      {!effectiveReadOnly ? (
        <div className="flex items-center gap-3 justify-end">
          {mode === "create" && (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("procurementFormDraft");
                window.location.reload();
              }}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Clear Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !!duplicateError || isCheckingDuplicate}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 cursor-pointer"
            title={duplicateError ? duplicateError : undefined}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isLoading ? "Saving..." : mode === "edit" ? "Update Request" : "Submit Request"}
          </button>
        </div>
      ) : isCancelled ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
          <span className="text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            Request Cancelled — Modifications are disabled.
          </span>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700 font-semibold cursor-pointer"
          >
            Back
          </button>
        </div>
      ) : null}
    </form>
  );
}
