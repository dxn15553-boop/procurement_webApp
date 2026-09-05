import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { cn, formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import { TeamDashboardClient } from "./TeamDashboardClient";
import type { CurrentStage, SLAStatus } from "@/types";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function TeamDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const userId = session.user.id!;

  const userCondition = {
    isDeleted: false,
    OR: [
      { createdById: userId },
      { handlerId: userId },
      ...(session.user.name ? [{ nameOfHandler: { equals: session.user.name, mode: "insensitive" as const } }] : []),
    ],
  };

  const [total, active, completed, overdue, cancelled, recent, deptRaw, stageRaw, allReqs] = await Promise.all([
    prisma.procurementRequest.count({ where: userCondition }),
    prisma.procurementRequest.count({ where: { ...userCondition, NOT: { currentStage: { in: ["COMPLETED", "CANCELLED"] } } } }),
    prisma.procurementRequest.count({ where: { ...userCondition, currentStage: "COMPLETED" } }),
    prisma.procurementRequest.count({ where: { ...userCondition, slaStatus: "OVERDUE" } }),
    prisma.procurementRequest.count({ where: { ...userCondition, currentStage: "CANCELLED" } }),
    prisma.procurementRequest.findMany({
      where: userCondition,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      include: { _count: { select: { procurementRequests: { where: userCondition } } } },
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.procurementRequest.groupBy({
      by: ["currentStage"],
      where: userCondition,
      _count: { id: true },
    }),
    prisma.procurementRequest.findMany({
      where: userCondition,
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

  const dashboardData = {
    kpi: {
      total,
      active,
      completed,
      cancelled,
      overdue,
    },
    recentRequests: recent.map(r => ({
      id: r.id,
      sourceNo: r.sourceNo,
      sourceDescription: r.sourceDescription,
      currentStage: r.currentStage as CurrentStage,
      slaStatus: r.slaStatus as SLAStatus,
      createdAt: r.createdAt,
      pendingDays: r.pendingDays,
      department: r.department,
      vendor: r.vendor,
    })),
    departmentData,
    stageData,
    monthlyData,
    slaChartData,
  };

  return <TeamDashboardClient data={dashboardData} userName={session.user.name || "Team Member"} />;
}
