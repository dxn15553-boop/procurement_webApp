"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Save, RefreshCw, Trash2, ArrowRight, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, FileText } from "lucide-react";
import { generateSourceNo, formatDate } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import { SLA_THRESHOLDS } from "@/lib/calculations";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { exportUniformCsv, exportUniformExcel, generateImportTemplate } from "@/lib/exportHelper";

interface RowData {
  id: string; // "new-xxx" or real database id
  isNew?: boolean;
  isDirty?: boolean;
  createdAt?: string;
  sourceNo: string;
  sourceDate: string;
  sourceDescription: string;
  departmentName: string; // Enter department name as plain text
  vendorName: string; // Enter vendor name as plain text
  comparativeDate: string;
  daysForCS: number | null;
  csStatus: string;
  prNumber: string;
  prDate: string;
  daysForPR: number | null;
  prStatus: string;
  poNumber: string;
  poDate: string;
  poStatus: string;
  daysForPO: number | null;
  prlNo: string;
  prlDate: string;
  paymentStatus: string;
  daysForPayment: number | null;
  materialDispatchDate: string;
  materialReceivedDate: string;
  workCompletionDate: string;
  sourceCancellationDate: string;
  paymentApprovalDate: string;
  paymentDoneDate: string;
  currentStatusByHandler: string;
  nameOfHandler: string;
  noOfDays: number | null;
  currentStage: string;
  pendingFrom: string;
  pendingDays: number | null;
  slaStatus: string;
  slaCS: number;
  slaPR: number;
  slaPO: number;
  slaPAR: number;
  slaPDD: number;
  slaMDD: number;
  slaMRD: number;
  slaWCD: number;
  createdBy?: { id: string; name: string } | null;
}

interface Props {
  session: {
    user: {
      id: string;
      name?: string | null;
      role: string;
    };
  };
}

export function ProcurementSpreadsheet({ session }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(pageParam);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Manager Sheet selection state
  const [activeTab, setActiveTab] = useState<string>("All");
  const [handlers, setHandlers] = useState<{id: string, name: string, requestCount?: number}[]>([]);

  const isManager = session.user.role === "MANAGER";
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTable = (offset: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Fetch initial user requests
  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    
    fetch("/api/users")
      .then((r) => r.json())
      .then((u) => setHandlers(u.users ?? []))
      .catch(() => {});

    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (activeTab && activeTab !== "All") qs.set("employee", activeTab);
    qs.set("page", page.toString());
    qs.set("limit", limit.toString());
    qs.set("_t", Date.now().toString());

    fetch(`/api/requests?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((reqData) => {
        setTotalPages(reqData.pagination?.pages || 1);
        const initialRows = (reqData.requests ?? []).map((r: any) => ({
          id: r.id,
          createdAt: r.createdAt ? r.createdAt : "",
          sourceNo: r.sourceNo,
          sourceDate: r.sourceDate ? r.sourceDate.split("T")[0] : "",
          sourceDescription: r.sourceDescription ?? "",
          departmentName: r.department?.name ?? "",
          vendorName: r.vendor?.name ?? "",
          comparativeDate: r.comparativeDate ? r.comparativeDate.split("T")[0] : "",
          daysForCS: r.daysForCS ?? null,
          csStatus: r.csStatus ?? "PENDING",
          prNumber: r.prNumber ?? "",
          prDate: r.prDate ? r.prDate.split("T")[0] : "",
          daysForPR: r.daysForPR ?? null,
          prStatus: r.prStatus ?? "PENDING",
          poNumber: r.poNumber ?? "",
          poDate: r.poDate ? r.poDate.split("T")[0] : "",
          poStatus: r.poStatus ?? "PENDING",
          daysForPO: r.daysForPO ?? null,
          prlNo: r.prlNo ?? "",
          prlDate: r.prlDate ? r.prlDate.split("T")[0] : "",
          paymentStatus: r.paymentStatus ?? "PENDING",
          daysForPayment: r.daysForPayment ?? null,
          materialDispatchDate: r.materialDispatchDate ? r.materialDispatchDate.split("T")[0] : "",
          materialReceivedDate: r.materialReceivedDate ? r.materialReceivedDate.split("T")[0] : "",
          workCompletionDate: r.workCompletionDate ? r.workCompletionDate.split("T")[0] : "",
          sourceCancellationDate: r.sourceCancellationDate ? r.sourceCancellationDate.split("T")[0] : "",
          paymentApprovalDate: r.paymentApprovalDate ? r.paymentApprovalDate.split("T")[0] : "",
          paymentDoneDate: r.paymentDoneDate ? r.paymentDoneDate.split("T")[0] : "",
          currentStatusByHandler: r.currentStatusByHandler ?? "",
          nameOfHandler: r.nameOfHandler ?? "",
          noOfDays: r.noOfDays ?? null,
          currentStage: r.currentStage ?? "CS",
          pendingFrom: r.pendingFrom ? r.pendingFrom.split("T")[0] : "",
          pendingDays: r.pendingDays ?? null,
          slaStatus: r.slaStatus ?? "ON_TRACK",
          slaCS: r.slaCS ?? SLA_THRESHOLDS.CS,
          slaPR: r.slaPR ?? SLA_THRESHOLDS.PR,
          slaPO: r.slaPO ?? SLA_THRESHOLDS.PO,
          slaPAR: r.slaPAR ?? SLA_THRESHOLDS.PAR,
          slaPDD: r.slaPDD ?? SLA_THRESHOLDS.PDD,
          slaMDD: r.slaMDD ?? SLA_THRESHOLDS.MDD,
          slaMRD: r.slaMRD ?? SLA_THRESHOLDS.MRD,
          slaWCD: r.slaWCD ?? SLA_THRESHOLDS.WCD,
          createdBy: r.createdBy ?? null,
        }));
        
        setRows((prev) => {
          // Preserve rows the user is actively editing so they aren't overwritten by the poll
          const dirtyMap = new Map();
          prev.forEach((r) => {
            if (r.isDirty || r.isNew) dirtyMap.set(r.id, r);
          });

          const merged = initialRows.map((r: any) => {
            if (dirtyMap.has(r.id)) {
              const dirtyRow = dirtyMap.get(r.id);
              dirtyMap.delete(r.id);
              return dirtyRow;
            }
            return r;
          });

          // Prepend any brand new rows that haven't been saved to DB yet
          const newRows = Array.from(dirtyMap.values()).filter((r) => r.isNew);
          return [...newRows, ...merged];
        });
      })
      .catch(() => {
        if (!silent) toast.error("Failed to load spreadsheet data");
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [search, page, activeTab]);

  useEffect(() => {
    loadData();
    // Poll every 10 seconds for automatic live updates
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Show all active employees in the system, sorted by activity
  const tabs = useMemo(() => {
    if (!isManager) return [];
    // Prioritize by requestCount descending so the most active employees appear first, but include ALL employees
    const sorted = [...handlers].sort(
      (a, b) => (b.requestCount || 0) - (a.requestCount || 0)
    );
    const names = sorted.map((h) => h.name).filter(Boolean);
    return ["All", ...names];
  }, [handlers, isManager]);

  // Ensure activeTab falls back to "All" if current selection is no longer in active tabs
  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab("All");
    }
  }, [tabs, activeTab]);

  // Server handles filtering by employee and pagination
  const filteredRows = rows;

  // Recalculates all reactive cell formulas for a row
  const calcRowFormulas = useCallback((row: RowData): RowData => {
    let daysForCS = null;
    let daysForPR = null;
    let daysForPO = null;
    let daysForPayment = null;
    let noOfDays = null;
    let pendingDays = null;

    if (row.sourceDate && row.comparativeDate) {
      try { daysForCS = Math.max(0, differenceInDays(parseISO(row.comparativeDate), parseISO(row.sourceDate))); } catch {}
    }
    if (row.comparativeDate && row.prDate) {
      try { daysForPR = Math.max(0, differenceInDays(parseISO(row.prDate), parseISO(row.comparativeDate))); } catch {}
    }
    if (row.prDate && row.poDate) {
      try { daysForPO = Math.max(0, differenceInDays(parseISO(row.poDate), parseISO(row.prDate))); } catch {}
    }
    if (row.prlDate && row.paymentDoneDate) {
      try { daysForPayment = Math.max(0, differenceInDays(parseISO(row.paymentDoneDate), parseISO(row.prlDate))); } catch {}
    }
    if (row.sourceDate) {
      try { noOfDays = Math.max(0, differenceInDays(new Date(), parseISO(row.sourceDate))); } catch {}
    }
    if (row.pendingFrom) {
      try { pendingDays = Math.max(0, differenceInDays(new Date(), parseISO(row.pendingFrom))); } catch {}
    }

    let currentStage = row.currentStage || "CS";
    if (row.sourceCancellationDate) currentStage = "CANCELLED";
    else if (row.workCompletionDate) currentStage = "COMPLETED";
    else if (row.materialReceivedDate) currentStage = "WCD";
    else if (row.materialDispatchDate) currentStage = "MRD";
    else if (row.paymentDoneDate) currentStage = "MDD";
    else if (row.paymentApprovalDate) currentStage = "PDD";
    else if (row.poDate) currentStage = "PAR";
    else if (row.prDate) currentStage = "PO";
    else if (row.comparativeDate) currentStage = "PR";
    else currentStage = "CS";

    let slaStatus = "ON_TRACK";
    if (currentStage && currentStage !== "COMPLETED" && currentStage !== "CANCELLED") {
      const customThreshold = (row as any)[`sla${currentStage}`];
      const threshold = customThreshold != null ? customThreshold : SLA_THRESHOLDS[currentStage as keyof typeof SLA_THRESHOLDS];
      if (threshold && pendingDays != null) {
        const ratio = pendingDays / threshold;
        if (ratio >= 1) slaStatus = "OVERDUE";
        else if (ratio >= 0.75) slaStatus = "AT_RISK";
      }
    } else if (currentStage === "COMPLETED") {
      slaStatus = "COMPLETED";
    }

    return { ...row, daysForCS, daysForPR, daysForPO, daysForPayment, noOfDays, pendingDays, currentStage, slaStatus, isDirty: true };
  }, []);

  // Handle cell edit change
  const handleCellChange = (id: string, field: keyof RowData, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updatedRow = { ...row, [field]: value };
        return calcRowFormulas(updatedRow);
      })
    );
  };

  // Add new empty row at top
  const handleAddRow = () => {
    const newRow: RowData = {
      id: `new-${Date.now()}`,
      isNew: true,
      isDirty: true,
      createdAt: new Date().toISOString(),
      sourceNo: generateSourceNo(),
      sourceDate: format(new Date(), "yyyy-MM-dd"),
      sourceDescription: "",
      departmentName: "",
      vendorName: "",
      comparativeDate: "",
      daysForCS: null,
      csStatus: "PENDING",
      prNumber: "",
      prDate: "",
      daysForPR: null,
      prStatus: "PENDING",
      poNumber: "",
      poDate: "",
      poStatus: "PENDING",
      daysForPO: null,
      prlNo: "",
      prlDate: "",
      paymentStatus: "PENDING",
      daysForPayment: null,
      materialDispatchDate: "",
      materialReceivedDate: "",
      workCompletionDate: "",
      sourceCancellationDate: "",
      paymentApprovalDate: "",
      paymentDoneDate: "",
      currentStatusByHandler: "",
      nameOfHandler: session.user.name ?? "",
      noOfDays: 0,
      currentStage: "CS",
      pendingFrom: format(new Date(), "yyyy-MM-dd"),
      pendingDays: 0,
      slaStatus: "ON_TRACK",
      slaCS: SLA_THRESHOLDS.CS,
      slaPR: SLA_THRESHOLDS.PR,
      slaPO: SLA_THRESHOLDS.PO,
      slaPAR: SLA_THRESHOLDS.PAR,
      slaPDD: SLA_THRESHOLDS.PDD,
      slaMDD: SLA_THRESHOLDS.MDD,
      slaMRD: SLA_THRESHOLDS.MRD,
      slaWCD: SLA_THRESHOLDS.WCD,
      createdBy: { id: session.user.id, name: session.user.name ?? "Me" },
    };

    setRows((prev) => [newRow, ...prev]);
  };

  // Discard unsaved row
  const handleRemoveNewRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Save row to Database
  const handleSaveRow = async (row: RowData) => {
    if (!row.sourceDescription) {
      toast.error("Source Description is required before saving.");
      return;
    }
    if (!row.departmentName) {
      toast.error("Department is required before saving.");
      return;
    }
    
    setSavingId(row.id);
    try {
      const url = row.isNew ? "/api/requests" : `/api/requests/${row.id}`;
      const method = row.isNew ? "POST" : "PUT";

      // Map spreadsheet text fields to database fields expected by Prisma schemas
      const payload = {
        ...row,
        departmentId: row.departmentName, // Text department name maps dynamically on backend
        vendorId: row.vendorName, // Text vendor name maps dynamically on backend
        comparativeDate: row.comparativeDate || null,
        prNumber: row.prNumber || null,
        prDate: row.prDate || null,
        poNumber: row.poNumber || null,
        poDate: row.poDate || null,
        prlNo: row.prlNo || null,
        prlDate: row.prlDate || null,
        materialDispatchDate: row.materialDispatchDate || null,
        materialReceivedDate: row.materialReceivedDate || null,
        workCompletionDate: row.workCompletionDate || null,
        sourceCancellationDate: row.sourceCancellationDate || null,
        paymentApprovalDate: row.paymentApprovalDate || null,
        paymentDoneDate: row.paymentDoneDate || null,
        currentStatusByHandler: row.currentStatusByHandler || null,
        pendingFrom: row.pendingFrom || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || errData?.error || `Server error (${res.status})`;
        if (res.status !== 400) {
          console.error("[Save Row] API error:", res.status, errData, "\nPayload:", payload);
        }
        throw new Error(String(errMsg));
      }

      const resData = await res.json();
      const savedItem = resData.request;

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...row, id: savedItem.id, isNew: false, isDirty: false }
            : r
        )
      );

      toast.success(`Row ${row.sourceNo} saved successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save spreadsheet row. Check inputs.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRow = async (id: string, sourceNo: string) => {
    if (!confirm(`Are you sure you want to delete request ${sourceNo}?`)) return;
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete request");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Request ${sourceNo} deleted successfully`);
    } catch {
      toast.error("Failed to delete request");
    }
  };

  const exportToCSV = () => {
    if (filteredRows.length === 0) return toast.error("No data to export");
    exportUniformCsv(filteredRows, "procurement_database");
    toast.success("CSV Exported successfully!");
  };

  const exportToExcel = () => {
    if (filteredRows.length === 0) return toast.error("No data to export");
    exportUniformExcel(filteredRows, "Procurement Database", "procurement_database");
    toast.success("Excel (.xlsx) exported successfully!");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/requests/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to import file");
      }

      if (data.createdCount > 0 && data.updatedCount > 0) {
        toast.success(`Processed: ${data.createdCount} new added, ${data.updatedCount} updated in database!`);
      } else if (data.createdCount > 0) {
        toast.success(`Successfully added ${data.createdCount} new records to the database!`);
      } else if (data.updatedCount > 0) {
        toast.info(`Updated ${data.updatedCount} existing records in database (Source Nos matched existing rows).`);
      } else {
        toast.error(`No records were added or updated. ${data.skippedCount > 0 ? `${data.skippedCount} rows were skipped.` : "File contains no readable rows."}`);
      }

      if (data.skippedCount > 0 && (data.createdCount > 0 || data.updatedCount > 0)) {
        toast.warning(`Skipped ${data.skippedCount} unparseable rows.`);
      }

      setPage(1);
      setActiveTab("All");
      loadData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred during import");
    } finally {
      setImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    }
  };

  const cellInputClass = "uppercase w-full h-full min-h-[38px] px-3 py-1.5 text-[12px] font-medium text-slate-800 bg-transparent border border-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg outline-none transition-all placeholder:text-slate-300";
  const headerCellClass = "px-3.5 py-3 text-xs font-bold text-indigo-600 uppercase tracking-wider border-r border-indigo-100 border-b border-indigo-100 bg-indigo-50 text-left sticky top-0 z-20 select-none whitespace-nowrap";
  const bodyCellClass = "p-1 border-r border-b border-slate-100 align-middle relative";
  const readonlyCellClass = "px-3 py-2 border-r border-b border-slate-100 align-middle text-center text-[12px] font-semibold text-slate-600 bg-slate-50/50";

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Spreadsheet Control Header */}
      {!isManager ? (
        <div className="flex justify-between items-center bg-slate-900 text-slate-200 p-4 rounded-xl shadow-md">
          <p className="text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Spreadsheet Mode: Type directly into any cell to edit. Click the save icon to persist changes.
          </p>
          <Link
            href="/team/requests/new"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </Link>
        </div>
      ) : (
        tabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">Employee Filter:</span>
            {tabs.map((tab) => {
              const userObj = handlers.find((h) => h.name === tab);
              const count = tab === "All" ? null : (userObj?.requestCount ?? null);
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-md shadow-indigo-500/20"
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60"
                  }`}
                >
                  <span>{tab === "All" ? "Master Sheet (Everyone)" : tab}</span>
                  {count != null && count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === tab ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Table Card Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col flex-1">
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1" 
          style={{ maxHeight: "calc(100vh - 315px)", minHeight: "380px" }}
        >
          <datalist id="handler-suggestions">
            {handlers.map((h) => (
              <option key={h.id} value={h.name} />
            ))}
          </datalist>
          <table className="w-full text-sm table-fixed min-w-[5000px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider border-r border-indigo-200 border-b border-indigo-200 bg-indigo-100 sticky top-0 left-0 z-30 text-center w-28 select-none shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Actions
                </th>
                <th className={headerCellClass} style={{ width: "140px" }}>Created By</th>
                <th className={headerCellClass} style={{ width: "135px" }}>Added Time</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Source No</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Source Date *</th>
                <th className={headerCellClass} style={{ width: "260px" }}>Source Description *</th>
                <th className={headerCellClass} style={{ width: "160px" }}>Department *</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Name of Handler</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Comparative Date</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PR Number</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PR Date</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PO Number</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PO Date</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PO Status</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Days for PO</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Payment Approval Date</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Payment Done Date</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Payment Status</th>
                <th className={headerCellClass} style={{ width: "130px" }}>Days for Payment</th>
                <th className={headerCellClass} style={{ width: "160px" }}>Vendor Name</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PRL NO</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PRL DATE</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Material Dispatch Date</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Material Received Date</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Work Completion Date</th>
                <th className={headerCellClass} style={{ width: "150px" }}>Source Cancellation Date</th>
                <th className={headerCellClass} style={{ width: "160px" }}>Current Status by Handler</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Current Stage</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Pending From</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Days for CS</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Days for PR</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Pending Days</th>
                <th className={headerCellClass} style={{ width: "120px" }}>No of Days</th>
                <th className={headerCellClass} style={{ width: "120px" }}>SLA Status</th>
                <th className={headerCellClass} style={{ width: "120px" }}>CS Status</th>
                <th className={headerCellClass} style={{ width: "120px" }}>PR Status</th>
                <th className={headerCellClass} style={{ width: "80px" }}>CS (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>PR (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>PO (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>PAR (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>PDD (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>MDD (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>MRD (SLA)</th>
                <th className={headerCellClass} style={{ width: "80px" }}>WCD (SLA)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="p-3 border-b border-slate-100" colSpan={44}>
                      <div className="h-5 rounded bg-slate-100 animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="py-20 text-center text-slate-400 text-sm font-semibold" colSpan={44}>
                    No requests found in this sheet.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIdx) => {
                  const isAssignedByManager = !isManager && row.createdBy && row.createdBy.id !== session.user.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const isInteractive = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "BUTTON" || target.tagName === "A" || target.closest("a") || target.closest("button");
                        if (!isInteractive && !row.isNew) {
                          router.push(isManager ? `/manager/requests/${row.id}` : `/team/requests/${row.id}`);
                        }
                      }}
                      className={`group cursor-pointer transition-colors duration-150 ${
                        row.isDirty
                          ? "bg-amber-50/80 hover:bg-amber-50"
                          : isAssignedByManager
                          ? "bg-violet-100/70 hover:bg-violet-200 border-l-[6px] border-l-violet-600"
                          : rowIdx % 2 === 0
                          ? "bg-white hover:bg-indigo-50/50"
                          : "bg-slate-50/60 hover:bg-indigo-50/50"
                      }`}
                    >
                    {/* Actions sticky Left */}
                    <td 
                      className={`p-2 border-r border-b border-slate-100 sticky left-0 z-10 text-center whitespace-nowrap w-28 transition-colors duration-150 ${
                        row.isDirty
                          ? "bg-amber-50 group-hover:bg-amber-50"
                          : isAssignedByManager
                          ? "bg-violet-100/70 group-hover:bg-violet-200"
                          : rowIdx % 2 === 0
                          ? "bg-white group-hover:bg-indigo-50/50"
                          : "bg-slate-50 group-hover:bg-indigo-50/50"
                      }`} 
                      style={{ boxShadow: "4px 0 8px rgba(0,0,0,0.03)" }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSaveRow(row)}
                          disabled={savingId === row.id || !row.isDirty}
                          className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-blue-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                          title="Save Row"
                        >
                          {savingId === row.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {row.isNew ? (
                          <button
                            onClick={() => handleRemoveNewRow(row.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Discard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <Link
                              href={isManager ? `/manager/requests/${row.id}` : `/team/requests/${row.id}`}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-block"
                              title="View Detail"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            {isManager && (
                              <button
                                onClick={() => handleDeleteRow(row.id, row.sourceNo)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors inline-block"
                                title="Delete Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="px-3 py-2 border-r border-b border-slate-100 text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                      {row.createdBy?.name ?? "System"}
                    </td>

                    {/* Added Time */}
                    <td className="px-3 py-2 border-r border-b border-slate-100 align-middle text-center whitespace-nowrap bg-slate-50/40 select-none" title={row.createdAt ? formatDate(row.createdAt, "dd MMM yyyy, hh:mm:ss a") : ""}>
                      {row.createdAt ? (
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="text-[11px] font-bold text-slate-700">
                            {formatDate(row.createdAt, "dd-MM-yyyy")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(row.createdAt, "hh:mm a")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Source No */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.sourceNo} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/[^0-9]/.test(val)) {
                            toast.error("Source No. can only contain numbers");
                          }
                          handleCellChange(row.id, "sourceNo", val.replace(/[^0-9]/g, ''));
                        }}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Source Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.sourceDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "sourceDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Source Description */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.sourceDescription} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "sourceDescription", e.target.value)}
                        className={cellInputClass}
                        placeholder="Description..."
                      />
                    </td>

                    {/* Department (text input) */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.departmentName} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "departmentName", e.target.value)}
                        className={cellInputClass}
                        placeholder="e.g. Nutraceutical"
                      />
                    </td>

                    {/* Name of Handler */}
                    <td className={bodyCellClass}>
                      <input
                        type="text"
                        list="handler-suggestions"
                        value={row.nameOfHandler || ""}
                        disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "nameOfHandler", e.target.value)}
                        className={cellInputClass}
                        placeholder="Handler name..."
                      />
                    </td>

                    {/* Comparative Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.comparativeDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "comparativeDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PR Number */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.prNumber} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => {
                          let val = e.target.value.toUpperCase();
                          let cleanVal = "";
                          for (let i = 0; i < val.length; i++) {
                            if (i < 3) {
                              if (/[A-Z]/.test(val[i])) cleanVal += val[i];
                            } else if (i < 11) {
                              if (/[0-9]/.test(val[i])) cleanVal += val[i];
                            }
                          }
                          handleCellChange(row.id, "prNumber", cleanVal);
                        }}
                        className={`${cellInputClass} uppercase`}
                        placeholder="PIF26070088"
                      />
                    </td>

                    {/* PR Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.prDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PO Number */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.poNumber} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => {
                          let val = e.target.value.toUpperCase();
                          let cleanVal = "";
                          for (let i = 0; i < val.length; i++) {
                            if (i < 2) {
                              if (/[A-Z]/.test(val[i])) cleanVal += val[i];
                            } else if (i < 10) {
                              if (/[0-9]/.test(val[i])) cleanVal += val[i];
                            }
                          }
                          handleCellChange(row.id, "poNumber", cleanVal);
                        }}
                        className={`${cellInputClass} uppercase`}
                        placeholder="DF26040022"
                      />
                    </td>

                    {/* PO Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.poDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "poDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PO Status */}
                    <td className={bodyCellClass}>
                      <select value={row.poStatus} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "poStatus", e.target.value)}
                        className={cellInputClass}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>

                    {/* Days for PO */}
                    <td className={readonlyCellClass}>{row.daysForPO != null ? `${row.daysForPO}d` : "—"}</td>

                    {/* Payment Approval Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.paymentApprovalDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "paymentApprovalDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Payment Done Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.paymentDoneDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "paymentDoneDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Payment Status */}
                    <td className={bodyCellClass}>
                      <select value={row.paymentStatus} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "paymentStatus", e.target.value)}
                        className={cellInputClass}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>

                    {/* Days for Payment */}
                    <td className={readonlyCellClass}>{row.daysForPayment != null ? `${row.daysForPayment}d` : "—"}</td>

                    {/* Vendor Name (text input) */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.vendorName} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "vendorName", e.target.value)}
                        className={cellInputClass}
                        placeholder="e.g. Tech Supplies Co."
                      />
                    </td>

                    {/* PRL NO */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.prlNo} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prlNo", e.target.value)}
                        className={cellInputClass}
                        placeholder="PRL-..."
                      />
                    </td>

                    {/* PRL DATE (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.prlDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prlDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Material Dispatch Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.materialDispatchDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "materialDispatchDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Material Received Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.materialReceivedDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "materialReceivedDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Work Completion Date */}
                    <td className={bodyCellClass}>
                      <input type="date" min={row.sourceDate || undefined} value={row.workCompletionDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "workCompletionDate", e.target.value)}
                        className={cellInputClass}
                        title="Work Completion Date"
                      />
                    </td>

                    {/* Source Cancellation Date */}
                    <td className={bodyCellClass}>
                      <input
                        type="date"
                        value={row.sourceCancellationDate}
                        onChange={(e) => handleCellChange(row.id, "sourceCancellationDate", e.target.value)}
                        className={cellInputClass}
                        title="Source Cancellation Date"
                      />
                    </td>

                    {/* Current Status by Handler */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.currentStatusByHandler} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "currentStatusByHandler", e.target.value)}
                        className={cellInputClass}
                        placeholder="Status..."
                      />
                    </td>

                    {/* Current Stage (text input) */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.currentStage}
                        onChange={(e) => handleCellChange(row.id, "currentStage", e.target.value)}
                        className={cellInputClass}
                        placeholder="e.g. CS, PR, PO"
                      />
                    </td>

                    {/* Pending From (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.pendingFrom} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "pendingFrom", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Days for CS */}
                    <td className={readonlyCellClass}>{row.daysForCS != null ? `${row.daysForCS}d` : "—"}</td>

                    {/* Days for PR */}
                    <td className={readonlyCellClass}>{row.daysForPR != null ? `${row.daysForPR}d` : "—"}</td>

                    {/* Pending Days */}
                    <td className={`${readonlyCellClass} ${
                      row.pendingDays != null && row.pendingDays > 30 ? "text-red-500 font-semibold" :
                      row.pendingDays != null && row.pendingDays > 14 ? "text-amber-600" : ""
                    }`}>{row.pendingDays != null ? `${row.pendingDays}d` : "—"}</td>

                    {/* No of Days */}
                    <td className={readonlyCellClass}>{row.noOfDays != null ? `${row.noOfDays}d` : "—"}</td>

                    {/* SLA Status */}
                    <td className="px-2.5 py-2 border-r border-b border-slate-100 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm ${
                        row.slaStatus === "ON_TRACK" ? "bg-emerald-50 text-emerald-700 border border-emerald-300/80" :
                        row.slaStatus === "AT_RISK" ? "bg-amber-50 text-amber-700 border border-amber-300/80" :
                        row.slaStatus === "OVERDUE" ? "bg-rose-50 text-rose-700 border border-rose-300/80" :
                        "bg-indigo-50 text-indigo-700 border border-indigo-300/80"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          row.slaStatus === "ON_TRACK" ? "bg-emerald-500" :
                          row.slaStatus === "AT_RISK" ? "bg-amber-500" :
                          row.slaStatus === "OVERDUE" ? "bg-rose-500" : "bg-indigo-500"
                        }`} />
                        {row.slaStatus.replace("_", " ")}
                      </span>
                    </td>

                    {/* CS Status (text input) */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.csStatus} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "csStatus", e.target.value)}
                        className={cellInputClass}
                        placeholder="PENDING..."
                      />
                    </td>

                    {/* PR Status (text input) */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.prStatus} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prStatus", e.target.value)}
                        className={cellInputClass}
                        placeholder="PENDING..."
                      />
                    </td>

                    {/* CS (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaCS} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaCS", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PR (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaPR} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaPR", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PO (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaPO} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaPO", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PAR (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaPAR} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaPAR", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PDD (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaPDD} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaPDD", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* MDD (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaMDD} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaMDD", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* MRD (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaMRD} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaMRD", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* WCD (SLA) */}
                    <td className={bodyCellClass}>
                      <input type="number" value={row.slaWCD} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "slaWCD", parseInt(e.target.value) || 0)}
                        className={cellInputClass}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination, Scroll Navigation & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
            ref={importFileInputRef} 
            onChange={handleImportFile}
          />
          <button 
            disabled={importing}
            onClick={() => importFileInputRef.current?.click()}
            className="text-xs flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm disabled:opacity-50"
            title="Import Excel or CSV into the Procurement Database"
          >
            {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-indigo-600" />}
            Import Data
          </button>
          <button 
            type="button"
            onClick={() => generateImportTemplate()}
            className="text-xs flex items-center gap-1.5 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-all font-bold shadow-sm"
            title="Download an Excel template matching the export format"
          >
            <FileText className="w-3.5 h-3.5" />
            Template
          </button>
          <button 
            onClick={exportToExcel} 
            className="text-xs flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all font-bold shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button 
            onClick={exportToCSV} 
            className="text-xs flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-xl hover:from-indigo-700 hover:to-violet-800 transition-all font-bold shadow-md shadow-indigo-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>

          {/* Quick horizontal scroll helpers */}
          <div className="hidden sm:flex items-center gap-1 ml-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 px-2">Scroll Table:</span>
            <button
              onClick={() => scrollTable(-600)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-all flex items-center gap-1 shadow-xs"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Left</span>
            </button>
            <button
              onClick={() => scrollTable(600)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-all flex items-center gap-1 shadow-xs"
              title="Scroll Right"
            >
              <span>Right</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">
            ← Prev
          </button>
          <span className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl border border-slate-200/80">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
