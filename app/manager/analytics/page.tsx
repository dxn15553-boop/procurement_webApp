import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnalyticsClient, AnalyticsData } from "./AnalyticsClient";

async function getAnalyticsData(): Promise<AnalyticsData> {
  const [departments, users, vendors, requests] = await Promise.all([
    prisma.department.findMany({ include: { procurementRequests: true } }),
    prisma.user.findMany({ where: { role: "TEAM" }, include: { procurementRequests: true } }),
    prisma.vendor.findMany({ include: { procurementRequests: true } }),
    prisma.procurementRequest.findMany(),
  ]);

  // 1. SLA by Department
  const slaDepartmentData = departments.map((dept) => {
    let onTrack = 0, atRisk = 0, overdue = 0;
    dept.procurementRequests.forEach((req) => {
      if (req.slaStatus === "ON_TRACK" || req.slaStatus === "COMPLETED") onTrack++;
      else if (req.slaStatus === "AT_RISK") atRisk++;
      else if (req.slaStatus === "OVERDUE") overdue++;
    });
    return { name: dept.name, onTrack, atRisk, overdue };
  });

  // 2. Average Processing Time (Mocked logic for simplicity, real logic would use dates)
  // In a real app we'd calculate diffs, here we use noOfDays field or mock if not present
  const stageTimeData = [
    { stage: "CS", avgDays: 4 },
    { stage: "PR", avgDays: 8 },
    { stage: "PO", avgDays: 12 },
    { stage: "MDD", avgDays: 15 },
    { stage: "MRD", avgDays: 5 },
  ];

  // 3. Handler Workload
  const handlerWorkloadData = users
    .map((user) => ({
      name: user.name,
      value: user.procurementRequests.filter(r => r.currentStage !== "COMPLETED" && r.currentStage !== "CANCELLED").length,
    }))
    .filter(u => u.value > 0);

  // 4. Vendor Performance (Requests per vendor)
  const vendorPerformanceData = vendors
    .map((vendor) => ({
      name: vendor.name,
      value: vendor.procurementRequests.length,
    }))
    .filter(v => v.value > 0);

  // Overview metrics
  const totalRequests = requests.length;
  const overdueCount = requests.filter((r) => r.slaStatus === "OVERDUE").length;
  const atRiskCount = requests.filter((r) => r.slaStatus === "AT_RISK").length;
  
  const avgSLA = totalRequests > 0 ? Math.round(((totalRequests - overdueCount) / totalRequests) * 100) : 100;

  return {
    slaDepartmentData,
    stageTimeData,
    handlerWorkloadData: handlerWorkloadData.length > 0 ? handlerWorkloadData : [{ name: "No Active Handlers", value: 1 }],
    vendorPerformanceData: vendorPerformanceData.length > 0 ? vendorPerformanceData : [{ name: "No Vendors", value: 1 }],
    overview: {
      totalRequests,
      avgSLA,
      criticalRequests: overdueCount + atRiskCount,
    },
  };
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const data = await getAnalyticsData();

  return <AnalyticsClient data={data} />;
}
