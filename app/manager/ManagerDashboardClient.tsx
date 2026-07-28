"use client";

import { KPICard } from "@/components/dashboard/KPICard";
import {
  MonthlyTrendChart,
  DepartmentChart,
  StageDistributionChart,
  SLAPerformanceChart,
} from "@/components/charts/DashboardCharts";
import { formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import {
  ShoppingCart, CheckCircle2, XCircle, AlertTriangle,
  Clock, TrendingUp, Truck, FileText, BarChart3, Activity,
  ArrowRight, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CurrentStage, SLAStatus } from "@/types";

interface DashboardData {
  kpi: {
    total: number; activeSource: number; pendingCS: number; pendingPR: number; pendingPO: number;
    pendingDispatch: number; completed: number; cancelled: number; overdue: number; avgSLA: number;
    totalTrend?: number; completedTrend?: number;
    csDone: number; prDone: number; poDone: number; paymentDone: number; pendingPayment: number; materialDone: number;
  };
  recentRequests: Array<{
    id: string; sourceNo: string; sourceDescription: string; currentStage: CurrentStage;
    slaStatus: SLAStatus; createdAt: Date; nameOfHandler: string;
    department?: { name: string } | null;
    vendor?: { name: string } | null;
    createdBy?: { name: string } | null;
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

export function ManagerDashboardClient({ data, userName }: Props) {
  const { kpi, recentRequests, departmentData, stageData, monthlyData, slaChartData } = data;

  const kpiCards = [
    { type: "single", label: "TOTAL SOURCE", value: kpi.total, icon: <BarChart3 className="w-5 h-5 text-slate-700" />, iconBg: "bg-slate-100" },
    { type: "single", label: "CANCELLED", value: kpi.cancelled, icon: <XCircle className="w-5 h-5 text-red-500" />, iconBg: "bg-red-50" },
    { type: "single", label: "ACTIVE SOURCE", value: kpi.activeSource, icon: <Activity className="w-5 h-5 text-indigo-600" />, iconBg: "bg-indigo-50" },
    { type: "dual", label: "CS STATUS", done: kpi.csDone, pending: kpi.pendingCS, icon: <FileText className="w-5 h-5 text-blue-500" />, iconBg: "bg-blue-50" },
    { type: "dual", label: "PR STATUS", done: kpi.prDone, pending: kpi.pendingPR, icon: <ShoppingCart className="w-5 h-5 text-cyan-500" />, iconBg: "bg-cyan-50" },
    { type: "dual", label: "PO STATUS", done: kpi.poDone, pending: kpi.pendingPO, icon: <FileText className="w-5 h-5 text-emerald-500" />, iconBg: "bg-emerald-50" },
    { type: "dual", label: "PAYMENT STATUS", done: kpi.paymentDone, pending: kpi.pendingPayment, icon: <Activity className="w-5 h-5 text-purple-500" />, iconBg: "bg-purple-50" },
    { type: "dual", label: "MATERIAL STATUS", done: kpi.materialDone, pending: kpi.pendingDispatch, icon: <Truck className="w-5 h-5 text-orange-500" />, iconBg: "bg-orange-50" },
    { type: "single", label: "WORK COMPLETED", value: kpi.completed, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, iconBg: "bg-emerald-50" },
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
            Here&apos;s what&apos;s happening with your procurement today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/manager/requests/new"
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
            
            {card.type === "single" ? (
              <div className="mt-auto">
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{card.value}</p>
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400">{card.label}</p>
              </div>
            ) : (
              <div className="mt-auto">
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-2">{card.label}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{card.done}</p>
                    <p className="text-[8px] font-bold tracking-widest uppercase text-slate-400">DONE</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-orange-500 tracking-tight leading-none mb-1">{card.pending}</p>
                    <p className="text-[8px] font-bold tracking-widest uppercase text-slate-400">PENDING</p>
                  </div>
                </div>
              </div>
            )}
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
              Recent Requests
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Latest procurement activity</p>
          </div>
          <Link
            href="/manager/requests"
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
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Handler</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 lg:px-8 py-12 text-center text-slate-500 font-medium text-sm bg-slate-50/30">
                    No procurement requests yet. <Link href="/manager/requests/new" className="text-indigo-600 hover:underline font-bold">Create one</Link>.
                  </td>
                </tr>
              ) : (
                recentRequests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 lg:px-8 py-4">
                      <Link href={`/manager/requests/${r.id}`} className="text-indigo-600 hover:text-indigo-700 font-bold text-xs tracking-wide">
                        {r.sourceNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4 max-w-48">
                      <p className="truncate text-xs font-medium text-slate-700">{r.sourceDescription}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.department?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider", getStageColor(r.currentStage))}>
                        {getStageName(r.currentStage)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border", getSLAColor(r.slaStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.nameOfHandler}</td>
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
