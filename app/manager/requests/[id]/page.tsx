import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import { formatDate, getSLAColor, getStageColor, getStageName, cn } from "@/lib/utils";
import { ArrowLeft, Edit, Calendar, User, Building2, Store, Clock } from "lucide-react";
import Link from "next/link";
import type { CurrentStage, SLAStatus } from "@/types";

export const metadata: Metadata = { title: "Request Details" };

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">{label}</p>
      <div className="w-full px-4 py-3 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium uppercase min-h-[46px] flex items-center">
        {value ?? "—"}
      </div>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const isManager = session.user.role === "MANAGER";

  const request = await prisma.procurementRequest.findUnique({
    where: isManager ? { id } : { id, createdById: session.user.id! },
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

  const basePath = isManager ? "/manager" : "/team";

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`${basePath}/requests`} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{request.sourceNo}</h1>
            <p className="text-sm text-slate-500 mt-1 uppercase tracking-wider font-medium">{request.sourceDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold tracking-wider", getStageColor(request.currentStage as CurrentStage))}>
            {getStageName(request.currentStage as CurrentStage)}
          </span>
          <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border", getSLAColor(request.slaStatus as SLAStatus))}>
            {request.slaStatus.replace("_", " ")}
          </span>
          {isManager && (
            <Link
              href={`/manager/requests/${request.id}/edit`}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
            >
              <Edit className="w-4 h-4" />
              Edit Request
            </Link>
          )}
        </div>
      </div>

      {/* Source Info */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">1</span>
          Source Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Source No" value={request.sourceNo} />
          <Field label="Source Date" value={formatDate(request.sourceDate)} />
          <Field label="Department" value={request.department?.name} />
          <Field label="Vendor Name" value={request.vendor?.name} />
          <div className="md:col-span-2 lg:col-span-4">
            <Field label="Description" value={request.sourceDescription} />
          </div>
        </div>
      </div>

      {/* CS & PR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">2</span>
            Comparative Statement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Comparative Date" value={formatDate(request.comparativeDate)} />
            <Field label="Days for CS" value={request.daysForCS != null ? `${request.daysForCS} days` : null} />
            <div className="md:col-span-2">
              <Field label="CS Status" value={request.csStatus} />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">3</span>
            Purchase Requisition
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="PR Number" value={request.prNumber} />
            <Field label="PR Date" value={formatDate(request.prDate)} />
            <Field label="Days for PR" value={request.daysForPR != null ? `${request.daysForPR} days` : null} />
            <Field label="PR Status" value={request.prStatus} />
          </div>
        </div>
      </div>

      {/* PO & PRL */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">4</span>
          Purchase Order & PRL
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="PO Number" value={request.poNumber} />
          <Field label="PO Date" value={formatDate(request.poDate)} />
          <Field label="PRL No" value={request.prlNo} />
          <Field label="PRL Date" value={formatDate(request.prlDate)} />
        </div>
      </div>

      {/* Milestone Dates */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">5</span>
          Milestone Dates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Material Dispatch Date" value={formatDate(request.materialDispatchDate)} />
          <Field label="Material Received Date" value={formatDate(request.materialReceivedDate)} />
          <Field label="Work Completion Date" value={formatDate(request.workCompletionDate)} />
          <Field label="Cancellation Date" value={formatDate(request.sourceCancellationDate)} />
        </div>
      </div>

      {/* Handler & Status */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">6</span>
          Handler & Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Handler Name" value={request.nameOfHandler} />
          <Field label="Current Status" value={request.currentStatusByHandler} />
          <Field label="Current Stage" value={request.currentStage} />
          <Field label="No. of Days" value={request.noOfDays != null ? `${request.noOfDays} days` : null} />
          <Field label="Pending From" value={formatDate(request.pendingFrom)} />
          <Field label="Pending Days" value={request.pendingDays != null ? `${request.pendingDays} days` : null} />
          <div className="md:col-span-2">
            <Field label="SLA Status" value={request.slaStatus.replace("_", " ")} />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">i</span>
          Meta Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Created By" value={request.createdBy?.name} />
          <Field label="Created Date" value={formatDate(request.createdAt)} />
          <Field label="Last Updated" value={formatDate(request.updatedAt)} />
        </div>
      </div>

      {/* Activity Log */}
      {request.activityLogs.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm border border-indigo-100">
              <Clock className="w-4 h-4" />
            </span>
            Activity Log
          </h3>
          <div className="space-y-4">
            {request.activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0 shadow-sm" />
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="font-bold text-slate-700">{log.user.name}</span>
                  <span className="text-slate-500 font-medium"> {log.action.toLowerCase()}</span>
                  {log.fieldName && <span className="text-slate-500 font-medium"> — {log.fieldName}</span>}
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">{formatDate(log.createdAt, "dd MMM yyyy, HH:mm")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
