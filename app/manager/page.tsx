import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { ManagerDashboardClient } from "./ManagerDashboardClient";

export const metadata: Metadata = { title: "Manager Dashboard" };
export const dynamic = "force-dynamic";
export const revalidate = 0;


async function getDashboardData() {
  const [
    total,
    pendingCS,
    pendingPR,
    pendingPO,
    pendingDispatch,
    completed,
    cancelled,
    overdue,
    recentRequests,
    departmentData,
    stageData,
    allRequests,
  ] = await Promise.all([
    prisma.procurementRequest.count({ where: { isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: "CS", isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: "PR", isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: "PO", isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: { in: ["MDD", "MRD", "WCD", "PAR", "PDD"] }, isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: "COMPLETED", isDeleted: false } }),
    prisma.procurementRequest.count({ where: { currentStage: "CANCELLED", isDeleted: false } }),
    prisma.procurementRequest.count({ where: { slaStatus: "OVERDUE", isDeleted: false } }),
    prisma.procurementRequest.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      include: { _count: { select: { procurementRequests: { where: { isDeleted: false } } } } },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.procurementRequest.groupBy({
      by: ["currentStage"],
      where: { isDeleted: false },
      _count: { id: true },
    }),
    prisma.procurementRequest.findMany({
      where: { isDeleted: false },
      select: { createdAt: true, currentStage: true, slaStatus: true },
    }),
  ]);

  // Calculate dynamic monthly data based on available dataset range
  let monthlyData: any[] = [];
  const validRequests = allRequests.filter(r => r.createdAt);
  
  if (validRequests.length > 0) {
    const dates = validRequests.map(r => r.createdAt.getTime());
    const maxDate = new Date(Math.max(...dates, Date.now()));

    // Ensure the graph always shows the last 6 months (maxDate minus 5 months)
    const minDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - 5, 1);

    const monthMap = new Map<string, { month: string, total: number, completed: number, overdue: number }>();
    
    // Generate all months from minDate to maxDate (inclusive)
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    
    while (current <= end) {
      const m = current.toLocaleString('en-US', { month: 'short' });
      // If we cross into a new year, you might want to show the year, e.g. "Jan 26"
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
    // Fallback if no records exist, show last 6 months anyway
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

  // Calculate dynamic SLA Chart Data
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

  allRequests.forEach(r => {
    const stage = r.currentStage;
    if (slaDist[stage]) {
      if (r.slaStatus === "ON_TRACK" || r.slaStatus === "COMPLETED") slaDist[stage].onTrack++;
      if (r.slaStatus === "AT_RISK") slaDist[stage].atRisk++;
      if (r.slaStatus === "OVERDUE") slaDist[stage].overdue++;
    }
  });

  const slaChartData = Object.values(slaDist).filter(d => d.onTrack > 0 || d.atRisk > 0 || d.overdue > 0);

  const currentMonthData = monthlyData[monthlyData.length - 1];
  const lastMonthData = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  const totalTrend = lastMonthData && lastMonthData.total > 0
    ? Math.round(((currentMonthData.total - lastMonthData.total) / lastMonthData.total) * 100)
    : 0;

  const completedTrend = lastMonthData && lastMonthData.completed > 0
    ? Math.round(((currentMonthData.completed - lastMonthData.completed) / lastMonthData.completed) * 100)
    : 0;

  return {
    kpi: { total, pendingCS, pendingPR, pendingPO, pendingDispatch, completed, cancelled, overdue,
      avgSLA: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100,
      totalTrend, completedTrend },
    recentRequests,
    departmentData: departmentData
      .map((d) => ({ name: d.name, value: d._count.procurementRequests }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
    stageData: stageData.map((s) => ({ name: s.currentStage, value: s._count.id })),
    monthlyData,
    slaChartData,
  };
}

export default async function ManagerDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const data = await getDashboardData();

  return <ManagerDashboardClient data={data} userName={session.user.name ?? "Manager"} />;
}
