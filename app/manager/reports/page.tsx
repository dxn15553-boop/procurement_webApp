import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReportClient } from "./ReportClient";

export const metadata: Metadata = { title: "Reports Center" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const [departmentsRaw, vendorsRaw] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const deptSeen = new Set<string>();
  const departments = departmentsRaw.filter((d) => {
    const key = d.name.trim().toLowerCase();
    if (deptSeen.has(key)) return false;
    deptSeen.add(key);
    return true;
  });

  const vendSeen = new Set<string>();
  const vendors = vendorsRaw.filter((v) => {
    const key = v.name.trim().toLowerCase();
    if (vendSeen.has(key)) return false;
    vendSeen.add(key);
    return true;
  });

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Generate Excel/PDF reports and SLA compliance audits</p>
      </div>
      <ReportClient departments={departments} vendors={vendors} />
    </div>
  );
}
