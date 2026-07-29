import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { parse, isValid } from "date-fns";

function parseDate(val: string | number | null | undefined): Date | null {
  if (!val) return null;
  // If it's an Excel date serial number (often parsed as numbers by xlsx)
  if (typeof val === "number") {
    // Excel dates are number of days since 1900-01-01
    const d = new Date((val - (25567 + 2)) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  const formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "d-MMM-yyyy", "dd MMM yyyy", "d MMM yyyy", "MM/dd/yyyy", "M/d/yyyy"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.toString(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { }
  }
  return null;
}

function cleanCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase();
}

function cleanStage(val: string | null | undefined): "CS" | "PR" | "PO" | "PAR" | "PDD" | "MDD" | "MRD" | "WCD" | "COMPLETED" | "CANCELLED" {
  const v = (val || "").toString().toUpperCase();
  if (v.includes("CS")) return "CS";
  if (v.includes("PR")) return "PR";
  if (v.includes("PO")) return "PO";
  if (v.includes("PAR")) return "PAR";
  if (v.includes("PDD")) return "PDD";
  if (v.includes("MDD")) return "MDD";
  if (v.includes("MRD")) return "MRD";
  if (v.includes("WCD")) return "WCD";
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  return "CS";
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
    const workbook = xlsx.read(buffer, { type: "buffer" });
    
    if (workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: { message: "File is empty" } }, { status: 400 });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Parse to JSON array
    const rows = xlsx.utils.sheet_to_json<any>(worksheet);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: { message: "No data found in file" } }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Cache departments and vendors by name to reduce DB hits
    const deptCache = new Map<string, string>();
    const vendorCache = new Map<string, string>();

    for (const row of rows) {
      const sourceNo = row["Source No"]?.toString().trim();
      const description = row["Description"]?.toString().trim();
      const departmentName = row["Department"]?.toString().trim();
      const vendorName = row["Vendor"]?.toString().trim();
      const stageStr = row["Stage"]?.toString().trim();
      const handlerName = row["Handler"]?.toString().trim();
      const dateStr = row["Date"];

      // Validate required fields
      if (!sourceNo || !description || !departmentName || !handlerName || !dateStr) {
        skippedCount++;
        continue;
      }

      // Check if sourceNo already exists
      const existing = await prisma.procurementRequest.findUnique({
        where: { sourceNo }
      });
      
      if (existing) {
        skippedCount++;
        continue;
      }

      // Handle Department
      let deptId = deptCache.get(departmentName);
      if (!deptId) {
        const code = cleanCode(departmentName);
        const dept = await prisma.department.upsert({
          where: { code },
          update: {},
          create: { name: departmentName, code },
        });
        deptId = dept.id;
        deptCache.set(departmentName, deptId);
      }

      // Handle Vendor
      let vendId = null;
      if (vendorName && vendorName.length > 0) {
        vendId = vendorCache.get(vendorName);
        if (!vendId) {
          const code = cleanCode(vendorName);
          const vend = await prisma.vendor.upsert({
            where: { code },
            update: {},
            create: { name: vendorName, code },
          });
          vendId = vend.id;
          vendorCache.set(vendorName, vendId);
        }
      }

      const sourceDate = parseDate(dateStr);
      if (!sourceDate) {
        skippedCount++;
        continue;
      }

      const currentStage = cleanStage(stageStr);

      // Create Request
      const request = await prisma.procurementRequest.create({
        data: {
          sourceNo,
          sourceDescription: description,
          departmentId: deptId,
          vendorId: vendId,
          sourceDate,
          currentStage,
          nameOfHandler: handlerName,
          createdById: session.user.id!,
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          requestId: request.id,
          userId: session.user.id!,
          action: "IMPORTED",
          newValue: `Source No: ${request.sourceNo}`,
        },
      });

      importedCount++;
    }

    return NextResponse.json({ success: true, importedCount, skippedCount });
    
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Failed to process the import file" } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
