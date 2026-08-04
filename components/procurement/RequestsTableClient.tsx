"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import { Search, Filter, Download, Trash2, Eye, Edit, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { CurrentStage, SLAStatus } from "@/types";

interface Request {
  id: string;
  sourceNo: string;
  sourceDescription: string;
  currentStage: CurrentStage;
  slaStatus: SLAStatus;
  pendingDays: number | null;
  noOfDays: number | null;
  nameOfHandler: string;
  createdAt: string;
  department?: { name: string } | null;
  vendor?: { name: string } | null;
  createdBy?: { name: string } | null;
}

interface Pagination {
  page: number; limit: number; total: number; pages: number;
}

const STAGES = ["", "CS", "PR", "PO", "PAR", "PDD", "MDD", "MRD", "WCD", "COMPLETED", "CANCELLED"];
const SLA_STATUSES = ["", "ON_TRACK", "AT_RISK", "OVERDUE", "COMPLETED"];

export function RequestsTableClient({ role }: { role: "TEAM" | "MANAGER" }) {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [slaStatus, setSlaStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (stage) params.set("stage", stage);
      if (slaStatus) params.set("status", slaStatus);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 });
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [search, stage, slaStatus]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchRequests(1), 300);
    return () => clearTimeout(timeout);
  }, [fetchRequests]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Request deleted");
        fetchRequests(pagination.page);
      } else {
        toast.error("Failed to delete request");
      }
    } catch {
      toast.error("Failed to delete request");
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ["Source No", "Description", "Department", "Vendor", "Stage", "SLA", "Handler", "Pending Days", "Date"],
      ...requests.map((r) => [
        r.sourceNo, r.sourceDescription, r.department?.name ?? "", r.vendor?.name ?? "",
        r.currentStage, r.slaStatus, r.nameOfHandler, String(r.pendingDays ?? ""), formatDate(r.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `procurex-requests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const basePath = role === "MANAGER" ? "/manager" : "/team";

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search source no, description, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
          />
        </div>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
        >
          <option value="">All Stages</option>
          {STAGES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={slaStatus}
          onChange={(e) => setSlaStatus(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
        >
          <option value="">All SLA</option>
          {SLA_STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>

        <button
          onClick={() => fetchRequests(pagination.page)}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm bg-white"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>

        {role === "MANAGER" && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold text-slate-700 shadow-sm bg-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-100 bg-indigo-50">
                {role === "MANAGER" && <th className="px-6 py-4 w-8"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></th>}
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600 whitespace-nowrap">Source No</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Description</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Department</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Vendor</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Stage</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600 whitespace-nowrap">SLA Status</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600 whitespace-nowrap">Pending Days</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Handler</th>
                {role === "MANAGER" && <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Created By</th>}
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Date</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-indigo-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: role === "MANAGER" ? 12 : 10 }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={role === "MANAGER" ? 12 : 10} className="px-6 py-12 text-center text-slate-500 font-medium text-sm bg-slate-50/30">
                    No requests found. {role === "TEAM" && (
                      <Link href="/team/requests/new" className="text-indigo-600 hover:underline font-bold ml-1">Create one →</Link>
                    )}
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    {role === "MANAGER" && (
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            e.target.checked ? next.add(r.id) : next.delete(r.id);
                            setSelectedIds(next);
                          }}
                        />
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <Link href={`${basePath}/requests/${r.id}`} className="text-indigo-600 hover:text-indigo-700 font-bold text-xs whitespace-nowrap tracking-wide">
                        {r.sourceNo}
                      </Link>
                    </td>
                    <td className="px-6 py-5 max-w-40">
                      <p className="truncate text-xs font-medium text-slate-700" title={r.sourceDescription}>{r.sourceDescription}</p>
                    </td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">{r.department?.name ?? "—"}</td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">{r.vendor?.name ?? "—"}</td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider whitespace-nowrap", getStageColor(r.currentStage))}>
                        {getStageName(r.currentStage)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border whitespace-nowrap", getSLAColor(r.slaStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {r.pendingDays != null ? `${r.pendingDays} days` : "—"}
                    </td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">{r.nameOfHandler}</td>
                    {role === "MANAGER" && (
                      <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">{r.createdBy?.name ?? "—"}</td>
                    )}
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`${basePath}/requests/${r.id}`}
                          className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {role === "MANAGER" && (
                          <>
                            <Link
                              href={`/manager/requests/${r.id}/edit`}
                              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRequests(pagination.page - 1)}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchRequests(pagination.page + 1)}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
