import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnalyticsClient, AnalyticsData } from "./AnalyticsClient";

async function getAnalyticsData(): Promise<AnalyticsData> {
  const [departments, users, vendors, requests] = await Promise.all([
    prisma.department.findMany({ include: { procurementRequests: { where: { isDeleted: false } } } }),
    prisma.user.findMany({ where: { role: "TEAM" }, include: { procurementRequests: { where: { isDeleted: false } } } }),
    prisma.vendor.findMany({ include: { procurementRequests: { where: { isDeleted: false } } } }),
    prisma.procurementRequest.findMany({ where: { isDeleted: false } }),
  ]);

  // 1. SLA by Department
  const slaDepartmentData = departments.map((dept) => {
    let onTrack = 0, atRisk = 0, overdue = 0;
    dept.procurementRequests.forEach((req) => {
      if (req.slaStatus === "ON_TRACK" || req.slaStatus === "COMPLETED") onTrack++;
      else if (req.slaStatus === "AT_RISK") atRisk++;
      else if (req.slaStatus === "OVERDUE") overdue++;
    });
    return { name: dept.name, onTrack, atRisk, overdue, total: onTrack + atRisk + overdue };
  }).filter(d => d.total > 0).map(({ total, ...rest }) => rest);

  // 2. Average Processing Time (Dynamic)
  let sumCS = 0, countCS = 0;
  let sumPR = 0, countPR = 0;
  let sumPO = 0, countPO = 0;
  let sumPay = 0, countPay = 0;
  
  requests.forEach(req => {
    if (req.daysForCS != null) { sumCS += req.daysForCS; countCS++; }
    if (req.daysForPR != null) { sumPR += req.daysForPR; countPR++; }
    if (req.daysForPO != null) { sumPO += req.daysForPO; countPO++; }
    if (req.daysForPayment != null) { sumPay += req.daysForPayment; countPay++; }
  });

  const stageTimeData = [
    { stage: "CS", avgDays: countCS > 0 ? Math.round(sumCS / countCS) : 0 },
    { stage: "PR", avgDays: countPR > 0 ? Math.round(sumPR / countPR) : 0 },
    { stage: "PO", avgDays: countPO > 0 ? Math.round(sumPO / countPO) : 0 },
    { stage: "Payment", avgDays: countPay > 0 ? Math.round(sumPay / countPay) : 0 },
  ];

  // 3. Handler Workload
  const handlerMap = new Map<string, number>();
  requests.forEach((req) => {
    if (req.currentStage !== "COMPLETED" && req.currentStage !== "CANCELLED" && req.nameOfHandler) {
      handlerMap.set(req.nameOfHandler, (handlerMap.get(req.nameOfHandler) || 0) + 1);
    }
  });
  const handlerWorkloadData = Array.from(handlerMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

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
