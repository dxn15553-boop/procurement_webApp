import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procurementSchema } from "@/lib/validations";
import { calculateAllFields } from "@/lib/calculations";
import { parse, isValid } from "date-fns";

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  const formats = ["yyyy-MM-dd", "dd-MMM-yyyy", "d-MMM-yyyy", "dd MMM yyyy", "d MMM yyyy"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val, fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {}
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.procurementRequest.findUnique({
    where: { id },
    include: {
      department: true,
      vendor: true,
      createdBy: { select: { id: true, name: true, email: true } },
      activityLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Team can only see their own
  if (session.user.role !== "MANAGER" && request.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request });
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = procurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.procurementRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "MANAGER" && existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  let vendorId = data.vendorId ?? null;
  if (vendorId && vendorId.length < 15) {
    const code = cleanCode(vendorId);
    const vend = await prisma.vendor.upsert({
      where: { code },
      update: {},
      create: { name: vendorId, code },
    });
    vendorId = vend.id;
  }

  const sourceDate = parseDate(data.sourceDate);
  const comparativeDate = parseDate(data.comparativeDate);
  const prDate = parseDate(data.prDate);
  const pendingFrom = parseDate(data.pendingFrom);

  const currentStage = cleanStage(data.currentStage);
  const csStatus = cleanCSStatus(data.csStatus);
  const prStatus = cleanPRStatus(data.prStatus);

  const calc = calculateAllFields({ sourceDate, comparativeDate, prDate, pendingFrom, currentStage });

  const updated = await prisma.procurementRequest.update({
    where: { id },
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
      poDate: parseDate(data.poDate),
      prlNo: data.prlNo ?? null,
      prlDate: parseDate(data.prlDate),
      materialDispatchDate: parseDate(data.materialDispatchDate),
      materialReceivedDate: parseDate(data.materialReceivedDate),
      workCompletionDate: parseDate(data.workCompletionDate),
      sourceCancellationDate: parseDate(data.sourceCancellationDate),
      paymentApprovalDate: parseDate(data.paymentApprovalDate),
      paymentDoneDate: parseDate(data.paymentDoneDate),
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
    },
  });

  // Log changes
  const changedFields = Object.keys(data).filter(
    (key) => (existing as Record<string, unknown>)[key] !== (data as Record<string, unknown>)[key]
  );

  if (changedFields.length > 0) {
    await prisma.activityLog.create({
      data: {
        requestId: id,
        userId: session.user.id!,
        action: "UPDATED",
        fieldName: changedFields.join(", "),
        oldValue: changedFields.map((f) => `${f}: ${(existing as Record<string, unknown>)[f]}`).join("; "),
        newValue: changedFields.map((f) => `${f}: ${(data as Record<string, unknown>)[f]}`).join("; "),
      },
    });
  }

  return NextResponse.json({ request: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.activityLog.deleteMany({ where: { requestId: id } });
  await prisma.notification.deleteMany({ where: { requestId: id } });
  await prisma.procurementRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";
