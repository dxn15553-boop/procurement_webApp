"use client";

import {
  MonthlyTrendChart,
  DepartmentChart,
  StageDistributionChart,
  SLAPerformanceChart,
} from "@/components/charts/DashboardCharts";
import { formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import {
  ShoppingCart, CheckCircle2, XCircle, AlertTriangle,
  Activity, ArrowRight, RefreshCw, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CurrentStage, SLAStatus } from "@/types";

interface DashboardData {
  kpi: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    overdue: number;
  };
  recentRequests: Array<{
    id: string; sourceNo: string; sourceDescription: string; currentStage: CurrentStage;
    slaStatus: SLAStatus; createdAt: Date; pendingDays: number | null;
    department?: { name: string } | null;
    vendor?: { name: string } | null;
  }>;
  departmentData: Array<{ name: string; value: number }>;
  stageData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ month: string; total: number; completed: number; overdue: number }>;
  slaChartData: Array<{ name: string; onTrack: number; atRisk: number; overdue: number }>;
}

interface Props {
  data: DashboardData;
  userName: string;
}

export function TeamDashboardClient({ data, userName }: Props) {
  const router = useRouter();
  const { kpi, recentRequests, departmentData, stageData, monthlyData, slaChartData } = data;

  const kpiCards = [
    { type: "single", label: "MY TOTAL REQUESTS", value: kpi.total, icon: <BarChart3 className="w-5 h-5 text-slate-700" />, iconBg: "bg-slate-100" },
    { type: "single", label: "ACTIVE", value: kpi.active, icon: <Activity className="w-5 h-5 text-indigo-600" />, iconBg: "bg-indigo-50" },
    { type: "single", label: "COMPLETED", value: kpi.completed, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, iconBg: "bg-emerald-50" },
    { type: "single", label: "OVERDUE", value: kpi.overdue, icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, iconBg: "bg-orange-50" },
    { type: "single", label: "CANCELLED", value: kpi.cancelled, icon: <XCircle className="w-5 h-5 text-red-500" />, iconBg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good morning, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your procurement requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/team/requests/new"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            New Request
          </Link>
        </div>
      </div>

      {/* KPI Summary Overview */}
      <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar w-full">
        {kpiCards.map((card, idx) => (
          <div key={idx} className="flex-shrink-0 flex-1 min-w-[140px] bg-white border border-slate-100 rounded-[1.5rem] p-4 xl:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-between h-[140px] xl:h-[150px] transition-transform hover:-translate-y-1">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-2", card.iconBg)}>
              {card.icon}
            </div>
            
            <div className="mt-auto">
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{card.value}</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyTrendChart data={monthlyData} />
        <DepartmentChart data={departmentData.length > 0 ? departmentData : [{ name: "No Data", value: 1 }]} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StageDistributionChart data={stageData.length > 0 ? stageData : [{ name: "No Data", value: 1 }]} />
        <SLAPerformanceChart data={slaChartData} />
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between p-6 lg:px-8 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-indigo-500" />
              My Procurement Requests
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">All requests you have submitted</p>
          </div>
          <Link
            href="/team/requests"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-6 lg:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source No</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Stage</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending</th>
                <th className="text-left px-6 lg:px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 lg:px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-2 shadow-sm">
                        <ShoppingCart className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">No requests yet</p>
                      <Link
                        href="/team/requests/new"
                        className="mt-2 px-5 py-2 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        Create your first request
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recentRequests.map((r) => (
                  <tr 
                    key={r.id} 
                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/team/requests/${r.id}`)}
                  >
                    <td className="px-6 lg:px-8 py-4">
                      <span className="text-indigo-600 group-hover:text-indigo-700 font-bold text-xs tracking-wide">
                        {r.sourceNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="truncate text-xs font-medium text-slate-700">{r.sourceDescription}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.department?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider", getStageColor(r.currentStage as CurrentStage))}>
                        {getStageName(r.currentStage as CurrentStage)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider border", getSLAColor(r.slaStatus as SLAStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {r.pendingDays != null ? `${r.pendingDays} days` : "—"}
                    </td>
                    <td className="px-6 lg:px-8 py-4 text-xs font-medium text-slate-500">
                      {formatDate(r.createdAt)}
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
