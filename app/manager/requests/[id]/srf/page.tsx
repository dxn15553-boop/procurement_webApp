import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck, CheckCircle2, Building2, User, Calendar, FileText } from "lucide-react";
import { formatDate, parseItemDescription } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `SRF Document - ${id}` };
}

export default async function RequestSRFPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ download?: string; print?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { download, print } = await searchParams;
  const autoPrint = download === "1" || print === "1";

  const request = await prisma.procurementRequest.findFirst({
    where: {
      id,
      isDeleted: false,
      
    },
    include: {
      department: true,
      vendor: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!request) notFound();

  const srfNo = request.sourceNo.replace("SRC-", "SRF-");
  const srfDateFormatted = formatDate(request.sourceDate, "dd MMM yyyy");
  const parsedItems = parseItemDescription(request.sourceDescription);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 text-slate-800 font-sans print:p-0 print:bg-white print:min-h-0">
      {/* Printable styles */}
      <style>{"\n        @media print {\n          body {\n            background: #ffffff !important;\n            color: #0f172a !important;\n            font-size: 11pt !important;\n            margin: 0 !important;\n            padding: 0 !important;\n          }\n          .no-print {\n            display: none !important;\n          }\n          .srf-sheet {\n            max-width: 100% !important;\n            width: 100% !important;\n            margin: 0 !important;\n            padding: 20px 24px !important;\n            background: #ffffff !important;\n            border: none !important;\n            box-shadow: none !important;\n            border-radius: 0 !important;\n          }\n          .srf-section {\n            page-break-inside: avoid;\n            margin-bottom: 16px !important;\n          }\n        }\n      "}</style>

      {/* Auto print trigger if query param download=1 */}
      {autoPrint && (
        <script
          dangerouslySetInnerHTML={{
            __html: "window.addEventListener('load', () => setTimeout(() => window.print(), 450));",
          }}
        />
      )}

      {/* Screen-only top action bar */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <Link
          href={`/manager/requests/${request.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Request Details</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Official Source Request Form (SRF)
          </span>
          <button
            onClick={() => {}}
            id="print-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
          <script
            dangerouslySetInnerHTML={{
              __html: "document.getElementById('print-btn').onclick = () => window.print();",
            }}
          />
        </div>
      </div>

      {/* Main SRF Document Sheet */}
      <div className="srf-sheet max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 lg:p-12 text-slate-900">
        {/* Document Header */}
        <div className="srf-section border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                DXN Enterprise Procurement
              </h2>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1 uppercase">
              Source Request Form (SRF)
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Official Material & Service Sourcing Authorization Form
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-black text-sm tracking-wide font-mono">
              {srfNo}
            </span>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Doc Date: {srfDateFormatted}
            </p>
          </div>
        </div>

        {/* SRF Identification Grid */}
        <div className="srf-section grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">SRF Number</span>
            <span className="font-extrabold text-sky-700 text-sm font-mono">{srfNo}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Source Req ID</span>
            <span className="font-bold text-slate-800 font-mono">{request.sourceNo}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Originating Dept</span>
            <span className="font-bold text-slate-800">{request.department?.name || "—"}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Assigned Handler</span>
            <span className="font-extrabold text-indigo-700">{request.nameOfHandler || "Team Member"}</span>
          </div>
        </div>

        {/* Section 1: Requisition Details */}
        <div className="srf-section mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
            <span>1. Requisition & Department Information</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Department</span>
              <span className="font-bold text-slate-800 text-sm">{request.department?.name || "—"}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Created / Initiated By</span>
              <span className="font-bold text-slate-800 text-sm">{request.createdBy?.name || "User Department"}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Requisition Date</span>
              <span className="font-bold text-slate-800 text-sm">{srfDateFormatted}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Items & Specifications Table */}
        <div className="srf-section mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-2 rounded-lg mb-3">
            2. Required Items & Technical Specifications
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Item Description & Requirement Details</th>
                  <th className="py-2.5 px-3 w-36">Type</th>
                  <th className="py-2.5 px-3 w-40">Make / Model</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-sm">{item.itemNum}: {item.itemName}</div>
                      <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">{item.details}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{item.itemType}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div><span className="font-bold text-slate-700">Make:</span> {item.make}</div>
                      <div><span className="font-bold text-slate-700">Model:</span> {item.model}</div>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-900 text-center">{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Workflow Approvals Sign-Off */}
        <div className="srf-section mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-2 rounded-lg mb-3">
            3. Multi-Tier Approval & Authorization Trail
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200/80 text-slate-700 text-[10px] font-extrabold uppercase">
                  <th className="py-2 px-3">Role / Authority</th>
                  <th className="py-2 px-3">Review Action</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Authorization Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">User Department (Initiator)</td>
                  <td className="py-2.5 px-3 text-slate-600">Requisition Submission</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">SUBMITTED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Head of Department (HOD)</td>
                  <td className="py-2.5 px-3 text-slate-600">Departmental Review & Approval</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">APPROVED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Regional Coordinator</td>
                  <td className="py-2.5 px-3 text-slate-600">Regional Budget & Sourcing Endorsement</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">APPROVED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">Final Head of Approvals</td>
                  <td className="py-2.5 px-3 text-slate-600">Final Corporate Sanction</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">APPROVED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr className="bg-indigo-50/40">
                  <td className="py-2.5 px-3 font-bold text-indigo-900">Procurement Section Manager</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    SRF Released & Assigned to <span className="font-bold text-indigo-700">{request.nameOfHandler || "Laya"}</span>
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-indigo-600">ASSIGNED</td>
                  <td className="py-2.5 px-3 text-slate-700 font-mono">{srfDateFormatted}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="srf-section pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            Official Electronic Requisition Form • DXN Enterprise Procurement System
          </div>
          <div className="font-mono">
            {srfNo}
          </div>
        </div>
      </div>
    </div>
  );
}
