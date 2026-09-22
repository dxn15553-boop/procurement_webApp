import * as XLSX from "xlsx";
import { format } from "date-fns";

export const UNIFORM_REPORT_HEADERS = [
  // 1. Requisition Metadata
  "Source No",
  "Source Date",
  "Source Description",
  "Department",
  "Name of Handler",
  "Vendor Name",
  "Created By",

  // 2. Comparative Statement (CS) Phase
  "Comparative Date",
  "CS Status",
  "Days for CS",

  // 3. Purchase Requisition (PR) Phase
  "PR Number",
  "PR Date",
  "PR Status",
  "Days for PR",

  // 4. Purchase Order (PO) Phase
  "PO Number",
  "PO Date",
  "PO Status",
  "Days for PO",

  // 5. Logistics & Delivery Phase
  "Material Dispatch Date",
  "Material Received Date",
  "Work Completion Date",

  // 6. Billing & Payment Phase
  "PRL No",
  "PRL Date",
  "Payment Approval Date",
  "Payment Done Date",
  "Payment Status",
  "Days for Payment",

  // 7. Tracking & Lifecycle
  "Current Stage",
  "Current Status by Handler",
  "Pending From Date",
  "Pending Days",
  "Total Days",
  "Cancellation Date",

  // 8. SLA Targets & Status
  "Overall SLA Status",
  "CS (SLA Target)",
  "PR (SLA Target)",
  "PO (SLA Target)",
  "MDD (SLA Target)",
  "MRD (SLA Target)",
  "WCD (SLA Target)",
  "PAR (SLA Target)",
  "PDD (SLA Target)",
];

export function mapRequestToUniformRow(r: any) {
  const formatDateStr = (d: any) => {
    if (!d) return "";
    try {
      return format(new Date(d), "yyyy-MM-dd");
    } catch {
      return String(d);
    }
  };

  return [
    // 1. Requisition Metadata
    r.sourceNo ?? "",
    formatDateStr(r.sourceDate),
    r.sourceDescription ?? "",
    r.department?.name ?? r.departmentName ?? "",
    r.nameOfHandler ?? "",
    r.vendor?.name ?? r.vendorName ?? "",
    r.createdBy?.name ?? r.createdByName ?? "System",

    // 2. CS Phase
    formatDateStr(r.comparativeDate),
    r.csStatus ?? "",
    r.daysForCS ?? "",

    // 3. PR Phase
    r.prNumber ?? "",
    formatDateStr(r.prDate),
    r.prStatus ?? "",
    r.daysForPR ?? "",

    // 4. PO Phase
    r.poNumber ?? "",
    formatDateStr(r.poDate),
    r.poStatus ?? "",
    r.daysForPO ?? "",

    // 5. Logistics & Delivery
    formatDateStr(r.materialDispatchDate),
    formatDateStr(r.materialReceivedDate),
    formatDateStr(r.workCompletionDate),

    // 6. Billing & Payment
    r.prlNo ?? "",
    formatDateStr(r.prlDate),
    formatDateStr(r.paymentApprovalDate),
    formatDateStr(r.paymentDoneDate),
    r.paymentStatus ?? "",
    r.daysForPayment ?? "",

    // 7. Tracking & Lifecycle
    r.currentStage ?? "",
    r.currentStatusByHandler ?? "",
    formatDateStr(r.pendingFrom),
    r.pendingDays ?? "",
    r.noOfDays ?? "",
    formatDateStr(r.sourceCancellationDate),

    // 8. SLA Targets & Status
    (r.slaStatus ?? "").replace("_", " "),
    r.slaCS ?? 2,
    r.slaPR ?? 2,
    r.slaPO ?? 3,
    r.slaMDD ?? 5,
    r.slaMRD ?? 2,
    r.slaWCD ?? 5,
    r.slaPAR ?? 2,
    r.slaPDD ?? 3,
  ];
}

/**
 * Generates and downloads a formatted Excel (.xlsx) file with uniform column layout.
 */
export function exportUniformExcel(requests: any[], reportTitle: string = "Procurement Report", fileName: string = "procurement_report") {
  const rows = requests.map(mapRequestToUniformRow);
  const dataTable = [UNIFORM_REPORT_HEADERS, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(dataTable);

  // Auto-calculate column widths
  const colWidths = UNIFORM_REPORT_HEADERS.map((header, colIdx) => {
    let maxLen = header.length;
    rows.forEach((row) => {
      const valStr = String(row[colIdx] ?? "");
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 31));

  XLSX.writeFile(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

/**
 * Generates and downloads a uniform CSV file with UTF-8 BOM encoding for Excel compatibility.
 */
export function exportUniformCsv(requests: any[], fileName: string = "procurement_report") {
  const rows = requests.map(mapRequestToUniformRow);
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvLines = [
    UNIFORM_REPORT_HEADERS.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  // UTF-8 BOM for Excel opening
  const csvContent = "\uFEFF" + csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean Excel template with UNIFORM_REPORT_HEADERS and sample row.
 */
export function generateImportTemplate() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sampleRow1 = [
    // 1. Requisition Metadata
    "PR-SAMPLE-001",                 // Source No
    todayStr,                        // Source Date
    "Standard Office Laptop & Dock", // Source Description
    "IT Department",                 // Department
    "John Doe",                      // Name of Handler
    "Dell Technologies",             // Vendor Name
    "System",                        // Created By

    // 2. CS Phase
    "",                              // Comparative Date
    "PENDING",                       // CS Status
    0,                               // Days for CS

    // 3. PR Phase
    "",                              // PR Number
    "",                              // PR Date
    "PENDING",                       // PR Status
    0,                               // Days for PR

    // 4. PO Phase
    "",                              // PO Number
    "",                              // PO Date
    "PENDING",                       // PO Status
    0,                               // Days for PO

    // 5. Logistics & Delivery
    "",                              // Material Dispatch Date
    "",                              // Material Received Date
    "",                              // Work Completion Date

    // 6. Billing & Payment
    "",                              // PRL No
    "",                              // PRL Date
    "",                              // Payment Approval Date
    "",                              // Payment Done Date
    "PENDING",                       // Payment Status
    0,                               // Days for Payment

    // 7. Tracking & Lifecycle
    "CS",                            // Current Stage
    "Waiting for vendor quotes",     // Current Status by Handler
    todayStr,                        // Pending From Date
    0,                               // Pending Days
    0,                               // Total Days
    "",                              // Cancellation Date

    // 8. SLA Targets & Status
    "ON TRACK",                      // Overall SLA Status
    2,                               // CS (SLA Target)
    2,                               // PR (SLA Target)
    3,                               // PO (SLA Target)
    5,                               // MDD (SLA Target)
    2,                               // MRD (SLA Target)
    5,                               // WCD (SLA Target)
    2,                               // PAR (SLA Target)
    3,                               // PDD (SLA Target)
  ];

  const dataTable = [UNIFORM_REPORT_HEADERS, sampleRow1];
  const ws = XLSX.utils.aoa_to_sheet(dataTable);

  // Auto-calculate column widths
  const colWidths = UNIFORM_REPORT_HEADERS.map((header) => ({
    wch: Math.min(Math.max(header.length + 3, 14), 35),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Template");
  XLSX.writeFile(wb, `procurement_import_template.xlsx`);
}

