import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import { formatDate, getSLAColor, getStageColor, getStageName, cn, parseItemDescription } from "@/lib/utils";
import { 
  ArrowLeft, Calendar, User, Building2, Clock, FileText, CheckCircle2, 
  ExternalLink, Layers, Truck, ShieldCheck, Tag, Sparkles, AlertCircle, 
  ChevronRight, Hash, DollarSign, Package, Edit
} from "lucide-react";
import Link from "next/link";
import type { CurrentStage, SLAStatus } from "@/types";
import { SRFDownloadButton } from "@/components/procurement/SRFDownloadButton";
import { RequestStageStepper } from "@/components/procurement/RequestStageStepper";

export const metadata: Metadata = { title: "Request Details - Manager Portal" };

function DataField({
  label,
  value,
  icon,
  badge,
  highlight = false,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  highlight?: boolean;
}) {
  const isEmpty = value == null || value === "" || value === "—";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        highlight
          ? "bg-indigo-50/60 border-indigo-200/90 shadow-sm"
          : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-center min-h-[26px]">
        {isEmpty ? (
          <span className="text-xs font-semibold text-slate-400 italic">Not set</span>
        ) : (
          <span
            className={cn(
              "text-sm font-bold tracking-tight break-words",
              highlight ? "text-indigo-950 font-mono" : "text-slate-900"
            )}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

export default async function ManagerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const { id } = await params;

  const request = await prisma.procurementRequest.findUnique({
    where: { id },
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

  const srfNo = request.sourceNo.replace("SRC-", "SRF-");
  const parsedItems = parseItemDescription(request.sourceDescription);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Executive Header */}
      <div className="space-y-3">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/manager/requests" className="hover:text-indigo-600 transition-colors">
            Requests
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700 font-mono">{request.sourceNo}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-indigo-600 font-bold font-mono">{srfNo}</span>
        </div>

        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-start sm:items-center gap-4">
            <Link
              href="/manager/requests"
              className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all shadow-sm shrink-0"
              title="Back to requests"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {request.sourceNo}
                </h1>
                {/* SRF Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  {srfNo}
                </span>
                {/* Stage Badge */}
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold tracking-wide",
                    getStageColor(request.currentStage as CurrentStage)
                  )}
                >
                  {getStageName(request.currentStage as CurrentStage)}
                </span>
                {/* SLA Status Badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border",
                    getSLAColor(request.slaStatus as SLAStatus)
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {request.slaStatus.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Created on {formatDate(request.sourceDate)} • Handled by{" "}
                <span className="font-bold text-slate-700">{request.nameOfHandler || "Team Member"}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Link
              href={`/manager/requests/${request.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Request</span>
            </Link>

            <SRFDownloadButton
              requestId={request.id}
              sourceNo={request.sourceNo}
              srfNo={srfNo}
              sourceDate={request.sourceDate}
              departmentName={request.department?.name}
              handlerName={request.nameOfHandler}
              description={request.sourceDescription}
              currentStage={request.currentStage}
              csStatus={request.csStatus}
              role="MANAGER"
              variant="compact"
            />

            <Link
              href={`/manager/requests/${request.id}/srf`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View SRF Form</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Official SRF Form Card (with instant PDF Download) */}
      <SRFDownloadButton
        requestId={request.id}
        sourceNo={request.sourceNo}
        srfNo={srfNo}
        sourceDate={request.sourceDate}
        departmentName={request.department?.name}
        handlerName={request.nameOfHandler}
        description={request.sourceDescription}
        currentStage={request.currentStage}
        csStatus={request.csStatus}
        role="MANAGER"
        variant="card"
      />

      {/* Procurement Lifecycle Stepper */}
      <RequestStageStepper
        currentStage={request.currentStage}
        csStatus={request.csStatus}
        prStatus={request.prStatus}
        poStatus={request.poStatus}
      />

      {/* Section 1: Requisition & Item Specifications */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
              1
            </span>
            Source & Item Information
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            {request.sourceNo}
          </span>
        </div>

        {/* 4-Grid of Requisition Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <DataField
            label="Source No"
            value={request.sourceNo}
            icon={<Hash className="w-3.5 h-3.5 text-slate-400" />}
            highlight
          />
          <DataField
            label="Source Date"
            value={formatDate(request.sourceDate)}
            icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          />
          <DataField
            label="Department"
            value={request.department?.name}
            icon={<Building2 className="w-3.5 h-3.5 text-slate-400" />}
          />
          <DataField
            label="Vendor Name"
            value={request.vendor?.name}
            icon={<Tag className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>

        {/* Structured Item Specifications */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Required Items & Specifications ({parsedItems.length})
            </h4>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Extracted from Requisition
            </span>
          </div>

          <div className="space-y-4">
            {parsedItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/20 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
                      {item.itemNum}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">{item.itemName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      Type: <span className="text-indigo-700">{item.itemType}</span>
                    </span>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Qty: {item.qty}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Make</span>
                    <span className="font-extrabold text-slate-800">{item.make}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Model</span>
                    <span className="font-extrabold text-slate-800">{item.model}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Requirement Reason / Description
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections 2 & 3: Comparative Statement & Purchase Requisition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparative Statement */}
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  2
                </span>
                Comparative Statement (CS)
              </h3>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  request.csStatus === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : request.csStatus === "IN_PROGRESS"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {request.csStatus}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DataField label="Comparative Date" value={formatDate(request.comparativeDate)} />
              <DataField
                label="Days for CS"
                value={request.daysForCS != null ? `${request.daysForCS} Days` : "0 Days"}
              />
              <div className="sm:col-span-2">
                <DataField label="CS Workflow Status" value={request.csStatus} highlight />
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Requisition */}
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  3
                </span>
                Purchase Requisition (PR)
              </h3>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  request.prStatus === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : request.prStatus === "IN_PROGRESS"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {request.prStatus}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DataField label="PR Number" value={request.prNumber} highlight={Boolean(request.prNumber)} />
              <DataField label="PR Date" value={formatDate(request.prDate)} />
              <DataField
                label="Days for PR"
                value={request.daysForPR != null ? `${request.daysForPR} Days` : "0 Days"}
              />
              <DataField label="PR Status" value={request.prStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Purchase Order & PRL */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
              4
            </span>
            Purchase Order (PO) & PRL
          </h3>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              request.poStatus === "COMPLETED"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {request.poStatus}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataField label="PO Number" value={request.poNumber} highlight={Boolean(request.poNumber)} />
          <DataField label="PO Date" value={formatDate(request.poDate)} />
          <DataField label="PRL No" value={request.prlNo} />
          <DataField label="PRL Date" value={formatDate(request.prlDate)} />
        </div>
      </div>

      {/* Section 5: Milestone Timeline Dates */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
              5
            </span>
            Execution & Delivery Milestones
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Material & Work Tracking
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataField
            label="Material Dispatch Date"
            value={formatDate(request.materialDispatchDate)}
            icon={<Truck className="w-3.5 h-3.5 text-slate-400" />}
          />
          <DataField
            label="Material Received Date"
            value={formatDate(request.materialReceivedDate)}
            icon={<Package className="w-3.5 h-3.5 text-slate-400" />}
          />
          <DataField
            label="Work Completion Date"
            value={formatDate(request.workCompletionDate)}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />}
          />
          <DataField
            label="Cancellation Date"
            value={formatDate(request.sourceCancellationDate)}
            icon={<AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      {/* Section 6: Handler Ownership & SLA Health */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
              6
            </span>
            Handler Ownership & SLA Health
          </h3>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold tracking-wider border",
              getSLAColor(request.slaStatus as SLAStatus)
            )}
          >
            {request.slaStatus.replace("_", " ")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataField
            label="Handler Name"
            value={request.nameOfHandler}
            icon={<User className="w-3.5 h-3.5 text-slate-400" />}
            highlight
          />
          <DataField label="Current Status Note" value={request.currentStatusByHandler} />
          <DataField label="Current Stage" value={request.currentStage} />
          <DataField
            label="Total Days"
            value={request.noOfDays != null ? `${request.noOfDays} Days` : "0 Days"}
          />
          <DataField label="Pending From" value={formatDate(request.pendingFrom)} />
          <DataField
            label="Pending Days"
            value={request.pendingDays != null ? `${request.pendingDays} Days` : "0 Days"}
          />
          <div className="sm:col-span-2">
            <DataField
              label="SLA Compliance Status"
              value={request.slaStatus.replace("_", " ")}
              badge={
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              }
            />
          </div>
        </div>
      </div>

      {/* Section 7: Meta & Activity Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meta Details */}
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            System Meta Information
          </h3>
          <div className="space-y-3">
            <DataField label="Initiated / Created By" value={request.createdBy?.name} />
            <DataField label="Creation Timestamp" value={formatDate(request.createdAt, "dd MMM yyyy, HH:mm")} />
            <DataField label="Last System Update" value={formatDate(request.updatedAt, "dd MMM yyyy, HH:mm")} />
          </div>
        </div>

        {/* Activity Log */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Activity Audit Trail
            </span>
            <span className="text-[11px] text-slate-400 font-bold">{request.activityLogs.length} Events</span>
          </h3>

          {request.activityLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
              No activity logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {request.activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1 shrink-0 ring-4 ring-indigo-50" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900">{log.user.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(log.createdAt, "dd MMM, HH:mm")}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      <span className="font-semibold text-indigo-700">{log.action}</span>
                      {log.fieldName && (
                        <span className="text-slate-500"> • Field: {log.fieldName}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
