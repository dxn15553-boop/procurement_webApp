import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { cn, formatDate, getSLAColor, getStageColor, getStageName } from "@/lib/utils";
import { ShoppingCart, Plus, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import type { CurrentStage, SLAStatus } from "@/types";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function TeamDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const userId = session.user.id!;

  const [total, active, completed, overdue, recent] = await Promise.all([
    prisma.procurementRequest.count({ where: { createdById: userId } }),
    prisma.procurementRequest.count({ where: { createdById: userId, NOT: { currentStage: { in: ["COMPLETED", "CANCELLED"] } } } }),
    prisma.procurementRequest.count({ where: { createdById: userId, currentStage: "COMPLETED" } }),
    prisma.procurementRequest.count({ where: { createdById: userId, slaStatus: "OVERDUE" } }),
    prisma.procurementRequest.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            My Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage your procurement requests.
          </p>
        </div>
        <Link
          href="/team/requests"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Enter Spreadsheet
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Requests" value={total} icon="shopping-cart" color="blue" />
        <KPICard title="Active" value={active} icon="clock" color="amber" />
        <KPICard title="Completed" value={completed} icon="check-circle" color="green" />
        <KPICard title="Overdue" value={overdue} icon="alert-triangle" color="red" />
      </div>

      {/* My Requests Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">My Procurement Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All requests you have submitted</p>
          </div>
          <Link
            href="/team/requests"
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Source No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Pending Days</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No requests yet</p>
                      <Link
                        href="/team/requests/new"
                        className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Create your first request
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/team/requests/${r.id}`} className="text-primary hover:underline font-medium text-xs">
                        {r.sourceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="truncate text-xs">{r.sourceDescription}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", getStageColor(r.currentStage as CurrentStage))}>
                        {getStageName(r.currentStage as CurrentStage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", getSLAColor(r.slaStatus as SLAStatus))}>
                        {r.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.pendingDays != null ? `${r.pendingDays} days` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
