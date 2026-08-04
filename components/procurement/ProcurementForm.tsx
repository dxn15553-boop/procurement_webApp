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
  const [handlers, setHandlers] = useState<{id: string, name: string}[]>([]);
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
    if (prDate) setValue("prStatus", "COMPLETED", { shouldDirty: true });
    if (poDate) setValue("poStatus", "COMPLETED", { shouldDirty: true });
    if (paymentDoneDate) setValue("paymentStatus", "COMPLETED", { shouldDirty: true });
  }, [comparativeDate, prDate, poDate, paymentDoneDate, setValue]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Auto-update currentStage based on milestone dates
  useEffect(() => {
    let autoStage = "CS";
    if (sourceCancellationDate) autoStage = "CANCELLED";
    else if (workCompletionDate) autoStage = "COMPLETED";
    else if (materialReceivedDate) autoStage = "WCD";
    else if (materialDispatchDate) autoStage = "MRD";
    else if (paymentDoneDate) autoStage = "MDD";
    else if (paymentApprovalDate) autoStage = "PDD";
    else if (poDate) autoStage = "PAR";
    else if (prDate) autoStage = "PO";
    else if (comparativeDate) autoStage = "PR";

    setValue("currentStage", autoStage, { shouldDirty: true, shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceCancellationDate,
    workCompletionDate,
    materialReceivedDate,
    materialDispatchDate,
    paymentDoneDate,
    paymentApprovalDate,
    poDate,
    prDate,
    comparativeDate,
    setValue,
  ]);

  const onSubmit = async (data: ProcurementInput) => {
    setIsLoading(true);
    
    // Validate Handler Name
    const isValidHandler = handlers.some(
      (h) => h.name.toLowerCase() === data.nameOfHandler.trim().toLowerCase()
    );
    if (!isValidHandler) {
      toast.error("Handler Name not found. Please enter the correct account name.");
      setIsLoading(false);
      return;
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

  const slaStatusColors: Record<string, string> = {
    ON_TRACK: "text-emerald-600 bg-emerald-50",
    AT_RISK: "text-amber-600 bg-amber-50",
    OVERDUE: "text-red-600 bg-red-50",
    COMPLETED: "text-blue-600 bg-blue-50",
  };

  const inputClass = "w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 text-slate-900";
  const labelClass = "block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider";
  const calcClass = "w-full px-4 py-3 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500 cursor-default font-medium";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section: Source Info */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">1</span>
          Source Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Source No *</label>
            <input {...register("sourceNo")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} onInput={(e) => {
              const val = e.currentTarget.value;
              if (/[^0-9]/.test(val)) {
                import("sonner").then(({ toast }) => toast.error("Source No. can only contain numbers"));
                e.currentTarget.value = val.replace(/[^0-9]/g, '');
              }
            }} placeholder="ENTER SOURCE NO..." />
            {errors.sourceNo && <p className="text-xs text-destructive mt-1">{errors.sourceNo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Source Date *</label>
            <input type="date" {...register("sourceDate")} disabled={readOnly || isCancelled} className={inputClass} />
            {errors.sourceDate && <p className="text-xs text-destructive mt-1">{errors.sourceDate.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Department *</label>
            <input type="text" {...register("departmentId")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="Enter department..." onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
            {errors.departmentId && <p className="text-xs text-destructive mt-1">{errors.departmentId.message}</p>}
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Source Description *</label>
            <textarea {...register("sourceDescription")} disabled={readOnly || isCancelled} rows={2} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
            {errors.sourceDescription && <p className="text-xs text-destructive mt-1">{errors.sourceDescription.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Vendor</label>
            <input type="text" {...register("vendorId")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}  placeholder="Enter vendor name..." />
          </div>
        </div>
      </div>

      {/* Section: Comparative Statement */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">2</span>
          Comparative Statement (CS)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Comparative Date</label>
            <input type="date" {...register("comparativeDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Days for CS <span className="text-blue-500">(Auto)</span></label>
            <div className={calcClass}>{calcValues.daysForCS != null ? `${calcValues.daysForCS} days` : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>CS Status</label>
            <input type="text" {...register("csStatus")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="e.g. PENDING, IN PROGRESS" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          </div>
        </div>
      </div>

      {/* Section: PR */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">3</span>
          Purchase Requisition (PR)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <input type="date" {...register("prDate")} disabled={readOnly || isCancelled} className={inputClass} />
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
            <input type="date" {...register("poDate")} disabled={readOnly || isCancelled} className={inputClass} />
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
            <input {...register("prlNo")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}  />
          </div>
          <div>
            <label className={labelClass}>PRL Date</label>
            <input type="date" {...register("prlDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment Approval Date</label>
            <input type="date" {...register("paymentApprovalDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment Done Date</label>
            <input type="date" {...register("paymentDoneDate")} disabled={readOnly || isCancelled} className={inputClass} />
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
            <input type="date" {...register("materialDispatchDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Material Received Date</label>
            <input type="date" {...register("materialReceivedDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Completion Date</label>
            <input type="date" {...register("workCompletionDate")} disabled={readOnly || isCancelled} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Source Cancellation Date</label>
            <input type="date" {...register("sourceCancellationDate")} disabled={readOnly} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Section: Status & Handler */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">6</span>
          Status & Handler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Name of Handler *</label>
            <input type="text" {...register("nameOfHandler")} disabled={readOnly || isCancelled} className={`${inputClass} uppercase`} placeholder="Enter handler name..." onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
            {errors.nameOfHandler && <p className="text-xs text-destructive mt-1">{errors.nameOfHandler.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Current Status by Handler</label>
            <input {...register("currentStatusByHandler")} disabled={readOnly || isCancelled} className={`\${inputClass} uppercase`} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())}  />
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
