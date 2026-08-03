import * as XLSX from "xlsx";
import { format } from "date-fns";

export const UNIFORM_REPORT_HEADERS = [
  "Source No",
  "Source Date",
  "Source Description",
  "Department",
  "Vendor Name",
  "Created By",
  "Current Stage",
  "Overall SLA Status",
  "Name of Handler",
  "Handler Status",
  "Pending From Date",
  "Pending Days",
  "Total Days",
  "CS Status",
  "Days for CS",
  "Comparative Date",
  "PR Status",
  "PR Number",
  "PR Date",
  "Days for PR",
  "PO Status",
  "PO Number",
  "PO Date",
  "Days for PO",
  "Payment Status",
  "Payment Approval Date",
  "Payment Done Date",
  "Days for Payment",
  "PRL No",
  "PRL Date",
  "Material Dispatch Date",
  "Material Received Date",
  "Work Completion Date",
  "Cancellation Date",
  "CS (SLA Target)",
  "PR (SLA Target)",
  "PO (SLA Target)",
  "PAR (SLA Target)",
  "PDD (SLA Target)",
  "MDD (SLA Target)",
  "MRD (SLA Target)",
  "WCD (SLA Target)",
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
    r.sourceNo ?? "",
    formatDateStr(r.sourceDate),
    r.sourceDescription ?? "",
    r.department?.name ?? r.departmentName ?? "",
    r.vendor?.name ?? r.vendorName ?? "",
    r.createdBy?.name ?? r.createdByName ?? "System",
    r.currentStage ?? "",
    (r.slaStatus ?? "").replace("_", " "),
    r.nameOfHandler ?? "",
    r.currentStatusByHandler ?? "",
    formatDateStr(r.pendingFrom),
    r.pendingDays ?? "",
    r.noOfDays ?? "",
    r.csStatus ?? "",
    r.daysForCS ?? "",
    formatDateStr(r.comparativeDate),
    r.prStatus ?? "",
    r.prNumber ?? "",
    formatDateStr(r.prDate),
    r.daysForPR ?? "",
    r.poStatus ?? "",
    r.poNumber ?? "",
    formatDateStr(r.poDate),
    r.daysForPO ?? "",
    r.paymentStatus ?? "",
    formatDateStr(r.paymentApprovalDate),
    formatDateStr(r.paymentDoneDate),
    r.daysForPayment ?? "",
    r.prlNo ?? "",
    formatDateStr(r.prlDate),
    formatDateStr(r.materialDispatchDate),
    formatDateStr(r.materialReceivedDate),
    formatDateStr(r.workCompletionDate),
    formatDateStr(r.sourceCancellationDate),
    r.slaCS ?? 2,
    r.slaPR ?? 2,
    r.slaPO ?? 3,
    r.slaPAR ?? 2,
    r.slaPDD ?? 3,
    r.slaMDD ?? 5,
    r.slaMRD ?? 2,
    r.slaWCD ?? 5,
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
