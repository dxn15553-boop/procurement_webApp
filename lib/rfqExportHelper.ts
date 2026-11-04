import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";
import { parseItemDescription } from "@/lib/utils";

/**
 * Extracts a concise, clean title without line breaks or redundant "RFQ FOR" / "ITEM 1:" prefixes
 */
export function getCleanTitle(title: string): string {
  if (!title) return "PROCUREMENT REQUISITION";
  return title
    .split(/\r?\n|•/)[0]
    .replace(/^RFQ (FOR|for) /i, "")
    .replace(/^(ITEM|Item) \d+:\s*/i, "")
    .trim();
}
import { DXN_LOGO_BASE64 } from "./dxnLogoData";

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
  sourceDetails?: {
    department_name?: string | null;
    requester_name?: string | null;
    priority?: string | null;
    purpose_justification?: string | null;
    required_by_date?: string | Date | null;
    handler_name?: string | null;
  } | null;
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
  discountAmount?: number;
  taxAmount?: number;
  freightCharges?: number;
  otherCharges?: number;
  totalAmount: number;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  warranty?: string | null;
  validityDays?: number | null;
  remarks?: string | null;
  submittedAt: string;
  status?: string;
}

export const DXN_COMPANY_HEADER = "DXN MANUFACTURING (INDIA) PVT. LTD.,";
export const DXN_ADDRESS_LINE1 = "Sy. No: 392 & 206 |Siddipet Industrial Park, Rajagopalpet (V) & Mandapally (V)";
export const DXN_ADDRESS_LINE2 = "| Nangunoor (M) & Siddipet Urban (M) |Siddipet Dist. |-Telangana - 502267";
export const DXN_COMPANY_NAME = "DXN Manufacturing (India) Pvt Ltd (TS)";
export const DXN_COMPANY_FULL = "DXN MANUFACTURING (INDIA PRIVATE LIMITED)";
export const DXN_PLANT_ADDRESS = `${DXN_ADDRESS_LINE1} ${DXN_ADDRESS_LINE2}`;
export const DXN_GSTIN = "36AABCD4141M1ZO";
export const DXN_STATE = "36-Telangana";

/**
 * Draws the official DXN bordered header box matching the physical reference template
 * (Box border with left DXN Logo and centered company name & address)
 */
export function drawDxnOfficialHeaderBox(
  doc: jsPDF,
  startX: number,
  startY: number,
  boxWidth: number,
  boxHeight: number = 22
) {
  // 1. Draw outer border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.4);
  doc.rect(startX, startY, boxWidth, boxHeight);

  // 2. Vertical divider between Logo and Address
  const logoBoxWidth = 26;
  const dividerX = startX + logoBoxWidth;
  doc.line(dividerX, startY, dividerX, startY + boxHeight);

  // 3. Render DXN Logo on left
  try {
    if (DXN_LOGO_BASE64) {
      doc.addImage(
        DXN_LOGO_BASE64,
        "PNG",
        startX + 3,
        startY + 2,
        logoBoxWidth - 6,
        boxHeight - 4
      );
    }
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    doc.text("DXN", startX + logoBoxWidth / 2, startY + boxHeight / 2 + 2, { align: "center" });
  }

  // 4. Center-aligned text block
  const textAreaCenter = (dividerX + startX + boxWidth) / 2;

  // Line 1: Company Title (Bold, uppercase)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(DXN_COMPANY_HEADER, textAreaCenter, startY + 6.8, { align: "center" });

  // Line 2: Address line 1
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(DXN_ADDRESS_LINE1, textAreaCenter, startY + 12.2, { align: "center" });

  // Line 3: Address line 2
  doc.text(DXN_ADDRESS_LINE2, textAreaCenter, startY + 16.8, { align: "center" });

  return startY + boxHeight;
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
    const deptName = rfq.sourceDetails?.department_name || "Enterprise Operations";

    // Official DXN Boxed Header (matching user reference)
    const headerBottomY = drawDxnOfficialHeaderBox(doc, 14, 10, pageWidth - 28, 22);

    // RFQ Sourcing Banner & Identifier Sub-bar
    const bannerY = headerBottomY + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(14, bannerY, pageWidth - 28, 11, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("REQUEST FOR QUOTATION (RFQ) • OFFICIAL PROCUREMENT SOURCING", 18, bannerY + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(rfq.rfqNumber, pageWidth - 18, bannerY + 7, { align: "right" });

    // RFQ Overview Metadata Table
    autoTable(doc, {
      startY: bannerY + 14,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      body: [
        [
          { content: "RFQ NUMBER", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.rfqNumber, styles: { fontStyle: "bold", textColor: [220, 38, 38] } },
          { content: "SOURCE REF", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.sourceNo, styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
        ],
        [
          { content: "TARGET DEPARTMENT", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: deptName.toUpperCase(), styles: { fontStyle: "bold", textColor: [15, 23, 42] } },
          { content: "SUBMISSION DEADLINE", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: formattedDeadline, styles: { fontStyle: "bold", textColor: [220, 38, 38] } },
        ],
        [
          { content: "DELIVERY DESTINATION", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          {
            content: rfq.deliveryLocation || "Mandapally & Rajagopalpet, Siddipet (DXN Flagship Plant)",
            styles: { fontStyle: "bold", textColor: [15, 23, 42] },
          },
          { content: "RFQ STATUS", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
          { content: rfq.status.toUpperCase(), styles: { fontStyle: "bold", textColor: [16, 185, 129] } },
        ],
      ],
    });

    // Section 1: Item Requirements & Scope
    const currentY1 = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("1. PROCUREMENT ITEM SPECIFICATIONS & SCOPE OF SUPPLY", 14, currentY1);

    const parsedItems = parseItemDescription(rfq.description || rfq.title);
    const itemRows = parsedItems.map((item, idx) => [
      idx + 1,
      `${item.itemName}\n${item.details || ""}`.trim(),
      item.itemType || "Standard Material",
      item.qty !== "—" && item.qty ? item.qty : `${rfq.quantity || 1} ${rfq.unit || "Nos"}`,
      "Mandapally Plant",
    ]);

    autoTable(doc, {
      startY: currentY1 + 3,
      head: [["#", "Item Description & Requirement Details", "Item Type", "Quantity / UOM", "Delivery Location"]],
      body: itemRows,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 3, valign: "top" },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 85, fontStyle: "bold" },
        2: { cellWidth: 35 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 28 },
      },
    });

    // Section 2: Invited Vendors Register
    const currentY2 = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. INVITED VENDORS REGISTER (${rfq.vendors.length} Vendors)`, 14, currentY2);

    const vendorRows = rfq.vendors.map((v, i) => [
      i + 1,
      v.vendorName || "Vendor Organization",
      v.vendorEmail || "—",
      v.status || "INVITED",
      v.accessKey ? "Official Online Link Dispatched" : "Direct Invite",
    ]);

    autoTable(doc, {
      startY: currentY2 + 3,
      head: [["#", "Vendor Legal Entity Name", "Contact Email", "Dispatch Status", "Portal Link Status"]],
      body: vendorRows.length > 0 ? vendorRows : [["—", "No vendors recorded", "—", "—", "—"]],
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 2.8 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 65, fontStyle: "bold" },
        2: { cellWidth: 52 },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 29, halign: "center" },
      },
    });

    // Section 3: Commercial & Bidding Instructions
    const currentY3 = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("3. COMMERCIAL INSTRUCTIONS & SUBMISSION GUIDELINES", 14, currentY3);

    const instructions = [
      "1. All commercial pricing must be quoted in Indian Rupees (INR) and itemize Base Rate, GST %, and Freight charges.",
      "2. Quotations must be submitted directly through the DXN Vendor Quotation Portal before the submission deadline.",
      "3. Delivery Destination: FOR Destination - DXN Manufacturing India Pvt. Ltd., Mandapally & Rajagopalpet, Siddipet.",
      "4. Standard Payment Terms: 100% payment within 30 days after receipt of material along with correct tax invoice.",
      "5. Warranty: Minimum one year warranty for manufacturing defects.",
      "6. Commercial offers must remain firm and valid for a minimum of 60 days from the closing deadline.",
    ];

    autoTable(doc, {
      startY: currentY3 + 3,
      theme: "plain",
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [71, 85, 105] },
      body: instructions.map((ins) => [{ content: ins }]),
    });

    // Section 4: Sign-off & Authorization Box (matching DXN physical format)
    const currentY4 = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: currentY4,
      head: [["Prepared By", "Checked By", "Approved By"]],
      body: [
        [
          `\n\n\n${rfq.createdBy?.name || "Procurement Officer"}\nProcurement Department`,
          `\n\n\nHead of Department\n${deptName}`,
          "\n\n\nPlant Head / Director\nDXN Manufacturing (India) Pvt Ltd",
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
 * Generates and downloads the Official DXN Comparative Statement (CS) PDF
 * Modeled after DXN Physical Reference Document (Image 2)
 */
export function downloadBiddingsPdf(rfq: RfqExportData, quotes: QuoteExportData[]) {
  try {
    // DXN Official Comparative Statement is printed in LANDSCAPE orientation
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    const selectedVendorName = rfq.comparativeStatement?.recommendedVendorName || (sortedQuotes[0]?.vendorName ?? "L1 Vendor");
    const deptName = rfq.sourceDetails?.department_name || "COSMETICS & TOILETRY DEPARTMENT";
    const refNo = `DXN/TS/CS/26-27/${rfq.sourceNo.replace("SRC-", "")}/${rfq.rfqNumber.replace("RFQ-", "")}`;
    const todayFormatted = format(new Date(), "dd/MM/yyyy");

    // Top Header - Official DXN Boxed Header (matching user reference)
    let currentY = drawDxnOfficialHeaderBox(doc, 14, 7, pageWidth - 28, 19);
    currentY += 4.5;

    // CS Title - clean redundant prefix and dynamically calculate wrapped lines to prevent any overlap
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const cleanTitle = getCleanTitle(rfq.title).toUpperCase();
    const csTitle = `COMPARATIVE STATEMENT OF ${cleanTitle} FOR ${deptName.toUpperCase()}`;
    const csTitleLines = doc.splitTextToSize(csTitle, pageWidth - 28);
    doc.text(csTitleLines, 14, currentY);
    currentY += csTitleLines.length * 4.2 + 1.5;

    // Reference and Date Row (strictly below the title)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`REF NO: ${refNo}`, 14, currentY);
    doc.text(`Date: ${todayFormatted}`, pageWidth - 14, currentY, { align: "right" });
    currentY += 4.5;

    // STATEMENT label
    doc.setFontSize(8);
    doc.text("STATEMENT:", 14, currentY);
    currentY += 3.5;

    // Parse Requirement Items
    const parsedItems = parseItemDescription(rfq.description || rfq.title);

    // Build the Side-by-Side Vendor Matrix (matching Image 2)
    // Left Columns: SL.NO | DESCRIPTION | Qty | UOM
    // Right Columns: For each vendor, two columns: Rate | Amount (or single combined column)
    const vendorCols = sortedQuotes.slice(0, 5); // display up to 5 vendors side-by-side cleanly
    const numVendors = vendorCols.length;

    // Table Header Structure
    // Header Row 1: SL.NO | DESCRIPTION | Qty | UOM | Vendor 1 (colSpan 2) | Vendor 2 (colSpan 2) ...
    // Header Row 2: " " | " " | " " | " " | Rate | Total | Rate | Total ...
    const headRow1: any[] = [
      { content: "SL.NO", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "DESCRIPTION", rowSpan: 2, styles: { valign: "middle" } },
      { content: "Qty", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "UOM", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    ];

    const headRow2: any[] = [];

    vendorCols.forEach((v) => {
      const isSelected = selectedVendorName && v.vendorName.toLowerCase().trim() === selectedVendorName.toLowerCase().trim();
      headRow1.push({
        content: `${v.vendorName.toUpperCase()}${isSelected ? " (L1 / SELECTED)" : ""}`,
        colSpan: 2,
        styles: { halign: "center", fillColor: isSelected ? [22, 101, 52] : [51, 65, 85], fontStyle: "bold" },
      });
      headRow2.push({ content: "Rate (INR)", styles: { halign: "right" } });
      headRow2.push({ content: "Amount (INR)", styles: { halign: "right" } });
    });

    // Item Data Rows
    const tableBody: any[] = [];
    parsedItems.forEach((item, itemIdx) => {
      const row: any[] = [
        itemIdx + 1,
        `${item.itemName}\n${item.details || ""}`.trim(),
        item.qty && item.qty !== "—" ? item.qty : String(rfq.quantity || 1),
        rfq.unit || "Nos",
      ];

      vendorCols.forEach((v) => {
        const vendorBase = Number(v.baseAmount) || Number(v.totalAmount) || 0;
        const itemQty = Number(item.qty) || Number(rfq.quantity) || 1;
        const totalItemsCount = parsedItems.length || 1;
        const estimatedItemRate = vendorBase / (itemQty * totalItemsCount);
        const estimatedItemAmt = estimatedItemRate * itemQty;

        row.push(estimatedItemRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        row.push(estimatedItemAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      });

      tableBody.push(row);
    });

    // Commercial Terms & Financial Comparison Rows (Line-for-line matching Image 2)
    // 1. TOTAL BASIC
    const basicRow: any[] = [
      { content: "TOTAL BASIC", colSpan: 4, styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
    ];
    vendorCols.forEach((v) => {
      const base = Number(v.baseAmount) || Number(v.totalAmount) || 0;
      basicRow.push({ content: " ", styles: { fillColor: [248, 250, 252] } });
      basicRow.push({
        content: base.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252] },
      });
    });
    tableBody.push(basicRow);

    // 2. Discount
    const discountRow: any[] = [
      { content: "Discount", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      const disc = Number(v.discountAmount) || 0;
      discountRow.push({ content: disc > 0 ? "5%" : "—", styles: { halign: "right" } });
      discountRow.push({
        content: disc > 0 ? disc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—",
        styles: { halign: "right" },
      });
    });
    tableBody.push(discountRow);

    // 3. After Discount Basic Fare
    const afterDiscountRow: any[] = [
      { content: "After Discount Basic Fare", colSpan: 4, styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
    ];
    vendorCols.forEach((v) => {
      const base = Number(v.baseAmount) || Number(v.totalAmount) || 0;
      const disc = Number(v.discountAmount) || 0;
      const netBase = Math.max(0, base - disc);
      afterDiscountRow.push({ content: " ", styles: { fillColor: [248, 250, 252] } });
      afterDiscountRow.push({
        content: netBase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252] },
      });
    });
    tableBody.push(afterDiscountRow);

    // 4. GST
    const gstRow: any[] = [
      { content: "GST (18% / Taxes)", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      const tax = Number(v.taxAmount) || 0;
      gstRow.push({ content: "18%", styles: { halign: "right" } });
      gstRow.push({
        content: tax > 0 ? tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Included / Extra",
        styles: { halign: "right" },
      });
    });
    tableBody.push(gstRow);

    // 5. Transportation / Freight
    const transRow: any[] = [
      { content: "Transportation / Freight", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      const freight = Number(v.freightCharges) || 0;
      transRow.push({ content: freight > 0 ? "Without GST" : "—", styles: { halign: "right" } });
      transRow.push({
        content: freight > 0 ? freight.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Extra / Included",
        styles: { halign: "right" },
      });
    });
    tableBody.push(transRow);

    // 6. Total+GST (Landed Cost)
    const totalGstRow: any[] = [
      { content: "Total+GST (Evaluated Landed Cost)", colSpan: 4, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
    ];
    vendorCols.forEach((v) => {
      const tot = Number(v.totalAmount) || 0;
      totalGstRow.push({ content: " ", styles: { fillColor: [241, 245, 249] } });
      totalGstRow.push({
        content: tot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        styles: { fontStyle: "bold", halign: "right", textColor: [16, 100, 50], fillColor: [241, 245, 249] },
      });
    });
    tableBody.push(totalGstRow);

    // 7. Warranty (matching Image 2)
    const warrantyRow: any[] = [
      { content: "Warranty", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      warrantyRow.push({
        content: v.warranty || "One Year (Manufacturing defects)",
        colSpan: 2,
        styles: { halign: "center", fontSize: 6.5 },
      });
    });
    tableBody.push(warrantyRow);

    // 8. Payment Terms (matching Image 2)
    const paymentRow: any[] = [
      { content: "Payment terms", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      paymentRow.push({
        content:
          v.paymentTerms ||
          "100% payment will be made within 30 days after receipt of the material, along with the correct tax invoice.",
        colSpan: 2,
        styles: { fontSize: 6.5 },
      });
    });
    tableBody.push(paymentRow);

    // 9. Delivery (matching Image 2)
    const deliveryRow: any[] = [
      { content: "Delivery", colSpan: 4, styles: { fontStyle: "bold" } },
    ];
    vendorCols.forEach((v) => {
      deliveryRow.push({
        content: v.leadTimeDays ? `${v.leadTimeDays} days after PO` : "Material will be dispatch within 2-3 weeks after issuing the PO.",
        colSpan: 2,
        styles: { fontSize: 6.5 },
      });
    });
    tableBody.push(deliveryRow);

    // Render AutoTable with Landscape geometry
    autoTable(doc, {
      startY: currentY,
      head: [headRow1, headRow2],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" }, // enough width for "SL.NO" on 1 line
        1: { cellWidth: 66 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 14, halign: "center" },
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 4;

    // Bottom Note & Official Suggestion Box (with dynamic line splitting to prevent overlap)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const noteText = `Note: ${cleanTitle} FOR ${deptName.toUpperCase()}`;
    const noteLines = doc.splitTextToSize(noteText, pageWidth - 28);
    doc.text(noteLines, 14, finalY);
    finalY += noteLines.length * 3.8 + 1.5;

    const suggestionText = `Suggestion :Comparing these ${numVendors > 1 ? `${numVendors} ` : ""}quotations "${selectedVendorName}" supplier price is low, so we suggest "${selectedVendorName}"`;
    const suggestionLines = doc.splitTextToSize(suggestionText, pageWidth - 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(suggestionLines, 14, finalY);
    finalY += suggestionLines.length * 4 + 2;

    // Signatures Trail - Exactly Matching Image 2
    autoTable(doc, {
      startY: finalY + 1.5,
      head: [["Prepared By", "Checked By", "Approved By"]],
      body: [
        [
          `\n\n\n${rfq.createdBy?.name || "Procurement Officer"}\nDXN Sourcing Team`,
          `\n\n\nHead of Department\n${deptName}`,
          "\n\n\nDirector / Sanctioning Authority\nDXN Manufacturing (India) Pvt Ltd",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 7.5, cellPadding: 2.5, halign: "center" },
    });

    const fileName = `Comparative_Statement_${rfq.rfqNumber}_${rfq.sourceNo}.pdf`;
    doc.save(fileName);
    toast.success(`Downloaded official DXN Comparative Statement (${fileName})!`);
  } catch (error) {
    console.error("Failed to generate Comparative Statement PDF:", error);
    toast.error("Failed to generate Comparative Statement document.");
  }
}

/**
 * Generates and downloads the Official DXN Comparative Statement in Excel (.xlsx) format
 * Modeled after DXN Physical Reference Document (Image 2)
 */
export function downloadBiddingsExcel(rfq: RfqExportData, quotes: QuoteExportData[]) {
  try {
    const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    const selectedVendorName = rfq.comparativeStatement?.recommendedVendorName || (sortedQuotes[0]?.vendorName ?? "L1 Vendor");
    const deptName = rfq.sourceDetails?.department_name || "COSMETICS & TOILETRY DEPARTMENT";
    const refNo = `DXN/TS/CS/26-27/${rfq.sourceNo.replace("SRC-", "")}/${rfq.rfqNumber.replace("RFQ-", "")}`;
    const todayFormatted = format(new Date(), "dd/MM/yyyy");
    const parsedItems = parseItemDescription(rfq.description || rfq.title);
    const cleanTitle = getCleanTitle(rfq.title).toUpperCase();

    // Build workbook rows structured after official DXN reference
    const excelRows: any[][] = [
      [DXN_COMPANY_HEADER],
      [DXN_ADDRESS_LINE1],
      [DXN_ADDRESS_LINE2],
      [`GSTIN: ${DXN_GSTIN} | State: ${DXN_STATE}`],
      [],
      [`COMPARATIVE STATEMENT OF ${cleanTitle} FOR ${deptName.toUpperCase()}`],
      [`REF NO: ${refNo}`, "", "", "", `Date: ${todayFormatted}`],
      ["STATEMENT:"],
      [],
    ];

    // Header Row 1: SL.NO, DESCRIPTION, Qty, UOM, and vendor names
    const header1: any[] = ["SL.NO", "DESCRIPTION", "Qty", "UOM"];
    sortedQuotes.forEach((v) => {
      const isSelected = selectedVendorName && v.vendorName.toLowerCase().trim() === selectedVendorName.toLowerCase().trim();
      header1.push(`${v.vendorName.toUpperCase()}${isSelected ? " (L1 / SELECTED)" : ""}`);
      header1.push("");
    });
    excelRows.push(header1);

    // Header Row 2: Rate, Amount for each vendor
    const header2: any[] = ["", "", "", ""];
    sortedQuotes.forEach(() => {
      header2.push("Rate (INR)");
      header2.push("Amount (INR)");
    });
    excelRows.push(header2);

    // Item Rows
    parsedItems.forEach((item, idx) => {
      const row: any[] = [
        idx + 1,
        `${item.itemName} ${item.details || ""}`.trim(),
        item.qty && item.qty !== "—" ? item.qty : rfq.quantity || 1,
        rfq.unit || "Nos",
      ];

      sortedQuotes.forEach((v) => {
        const vendorBase = Number(v.baseAmount) || Number(v.totalAmount) || 0;
        const itemQty = Number(item.qty) || Number(rfq.quantity) || 1;
        const totalItemsCount = parsedItems.length || 1;
        const estimatedItemRate = vendorBase / (itemQty * totalItemsCount);
        const estimatedItemAmt = estimatedItemRate * itemQty;

        row.push(estimatedItemRate);
        row.push(estimatedItemAmt);
      });

      excelRows.push(row);
    });

    // Commercial Terms Rows
    // 1. TOTAL BASIC
    const basicRow: any[] = ["TOTAL BASIC", "", "", ""];
    sortedQuotes.forEach((v) => {
      const base = Number(v.baseAmount) || Number(v.totalAmount) || 0;
      basicRow.push("");
      basicRow.push(base);
    });
    excelRows.push(basicRow);

    // 2. Discount
    const discRow: any[] = ["Discount", "", "", ""];
    sortedQuotes.forEach((v) => {
      const disc = Number(v.discountAmount) || 0;
      discRow.push(disc > 0 ? "5%" : "—");
      discRow.push(disc > 0 ? disc : "—");
    });
    excelRows.push(discRow);

    // 3. After Discount Basic Fare
    const afterDiscRow: any[] = ["After Discount Basic Fare", "", "", ""];
    sortedQuotes.forEach((v) => {
      const base = Number(v.baseAmount) || Number(v.totalAmount) || 0;
      const disc = Number(v.discountAmount) || 0;
      afterDiscRow.push("");
      afterDiscRow.push(Math.max(0, base - disc));
    });
    excelRows.push(afterDiscRow);

    // 4. GST
    const gstRow: any[] = ["GST (18% / Taxes)", "", "", ""];
    sortedQuotes.forEach((v) => {
      const tax = Number(v.taxAmount) || 0;
      gstRow.push("18%");
      gstRow.push(tax > 0 ? tax : "Included / Extra");
    });
    excelRows.push(gstRow);

    // 5. Transportation
    const transRow: any[] = ["Transportation", "", "", ""];
    sortedQuotes.forEach((v) => {
      const freight = Number(v.freightCharges) || 0;
      transRow.push(freight > 0 ? "Without GST" : "—");
      transRow.push(freight > 0 ? freight : "Extra / Included");
    });
    excelRows.push(transRow);

    // 6. Total+GST
    const totalGstRow: any[] = ["Total+GST (Evaluated Landed Cost)", "", "", ""];
    sortedQuotes.forEach((v) => {
      totalGstRow.push("");
      totalGstRow.push(Number(v.totalAmount) || 0);
    });
    excelRows.push(totalGstRow);

    // 7. Warranty
    const warrantyRow: any[] = ["Warranty", "", "", ""];
    sortedQuotes.forEach((v) => {
      warrantyRow.push(v.warranty || "One Year (Manufacturing defects)");
      warrantyRow.push("");
    });
    excelRows.push(warrantyRow);

    // 8. Payment terms
    const paymentRow: any[] = ["Payment terms", "", "", ""];
    sortedQuotes.forEach((v) => {
      paymentRow.push(
        v.paymentTerms ||
          "100% payment will be made within 30 days after receipt of the material, along with the correct tax invoice."
      );
      paymentRow.push("");
    });
    excelRows.push(paymentRow);

    // 9. Delivery
    const deliveryRow: any[] = ["Delivery", "", "", ""];
    sortedQuotes.forEach((v) => {
      deliveryRow.push(
        v.leadTimeDays ? `${v.leadTimeDays} days after PO` : "Material will be dispatch within 2-3 weeks after issuing the PO."
      );
      deliveryRow.push("");
    });
    excelRows.push(deliveryRow);

    excelRows.push([]);
    excelRows.push([`Note: ${cleanTitle} FOR ${deptName.toUpperCase()}`]);
    excelRows.push([
      `Suggestion: Comparing these quotations "${selectedVendorName}" supplier price is low, so we suggest "${selectedVendorName}"`,
    ]);
    excelRows.push([]);
    excelRows.push(["Prepared By", "", "Checked By", "", "Approved By"]);
    excelRows.push([
      `${rfq.createdBy?.name || "Procurement Officer"} (Procurement)`,
      "",
      `Head of Department (${deptName})`,
      "",
      "Plant Head / Sanctioning Authority",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(excelRows);

    // Auto-size columns
    const colWidths = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 10 }];
    sortedQuotes.forEach(() => {
      colWidths.push({ wch: 18 });
      colWidths.push({ wch: 18 });
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparative Statement");

    const fileName = `Comparative_Statement_${rfq.rfqNumber}_${rfq.sourceNo}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported DXN Comparative Statement to Excel (${fileName})!`);
  } catch (error) {
    console.error("Failed to export Comparative Statement to Excel:", error);
    toast.error("Failed to export Comparative Statement to Excel.");
  }
}

/**
 * Generates and downloads the Official DXN Consolidated Comparative Statement (PDF)
 * Combines multiple Source Requests & RFQs into a single comprehensive executive report
 */
export function downloadConsolidatedBiddingsPdf(items: { rfq: RfqExportData; quotes: QuoteExportData[] }[]) {
  if (!items || items.length === 0) {
    toast.error("No Source Requests selected for consolidated export.");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const todayFormatted = format(new Date(), "dd/MM/yyyy");
    const refNo = `DXN/TS/CS-MULTI/${format(new Date(), "yyyyMMdd")}/${items.length}-SOURCES`;

    // PAGE 1: EXECUTIVE CONSOLIDATED SUMMARY
    let currentY = drawDxnOfficialHeaderBox(doc, 14, 7, pageWidth - 28, 19);
    currentY += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `CONSOLIDATED COMPARATIVE STATEMENT • ${items.length} SOURCE REQUEST(S) EVALUATION`,
      14,
      currentY
    );
    currentY += 4.5;

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`REF NO: ${refNo}`, 14, currentY);
    doc.text(`Date: ${todayFormatted}`, pageWidth - 14, currentY, { align: "right" });
    currentY += 4.5;

    doc.setFontSize(8);
    doc.text("EXECUTIVE SOURCING SUMMARY:", 14, currentY);
    currentY += 3.5;

    // Master Summary Table rows
    let grandTotalAmount = 0;
    const summaryRows: any[] = [];

    items.forEach((item, idx) => {
      const { rfq, quotes } = item;
      const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
      const deptName = rfq.sourceDetails?.department_name || "Enterprise Operations";
      const cleanTitle = getCleanTitle(rfq.title);

      const selectedVendor = rfq.comparativeStatement?.recommendedVendorName;
      const l1Vendor = sortedQuotes[0];
      const effectiveVendor = selectedVendor || (l1Vendor ? `${l1Vendor.vendorName} (L1)` : "Pending Quote");

      const effectiveCost = selectedVendor
        ? quotes.find((q) => q.vendorName.toLowerCase().trim() === selectedVendor.toLowerCase().trim())?.totalAmount ||
          (l1Vendor ? l1Vendor.totalAmount : 0)
        : (l1Vendor ? l1Vendor.totalAmount : 0);

      const numericCost = Number(effectiveCost) || 0;
      grandTotalAmount += numericCost;

      const isCsApproved = !!rfq.comparativeStatement;
      const statusBadge = isCsApproved
        ? "APPROVED"
        : quotes.length > 0
        ? "QUOTES RECEIVED"
        : "AWAITING QUOTES";

      summaryRows.push([
        idx + 1,
        rfq.sourceNo,
        rfq.rfqNumber,
        deptName,
        cleanTitle,
        `${quotes.length} / ${rfq.vendors.length}`,
        effectiveVendor,
        numericCost > 0
          ? numericCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—",
        statusBadge,
      ]);
    });

    // Grand Total Row
    summaryRows.push([
      {
        content: `TOTAL EVALUATED PROCUREMENT VALUE (${items.length} SOURCE REQUESTS)`,
        colSpan: 7,
        styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      },
      {
        content: `INR ${grandTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249], textColor: [22, 101, 52] },
      },
      { content: "", styles: { fillColor: [241, 245, 249] } },
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          "SL",
          "SOURCE REF",
          "RFQ NO",
          "DEPARTMENT",
          "REQUIREMENT SCOPE",
          "BIDS",
          "SELECTED / L1 VENDOR",
          "AMOUNT (INR)",
          "STATUS",
        ],
      ],
      body: summaryRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 26, fontStyle: "bold" },
        2: { cellWidth: 26 },
        3: { cellWidth: 35 },
        4: { cellWidth: 60 },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 40 },
        7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        8: { cellWidth: 26, halign: "center" },
      },
    });

    let summaryFinalY = (doc as any).lastAutoTable.finalY + 6;

    // Executive Recommendation & Approval Signatures on Summary Page
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Executive Sourcing Note: Comparative evaluation conducted across ${items.length} requisition(s) with Total Outlay INR ${grandTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Individual detailed matrices attached.`,
      14,
      summaryFinalY
    );
    summaryFinalY += 4.5;

    autoTable(doc, {
      startY: summaryFinalY,
      head: [["Prepared By (Procurement)", "Checked By (Department Head)", "Approved By (Sanctioning Authority)"]],
      body: [
        [
          `\n\n\nProcurement Sourcing Team\nDXN Manufacturing (India) Pvt Ltd`,
          `\n\n\nRespective Department Heads\nFlagship Manufacturing Facility`,
          `\n\n\nDirector / Plant Head\nDXN Manufacturing (India) Pvt Ltd`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 7.5, cellPadding: 2.5, halign: "center" },
    });

    // SUBSEQUENT PAGES: DETAILED COMPARATIVE STATEMENT MATRIX FOR EACH SOURCE
    items.forEach((item, idx) => {
      doc.addPage();
      const { rfq, quotes } = item;
      const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
      const selectedVendorName = rfq.comparativeStatement?.recommendedVendorName || (sortedQuotes[0]?.vendorName ?? "L1 Vendor");
      const deptName = rfq.sourceDetails?.department_name || "Enterprise Operations";
      const itemRefNo = `DXN/TS/CS/26-27/${rfq.sourceNo.replace("SRC-", "")}/${rfq.rfqNumber.replace("RFQ-", "")}`;

      // Boxed Header on each detail sheet
      let sheetY = drawDxnOfficialHeaderBox(doc, 14, 7, pageWidth - 28, 19);
      sheetY += 4.5;

      const cleanTitle = getCleanTitle(rfq.title).toUpperCase();
      const csTitle = `ATTACHMENT ${idx + 1} OF ${items.length}: COMPARATIVE STATEMENT OF ${cleanTitle} FOR ${deptName.toUpperCase()}`;
      const csTitleLines = doc.splitTextToSize(csTitle, pageWidth - 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(csTitleLines, 14, sheetY);
      sheetY += csTitleLines.length * 4 + 1;

      doc.setFontSize(8);
      doc.text(`REF NO: ${itemRefNo}`, 14, sheetY);
      doc.text(`Source Ref: ${rfq.sourceNo}  |  Date: ${todayFormatted}`, pageWidth - 14, sheetY, { align: "right" });
      sheetY += 4;

      doc.text("DETAILED COMMERCIAL EVALUATION MATRIX:", 14, sheetY);
      sheetY += 3;

      // Side-by-side vendor matrix for this RFQ
      const parsedItems = parseItemDescription(rfq.description || rfq.title);
      const vendorCols = sortedQuotes.slice(0, 5);

      const headRow1: any[] = [
        { content: "SL.NO", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "DESCRIPTION", rowSpan: 2, styles: { valign: "middle" } },
        { content: "Qty", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "UOM", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      ];
      const headRow2: any[] = [];

      vendorCols.forEach((v) => {
        const isSelected = selectedVendorName && v.vendorName.toLowerCase().trim() === selectedVendorName.toLowerCase().trim();
        headRow1.push({
          content: `${v.vendorName.toUpperCase()}${isSelected ? " (L1 / SELECTED)" : ""}`,
          colSpan: 2,
          styles: { halign: "center", fillColor: isSelected ? [22, 101, 52] : [51, 65, 85], fontStyle: "bold" },
        });
        headRow2.push({ content: "Rate (INR)", styles: { halign: "right" } });
        headRow2.push({ content: "Amount (INR)", styles: { halign: "right" } });
      });

      const tableBody: any[] = [];
      parsedItems.forEach((pItem, pIdx) => {
        const row: any[] = [
          pIdx + 1,
          `${pItem.itemName}\n${pItem.details || ""}`.trim(),
          pItem.qty && pItem.qty !== "—" ? pItem.qty : String(rfq.quantity || 1),
          rfq.unit || "Nos",
        ];
        vendorCols.forEach((v) => {
          const vendorBase = Number(v.baseAmount) || Number(v.totalAmount) || 0;
          const itemQty = Number(pItem.qty) || Number(rfq.quantity) || 1;
          const totalItemsCount = parsedItems.length || 1;
          const estimatedItemRate = vendorBase / (itemQty * totalItemsCount);
          const estimatedItemAmt = estimatedItemRate * itemQty;
          row.push(estimatedItemRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          row.push(estimatedItemAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        });
        tableBody.push(row);
      });

      // Commercial breakdown rows
      const basicRow: any[] = [{ content: "TOTAL BASIC", colSpan: 4, styles: { fontStyle: "bold", fillColor: [248, 250, 252] } }];
      vendorCols.forEach((v) => {
        const base = Number(v.baseAmount) || Number(v.totalAmount) || 0;
        basicRow.push({ content: " ", styles: { fillColor: [248, 250, 252] } });
        basicRow.push({ content: base.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252] } });
      });
      tableBody.push(basicRow);

      const netBasicRow: any[] = [{ content: "After Discount Basic Fare", colSpan: 4, styles: { fontStyle: "bold" } }];
      vendorCols.forEach((v) => {
        const netBase = (Number(v.baseAmount) || Number(v.totalAmount) || 0) - (Number(v.discountAmount) || 0);
        netBasicRow.push({ content: " ", styles: { halign: "center" } });
        netBasicRow.push({ content: netBase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold", halign: "right" } });
      });
      tableBody.push(netBasicRow);

      const gstRow: any[] = [{ content: "GST (18% / Taxes)", colSpan: 4, styles: { fontStyle: "bold" } }];
      vendorCols.forEach((v) => {
        const tax = Number(v.taxAmount) || 0;
        gstRow.push({ content: "18%", styles: { halign: "center", fontSize: 6.5 } });
        gstRow.push({ content: tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: "right" } });
      });
      tableBody.push(gstRow);

      const freightRow: any[] = [{ content: "Transportation / Freight", colSpan: 4, styles: { fontStyle: "bold" } }];
      vendorCols.forEach((v) => {
        const fr = Number(v.freightCharges) || 0;
        freightRow.push({ content: fr > 0 ? "Without GST" : "Included", styles: { halign: "center", fontSize: 6.5 } });
        freightRow.push({ content: fr > 0 ? fr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Extra / Included", styles: { halign: "right" } });
      });
      tableBody.push(freightRow);

      const landedRow: any[] = [{ content: "Total+GST (Evaluated Landed Cost)", colSpan: 4, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } }];
      vendorCols.forEach((v) => {
        const total = Number(v.totalAmount) || 0;
        const isSel = selectedVendorName && v.vendorName.toLowerCase().trim() === selectedVendorName.toLowerCase().trim();
        landedRow.push({ content: isSel ? "SELECTED" : " ", styles: { halign: "center", fontStyle: "bold", fillColor: isSel ? [220, 252, 231] : [241, 245, 249], textColor: isSel ? [22, 101, 52] : [15, 23, 42] } });
        landedRow.push({ content: total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: "bold", halign: "right", fillColor: isSel ? [220, 252, 231] : [241, 245, 249], textColor: isSel ? [22, 101, 52] : [15, 23, 42] } });
      });
      tableBody.push(landedRow);

      const paymentRow: any[] = [{ content: "Payment terms", colSpan: 4, styles: { fontStyle: "bold" } }];
      vendorCols.forEach((v) => {
        paymentRow.push({ content: v.paymentTerms || "30 Days Credit after delivery & inspection", colSpan: 2, styles: { fontSize: 6.5 } });
      });
      tableBody.push(paymentRow);

      const deliveryRow: any[] = [{ content: "Delivery", colSpan: 4, styles: { fontStyle: "bold" } }];
      vendorCols.forEach((v) => {
        deliveryRow.push({ content: v.leadTimeDays ? `${v.leadTimeDays} days after PO` : "15 days after PO", colSpan: 2, styles: { fontSize: 6.5 } });
      });
      tableBody.push(deliveryRow);

      autoTable(doc, {
        startY: sheetY,
        head: [headRow1, headRow2],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 6.5, cellPadding: 1.8, overflow: "linebreak", valign: "middle" },
        columnStyles: { 0: { cellWidth: 14, halign: "center" }, 1: { cellWidth: 66 }, 2: { cellWidth: 12, halign: "center" }, 3: { cellWidth: 14, halign: "center" } },
      });

      let sheetFinalY = (doc as any).lastAutoTable.finalY + 3;
      const sugText = `Suggestion :Comparing these ${vendorCols.length} quotations "${selectedVendorName}" supplier price is low, so we suggest "${selectedVendorName}"`;
      const sugLines = doc.splitTextToSize(sugText, pageWidth - 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text(sugLines, 14, sheetFinalY);
    });

    const fileName = `Consolidated_Comparative_Statement_${items.length}_Sources_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
    toast.success(`Downloaded Consolidated Comparative Statement (${items.length} Sources)!`);
  } catch (err: any) {
    console.error("Failed to generate Consolidated CS PDF:", err);
    toast.error("Failed to generate Consolidated Comparative Statement.");
  }
}

/**
 * Generates and downloads the Official DXN Consolidated Comparative Statement (Excel)
 * Creates a comprehensive workbook with Master Summary sheet and individual detailed sheets
 */
export function downloadConsolidatedBiddingsExcel(items: { rfq: RfqExportData; quotes: QuoteExportData[] }[]) {
  if (!items || items.length === 0) {
    toast.error("No Source Requests selected for consolidated export.");
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    const todayFormatted = format(new Date(), "dd/MM/yyyy");

    // SHEET 1: Master Executive Summary
    const summaryRows: any[][] = [
      [DXN_COMPANY_HEADER],
      [DXN_ADDRESS_LINE1],
      [DXN_ADDRESS_LINE2],
      [`GSTIN: ${DXN_GSTIN} | State: ${DXN_STATE}`],
      [],
      [`CONSOLIDATED COMPARATIVE STATEMENT • ${items.length} SOURCE REQUESTS`],
      [`Generated Date: ${todayFormatted}`, "", "", "", "", `Total Requisitions: ${items.length}`],
      [],
      [
        "SL.NO",
        "SOURCE REF",
        "RFQ NUMBER",
        "DEPARTMENT",
        "REQUIREMENT SCOPE",
        "INVITED VENDORS",
        "QUOTES RECEIVED",
        "SELECTED / L1 VENDOR",
        "EVALUATED AMOUNT (INR)",
        "STATUS",
      ],
    ];

    let grandTotal = 0;
    items.forEach((item, idx) => {
      const { rfq, quotes } = item;
      const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
      const deptName = rfq.sourceDetails?.department_name || "Enterprise Operations";
      const cleanTitle = getCleanTitle(rfq.title);

      const selectedVendor = rfq.comparativeStatement?.recommendedVendorName;
      const l1Vendor = sortedQuotes[0];
      const effectiveVendor = selectedVendor || (l1Vendor ? `${l1Vendor.vendorName} (L1)` : "Pending Quote");

      const cost = selectedVendor
        ? quotes.find((q) => q.vendorName.toLowerCase().trim() === selectedVendor.toLowerCase().trim())?.totalAmount ||
          (l1Vendor ? l1Vendor.totalAmount : 0)
        : (l1Vendor ? l1Vendor.totalAmount : 0);

      const numericCost = Number(cost) || 0;
      grandTotal += numericCost;

      const isCsApproved = !!rfq.comparativeStatement;
      const statusBadge = isCsApproved ? "APPROVED" : quotes.length > 0 ? "QUOTES RECEIVED" : "AWAITING QUOTES";

      summaryRows.push([
        idx + 1,
        rfq.sourceNo,
        rfq.rfqNumber,
        deptName,
        cleanTitle,
        rfq.vendors.length,
        quotes.length,
        effectiveVendor,
        numericCost,
        statusBadge,
      ]);
    });

    // Total Row
    summaryRows.push([]);
    summaryRows.push([
      "TOTAL PROCUREMENT VALUE",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      grandTotal,
      `${items.length} Sources Combined`,
    ]);
    summaryRows.push([]);
    summaryRows.push(["Prepared By", "", "Checked By", "", "Approved By"]);
    summaryRows.push([
      "Procurement Sourcing Team",
      "",
      "Respective Department Heads",
      "",
      "Plant Head / Director (DXN India)",
    ]);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 },
      { wch: 22 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Master Summary");

    // SUBSEQUENT SHEETS: One for each Source Request
    const usedSheetNames = new Set<string>(["Master Summary"]);
    items.forEach((item) => {
      const { rfq, quotes } = item;
      const sortedQuotes = quotes.slice().sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
      const selectedVendorName = rfq.comparativeStatement?.recommendedVendorName || (sortedQuotes[0]?.vendorName ?? "L1 Vendor");
      const deptName = rfq.sourceDetails?.department_name || "Enterprise Operations";
      const itemRefNo = `DXN/TS/CS/26-27/${rfq.sourceNo.replace("SRC-", "")}/${rfq.rfqNumber.replace("RFQ-", "")}`;
      const parsedItems = parseItemDescription(rfq.description || rfq.title);
      const cleanTitle = getCleanTitle(rfq.title).toUpperCase();

      const sheetRows: any[][] = [
        [DXN_COMPANY_HEADER],
        [DXN_ADDRESS_LINE1],
        [DXN_ADDRESS_LINE2],
        [`GSTIN: ${DXN_GSTIN} | State: ${DXN_STATE}`],
        [],
        [`COMPARATIVE STATEMENT OF ${cleanTitle} FOR ${deptName.toUpperCase()}`],
        [`REF NO: ${itemRefNo}`, "", "", "", `Date: ${todayFormatted}`],
        ["STATEMENT:"],
        [],
      ];

      // Header 1: SL.NO, DESCRIPTION, Qty, UOM, and vendor names
      const header1: any[] = ["SL.NO", "DESCRIPTION", "Qty", "UOM"];
      sortedQuotes.forEach((v) => {
        const isSelected = selectedVendorName && v.vendorName.toLowerCase().trim() === selectedVendorName.toLowerCase().trim();
        header1.push(`${v.vendorName.toUpperCase()}${isSelected ? " (L1 / SELECTED)" : ""}`);
        header1.push("");
      });
      sheetRows.push(header1);

      // Header 2: Rate, Amount
      const header2: any[] = ["", "", "", ""];
      sortedQuotes.forEach(() => {
        header2.push("Rate (INR)");
        header2.push("Amount (INR)");
      });
      sheetRows.push(header2);

      // Item Rows
      parsedItems.forEach((pItem, pIdx) => {
        const row: any[] = [
          pIdx + 1,
          `${pItem.itemName} ${pItem.details || ""}`.trim(),
          pItem.qty && pItem.qty !== "—" ? pItem.qty : rfq.quantity || 1,
          rfq.unit || "Nos",
        ];
        sortedQuotes.forEach((v) => {
          const vendorBase = Number(v.baseAmount) || Number(v.totalAmount) || 0;
          const itemQty = Number(pItem.qty) || Number(rfq.quantity) || 1;
          const totalItemsCount = parsedItems.length || 1;
          const estimatedItemRate = vendorBase / (itemQty * totalItemsCount);
          const estimatedItemAmt = estimatedItemRate * itemQty;
          row.push(estimatedItemRate);
          row.push(estimatedItemAmt);
        });
        sheetRows.push(row);
      });

      // Commercial Rows: Total Basic, Net Basic, GST, Freight, Total+GST, Payment terms, Delivery
      const basicRow: any[] = ["TOTAL BASIC", "", "", ""];
      sortedQuotes.forEach((v) => {
        basicRow.push("");
        basicRow.push(Number(v.baseAmount) || Number(v.totalAmount) || 0);
      });
      sheetRows.push(basicRow);

      const netBasicRow: any[] = ["After Discount Basic Fare", "", "", ""];
      sortedQuotes.forEach((v) => {
        netBasicRow.push("");
        netBasicRow.push((Number(v.baseAmount) || Number(v.totalAmount) || 0) - (Number(v.discountAmount) || 0));
      });
      sheetRows.push(netBasicRow);

      const gstRow: any[] = ["GST (18% / Taxes)", "", "", ""];
      sortedQuotes.forEach((v) => {
        gstRow.push("18%");
        gstRow.push(Number(v.taxAmount) || 0);
      });
      sheetRows.push(gstRow);

      const freightRow: any[] = ["Transportation / Freight", "", "", ""];
      sortedQuotes.forEach((v) => {
        const fr = Number(v.freightCharges) || 0;
        freightRow.push(fr > 0 ? "Without GST" : "Included");
        freightRow.push(fr);
      });
      sheetRows.push(freightRow);

      const landedRow: any[] = ["Total+GST (Evaluated Landed Cost)", "", "", ""];
      sortedQuotes.forEach((v) => {
        landedRow.push("");
        landedRow.push(Number(v.totalAmount) || 0);
      });
      sheetRows.push(landedRow);

      const paymentRow: any[] = ["Payment terms", "", "", ""];
      sortedQuotes.forEach((v) => {
        paymentRow.push(v.paymentTerms || "100% payment will be made within 30 days");
        paymentRow.push("");
      });
      sheetRows.push(paymentRow);

      const deliveryRow: any[] = ["Delivery", "", "", ""];
      sortedQuotes.forEach((v) => {
        deliveryRow.push(v.leadTimeDays ? `${v.leadTimeDays} days after PO` : "15 days after PO");
        deliveryRow.push("");
      });
      sheetRows.push(deliveryRow);

      sheetRows.push([]);
      sheetRows.push([`Suggestion: Comparing these quotations "${selectedVendorName}" supplier price is low, so we suggest "${selectedVendorName}"`]);

      const sheetWs = XLSX.utils.aoa_to_sheet(sheetRows);
      const colWidths = [{ wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 10 }];
      sortedQuotes.forEach(() => {
        colWidths.push({ wch: 16 });
        colWidths.push({ wch: 16 });
      });
      sheetWs["!cols"] = colWidths;

      // Ensure valid, unique sheet name (max 31 chars in Excel)
      let rawSheetName = rfq.sourceNo.replace(/[:\\/?*\[\]]/g, "_").slice(0, 31);
      let sheetName = rawSheetName;
      let counter = 1;
      while (usedSheetNames.has(sheetName)) {
        sheetName = `${rawSheetName.slice(0, 27)}_${counter++}`;
      }
      usedSheetNames.add(sheetName);

      XLSX.utils.book_append_sheet(wb, sheetWs, sheetName);
    });

    const fileName = `Consolidated_Comparative_Statement_${items.length}_Sources_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported Consolidated Comparative Statement to Excel (${items.length} Sources)!`);
  } catch (err: any) {
    console.error("Failed to export Consolidated CS to Excel:", err);
    toast.error("Failed to export Consolidated Comparative Statement to Excel.");
  }
}
