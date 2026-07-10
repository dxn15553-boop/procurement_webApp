import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReportClient } from "./ReportClient";

export const metadata: Metadata = { title: "Reports Center" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const [departments, vendors] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.vendor.findMany({ where: { isActive: true } }),
  ]);

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
