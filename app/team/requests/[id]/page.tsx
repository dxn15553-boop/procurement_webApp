import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import { formatDate, getSLAColor, getStageColor, getStageName, cn } from "@/lib/utils";
import { ArrowLeft, Calendar, User, Building2, Clock } from "lucide-react";
import Link from "next/link";
import type { CurrentStage, SLAStatus } from "@/types";

export const metadata: Metadata = { title: "Request Details" };

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export default async function TeamRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const { id } = await params;

  const request = await prisma.procurementRequest.findUnique({
    where: { id, createdById: session.user.id! },
    include: {
      department: true,
      vendor: true,
      createdBy: { select: { name: true, email: true } },
      activityLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!request) notFound();

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/team/requests" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{request.sourceNo}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{request.sourceDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", getStageColor(request.currentStage as CurrentStage))}>
            {getStageName(request.currentStage as CurrentStage)}
          </span>
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getSLAColor(request.slaStatus as SLAStatus))}>
            {request.slaStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Source Info */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" />
          Source Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Source No" value={request.sourceNo} />
          <Field label="Source Date" value={formatDate(request.sourceDate)} />
          <Field label="Department" value={request.department?.name} />
          <Field label="Vendor" value={request.vendor?.name} />
          <div className="col-span-2 md:col-span-4">
            <Field label="Description" value={request.sourceDescription} />
          </div>
        </div>
      </div>

      {/* CS & PR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Comparative Statement</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Comparative Date" value={formatDate(request.comparativeDate)} />
            <Field label="Days for CS" value={request.daysForCS != null ? `${request.daysForCS} days` : null} />
            <Field label="CS Status" value={request.csStatus} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Purchase Requisition</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="PR Number" value={request.prNumber} />
            <Field label="PR Date" value={formatDate(request.prDate)} />
            <Field label="Days for PR" value={request.daysForPR != null ? `${request.daysForPR} days` : null} />
            <Field label="PR Status" value={request.prStatus} />
          </div>
        </div>
      </div>

      {/* PO & Dates */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-500" />
          Purchase Order & Milestone Dates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="PO Number" value={request.poNumber} />
          <Field label="PO Date" value={formatDate(request.poDate)} />
          <Field label="PRL No" value={request.prlNo} />
          <Field label="PRL Date" value={formatDate(request.prlDate)} />
          <Field label="Dispatch Date" value={formatDate(request.materialDispatchDate)} />
          <Field label="Received Date" value={formatDate(request.materialReceivedDate)} />
          <Field label="Work Completion" value={formatDate(request.workCompletionDate)} />
          <Field label="Cancellation Date" value={formatDate(request.sourceCancellationDate)} />
        </div>
      </div>

      {/* Handler */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          Handler & Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Handler Name" value={request.nameOfHandler} />
          <Field label="Current Status" value={request.currentStatusByHandler} />
          <Field label="Current Stage" value={request.currentStage} />
          <Field label="No. of Days" value={request.noOfDays != null ? `${request.noOfDays} days` : null} />
          <Field label="Pending From" value={formatDate(request.pendingFrom)} />
          <Field label="Pending Days" value={request.pendingDays != null ? `${request.pendingDays} days` : null} />
          <Field label="SLA Status" value={request.slaStatus.replace("_", " ")} />
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Created By" value={request.createdBy?.name} />
          <Field label="Created Date" value={formatDate(request.createdAt)} />
          <Field label="Last Updated" value={formatDate(request.updatedAt)} />
        </div>
      </div>

      {/* Activity Log */}
      {request.activityLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            Activity Log
          </h3>
          <div className="space-y-3">
            {request.activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{log.user.name}</span>
                  <span className="text-muted-foreground"> {log.action.toLowerCase()}</span>
                  {log.fieldName && <span className="text-muted-foreground"> — {log.fieldName}</span>}
                  <span className="block text-muted-foreground mt-0.5">{formatDate(log.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
