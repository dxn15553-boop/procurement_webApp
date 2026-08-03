"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Save, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { generateSourceNo } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import { SLA_THRESHOLDS } from "@/lib/calculations";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { exportUniformCsv, exportUniformExcel } from "@/lib/exportHelper";

interface RowData {
  id: string; // "new-xxx" or real database id
  isNew?: boolean;
  isDirty?: boolean;
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

  const [page, setPage] = useState(pageParam);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Manager Sheet selection state
  const [activeTab, setActiveTab] = useState<string>("All");
  const [handlers, setHandlers] = useState<{id: string, name: string}[]>([]);

  const isManager = session.user.role === "MANAGER";

  // Fetch initial user requests
  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    
    fetch("/api/users")
      .then((r) => r.json())
      .then((u) => setHandlers(u.users ?? []))
      .catch(() => {});

    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    qs.set("page", page.toString());
    qs.set("limit", limit.toString());

    fetch(`/api/requests?${qs.toString()}`)
      .then((r) => r.json())
      .then((reqData) => {
        setTotalPages(reqData.pagination?.pages || 1);
        const initialRows = (reqData.requests ?? []).map((r: any) => ({
          id: r.id,
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
  }, [search, page]);

  useEffect(() => {
    loadData();
    // Poll every 10 seconds for automatic live updates
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Extract all unique employee names from the dataset to render Excel tabs at the bottom
  const tabs = useMemo(() => {
    if (!isManager) return [];
    const names = new Set<string>();
    rows.forEach((r) => {
      if (r.createdBy?.name) names.add(r.createdBy.name);
    });
    return ["All", ...Array.from(names)];
  }, [rows, isManager]);

  // Filter rows based on selected tab at the bottom
  const filteredRows = useMemo(() => {
    if (!isManager || activeTab === "All") return rows;
    return rows.filter((r) => r.createdBy?.name === activeTab);
  }, [rows, activeTab, isManager]);

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
    
    // Validate Handler Name
    const isValidHandler = handlers.some(
      (h) => h.name.toLowerCase() === row.nameOfHandler.trim().toLowerCase()
    );
    if (!isValidHandler) {
      toast.error("Handler Name not found. Please enter the correct account name.");
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

      if (!res.ok) throw new Error("Failed to save row");

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
    } catch {
      toast.error("Failed to save spreadsheet row. Check inputs.");
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

  const cellInputClass = "uppercase w-full h-full min-h-[38px] px-3 py-1.5 text-[12px] font-medium text-slate-800 bg-transparent border border-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg outline-none transition-all placeholder:text-slate-300";
  const headerCellClass = "px-3.5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 border-b border-slate-200 bg-slate-50 text-left sticky top-0 z-20 select-none whitespace-nowrap";
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
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all font-semibold ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-md shadow-indigo-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60"
                }`}
              >
                {tab === "All" ? "Master Sheet (Everyone)" : tab}
              </button>
            ))}
          </div>
        )
      )}

      {/* Table Card Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col flex-1">
        <div className="overflow-auto custom-scrollbar flex-1" style={{ maxHeight: "calc(100vh - 220px)", minHeight: "500px" }}>
          <table className="w-full text-sm table-fixed min-w-[5000px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 border-b border-slate-200 bg-slate-100 sticky top-0 left-0 z-30 text-center w-28 select-none shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Actions
                </th>
                <th className={headerCellClass} style={{ width: "150px" }}>{isManager ? "Employee Name" : "Created By"}</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Source No</th>
                <th className={headerCellClass} style={{ width: "120px" }}>Source Date *</th>
                <th className={headerCellClass} style={{ width: "260px" }}>Source Description *</th>
                <th className={headerCellClass} style={{ width: "160px" }}>Department *</th>
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
                <th className={headerCellClass} style={{ width: "150px" }}>Name of Handler *</th>
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
                    <td className="p-3 border-b border-slate-100" colSpan={43}>
                      <div className="h-5 rounded bg-slate-100 animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="py-20 text-center text-slate-400 text-sm font-semibold" colSpan={43}>
                    No requests found in this sheet.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIdx) => (
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

                    {/* Employee Reference Name */}
                    <td className="px-3 py-2 border-r border-b border-slate-100 text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                      {row.createdBy?.name ?? "System"}
                    </td>

                    {/* Source No */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.sourceNo} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "sourceNo", e.target.value)}
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

                    {/* Comparative Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.comparativeDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "comparativeDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PR Number */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.prNumber} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prNumber", e.target.value)}
                        className={cellInputClass}
                        placeholder="PR-..."
                      />
                    </td>

                    {/* PR Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.prDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* PO Number */}
                    <td className={bodyCellClass}>
                      <input type="text" value={row.poNumber} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "poNumber", e.target.value)}
                        className={cellInputClass}
                        placeholder="PO-..."
                      />
                    </td>

                    {/* PO Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.poDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
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
                      <input type="date" value={row.paymentApprovalDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "paymentApprovalDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Payment Done Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.paymentDoneDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
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
                      <input type="date" value={row.prlDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "prlDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Material Dispatch Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.materialDispatchDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "materialDispatchDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Material Received Date (text input) */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.materialReceivedDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "materialReceivedDate", e.target.value)}
                        className={cellInputClass}
                      />
                    </td>

                    {/* Work Completion Date */}
                    <td className={bodyCellClass}>
                      <input type="date" value={row.workCompletionDate} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
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

                    {/* Name of Handler */}
                    <td className={bodyCellClass}>
                      <select value={row.nameOfHandler} disabled={!row.isNew && (row.currentStage === "CANCELLED" || !!row.sourceCancellationDate)}
                        onChange={(e) => handleCellChange(row.id, "nameOfHandler", e.target.value)}
                        className={cellInputClass}
                      >
                        <option value="">Select handler...</option>
                        {handlers.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      </select>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Export Controls */}
      <div className="flex items-center justify-between pt-3 pb-1 px-1">
        <button onClick={exportToCSV} className="text-xs flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-xl hover:from-indigo-700 hover:to-violet-800 transition-all font-bold shadow-md shadow-indigo-500/20">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export to CSV
        </button>
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
