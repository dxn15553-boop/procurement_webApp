import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { parse, isValid } from "date-fns";
import { calculateAllFields } from "@/lib/calculations";
import type { CurrentStage } from "@/types";

function parseDate(val: any): Date | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // Excel serial number format (e.g. 45123)
  if (typeof val === "number" || (typeof val === "string" && /^\d+(\.\d+)?$/.test(val.trim()) && Number(val.trim()) > 10000 && Number(val.trim()) < 100000)) {
    const num = Number(val);
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  const formats = [
    "yyyy-MM-dd",
    "dd-MMM-yyyy",
    "d-MMM-yyyy",
    "dd MMM yyyy",
    "d MMM yyyy",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "MM/dd/yyyy",
    "M/d/yyyy",
    "dd-MM-yyyy",
    "d-M-yyyy",
    "yyyy/MM/dd",
  ];
  for (const fmt of formats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { }
  }
  return null;
}

function cleanCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase();
}

function cleanStage(val: string | null | undefined, fallback: CurrentStage = "CS"): CurrentStage {
  if (!val) return fallback;
  const v = val.toString().toUpperCase().trim();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("WCD") || v.includes("WORK COMPLETION")) return "WCD";
  if (v.includes("MRD") || v.includes("MATERIAL RECEIVED")) return "MRD";
  if (v.includes("MDD") || v.includes("MATERIAL DISPATCH")) return "MDD";
  if (v.includes("PDD") || v.includes("PAYMENT DONE")) return "PDD";
  if (v.includes("PAR") || v.includes("PAYMENT APPROVAL")) return "PAR";
  if (v.includes("PO") || v.includes("PURCHASE ORDER")) return "PO";
  if (v.includes("PR") || v.includes("PURCHASE REQUISITION")) return "PR";
  if (v.includes("CS") || v.includes("COMPARATIVE")) return "CS";
  return fallback;
}

function cleanCSStatus(val: string | null | undefined, fallback: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "PENDING") {
  if (!val) return fallback;
  const v = val.toString().toUpperCase().trim();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  if (v.includes("PENDING")) return "PENDING";
  return fallback;
}

function cleanPRStatus(val: string | null | undefined, fallback: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" = "PENDING") {
  if (!val) return fallback;
  const v = val.toString().toUpperCase().trim();
  if (v.includes("APPROV")) return "APPROVED";
  if (v.includes("REJECT")) return "REJECTED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  if (v.includes("PENDING")) return "PENDING";
  return fallback;
}

function cleanPOStatus(val: string | null | undefined, fallback: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "PENDING") {
  if (!val) return fallback;
  const v = val.toString().toUpperCase().trim();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  if (v.includes("PENDING")) return "PENDING";
  return fallback;
}

function cleanPaymentStatus(val: string | null | undefined, fallback: "PENDING" | "IN_PROGRESS" | "COMPLETED" = "PENDING") {
  if (!val) return fallback;
  const v = val.toString().toUpperCase().trim();
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  if (v.includes("PENDING")) return "PENDING";
  return fallback;
}

function parseNullableInt(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

/**
 * Flexible value extractor supporting uniform export headers and short forms.
 */
function getValue(row: Record<string, any>, candidateKeys: string[]): any {
  // 1. Try exact matches
  for (const key of candidateKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }

  // 2. Normalized matching (lowercase, letters and numbers only)
  const normalizedCandidates = candidateKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const [rowKey, rowVal] of Object.entries(row)) {
    if (rowVal === undefined || rowVal === null || String(rowVal).trim() === "") continue;
    const normRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedCandidates.includes(normRowKey)) {
      return rowVal;
    }
  }
  return undefined;
}

export async function processImportBuffer(buffer: ArrayBuffer | Buffer, userId: string) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error("File is empty");
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Parse to JSON array
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet);
  
  if (rows.length === 0) {
    throw new Error("No data rows found in uploaded file");
  }

  let createdCount = 0;
  let updatedCount = 0;

    let skippedCount = 0;

    // Cache departments, vendors and users to reduce repetitive queries
    const deptCache = new Map<string, string>();
    const vendorCache = new Map<string, string>();
    const userCache = new Map<string, string | null>();

    for (const row of rows) {
      // 1. Extract Source No (Mandatory)
      const rawSourceNo = getValue(row, ["Source No", "Source Number", "source_no", "sourceno", "source no", "source#", "request_no", "pr_no"]);
      const sourceNo = rawSourceNo ? String(rawSourceNo).trim() : "";
      if (!sourceNo) {
        skippedCount++;
        continue;
      }

      // Check if record exists in the main Procurement Database
      const existing = await prisma.procurementRequest.findUnique({
        where: { sourceNo }
      });

      // 2. Extract Department & Vendor
      const rawDept = getValue(row, ["Department", "Department Name", "dept", "department_name", "department"]);
      const departmentName = rawDept ? String(rawDept).trim() : "";

      let deptId = existing?.departmentId || null;
      if (departmentName) {
        deptId = deptCache.get(departmentName) || null;
        if (!deptId) {
          const code = cleanCode(departmentName) || "DEPT";
          const dept = await prisma.department.upsert({
            where: { code },
            update: { name: departmentName },
            create: { name: departmentName, code },
          });
          deptId = dept.id;
          deptCache.set(departmentName, deptId);
        }
      }

      // Fallback for new records if department wasn't specified
      if (!deptId && !existing) {
        const defaultCode = "GEN";
        const defaultDept = await prisma.department.upsert({
          where: { code: defaultCode },
          update: {},
          create: { name: "General", code: defaultCode },
        });
        deptId = defaultDept.id;
      }

      const rawVendor = getValue(row, ["Vendor Name", "Vendor", "vendor_name", "vendor"]);
      const vendorName = rawVendor ? String(rawVendor).trim() : "";

      let vendId = existing?.vendorId || null;
      if (vendorName) {
        vendId = vendorCache.get(vendorName) || null;
        if (!vendId) {
          const code = cleanCode(vendorName) || "VEND";
          const vend = await prisma.vendor.upsert({
            where: { code },
            update: { name: vendorName },
            create: { name: vendorName, code },
          });
          vendId = vend.id;
          vendorCache.set(vendorName, vendId);
        }
      }

      // 3. Extract Handler & resolve user
      const rawHandler = getValue(row, ["Name of Handler", "Handler", "handler_name", "handler", "assigned_to"]);
      const handlerName = rawHandler ? String(rawHandler).trim() : (existing?.nameOfHandler || "");

      let handlerId = existing?.handlerId || null;
      if (handlerName) {
        if (userCache.has(handlerName.toLowerCase())) {
          handlerId = userCache.get(handlerName.toLowerCase()) || null;
        } else {
          const handlerUser = await prisma.user.findFirst({
            where: { name: { equals: handlerName, mode: "insensitive" } }
          });
          handlerId = handlerUser ? handlerUser.id : null;
          userCache.set(handlerName.toLowerCase(), handlerId);
        }
      }

      // 4. Extract Description
      const rawDesc = getValue(row, ["Source Description", "Description", "source_description", "source description", "item_description"]);
      const description = rawDesc ? String(rawDesc).trim() : (existing?.sourceDescription || "Procurement Request");

      // 5. Extract and parse dates
      const rawSourceDate = getValue(row, ["Source Date", "Date", "source_date", "source date", "request_date"]);
      const sourceDate = parseDate(rawSourceDate) || existing?.sourceDate || new Date();

      const rawCompDate = getValue(row, ["Comparative Date", "Comparative Statement Date", "CS Date", "comparative_date"]);
      const comparativeDate = rawCompDate !== undefined ? parseDate(rawCompDate) : (existing ? existing.comparativeDate : null);

      const rawPrDate = getValue(row, ["PR Date", "pr_date", "pr date"]);
      const prDate = rawPrDate !== undefined ? parseDate(rawPrDate) : (existing ? existing.prDate : null);

      const rawPoDate = getValue(row, ["PO Date", "po_date", "po date"]);
      const poDate = rawPoDate !== undefined ? parseDate(rawPoDate) : (existing ? existing.poDate : null);

      const rawPrlDate = getValue(row, ["PRL Date", "prl_date", "prl date"]);
      const prlDate = rawPrlDate !== undefined ? parseDate(rawPrlDate) : (existing ? existing.prlDate : null);

      const rawPaymentApprovalDate = getValue(row, ["Payment Approval Date", "Approval Date", "payment_approval_date", "par_date"]);
      const paymentApprovalDate = rawPaymentApprovalDate !== undefined ? parseDate(rawPaymentApprovalDate) : (existing ? existing.paymentApprovalDate : null);

      const rawPaymentDoneDate = getValue(row, ["Payment Done Date", "Payment Date", "payment_done_date", "pdd_date"]);
      const paymentDoneDate = rawPaymentDoneDate !== undefined ? parseDate(rawPaymentDoneDate) : (existing ? existing.paymentDoneDate : null);

      const rawMaterialDispatchDate = getValue(row, ["Material Dispatch Date", "Dispatch Date", "material_dispatch_date", "mdd_date"]);
      const materialDispatchDate = rawMaterialDispatchDate !== undefined ? parseDate(rawMaterialDispatchDate) : (existing ? existing.materialDispatchDate : null);

      const rawMaterialReceivedDate = getValue(row, ["Material Received Date", "Received Date", "material_received_date", "mrd_date"]);
      const materialReceivedDate = rawMaterialReceivedDate !== undefined ? parseDate(rawMaterialReceivedDate) : (existing ? existing.materialReceivedDate : null);

      const rawWorkCompletionDate = getValue(row, ["Work Completion Date", "Completion Date", "work_completion_date", "wcd_date"]);
      const workCompletionDate = rawWorkCompletionDate !== undefined ? parseDate(rawWorkCompletionDate) : (existing ? existing.workCompletionDate : null);

      const rawCancellationDate = getValue(row, ["Cancellation Date", "Source Cancellation Date", "source_cancellation_date", "cancellation_date"]);
      const sourceCancellationDate = rawCancellationDate !== undefined ? parseDate(rawCancellationDate) : (existing ? existing.sourceCancellationDate : null);

      const rawPendingFrom = getValue(row, ["Pending From Date", "Pending From", "pending_from", "pending_from_date"]);
      const pendingFrom = rawPendingFrom !== undefined ? parseDate(rawPendingFrom) : (existing ? existing.pendingFrom : null);

      // 6. Stages & Statuses
      const rawStage = getValue(row, ["Current Stage", "Stage", "current_stage", "stage"]);
      const currentStage = cleanStage(rawStage, existing?.currentStage || "CS");

      const rawCsStatus = getValue(row, ["CS Status", "cs_status", "cs status"]);
      const csStatus = cleanCSStatus(rawCsStatus, existing?.csStatus || "PENDING");

      const rawPrStatus = getValue(row, ["PR Status", "pr_status", "pr status"]);
      const prStatus = cleanPRStatus(rawPrStatus, existing?.prStatus || "PENDING");

      const rawPoStatus = getValue(row, ["PO Status", "po_status", "po status"]);
      const poStatus = cleanPOStatus(rawPoStatus, existing?.poStatus || "PENDING");

      const rawPaymentStatus = getValue(row, ["Payment Status", "payment_status", "payment status"]);
      const paymentStatus = cleanPaymentStatus(rawPaymentStatus, existing?.paymentStatus || "PENDING");

      // 7. Text & Identifiers
      const rawPrNo = getValue(row, ["PR Number", "PR No", "PR#", "pr_number", "pr_no"]);
      const prNumber = rawPrNo !== undefined ? String(rawPrNo).trim() : (existing ? existing.prNumber : null);

      const rawPoNo = getValue(row, ["PO Number", "PO No", "PO#", "po_number", "po_no"]);
      const poNumber = rawPoNo !== undefined ? String(rawPoNo).trim() : (existing ? existing.poNumber : null);

      const rawPrlNo = getValue(row, ["PRL No", "PRL Number", "PRL#", "prl_no"]);
      const prlNo = rawPrlNo !== undefined ? String(rawPrlNo).trim() : (existing ? existing.prlNo : null);

      const rawHandlerStatus = getValue(row, ["Handler Status", "Current Status By Handler", "status_by_handler", "handler_status", "Current Status"]);
      const currentStatusByHandler = rawHandlerStatus !== undefined ? String(rawHandlerStatus).trim() : (existing ? existing.currentStatusByHandler : null);

      // 8. Custom SLA thresholds
      const slaCS = parseNullableInt(getValue(row, ["CS (SLA Target)", "slaCS", "SLA CS", "CS SLA"])) ?? existing?.slaCS ?? null;
      const slaPR = parseNullableInt(getValue(row, ["PR (SLA Target)", "slaPR", "SLA PR", "PR SLA"])) ?? existing?.slaPR ?? null;
      const slaPO = parseNullableInt(getValue(row, ["PO (SLA Target)", "slaPO", "SLA PO", "PO SLA"])) ?? existing?.slaPO ?? null;
      const slaPAR = parseNullableInt(getValue(row, ["PAR (SLA Target)", "slaPAR", "SLA PAR", "PAR SLA"])) ?? existing?.slaPAR ?? null;
      const slaPDD = parseNullableInt(getValue(row, ["PDD (SLA Target)", "slaPDD", "SLA PDD", "PDD SLA"])) ?? existing?.slaPDD ?? null;
      const slaMDD = parseNullableInt(getValue(row, ["MDD (SLA Target)", "slaMDD", "SLA MDD", "MDD SLA"])) ?? existing?.slaMDD ?? null;
      const slaMRD = parseNullableInt(getValue(row, ["MRD (SLA Target)", "slaMRD", "SLA MRD", "MRD SLA"])) ?? existing?.slaMRD ?? null;
      const slaWCD = parseNullableInt(getValue(row, ["WCD (SLA Target)", "slaWCD", "SLA WCD", "WCD SLA"])) ?? existing?.slaWCD ?? null;

      // 9. Calculate dynamic fields and SLA
      const calc = calculateAllFields({
        sourceDate,
        comparativeDate,
        prDate,
        poDate,
        prlDate,
        paymentDoneDate,
        pendingFrom,
        currentStage,
      });

      if (existing) {
        // UPDATE existing record in the main Procurement Database
        await prisma.procurementRequest.update({
          where: { id: existing.id },
          data: {
            sourceDescription: description,
            departmentId: deptId!,
            vendorId: vendId,
            sourceDate,
            comparativeDate,
            daysForCS: calc.daysForCS,
            csStatus,
            prNumber,
            prDate,
            daysForPR: calc.daysForPR,
            prStatus,
            poNumber,
            poDate,
            poStatus,
            daysForPO: calc.daysForPO,
            paymentApprovalDate,
            paymentDoneDate,
            paymentStatus,
            daysForPayment: calc.daysForPayment,
            prlNo,
            prlDate,
            materialDispatchDate,
            materialReceivedDate,
            workCompletionDate,
            sourceCancellationDate,
            currentStatusByHandler,
            nameOfHandler: handlerName || null,
            handlerId: handlerId || null,
            noOfDays: calc.noOfDays,
            currentStage,
            pendingFrom,
            pendingDays: calc.pendingDays,
            slaStatus: calc.slaStatus,
            slaCS,
            slaPR,
            slaPO,
            slaPAR,
            slaPDD,
            slaMDD,
            slaMRD,
            slaWCD,
          }
        });

        // Audit log
        await prisma.activityLog.create({
          data: {
            requestId: existing.id,
            userId: userId,
            action: "UPDATED",
            fieldName: "Import",
            newValue: `Updated via file import (${sourceNo})`,
          }
        });

        updatedCount++;
      } else {
        // CREATE new record in the main Procurement Database
        const request = await prisma.procurementRequest.create({
          data: {
            sourceNo,
            sourceDescription: description,
            departmentId: deptId!,
            vendorId: vendId,
            sourceDate,
            comparativeDate,
            daysForCS: calc.daysForCS,
            csStatus,
            prNumber,
            prDate,
            daysForPR: calc.daysForPR,
            prStatus,
            poNumber,
            poDate,
            poStatus,
            daysForPO: calc.daysForPO,
            paymentApprovalDate,
            paymentDoneDate,
            paymentStatus,
            daysForPayment: calc.daysForPayment,
            prlNo,
            prlDate,
            materialDispatchDate,
            materialReceivedDate,
            workCompletionDate,
            sourceCancellationDate,
            currentStatusByHandler,
            nameOfHandler: handlerName || null,
            handlerId: handlerId || null,
            noOfDays: calc.noOfDays,
            currentStage,
            pendingFrom,
            pendingDays: calc.pendingDays,
            slaStatus: calc.slaStatus,
            slaCS,
            slaPR,
            slaPO,
            slaPAR,
            slaPDD,
            slaMDD,
            slaMRD,
            slaWCD,
            createdById: userId,
          }
        });

        // Audit log
        await prisma.activityLog.create({
          data: {
            requestId: request.id,
            userId: userId,
            action: "IMPORTED",
            newValue: `Source No: ${request.sourceNo}`,
          }
        });

        createdCount++;
      }
    }

    return {
      success: true,
      importedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      skippedCount,
    };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: { message: "No file uploaded" } }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await processImportBuffer(buffer, session.user.id!);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Failed to process the import file" } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
