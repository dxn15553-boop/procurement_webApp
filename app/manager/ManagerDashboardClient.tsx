"use client";

import { KPICard } from "@/components/dashboard/KPICard";
import {
  MonthlyTrendChart,
  DepartmentChart,
  StageDistributionChart,
  SLAPerformanceChart,
  SourceSummaryChart,
  KPISummaryChart,
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

  const kpiChartData = [
    { name: "Total", value: kpi.total, fill: "#3b82f6" },
    { name: "Pending CS", value: kpi.pendingCS, fill: "#f59e0b" },
    { name: "Pending PR", value: kpi.pendingPR, fill: "#a855f7" },
    { name: "Pending PO", value: kpi.pendingPO, fill: "#6366f1" },
    { name: "Pending Dispatch", value: kpi.pendingDispatch, fill: "#06b6d4" },
    { name: "Completed", value: kpi.completed, fill: "#22c55e" },
    { name: "Cancelled", value: kpi.cancelled, fill: "#ef4444" },
    { name: "Overdue", value: kpi.overdue, fill: "#dc2626" },
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            New Request
          </Link>
        </div>
      </div>

      {/* KPI Summary Chart */}
      <div className="grid grid-cols-1 gap-4">
        <KPISummaryChart data={kpiChartData} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyTrendChart data={monthlyData} />
        </div>
        <DepartmentChart data={departmentData.length > 0 ? departmentData : [{ name: "No Data", value: 1 }]} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SourceSummaryChart data={[{ name: "Metrics", total: kpi.total, active: kpi.activeSource, cancelled: kpi.cancelled }]} />
        <StageDistributionChart data={stageData.length > 0 ? stageData : [{ name: "No Data", value: 1 }]} />
        <SLAPerformanceChart data={slaChartData} />
      </div>



      {/* Recent Requests Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Requests
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest procurement activity</p>
          </div>
          <Link
            href="/manager/requests"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Source No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Handler</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No procurement requests yet. <Link href="/manager/requests/new" className="text-primary hover:underline">Create one</Link>.
                  </td>
                </tr>
              ) : (
                recentRequests.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/manager/requests/${r.id}`} className="text-primary hover:underline font-medium text-xs">
                        {r.sourceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="truncate text-xs text-foreground">{r.sourceDescription}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", getStageColor(r.currentStage))}>
                        {getStageName(r.currentStage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", getSLAColor(r.slaStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.nameOfHandler}</td>
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
