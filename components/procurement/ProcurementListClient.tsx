"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  ArrowRight, 
  Clock, 
  Building2, 
  FileText,
  AlertCircle,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RequestItem {
  id: string;
  sourceNo: string;
  sourceDate: string;
  sourceDescription: string;
  department: { name: string } | null;
  vendor: { name: string } | null;
  currentStage: string;
  slaStatus: string;
  createdBy: { name: string } | null;
  createdAt: string;
}

interface ProcurementListClientProps {
  role: "MANAGER" | "TEAM";
}

export function ProcurementListClient({ role }: ProcurementListClientProps) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/requests")
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.requests || []);
      })
      .catch(() => toast.error("Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      req.sourceNo?.toLowerCase().includes(search.toLowerCase()) ||
      req.sourceDescription?.toLowerCase().includes(search.toLowerCase()) ||
      req.department?.name?.toLowerCase().includes(search.toLowerCase()) ||
      req.createdBy?.name?.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === "ALL" || req.slaStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getSLAColor = (status: string) => {
    switch (status) {
      case "ON_TRACK": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "AT_RISK": return "text-amber-700 bg-amber-50 border-amber-200";
      case "OVERDUE": return "text-red-700 bg-red-50 border-red-200";
      case "COMPLETED": return "text-blue-700 bg-blue-50 border-blue-200";
      default: return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      CS: "bg-purple-100 text-purple-700",
      PR: "bg-amber-100 text-amber-700",
      PO: "bg-green-100 text-green-700",
      PAR: "bg-indigo-100 text-indigo-700",
      PDD: "bg-cyan-100 text-cyan-700",
      MDD: "bg-teal-100 text-teal-700",
      MRD: "bg-blue-100 text-blue-700",
      WCD: "bg-emerald-100 text-emerald-700",
      COMPLETED: "bg-slate-100 text-slate-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[stage] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON_TRACK">On Track</option>
              <option value="AT_RISK">At Risk</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {role === "TEAM" && (
          <Link
            href="/team/requests/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 font-semibold text-muted-foreground">Source Info</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground hidden md:table-cell">Department</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Stage</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center hidden sm:table-cell">SLA Status</th>
                {role === "MANAGER" && (
                  <th className="px-6 py-4 font-semibold text-muted-foreground hidden lg:table-cell">Submitted By</th>
                )}
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-5 bg-muted rounded w-3/4 mb-2"></div><div className="h-3 bg-muted rounded w-1/2"></div></td>
                    <td className="px-6 py-5 hidden md:table-cell"><div className="h-4 bg-muted rounded w-full"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-muted rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-5 hidden sm:table-cell"><div className="h-6 bg-muted rounded-full w-20 mx-auto"></div></td>
                    {role === "MANAGER" && <td className="px-6 py-5 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-24"></div></td>}
                    <td className="px-6 py-5 text-right"><div className="h-8 bg-muted rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-10 h-10 text-muted-foreground/30" />
                      <p>No requests found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {req.sourceNo}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[250px]">
                          {req.sourceDescription || "No description provided"}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground md:hidden">
                          <Building2 className="w-3 h-3" />
                          <span>{req.department?.name || "No Dept"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-muted-foreground/50" />
                        <span className="truncate max-w-[150px]">{req.department?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap", getStageColor(req.currentStage))}>
                        {req.currentStage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border uppercase tracking-wider flex items-center justify-center gap-1.5 w-max mx-auto", getSLAColor(req.slaStatus))}>
                        {req.slaStatus === 'AT_RISK' && <Clock className="w-3 h-3" />}
                        {req.slaStatus === 'OVERDUE' && <AlertCircle className="w-3 h-3" />}
                        {req.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    {role === "MANAGER" && (
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{req.createdBy?.name || "System"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {req.createdAt ? format(new Date(req.createdAt), "dd MMM yyyy") : "—"}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={role === "MANAGER" ? `/manager/requests/${req.id}` : `/team/requests/${req.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="View Details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
