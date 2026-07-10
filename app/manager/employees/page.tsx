import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { EmployeeListClient } from "./EmployeeListClient";

export const metadata: Metadata = { title: "Employees Management" };

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const [employees, departments] = await Promise.all([
    prisma.user.findMany({
      include: {
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
    }),
  ]);

  const safeEmployees = employees.map(({ passwordHash: _pw, ...e }) => e);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Employees</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage procurement handlers, roles and access control</p>
      </div>
      <EmployeeListClient initialEmployees={safeEmployees} departments={departments} />
    </div>
  );
}
