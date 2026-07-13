import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    total,
    pendingCS,
    pendingPR,
    pendingPO,
    pendingDispatch,
    completed,
    cancelled,
    overdue,
    departmentData,
    stageData,
    monthlyData,
  ] = await Promise.all([
    prisma.procurementRequest.count(),
    prisma.procurementRequest.count({ where: { currentStage: "CS" } }),
    prisma.procurementRequest.count({ where: { currentStage: "PR" } }),
    prisma.procurementRequest.count({ where: { currentStage: "PO" } }),
    prisma.procurementRequest.count({ where: { currentStage: "MDD" } }),
    prisma.procurementRequest.count({ where: { currentStage: "COMPLETED" } }),
    prisma.procurementRequest.count({ where: { currentStage: "CANCELLED" } }),
    prisma.procurementRequest.count({ where: { slaStatus: "OVERDUE" } }),
    prisma.department.findMany({
      include: { _count: { select: { procurementRequests: true } } },
      where: { isActive: true },
    }),
    prisma.procurementRequest.groupBy({
      by: ["currentStage"],
      _count: { id: true },
    }),
    // Get last 6 months data
    prisma.$queryRaw`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as total,
        SUM(CASE WHEN currentStage = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN slaStatus = 'OVERDUE' THEN 1 ELSE 0 END) as overdue
      FROM ProcurementRequest
      WHERE createdAt >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month ASC
    `,
  ]);

  const kpi = {
    total,
    pendingCS,
    pendingPR,
    pendingPO,
    pendingDispatch,
    completed,
    cancelled,
    overdue,
    avgSLA: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100,
  };

  const department = departmentData.map((d) => ({
    name: d.name,
    value: d._count.procurementRequests,
  }));

  const stage = stageData.map((s) => ({
    name: s.currentStage,
    value: s._count.id,
  }));

  return NextResponse.json({ kpi, department, stage, monthly: monthlyData });
}

export const runtime = "nodejs";
