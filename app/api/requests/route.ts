import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procurementSchema } from "@/lib/validations";
import { calculateAllFields, deriveCurrentStage } from "@/lib/calculations";
import type { CurrentStage } from "@/types";
import { parse, isValid, parseISO } from "date-fns";
import { resolveDepartmentId, resolveVendorId } from "@/lib/departmentHelper";
import { validateWorkflowDates } from "@/lib/dateWorkflow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  const formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "d-MMM-yyyy", "dd MMM yyyy", "d MMM yyyy"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val, fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { }
  }
  return null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const status = searchParams.get("status") ?? "";
  const departmentId = searchParams.get("departmentId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const employee = searchParams.get("employee") ?? "";

  const isManager = session.user.role === "MANAGER";

  const where: Record<string, unknown> = {};

  // Team members can only see their own requests
  where.isDeleted = false;
  // Team members can see requests they created OR requests where they are the named handler
  if (!isManager) {
    where.AND = [
      {
        OR: [
          { createdById: session.user.id },
          { handlerId: session.user.id },
          { nameOfHandler: { equals: session.user.name ?? "", mode: "insensitive" } },
        ],
      },
    ];
  }

  if (search) {
    const searchFilter = {
      OR: [
        { sourceNo: { contains: search, mode: "insensitive" } },
        { sourceDescription: { contains: search, mode: "insensitive" } },
        { prNumber: { contains: search, mode: "insensitive" } },
        { poNumber: { contains: search, mode: "insensitive" } },
        { prlNo: { contains: search, mode: "insensitive" } },
        { currentStatusByHandler: { contains: search, mode: "insensitive" } },
        { nameOfHandler: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
        { department: { name: { contains: search, mode: "insensitive" } } },
      ],
    };

    if (!isManager && Array.isArray(where.AND)) {
      (where.AND as unknown[]).push(searchFilter);
    } else {
      where.AND = [searchFilter];
    }
  }

  if (stage) where.currentStage = stage;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.slaStatus = status;

  if (employee && employee !== "All") {
    const cleanName = employee.trim();
    const orConditions: any[] = [
      { createdBy: { name: { equals: cleanName, mode: "insensitive" } } },
      { handler: { name: { equals: cleanName, mode: "insensitive" } } },
      { nameOfHandler: { contains: cleanName, mode: "insensitive" } },
    ];

    if (cleanName.toLowerCase() === "madhukumar") {
      orConditions.push({ nameOfHandler: { contains: "Madhu", mode: "insensitive" } });
    }

    const tokens = cleanName.split(/\s+/).filter((t) => t.length >= 3);
    for (const token of tokens) {
      orConditions.push({ nameOfHandler: { contains: token, mode: "insensitive" } });
    }

    const employeeFilter = { OR: orConditions };
    if (Array.isArray(where.AND)) {
      (where.AND as unknown[]).push(employeeFilter);
    } else if (where.AND) {
      where.AND = [where.AND, employeeFilter];
    } else {
      where.AND = [employeeFilter];
    }
  }
  if (from || to) {
    where.sourceDate = {};
    if (from) (where.sourceDate as Record<string, unknown>).gte = parseISO(from);
    if (to) (where.sourceDate as Record<string, unknown>).lte = parseISO(to);
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.procurementRequest.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.procurementRequest.count({ where }),
  ]);

  return NextResponse.json(
    {
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    }
  );
}

function cleanCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase();
}

function cleanCSStatus(val: string | null | undefined): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" {
  const v = (val || "").toUpperCase();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

function cleanPRStatus(val: string | null | undefined): "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" {
  const v = (val || "").toUpperCase();
  if (v.includes("APPROV") || v.includes("COMPLET") || v.includes("DONE")) return "APPROVED";
  if (v.includes("REJECT")) return "REJECTED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

function cleanPOStatus(val: string | null | undefined): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" {
  const v = (val || "").toUpperCase();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

function cleanPaymentStatus(val: string | null | undefined): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  const v = (val || "").toUpperCase();
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

function cleanStage(val: string | null | undefined): CurrentStage {
  const v = (val || "").toUpperCase();
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("COMPLET")) return "COMPLETED";
  if (v.includes("CS")) return "CS";
  if (v.includes("PRL")) return "PRL";
  if (v.includes("PR")) return "PR";
  if (v.includes("PO")) return "PO";
  if (v.includes("MDD")) return "MDD";
  if (v.includes("MRD")) return "MRD";
  if (v.includes("WCD")) return "WCD";
  if (v.includes("PAR")) return "PAR";
  if (v.includes("PDD")) return "PDD";
  return "CS";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = procurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Validation failed" } }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const cleanSourceNo = data.sourceNo.trim();

    // Check for duplicate Source No
    const duplicate = await prisma.procurementRequest.findFirst({
      where: {
        sourceNo: { equals: cleanSourceNo, mode: "insensitive" },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: { message: `Source No "${cleanSourceNo}" already exists in the system. Duplicate source numbers are not allowed.` } },
        { status: 409 }
      );
    }

    const departmentId = await resolveDepartmentId(data.departmentId);
    if (!departmentId) {
      return NextResponse.json({ error: { message: "Valid Department is required" } }, { status: 400 });
    }
    const vendorId = await resolveVendorId(data.vendorId);

  // Auto-fill Source Date from original Source App submission date if available
  let sourceDate = parseDate(data.sourceDate) || new Date();
  try {
    const { fetchSourceRequestByNo } = await import("@/lib/sourceDb");
    const src = await fetchSourceRequestByNo(cleanSourceNo);
    if (src) {
      if (src.request_date) sourceDate = new Date(src.request_date);
      else if (src.created_at) sourceDate = new Date(src.created_at);
    }
  } catch {}

  const comparativeDate = parseDate(data.comparativeDate);
  const prDate = parseDate(data.prDate);
  const poDate = parseDate(data.poDate);
  const prlDate = parseDate(data.prlDate);
  const paymentDoneDate = parseDate(data.paymentDoneDate);
  const materialDispatchDate = parseDate(data.materialDispatchDate);
  const materialReceivedDate = parseDate(data.materialReceivedDate);
  const workCompletionDate = parseDate(data.workCompletionDate);
  const sourceCancellationDate = parseDate(data.sourceCancellationDate);
  const paymentApprovalDate = parseDate(data.paymentApprovalDate);

  // Validate workflow date sequence
  const dateValidation = validateWorkflowDates({
    sourceDate,
    comparativeDate,
    prDate,
    poDate,
    materialDispatchDate,
    materialReceivedDate,
    workCompletionDate,
    prlDate,
    paymentApprovalDate,
    paymentDoneDate,
    sourceCancellationDate,
  });
  if (!dateValidation.isValid) {
    return NextResponse.json(
      { error: { message: dateValidation.firstError || "Workflow date sequence validation failed." } },
      { status: 400 }
    );
  }

  const csStatus = cleanCSStatus(data.csStatus);
  let prStatus = cleanPRStatus(data.prStatus);
  if ((prDate || data.prNumber) && (!data.prStatus || data.prStatus.trim() === "" || data.prStatus.toUpperCase() === "PENDING")) {
    prStatus = "APPROVED";
  }
  const poStatus = cleanPOStatus(data.poStatus);
  const paymentStatus = cleanPaymentStatus(data.paymentStatus);

  const inputStage = data.currentStage ? cleanStage(data.currentStage) : "CS";
  const derivedStage = deriveCurrentStage({
    currentStage: inputStage,
    csStatus,
    comparativeDate,
    prStatus,
    prDate,
    poStatus,
    poDate,
    materialDispatchDate,
    materialReceivedDate,
    workCompletionDate,
    prlDate,
    paymentApprovalDate,
    paymentDoneDate,
    sourceCancellationDate,
  });

  const pendingFrom = parseDate(data.pendingFrom) || new Date();
  const procurementReceivedDate = parseDate(data.procurementReceivedDate) || new Date();

  const calc = calculateAllFields({
    sourceDate,
    comparativeDate,
    prDate,
    poDate,
    prlDate,
    paymentDoneDate,
    pendingFrom,
    currentStage: derivedStage,
    csStatus,
    prStatus,
    poStatus,
    materialDispatchDate,
    materialReceivedDate,
    workCompletionDate,
    paymentApprovalDate,
  });

  let handlerId = data.handlerId || null;
  if (!handlerId && data.nameOfHandler?.trim()) {
    const handlerUser = await prisma.user.findFirst({
      where: { name: { equals: data.nameOfHandler.trim(), mode: "insensitive" } }
    });
    if (handlerUser) {
      handlerId = handlerUser.id;
    }
  }

  const request = await prisma.procurementRequest.create({
    data: {
      sourceNo: data.sourceNo,
      sourceDate: sourceDate!,
      sourceDescription: data.sourceDescription,
      departmentId: departmentId,
      vendorId: vendorId,
      comparativeDate,
      daysForCS: calc.daysForCS,
      csStatus: csStatus,
      prNumber: data.prNumber ?? null,
      prDate,
      daysForPR: calc.daysForPR,
      prStatus: prStatus,
      poNumber: data.poNumber ?? null,
      poDate,
      poStatus,
      daysForPO: calc.daysForPO,
      prlNo: data.prlNo ?? null,
      prlDate,
      materialDispatchDate,
      materialReceivedDate,
      workCompletionDate,
      sourceCancellationDate,
      paymentApprovalDate,
      paymentDoneDate,
      paymentStatus,
      daysForPayment: calc.daysForPayment,
      currentStatusByHandler: data.currentStatusByHandler ?? null,
      nameOfHandler: data.nameOfHandler ?? null,
      handlerId: handlerId ?? null,
      noOfDays: calc.noOfDays,
      currentStage: derivedStage,
      pendingFrom,
      pendingDays: calc.pendingDays,
      slaStatus: calc.slaStatus,
      slaCS: data.slaCS ?? null,
      slaPR: data.slaPR ?? null,
      slaPO: data.slaPO ?? null,
      slaMDD: data.slaMDD ?? null,
      slaMRD: data.slaMRD ?? null,
      slaWCD: data.slaWCD ?? null,
      slaPRL: data.slaPRL ?? null,
      slaPAR: data.slaPAR ?? null,
      slaPDD: data.slaPDD ?? null,
      procurementReceivedDate,
      createdById: session.user.id!,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      requestId: request.id,
      userId: session.user.id!,
      action: "CREATED",
      newValue: `Source No: ${request.sourceNo}`,
    },
  });

  // Notify assigned employee if assigned on creation
  if (handlerId && handlerId !== session.user.id) {
    try {
      const assignedDate = new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric", month: "short", year: "numeric"
      });
      await prisma.notification.create({
        data: {
          userId: handlerId,
          requestId: request.id,
          type: "ASSIGNMENT",
          title: `New Task Assigned: ${request.sourceNo}`,
          message: `You have been assigned a new procurement task.\n\nTask: ${request.sourceNo}\nDescription: ${request.sourceDescription}\nCurrent Stage: ${request.currentStage}\nAssigned Date: ${assignedDate}\n\nPlease log in to the Procurement portal to review and begin working on this task.`,
          isRead: false,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to create assignment notification:", notifyErr);
    }
  }

  return NextResponse.json({ request }, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error);
    
    // Prisma Unique Constraint Violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { message: "This Source No already exists. Please change it to a unique number and try again." } },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
