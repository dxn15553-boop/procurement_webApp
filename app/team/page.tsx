import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { cn, formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import { ShoppingCart, Plus, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  SourceSummaryChart,
  MonthlyTrendChart,
  DepartmentChart,
  StageDistributionChart,
  SLAPerformanceChart,
} from "@/components/charts/DashboardCharts";
import type { CurrentStage, SLAStatus } from "@/types";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function TeamDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const userId = session.user.id!;

  const [total, active, completed, overdue, cancelled, recent, deptRaw, stageRaw, allReqs] = await Promise.all([
    prisma.procurementRequest.count({ where: { createdById: userId } }),
    prisma.procurementRequest.count({ where: { createdById: userId, NOT: { currentStage: { in: ["COMPLETED", "CANCELLED"] } } } }),
    prisma.procurementRequest.count({ where: { createdById: userId, currentStage: "COMPLETED" } }),
    prisma.procurementRequest.count({ where: { createdById: userId, slaStatus: "OVERDUE" } }),
    prisma.procurementRequest.count({ where: { createdById: userId, currentStage: "CANCELLED" } }),
    prisma.procurementRequest.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      include: { _count: { select: { procurementRequests: { where: { createdById: userId, isDeleted: false } } } } },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.procurementRequest.groupBy({
      by: ["currentStage"],
      where: { createdById: userId, isDeleted: false },
      _count: { id: true },
    }),
    prisma.procurementRequest.findMany({
      where: { createdById: userId, isDeleted: false },
      select: { createdAt: true, currentStage: true, slaStatus: true },
    }),
  ]);

  const departmentData = deptRaw
    .map((d) => ({ name: d.name, value: d._count.procurementRequests }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const stageData = stageRaw.map((s) => ({ name: s.currentStage, value: s._count.id }));

  let monthlyData: any[] = [];
  const validRequests = allReqs.filter(r => r.createdAt);
  
  if (validRequests.length > 0) {
    const dates = validRequests.map(r => r.createdAt.getTime());
    const maxDate = new Date(Math.max(...dates, Date.now()));
    const minDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);
    const monthMap = new Map<string, { month: string, total: number, completed: number, overdue: number }>();
    
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    
    while (current <= end) {
      const m = current.toLocaleString('en-US', { month: 'short' });
      const label = current.getFullYear() !== end.getFullYear() ? `${m} '${current.getFullYear().toString().slice(2)}` : m;
      monthMap.set(`${current.getFullYear()}-${current.getMonth()}`, { month: label, total: 0, completed: 0, overdue: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    validRequests.forEach(req => {
      const key = `${req.createdAt.getFullYear()}-${req.createdAt.getMonth()}`;
      if (monthMap.has(key)) {
        const entry = monthMap.get(key)!;
        entry.total++;
        if (req.currentStage === "COMPLETED") entry.completed++;
        if (req.slaStatus === "OVERDUE") entry.overdue++;
      }
    });

    monthlyData = Array.from(monthMap.values());
  } else {
    const maxDate = new Date();
    const minDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);
    const monthMap = new Map<string, { month: string, total: number, completed: number, overdue: number }>();
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    while (current <= end) {
      const m = current.toLocaleString('en-US', { month: 'short' });
      const label = current.getFullYear() !== end.getFullYear() ? `${m} '${current.getFullYear().toString().slice(2)}` : m;
      monthMap.set(`${current.getFullYear()}-${current.getMonth()}`, { month: label, total: 0, completed: 0, overdue: 0 });
      current.setMonth(current.getMonth() + 1);
    }
    monthlyData = Array.from(monthMap.values());
  }

  const slaDist: Record<string, { name: string, onTrack: number, atRisk: number, overdue: number }> = {
    CS: { name: "CS", onTrack: 0, atRisk: 0, overdue: 0 },
    PR: { name: "PR", onTrack: 0, atRisk: 0, overdue: 0 },
    PO: { name: "PO", onTrack: 0, atRisk: 0, overdue: 0 },
    PAR: { name: "PAR", onTrack: 0, atRisk: 0, overdue: 0 },
    PDD: { name: "PDD", onTrack: 0, atRisk: 0, overdue: 0 },
    MDD: { name: "MDD", onTrack: 0, atRisk: 0, overdue: 0 },
    MRD: { name: "MRD", onTrack: 0, atRisk: 0, overdue: 0 },
    WCD: { name: "WCD", onTrack: 0, atRisk: 0, overdue: 0 },
  };

  allReqs.forEach(r => {
    const stage = r.currentStage;
    if (slaDist[stage]) {
      if (r.slaStatus === "ON_TRACK" || r.slaStatus === "COMPLETED") slaDist[stage].onTrack++;
      if (r.slaStatus === "AT_RISK") slaDist[stage].atRisk++;
      if (r.slaStatus === "OVERDUE") slaDist[stage].overdue++;
    }
  });

  const slaChartData = Object.values(slaDist).filter(d => d.onTrack > 0 || d.atRisk > 0 || d.overdue > 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            My Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your procurement requests.
          </p>
        </div>
        <Link
          href="/team/requests"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Enter Spreadsheet
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Requests" value={total} icon="shopping-cart" color="blue" />
        <KPICard title="Active" value={active} icon="clock" color="amber" />
        <KPICard title="Completed" value={completed} icon="check-circle" color="green" />
        <KPICard title="Overdue" value={overdue} icon="alert-triangle" color="red" />
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
        <SourceSummaryChart data={[{ name: "Metrics", total, active, cancelled }]} />
        <StageDistributionChart data={stageData.length > 0 ? stageData : [{ name: "No Data", value: 1 }]} />
        <SLAPerformanceChart data={slaChartData} />
      </div>

      {/* My Requests Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">My Procurement Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All requests you have submitted</p>
          </div>
          <Link
            href="/team/requests"
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            View all →
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Pending Days</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No requests yet</p>
                      <Link
                        href="/team/requests/new"
                        className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Create your first request
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/team/requests/${r.id}`} className="text-primary hover:underline font-medium text-xs">
                        {r.sourceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="truncate text-xs">{r.sourceDescription}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", getStageColor(r.currentStage as CurrentStage))}>
                        {getStageName(r.currentStage as CurrentStage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", getSLAColor(r.slaStatus as SLAStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.pendingDays != null ? `${r.pendingDays} days` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
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
