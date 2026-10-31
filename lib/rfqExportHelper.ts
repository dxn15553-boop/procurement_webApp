import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";

export interface RfqExportData {
  id: string;
  rfqNumber: string;
  sourceNo: string;
  title: string;
  description?: string;
  specifications?: string | null;
  quantity?: number | null;
  unit?: string | null;
  submissionDeadline: string;
  deliveryLocation?: string | null;
  termsAndConditions?: string | null;
  status: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
  vendors: {
    id?: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    status: string;
    accessKey?: string;
    quotations?: any[];
  }[];
  comparativeStatement?: {
    id?: string;
    csNumber?: string;
    status?: string;
    recommendedVendorName?: string;
    recommendationReason?: string | null;
  } | null;
}

export interface QuoteExportData {
  id?: string;
  quotationNo: string;
  vendorId?: string;
  vendorName: string;
  vendorEmail: string;
  baseAmount?: number;
  taxAmount?: number;
  freightCharges?: number;
  otherCharges?: number;
  totalAmount: number;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  validityDays?: number | null;
  remarks?: string | null;
  submittedAt: string;
  status?: string;
}

/**
 * Generates and downloads the Official DXN Request for Quotation (RFQ) PDF
 */
export function downloadRfqPdf(rfq: RfqExportData) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const formattedDeadline = rfq.submissionDeadline
      ? format(new Date(rfq.submissionDeadline), "dd MMM yyyy, hh:mm a")
      : "As specified";
    const formattedCreated = rfq.createdAt
      ? format(new Date(rfq.createdAt), "dd MMM yyyy")
      : format(new Date(), "dd MMM yyyy");

    // DXN Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DXN ENTERPRISE PROCUREMENT", 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text("REQUEST FOR QUOTATION (RFQ) • OFFICIAL PROCUREMENT SOURCING", 14, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(rfq.rfqNumber, pageWidth - 14, 15, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Source Ref: ${rfq.sourceNo}`, pageWidth - 14, 21, { align: "right" });

    // RFQ Overview Metadata Table
    autoTable(doc, {
      startY: 32,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      body: [
        [
          { content: "RFQ NUMBER", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.rfqNumber, styles: { fontStyle: "bold", textColor: [220, 38, 38] } },
          { content: "SOURCE REF", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.sourceNo, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
        ],
        [
          { content: "DATE DISPATCHED", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: formattedCreated, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          { content: "SUBMISSION DEADLINE", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: formattedDeadline, styles: { fontStyle: "bold", textColor: [220, 38, 38] } },
        ],
        [
          { content: "DELIVERY LOCATION", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          {
            content: rfq.deliveryLocation || "Mandapally, Siddipet (DXN Flagship Plant)",
            styles: { fontStyle: "bold", textColor: [15, 23, 42] },
          },
          { content: "RFQ STATUS", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.status.toUpperCase(), styles: { fontStyle: "bold", textColor: [16, 185, 129] } },
        ],
      ],
    });

    // Section 1: Item Requirements & Scope
    const currentY1 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("1. PROCUREMENT ITEM SPECIFICATIONS & REQUIREMENT SCOPE", 14, currentY1);

    autoTable(doc, {
      startY: currentY1 + 3,
      head: [["#", "Item Requirement / Subject", "Quantity / Unit", "Specifications & Technical Details"]],
      body: [
        [
          "1",
          rfq.title || "Procurement Item",
          `${rfq.quantity || 1} ${rfq.unit || "Lots / Units"}`,
          rfq.specifications || rfq.description || "As per standard DXN technical specifications.",
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
      styles: { fontSize: 8.5, cellPadding: 3.5, valign: "top" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 65, fontStyle: "bold" },
        2: { cellWidth: 35 },
        3: { cellWidth: 72 },
      },
    });

    // Section 2: Invited Vendors Register
    const currentY2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. INVITED VENDORS REGISTER (${rfq.vendors.length} Vendors)`, 14, currentY2);

    const vendorRows = rfq.vendors.map((v, i) => [
      i + 1,
      v.vendorName || "Vendor Organization",
      v.vendorEmail || "—",
      v.status || "INVITED",
      v.accessKey ? "Secure Link Dispatched" : "Direct Invite",
    ]);

    autoTable(doc, {
      startY: currentY2 + 3,
      head: [["#", "Vendor Legal Entity Name", "Contact Email", "Dispatch Status", "Portal Link Status"]],
      body: vendorRows.length > 0 ? vendorRows : [["—", "No vendors recorded", "—", "—", "—"]],
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 65, fontStyle: "bold" },
        2: { cellWidth: 50 },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 29, halign: "center" },
      },
    });

    // Section 3: Commercial & Bidding Instructions
    const currentY3 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("3. COMMERCIAL INSTRUCTIONS & SUBMISSION GUIDELINES", 14, currentY3);

    const instructions = [
      "1. All commercial pricing must be quoted in Indian Rupees (INR) and itemize Base Price, GST %, and Freight charges.",
      "2. Quotations must be submitted directly through the DXN Vendor Portal link provided before the submission deadline.",
      "3. Delivery Plant: FOR Destination - DXN Manufacturing India Pvt. Ltd., Mandapally, Siddipet.",
      "4. Standard Payment Terms: 30 Days Credit after delivery and acceptance/inspection, unless explicitly negotiated.",
      "5. Commercial offers must remain firm and valid for a minimum of 60 days from the closing deadline.",
    ];

    autoTable(doc, {
      startY: currentY3 + 3,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 2, textColor: [71, 85, 105] },
      body: instructions.map((ins) => [{ content: ins }]),
    });

    // Section 4: Sign-off & Authorization Box
    const currentY4 = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: currentY4,
      head: [["Prepared By (Procurement)", "Verified By (HOD / Tech)", "Authorized By (Plant Head)"]],
      body: [
        [
          `\n\n\n${rfq.createdBy?.name || "Procurement Officer"}\nDXN Procurement Department`,
          "\n\n\nTechnical Evaluation Authority\nDXN Engineering / User Dept",
          "\n\n\nHead of Procurement & Operations\nDXN Manufacturing India Pvt. Ltd.",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 3, halign: "center" },
    });

    const fileName = `RFQ_${rfq.rfqNumber}_${rfq.sourceNo}.pdf`;
    doc.save(fileName);
    toast.success(`Downloaded official RFQ document (${fileName})!`);
  } catch (error) {
    console.error("Failed to generate RFQ PDF:", error);
    toast.error("Failed to generate RFQ document.");
  }
}

/**
 * Generates and downloads the Official Comparative Bidding Statement & Evaluation Report (PDF)
 */
export function downloadBiddingsPdf(rfq: RfqExportData, quotes: QuoteExportData[]) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    const lowestBid = sortedQuotes.length > 0 ? sortedQuotes[0].totalAmount : null;
    const winnerName = rfq.comparativeStatement?.recommendedVendorName || null;
    const generatedDate = format(new Date(), "dd MMM yyyy, hh:mm a");

    // DXN Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DXN ENTERPRISE PROCUREMENT", 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text("COMMERCIAL BIDDING SUMMARY & COMPARATIVE STATEMENT (CS)", 14, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`CS EVALUATION`, pageWidth - 14, 15, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(`Date: ${generatedDate}`, pageWidth - 14, 21, { align: "right" });

    // Bidding Metadata Table
    autoTable(doc, {
      startY: 32,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      body: [
        [
          { content: "SOURCE REQ NO", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.sourceNo, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          { content: "RFQ NUMBER", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.rfqNumber, styles: { fontStyle: "bold", textColor: [220, 38, 38] } },
        ],
        [
          { content: "ITEM TITLE", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.title, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          { content: "TOTAL INVITED / QUOTED", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          {
            content: `${rfq.vendors.length} Invited · ${sortedQuotes.length} Quotes`,
            styles: { fontStyle: "bold", textColor: [15, 23, 42] },
          },
        ],
        [
          { content: "LOWEST BID (L1)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          {
            content: lowestBid !== null ? `INR ${lowestBid.toLocaleString("en-IN")}` : "Awaiting Submissions",
            styles: { fontStyle: "bold", textColor: [16, 185, 129] },
          },
          { content: "WINNING VENDOR", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          {
            content: winnerName ? `${winnerName} (CONFIRMED)` : "Under Evaluation",
            styles: { fontStyle: "bold", textColor: winnerName ? [16, 185, 129] : [234, 88, 12] },
          },
        ],
      ],
    });

    // Section 1: Detailed Comparative Table
    const currentY1 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("1. COMMERCIAL BID EVALUATION MATRIX (RANKED L1 TO LN)", 14, currentY1);

    const biddingsTableBody = sortedQuotes.map((q, idx) => {
      const isWinner = winnerName && q.vendorName.toLowerCase().trim() === winnerName.toLowerCase().trim();
      const rankBadge = isWinner ? "WINNER" : idx === 0 ? "L1 (LOWEST)" : `L${idx + 1}`;
      const baseAmt = q.baseAmount !== undefined ? `INR ${q.baseAmount.toLocaleString("en-IN")}` : "—";
      const taxAmt = q.taxAmount !== undefined ? `INR ${q.taxAmount.toLocaleString("en-IN")}` : "—";
      const totalAmt = `INR ${Number(q.totalAmount).toLocaleString("en-IN")}`;
      const leadTime = q.leadTimeDays ? `${q.leadTimeDays} Days` : "15 Days";

      return [
        rankBadge,
        q.quotationNo || `QUO-${idx + 1}`,
        `${q.vendorName}\n(${q.vendorEmail})`,
        baseAmt,
        taxAmt,
        totalAmt,
        leadTime,
        q.paymentTerms || "30 Days Credit",
      ];
    });

    autoTable(doc, {
      startY: currentY1 + 3,
      head: [["Rank", "Quote Ref", "Vendor Company & Email", "Base Amount", "Taxes", "Total Landed", "Lead Time", "Payment Terms"]],
      body: biddingsTableBody.length > 0 ? biddingsTableBody : [["—", "—", "No quotations received yet", "—", "—", "—", "—", "—"]],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 3, valign: "top" },
      columnStyles: {
        0: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 26, fontStyle: "bold" },
        2: { cellWidth: 44 },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        6: { cellWidth: 15, halign: "center" },
        7: { cellWidth: 21 },
      },
    });

    // Section 2: Justification / Selection Remarks
    if (rfq.comparativeStatement) {
      const currentY2 = (doc as any).lastAutoTable.finalY + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("2. COMPARATIVE STATEMENT (CS) SANCTION & VENDOR SELECTION", 14, currentY2);

      autoTable(doc, {
        startY: currentY2 + 3,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 2.5 },
        body: [
          [
            { content: "RECOMMENDED VENDOR", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            {
              content: rfq.comparativeStatement.recommendedVendorName || "—",
              styles: { fontStyle: "bold", textColor: [16, 185, 129] },
            },
          ],
          [
            { content: "SELECTION JUSTIFICATION", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            {
              content:
                rfq.comparativeStatement.recommendationReason ||
                "Lowest evaluated commercial bidder (L1) meeting all technical and compliance requirements.",
              styles: { textColor: [15, 23, 42] },
            },
          ],
          [
            { content: "APPROVAL STATUS", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
            {
              content: "CS APPROVED · PURCHASE REQUISITION (PR) GENERATED",
              styles: { fontStyle: "bold", textColor: [16, 185, 129] },
            },
          ],
        ],
      });
    }

    // Section 3: Official Sign-off Block
    const currentY3 = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: currentY3,
      head: [["Commercial Evaluator", "Procurement Section Head", "Financial Sanctioning Authority"]],
      body: [
        [
          "\n\n\nProcurement Specialist\nDXN Sourcing Team",
          "\n\n\nManager - Procurement\nDXN Manufacturing India Pvt. Ltd.",
          "\n\n\nDirector / Head of Finance\nDXN Global Flagship Hub",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 3, halign: "center" },
    });

    const fileName = `Bidding_Statement_${rfq.rfqNumber}_${rfq.sourceNo}.pdf`;
    doc.save(fileName);
    toast.success(`Downloaded bidding comparative statement (${fileName})!`);
  } catch (error) {
    console.error("Failed to generate Biddings PDF:", error);
    toast.error("Failed to generate Biddings comparative report.");
  }
}

/**
 * Generates and downloads the Bidding Breakdown in Excel (.xlsx) format
 */
export function downloadBiddingsExcel(rfq: RfqExportData, quotes: QuoteExportData[]) {
  try {
    const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    const winnerName = rfq.comparativeStatement?.recommendedVendorName || null;

    const dataRows = sortedQuotes.map((q, idx) => {
      const isWinner = winnerName && q.vendorName.toLowerCase().trim() === winnerName.toLowerCase().trim();
      const rank = isWinner ? "CONFIRMED WINNER" : idx === 0 ? "L1 (Lowest Bid)" : `L${idx + 1}`;

      return {
        "Rank": rank,
        "Quotation Ref": q.quotationNo,
        "Vendor Company Name": q.vendorName,
        "Vendor Email": q.vendorEmail,
        "Base Amount (INR)": q.baseAmount ?? 0,
        "GST / Tax Amount (INR)": q.taxAmount ?? 0,
        "Freight Charges (INR)": q.freightCharges ?? 0,
        "Other Charges (INR)": q.otherCharges ?? 0,
        "Total Landed Cost (INR)": q.totalAmount,
        "Delivery Lead Time (Days)": q.leadTimeDays ?? "15",
        "Payment Terms": q.paymentTerms || "30 Days Credit",
        "Delivery Terms": q.deliveryTerms || "FOR Destination",
        "Offer Validity (Days)": q.validityDays ?? "60",
        "Submitted Date": q.submittedAt ? format(new Date(q.submittedAt), "yyyy-MM-dd HH:mm") : "—",
        "Quotation Status": q.status || "SUBMITTED",
        "Compliance Remarks": q.remarks || "Fully compliant with specifications",
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);

    // Auto-size columns
    ws["!cols"] = [
      { wch: 18 }, // Rank
      { wch: 18 }, // Quotation Ref
      { wch: 28 }, // Vendor Company Name
      { wch: 26 }, // Vendor Email
      { wch: 18 }, // Base Amount
      { wch: 20 }, // Tax Amount
      { wch: 20 }, // Freight Charges
      { wch: 18 }, // Other Charges
      { wch: 22 }, // Total Landed Cost
      { wch: 24 }, // Delivery Lead Time
      { wch: 30 }, // Payment Terms
      { wch: 22 }, // Delivery Terms
      { wch: 20 }, // Validity
      { wch: 20 }, // Submitted Date
      { wch: 16 }, // Status
      { wch: 35 }, // Compliance Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bidding Summary");

    const fileName = `Bidding_Summary_${rfq.rfqNumber}_${rfq.sourceNo}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported biddings to Excel (${fileName})!`);
  } catch (error) {
    console.error("Failed to export Biddings to Excel:", error);
    toast.error("Failed to export Biddings to Excel.");
  }
}
