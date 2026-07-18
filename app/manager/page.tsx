import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { ManagerDashboardClient } from "./ManagerDashboardClient";

export const metadata: Metadata = { title: "Manager Dashboard" };

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
  ] = await Promise.all([
    prisma.procurementRequest.count(),
    prisma.procurementRequest.count({ where: { currentStage: "CS" } }),
    prisma.procurementRequest.count({ where: { currentStage: "PR" } }),
    prisma.procurementRequest.count({ where: { currentStage: "PO" } }),
    prisma.procurementRequest.count({ where: { currentStage: { in: ["MDD", "MRD", "WCD", "PAR", "PDD"] } } }),
    prisma.procurementRequest.count({ where: { currentStage: "COMPLETED" } }),
    prisma.procurementRequest.count({ where: { currentStage: "CANCELLED" } }),
    prisma.procurementRequest.count({ where: { slaStatus: "OVERDUE" } }),
    prisma.procurementRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      include: { _count: { select: { procurementRequests: true } } },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.procurementRequest.groupBy({
      by: ["currentStage"],
      _count: { id: true },
    }),
  ]);

  return {
    kpi: { total, pendingCS, pendingPR, pendingPO, pendingDispatch, completed, cancelled, overdue,
      avgSLA: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100 },
    recentRequests,
    departmentData: departmentData.map((d) => ({ name: d.name, value: d._count.procurementRequests })),
    stageData: stageData.map((s) => ({ name: s.currentStage, value: s._count.id })),
    monthlyData: [
      { month: "Jan", total: 12, completed: 8, overdue: 2 },
      { month: "Feb", total: 18, completed: 14, overdue: 3 },
      { month: "Mar", total: 15, completed: 12, overdue: 1 },
      { month: "Apr", total: 22, completed: 17, overdue: 4 },
      { month: "May", total: 20, completed: 16, overdue: 2 },
      { month: "Jun", total: 28, completed: 22, overdue: 5 },
    ],
  };
}

export default async function ManagerDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const data = await getDashboardData();

  return <ManagerDashboardClient data={data} userName={session.user.name ?? "Manager"} />;
}
