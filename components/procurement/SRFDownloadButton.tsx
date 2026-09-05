"use client";

import { useState } from "react";
import { Download, FileText, Printer, CheckCircle2, ShieldCheck, Loader2, Sparkles, Building2, User, Calendar } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface SRFDownloadButtonProps {
  requestId: string;
  sourceNo: string;
  srfNo?: string | null;
  sourceDate?: Date | string | null;
  departmentName?: string | null;
  handlerName?: string | null;
  description?: string | null;
  currentStage?: string | null;
  csStatus?: string | null;
  role?: "TEAM" | "MANAGER";
  variant?: "primary" | "outline" | "card" | "compact";
}

export function parseItemDescription(raw?: string | null) {
  if (!raw) return [];
  const items: Array<{
    itemNum: string;
    itemName: string;
    itemType: string;
    make: string;
    model: string;
    qty: string;
    details: string;
  }> = [];

  // Match items structured with "Item X:" or "ITEM X:"
  const itemBlocks = raw.split(/(?=(?:ITEM|Item)\s+\d+:)/g);

  for (const block of itemBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const titleMatch = trimmed.match(/^(?:ITEM|Item)\s+(\d+):?\s*([^\n•]+)/i);
    const typeMatch = trimmed.match(/(?:ITEM TYPE|Item Type|TYPE|Type):\s*([^\n•]+)/i);
    const makeMatch = trimmed.match(/(?:MAKE|Make):\s*([^\n•]+)/i);
    const modelMatch = trimmed.match(/(?:MODEL|Model):\s*([^\n•]+)/i);
    const qtyMatch = trimmed.match(/(?:QUANTITY|Quantity|QTY|Qty):\s*([^\n•]+)/i);
    const descMatch = trimmed.match(/(?:DESCRIPTION|Description):\s*([^\n•]+)/i);

    if (titleMatch || typeMatch || makeMatch || modelMatch || qtyMatch) {
      items.push({
        itemNum: titleMatch ? `Item ${titleMatch[1]}` : "Item 1",
        itemName: titleMatch ? titleMatch[2].trim() : "Procurement Item",
        itemType: typeMatch ? typeMatch[1].trim() : "—",
        make: makeMatch ? makeMatch[1].trim() : "—",
        model: modelMatch ? modelMatch[1].trim() : "—",
        qty: qtyMatch ? qtyMatch[1].trim() : "—",
        details: descMatch ? descMatch[1].trim() : trimmed.replace(/^[\s\S]*?(?:Description:|DESCRIPTION:)/i, "").trim() || trimmed,
      });
    }
  }

  // Fallback if not matching standard item block pattern
  if (items.length === 0) {
    items.push({
      itemNum: "Item 1",
      itemName: "Requisition Item",
      itemType: "General Procurement",
      make: "—",
      model: "—",
      qty: "As per requirement",
      details: raw.trim(),
    });
  }

  return items;
}

export function SRFDownloadButton({
  requestId,
  sourceNo,
  srfNo,
  sourceDate,
  departmentName,
  handlerName,
  description,
  currentStage = "CS",
  csStatus = "PENDING",
  role = "TEAM",
  variant = "card",
}: SRFDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const effectiveSrfNo = srfNo || sourceNo.replace("SRC-", "SRF-");
  const srfDateFormatted = formatDate(sourceDate, "dd MMM yyyy");
  const basePath = role === "MANAGER" ? "/manager" : "/team";
  const srfViewUrl = `${basePath}/requests/${requestId}/srf`;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Top DXN Brand Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("DXN ENTERPRISE PROCUREMENT", 14, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text("SOURCE REQUEST FORM (SRF) • OFFICIAL SOURCING AUTHORIZATION", 14, 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(effectiveSrfNo, pageWidth - 14, 15, { align: "right" });

      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text(`Date: ${srfDateFormatted}`, pageWidth - 14, 21, { align: "right" });

      // Document Identification Summary Box
      autoTable(doc, {
        startY: 32,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: "bold",
        },
        body: [
          [
            { content: "SRF NUMBER", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: effectiveSrfNo, styles: { fontStyle: "bold", textColor: [2, 132, 199] } },
            { content: "SOURCE REQ NO", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: sourceNo, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          ],
          [
            { content: "DEPARTMENT", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: departmentName || "—", styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
            { content: "ASSIGNED HANDLER", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: handlerName || "Assigned Team Member", styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          ],
          [
            { content: "STAGE / CS STATUS", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: `${currentStage} (${csStatus})`, styles: { fontStyle: "bold", textColor: [16, 185, 129] } },
            { content: "DOC VALIDATION", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            { content: "VERIFIED & APPROVED", styles: { fontStyle: "bold", textColor: [16, 185, 129] } },
          ],
        ],
      });

      // Item Specifications Table
      const parsedItems = parseItemDescription(description);

      const itemsTableBody = parsedItems.map((it, idx) => [
        idx + 1,
        `${it.itemNum} - ${it.itemName}\n${it.details}`,
        it.itemType,
        `Make: ${it.make}\nModel: ${it.model}`,
        it.qty,
      ]);

      const lastY = (doc as any).lastAutoTable.finalY + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("1. REQUIRED ITEMS & TECHNICAL SPECIFICATIONS", 14, lastY);

      autoTable(doc, {
        startY: lastY + 3,
        head: [["#", "Item Description & Requirement Details", "Type", "Make / Model", "Quantity"]],
        body: itemsTableBody,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          valign: "top",
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 85 },
          2: { cellWidth: 32 },
          3: { cellWidth: 35 },
          4: { cellWidth: 20, halign: "center", fontStyle: "bold" },
        },
      });

      // Approvals & Authorization Section
      const approvalsY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("2. MULTI-TIER APPROVAL & AUTHORIZATION TRAIL", 14, approvalsY);

      autoTable(doc, {
        startY: approvalsY + 3,
        head: [["Workflow Stage", "Designation", "Verification Status", "Signed / Authorized"]],
        body: [
          ["Requisition Initiator", `${departmentName || "User"} Department`, "SUBMITTED", srfDateFormatted],
          ["HOD Review", "Head of Department (HOD)", "APPROVED", srfDateFormatted],
          ["Regional Review", "Regional Coordinator", "APPROVED & ENDORSED", srfDateFormatted],
          ["Final Sanction", "Final Approving Authority", "APPROVED & SANCTIONED", srfDateFormatted],
          [
            "Procurement Assignment",
            "Procurement Section Manager",
            `ASSIGNED TO ${(handlerName || "HANDLER").toUpperCase()}`,
            srfDateFormatted,
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        columnStyles: {
          2: { textColor: [5, 150, 105], fontStyle: "bold" },
        },
      });

      // Official Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Official Procurement Document • ${effectiveSrfNo} • Generated on ${new Date().toLocaleString("en-GB")}`,
          14,
          290
        );
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, 290, { align: "right" });
      }

      doc.save(`${effectiveSrfNo}.pdf`);

      toast.success("SRF PDF Downloaded!", {
        description: `Official form saved as ${effectiveSrfNo}.pdf`,
      });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Opening printable view instead...");
      window.open(`${srfViewUrl}?download=1`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  if (variant === "card") {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-sky-50/60 p-6 lg:p-7 shadow-[0_8px_30px_rgb(99,102,241,0.08)] transition-all hover:shadow-[0_12px_40px_rgb(99,102,241,0.14)]">
        {/* Glow decorative blur */}
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 ring-4 ring-indigo-100/80">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Official SRF Document
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed & Released
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{effectiveSrfNo}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                  {sourceNo}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {srfDateFormatted}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {departmentName || "General Requisition"}
                </span>
                <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Assigned: {handlerName || "Team"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download SRF PDF
            </button>

            <a
              href={srfViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200/90 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print / View Form
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleDownloadPdf}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all active:scale-95 cursor-pointer"
        title="Download Official SRF PDF"
      >
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>SRF PDF</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={downloading}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
    >
      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      <span>Download SRF PDF</span>
    </button>
  );
}
