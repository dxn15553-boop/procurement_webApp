import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procurementSchema } from "@/lib/validations";
import { calculateAllFields } from "@/lib/calculations";
import { parse, isValid, parseISO } from "date-fns";

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

  const isManager = session.user.role === "MANAGER";

  const where: Record<string, unknown> = {};

  // Team members can only see their own requests
  where.isDeleted = false;
  if (!isManager) {
    where.createdById = session.user.id;
  }

  if (search) {
    where.OR = [
      { sourceNo: { contains: search } },
      { sourceDescription: { contains: search } },
      { prNumber: { contains: search } },
      { poNumber: { contains: search } },
      { nameOfHandler: { contains: search } },
      { vendor: { name: { contains: search } } },
      { department: { name: { contains: search } } },
    ];
  }

  if (stage) where.currentStage = stage;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.slaStatus = status;
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

  return NextResponse.json({
    requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
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
  if (v.includes("APPROV")) return "APPROVED";
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

function cleanStage(val: string | null | undefined): "CS" | "PR" | "PO" | "PAR" | "PDD" | "MDD" | "MRD" | "WCD" | "COMPLETED" | "CANCELLED" {
  const v = (val || "").toUpperCase();
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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = procurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Validation failed" } }, { status: 400 });
  }

  try {
    const data = parsed.data;

  let departmentId = data.departmentId;
  if (departmentId && departmentId.length < 15) {
    const code = cleanCode(departmentId);
    const dept = await prisma.department.upsert({
      where: { code },
      update: {},
      create: { name: departmentId, code },
    });
    departmentId = dept.id;
  }

  let vendorId = data.vendorId || null;
  if (vendorId && vendorId.trim().length > 0) {
    const code = cleanCode(vendorId);
    const vend = await prisma.vendor.upsert({
      where: { code },
      update: {},
      create: { name: vendorId, code },
    });
    vendorId = vend.id;
  } else {
    vendorId = null;
  }

  const sourceDate = parseDate(data.sourceDate);
  const comparativeDate = parseDate(data.comparativeDate);
  const prDate = parseDate(data.prDate);
  const pendingFrom = parseDate(data.pendingFrom);

  const currentStage = cleanStage(data.currentStage);
  const csStatus = cleanCSStatus(data.csStatus);
  const prStatus = cleanPRStatus(data.prStatus);
  const poStatus = cleanPOStatus(data.poStatus);
  const paymentStatus = cleanPaymentStatus(data.paymentStatus);

  const poDate = parseDate(data.poDate);
  const prlDate = parseDate(data.prlDate);
  const paymentDoneDate = parseDate(data.paymentDoneDate);

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
      materialDispatchDate: parseDate(data.materialDispatchDate),
      materialReceivedDate: parseDate(data.materialReceivedDate),
      workCompletionDate: parseDate(data.workCompletionDate),
      sourceCancellationDate: parseDate(data.sourceCancellationDate),
      paymentApprovalDate: parseDate(data.paymentApprovalDate),
      paymentDoneDate,
      paymentStatus,
      daysForPayment: calc.daysForPayment,
      currentStatusByHandler: data.currentStatusByHandler ?? null,
      nameOfHandler: data.nameOfHandler,
      noOfDays: calc.noOfDays,
      currentStage: currentStage,
      pendingFrom,
      pendingDays: calc.pendingDays,
      slaStatus: calc.slaStatus,
      slaCS: data.slaCS ?? null,
      slaPR: data.slaPR ?? null,
      slaPO: data.slaPO ?? null,
      slaPAR: data.slaPAR ?? null,
      slaPDD: data.slaPDD ?? null,
      slaMDD: data.slaMDD ?? null,
      slaMRD: data.slaMRD ?? null,
      slaWCD: data.slaWCD ?? null,
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

    return NextResponse.json({ request }, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error);
    
    // Prisma Unique Constraint Violation
    if (error.code === 'P2002' && error.meta?.target?.includes('sourceNo')) {
      return NextResponse.json(
        { error: { message: "This Source No already exists. Please change it and try again." } },
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
