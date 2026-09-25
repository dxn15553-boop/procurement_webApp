import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { ArrowLeft, ShieldCheck, CheckCircle2, Building2, User, Calendar, FileText, AlertTriangle } from "lucide-react";
import { formatDate, parseItemDescription } from "@/lib/utils";
import SRFPrintClient from "./SRFPrintClient";

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
  const { download, print } = (await searchParams) || {};
  const autoPrint = download === "1" || print === "1";

  // Resilient lookup: supports both internal UUID and Source Request No (e.g. SRC-2026-0014)
  const request = await prisma.procurementRequest.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { id },
        { sourceNo: id },
      ],
    },
    include: {
      department: true,
      vendor: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Source Request Not Found</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            The requested SRF record (ID: <span className="font-mono font-bold text-slate-700">{id}</span>) could not be located in the procurement database.
          </p>
          <Link
            href="/team/requests"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Requests Database</span>
          </Link>
        </div>
      </div>
    );
  }

  const rawSourceNo = request.sourceNo || id;
  const srfNo = rawSourceNo.startsWith("SRC-") ? rawSourceNo.replace("SRC-", "SRF-") : `SRF-${rawSourceNo}`;
  const srfDateFormatted = request.sourceDate ? formatDate(request.sourceDate, "dd MMM yyyy") : formatDate(new Date(), "dd MMM yyyy");

  // Load official DXN logo as base64 for print rendering
  let dxnLogoDataUri = "/dxnLogo.png";
  try {
    const logoPath = path.join(process.cwd(), "public", "dxnLogo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      dxnLogoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch (e) {}
  const parsedItems = parseItemDescription(request.sourceDescription || "");

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 text-slate-800 font-sans print:p-0 print:bg-white print:min-h-0">
      {/* Printable styles */}
      <style>{"\n        @media print {\n          body {\n            background: #ffffff !important;\n            color: #0f172a !important;\n            font-size: 11pt !important;\n            margin: 0 !important;\n            padding: 0 !important;\n          }\n          .no-print {\n            display: none !important;\n          }\n          .srf-sheet {\n            max-width: 100% !important;\n            width: 100% !important;\n            margin: 0 !important;\n            padding: 20px 24px !important;\n            background: #ffffff !important;\n            border: none !important;\n            box-shadow: none !important;\n            border-radius: 0 !important;\n          }\n          .srf-section {\n            page-break-inside: avoid;\n            margin-bottom: 16px !important;\n          }\n        }\n      "}</style>

      {/* Screen-only top action bar */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <Link
          href={`/team/requests/${request.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Request Details</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Official Source Request Form (SRF)
          </span>
          <SRFPrintClient autoPrint={autoPrint} />
        </div>
      </div>

      {/* Main SRF Document Sheet */}
      <div className="srf-sheet max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 lg:p-12 text-slate-900">
        {/* Official DXN Manufacturing Plant Document Header Box */}
        <div className="srf-section border-2 border-slate-900 rounded-md overflow-hidden mb-6 bg-white">
          <div className="flex items-stretch min-h-[90px]">
            {/* Left: DXN Logo */}
            <div className="w-[115px] min-w-[115px] flex items-center justify-center p-2.5 border-r-2 border-slate-900 bg-white">
              <img
                src={dxnLogoDataUri}
                alt="DXN Logo"
                className="max-h-[76px] max-w-full object-contain"
              />
            </div>

            {/* Center: Company Name & Plant Address */}
            <div className="flex-1 flex flex-col justify-center items-center p-3 text-center">
              <h2 className="text-lg font-black text-slate-900 tracking-wide uppercase font-sans">
                DXN MANUFACTURING (INDIA) PVT. LTD.,
              </h2>
              <div className="text-[11px] font-semibold text-slate-700 mt-1.5 leading-relaxed">
                <div>
                  Sy. No: 392 &amp; 206 |Siddipet Industrial Park, Rajagopalpet (V) &amp; Mandapally (V)
                </div>
                <div>
                  | Nangunoor (M) &amp; Siddipet Urban (M) |Siddipet Dist. -Telangana - 502267
                </div>
              </div>
            </div>

            {/* Right: Document Reference Block */}
            <div className="w-[195px] min-w-[195px] border-l-2 border-slate-900 p-3 flex flex-col justify-center bg-slate-50 text-[11px] leading-relaxed">
              <div className="flex justify-between gap-1">
                <span className="font-bold text-slate-500">SRF NO:</span>
                <span className="font-extrabold text-sky-700 font-mono">{srfNo}</span>
              </div>
              <div className="flex justify-between gap-1 mt-1">
                <span className="font-bold text-slate-500">DOC DATE:</span>
                <span className="font-bold text-slate-900">{srfDateFormatted}</span>
              </div>
              <div className="flex justify-between gap-1 mt-1">
                <span className="font-bold text-slate-500">SOURCE ID:</span>
                <span className="font-bold text-slate-900 font-mono">{request.sourceNo}</span>
              </div>
            </div>
          </div>

          {/* Form Title Banner */}
          <div className="border-t-2 border-slate-900 bg-slate-900 text-white text-center py-1.5 text-sm font-extrabold tracking-widest uppercase">
            SOURCE REQUEST FORM (SRF)
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
            <span className="font-bold text-slate-800 font-mono">{rawSourceNo}</span>
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
                  <td className="py-2.5 px-3 font-semibold text-slate-800">1. Originating Dept (Initiator)</td>
                  <td className="py-2.5 px-3 text-slate-600">Requisition Submission</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">SUBMITTED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">2. Head of Department (HOD)</td>
                  <td className="py-2.5 px-3 text-slate-600">Departmental Review &amp; Acceptance</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">ACCEPTED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">3. Regional Coordinator</td>
                  <td className="py-2.5 px-3 text-slate-600">Initial Review &amp; Technical Routing</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">ACCEPTED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">4. User Department(s)</td>
                  <td className="py-2.5 px-3 text-slate-600">Cross-Department Technical Concurrence</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">REVIEWED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">5. Regional Coordinator</td>
                  <td className="py-2.5 px-3 text-slate-600">Budget Verification &amp; Endorsement</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">ENDORSED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">6. Regional Head</td>
                  <td className="py-2.5 px-3 text-slate-600">Corporate Sanction &amp; Approval</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">APPROVED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">7. Procurement Manager</td>
                  <td className="py-2.5 px-3 text-slate-600">Procurement Authorization &amp; Release</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">APPROVED</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr className="bg-indigo-50/40">
                  <td className="py-2.5 px-3 font-bold text-indigo-900">8. Procurement Section Manager</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    SRF Released &amp; Assigned to <span className="font-bold text-indigo-700">{request.nameOfHandler || "Team Member"}</span>
                  </td>
                  <td className="py-2.5 px-3 font-extrabold text-indigo-600">ASSIGNED</td>
                  <td className="py-2.5 px-3 text-slate-700 font-mono">{srfDateFormatted}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">9. Procurement Handler</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Handler Acknowledgment &amp; Sourcing Commencement
                  </td>
                  <td className="py-2.5 px-3 font-bold text-indigo-600">IN PROCESS</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{srfDateFormatted}</td>
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
          <div className="font-mono font-bold text-slate-600">
            {srfNo}
          </div>
        </div>
      </div>
    </div>
  );
}
