import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procurementSchema } from "@/lib/validations";
import { calculateAllFields, deriveCurrentStage } from "@/lib/calculations";
import type { CurrentStage } from "@/types";
import { parse, isValid } from "date-fns";
import { resolveDepartmentId, resolveVendorId } from "@/lib/departmentHelper";

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

  const isAuthorized =
    session.user.role === "MANAGER" ||
    request.createdById === session.user.id ||
    request.handlerId === session.user.id ||
    Boolean(session.user.name && request.nameOfHandler?.toLowerCase() === session.user.name.toLowerCase());

  if (!isAuthorized) {
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
    return NextResponse.json({ error: { message: parsed.error.issues[0]?.message || "Validation failed" } }, { status: 400 });
  }

  try {
    const existing = await prisma.procurementRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session.user.role !== "MANAGER" &&
      existing.createdById !== session.user.id &&
      existing.handlerId !== session.user.id &&
      existing.nameOfHandler?.toLowerCase() !== (session.user.name ?? "").toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Guard: Prevent non-manager modifications to a cancelled procurement request
    if (existing.currentStage === "CANCELLED" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: { message: "Cannot edit or advance a cancelled procurement request." } }, { status: 400 });
    }

    const data = parsed.data;

    // Check for duplicate Source No if sourceNo changed
    if (data.sourceNo && data.sourceNo.trim().toUpperCase() !== existing.sourceNo.trim().toUpperCase()) {
      const cleanSourceNo = data.sourceNo.trim();
      const duplicate = await prisma.procurementRequest.findFirst({
        where: {
          id: { not: id },
          sourceNo: { equals: cleanSourceNo, mode: "insensitive" },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: { message: `Source No "${cleanSourceNo}" already exists on another request. Duplicate source numbers are not allowed.` } },
          { status: 409 }
        );
      }
    }

    const departmentId = await resolveDepartmentId(data.departmentId);
    if (!departmentId) {
      return NextResponse.json({ error: { message: "Valid Department is required" } }, { status: 400 });
    }
    const vendorId = await resolveVendorId(data.vendorId);

    const sourceDate = parseDate(data.sourceDate) || new Date();
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

    const csStatus = cleanCSStatus(data.csStatus);
    let prStatus = cleanPRStatus(data.prStatus);
    if ((prDate || data.prNumber) && (!data.prStatus || data.prStatus.trim() === "" || data.prStatus.toUpperCase() === "PENDING")) {
      prStatus = "APPROVED";
    }
    const poStatus = cleanPOStatus(data.poStatus);
    const paymentStatus = cleanPaymentStatus(data.paymentStatus);

    // Derive stage from actual submitted/existing data
    const inputStage = data.currentStage ? cleanStage(data.currentStage) : existing.currentStage;
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

    // Reset pendingFrom if the stage has changed/advanced, unless user explicitly provided an edited date
    let pendingFrom = parseDate(data.pendingFrom);
    if (!pendingFrom) {
      pendingFrom = existing.pendingFrom || new Date();
    }
    if (derivedStage !== existing.currentStage && (!data.pendingFrom || parseDate(data.pendingFrom)?.getTime() === existing.pendingFrom?.getTime())) {
      pendingFrom = new Date();
    }

    const calc = calculateAllFields({
      sourceDate,
      comparativeDate,
      prDate,
      poDate,
      prlDate,
      paymentDoneDate,
      pendingFrom,
      currentStage: derivedStage,
      existingStage: existing.currentStage,
      csStatus,
      prStatus,
      poStatus,
      materialDispatchDate,
      materialReceivedDate,
      workCompletionDate,
      paymentApprovalDate,
    });

    let handlerId = data.handlerId !== undefined ? (data.handlerId || null) : existing.handlerId;
    const nameOfHandler = data.nameOfHandler !== undefined ? data.nameOfHandler : existing.nameOfHandler;

    if (!handlerId && nameOfHandler?.trim()) {
      const handlerUser = await prisma.user.findFirst({
        where: { name: { equals: nameOfHandler.trim(), mode: "insensitive" } }
      });
      if (handlerUser) {
        handlerId = handlerUser.id;
      }
    }

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
        nameOfHandler: nameOfHandler ?? null,
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
        procurementReceivedDate: data.procurementReceivedDate !== undefined ? parseDate(data.procurementReceivedDate) : existing.procurementReceivedDate,
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

    // Notify assigned employee if handlerId changed to a new person
    if (handlerId && handlerId !== existing.handlerId) {
      try {
        const assignedUser = await prisma.user.findUnique({ where: { id: handlerId } });
        if (assignedUser) {
          const assignedDate = new Date().toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "numeric", month: "short", year: "numeric"
          });
          await prisma.notification.create({
            data: {
              userId: handlerId,
              requestId: id,
              type: "ASSIGNMENT",
              title: `New Task Assigned: ${updated.sourceNo}`,
              message: `You have been assigned a new procurement task.\n\nTask: ${updated.sourceNo}\nDescription: ${updated.sourceDescription}\nDepartment: ${updated.departmentId}\nCurrent Stage: ${updated.currentStage}\nAssigned Date: ${assignedDate}\n\nPlease log in to the Procurement portal to review and begin working on this task.`,
              isRead: false,
            },
          });
        }
      } catch (notifyErr) {
        console.error("Failed to create assignment notification:", notifyErr);
      }
    }

    return NextResponse.json({ request: updated });
  } catch (error: any) {
    console.error("PUT Error:", error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { message: `Source No "${body.sourceNo || 'entered'}" is already in use by another request. Duplicate source numbers are not allowed.` } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.procurementRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthorized =
    session.user.role === "MANAGER" ||
    existing.createdById === session.user.id ||
    existing.handlerId === session.user.id ||
    Boolean(session.user.name && existing.nameOfHandler?.toLowerCase() === session.user.name.toLowerCase());

  if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.csStatus) updateData.csStatus = cleanCSStatus(body.csStatus);
    if (body.currentStatusByHandler !== undefined) updateData.currentStatusByHandler = body.currentStatusByHandler;
    if (body.currentStage) updateData.currentStage = cleanStage(body.currentStage);
    if (body.pendingFrom !== undefined) updateData.pendingFrom = parseDate(body.pendingFrom);
    if (body.comparativeDate !== undefined) updateData.comparativeDate = parseDate(body.comparativeDate);
    if (body.prNumber !== undefined) updateData.prNumber = body.prNumber;
    if (body.prDate !== undefined) updateData.prDate = parseDate(body.prDate);
    if (body.prStatus) updateData.prStatus = cleanPRStatus(body.prStatus);
    if (body.poNumber !== undefined) updateData.poNumber = body.poNumber;
    if (body.poDate !== undefined) updateData.poDate = parseDate(body.poDate);
    if (body.poStatus) updateData.poStatus = cleanPOStatus(body.poStatus);
    if (body.prlNo !== undefined) updateData.prlNo = body.prlNo;
    if (body.prlDate !== undefined) updateData.prlDate = parseDate(body.prlDate);
    if (body.materialDispatchDate !== undefined) updateData.materialDispatchDate = parseDate(body.materialDispatchDate);
    if (body.materialReceivedDate !== undefined) updateData.materialReceivedDate = parseDate(body.materialReceivedDate);
    if (body.workCompletionDate !== undefined) updateData.workCompletionDate = parseDate(body.workCompletionDate);
    if (body.paymentApprovalDate !== undefined) updateData.paymentApprovalDate = parseDate(body.paymentApprovalDate);
    if (body.paymentDoneDate !== undefined) updateData.paymentDoneDate = parseDate(body.paymentDoneDate);
    if (body.sourceCancellationDate !== undefined) updateData.sourceCancellationDate = parseDate(body.sourceCancellationDate);

    // Auto-derive stage from candidate updates
    const candidateStage = updateData.currentStage || existing.currentStage;
    const derivedStage = deriveCurrentStage({
      currentStage: candidateStage,
      csStatus: updateData.csStatus !== undefined ? updateData.csStatus : existing.csStatus,
      comparativeDate: updateData.comparativeDate !== undefined ? updateData.comparativeDate : existing.comparativeDate,
      prStatus: updateData.prStatus !== undefined ? updateData.prStatus : existing.prStatus,
      prDate: updateData.prDate !== undefined ? updateData.prDate : existing.prDate,
      poStatus: updateData.poStatus !== undefined ? updateData.poStatus : existing.poStatus,
      poDate: updateData.poDate !== undefined ? updateData.poDate : existing.poDate,
      materialDispatchDate: updateData.materialDispatchDate !== undefined ? updateData.materialDispatchDate : existing.materialDispatchDate,
      materialReceivedDate: updateData.materialReceivedDate !== undefined ? updateData.materialReceivedDate : existing.materialReceivedDate,
      workCompletionDate: updateData.workCompletionDate !== undefined ? updateData.workCompletionDate : existing.workCompletionDate,
      prlDate: updateData.prlDate !== undefined ? updateData.prlDate : existing.prlDate,
      paymentApprovalDate: updateData.paymentApprovalDate !== undefined ? updateData.paymentApprovalDate : existing.paymentApprovalDate,
      paymentDoneDate: updateData.paymentDoneDate !== undefined ? updateData.paymentDoneDate : existing.paymentDoneDate,
      sourceCancellationDate: updateData.sourceCancellationDate !== undefined ? updateData.sourceCancellationDate : existing.sourceCancellationDate,
    });
    updateData.currentStage = derivedStage;

    if (derivedStage !== existing.currentStage && updateData.pendingFrom === undefined) {
      updateData.pendingFrom = new Date();
    }

    // Auto-recalculate metrics
    const calc = calculateAllFields({
      sourceDate: existing.sourceDate,
      comparativeDate: updateData.comparativeDate !== undefined ? updateData.comparativeDate : existing.comparativeDate,
      prDate: updateData.prDate !== undefined ? updateData.prDate : existing.prDate,
      poDate: updateData.poDate !== undefined ? updateData.poDate : existing.poDate,
      prlDate: updateData.prlDate !== undefined ? updateData.prlDate : existing.prlDate,
      paymentDoneDate: updateData.paymentDoneDate !== undefined ? updateData.paymentDoneDate : existing.paymentDoneDate,
      pendingFrom: updateData.pendingFrom !== undefined ? updateData.pendingFrom : existing.pendingFrom,
      currentStage: derivedStage,
    });

    Object.assign(updateData, {
      daysForCS: calc.daysForCS,
      daysForPR: calc.daysForPR,
      daysForPO: calc.daysForPO,
      daysForPayment: calc.daysForPayment,
      noOfDays: calc.noOfDays,
      pendingDays: calc.pendingDays,
      slaStatus: calc.slaStatus,
    });

    const updated = await prisma.procurementRequest.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        requestId: id,
        userId: session.user.id!,
        action: body.action || "UPDATED",
        fieldName: Object.keys(body).filter((k) => k !== "action" && k !== "actionDetails").join(", ") || "status",
        newValue: body.actionDetails || `Updated: ${Object.keys(body).join(", ")}`,
      },
    });

    // Notify creator if accepted
    if (body.action === "ACCEPTED" && existing.createdById !== session.user.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: existing.createdById,
            requestId: id,
            type: "TASK_ACCEPTED",
            title: `Task Accepted: ${existing.sourceNo}`,
            message: `${session.user.name || "Assigned employee"} has accepted task ${existing.sourceNo} and started working on it.`,
            isRead: false,
          },
        });
      } catch (notifyErr) {
        console.error("Failed to create acceptance notification:", notifyErr);
      }
    }

    return NextResponse.json({ request: updated });
  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
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

  // 1. Soft-delete the request (This is working!)
  await prisma.procurementRequest.update({
    where: { id },
    data: { isDeleted: true }
  });

  // 2. Wrap the Activity Log in a try/catch so it doesn't break the deletion if it fails
  try {
    await prisma.activityLog.create({
      data: {
        requestId: id,
        userId: session.user.id!,
        action: "DELETED",
        newValue: "Record was soft-deleted",
      },
    });
  } catch (logError) {
    console.error("Failed to save activity log:", logError);
  }

  // 3. Always return success if the deletion worked
  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";
