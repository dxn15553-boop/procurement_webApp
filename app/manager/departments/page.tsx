import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { DepartmentListClient } from "./DepartmentListClient";

export const metadata: Metadata = { title: "Departments Management" };

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const departments = await prisma.department.findMany({
    include: {
      _count: { select: { users: true, procurementRequests: true } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Departments</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage enterprise departments and assign heads</p>
      </div>
      <DepartmentListClient initialDepartments={departments} />
    </div>
  );
}
