import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchAssignedRequestsForHandler,
  fetchAllAssignedSourceRequests,
  formatSourceDescription,
  type SourceRequestRecord,
} from "@/lib/sourceDb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager = session.user.role === "MANAGER";
    const userEmail = session.user.email || "";
    const userName = session.user.name || "";
    const userId = session.user.id;

    // 1. Fetch assigned source requests from the Source Database
    let sourceRecords: SourceRequestRecord[] = [];
    if (isManager) {
      sourceRecords = await fetchAllAssignedSourceRequests();
    } else {
      sourceRecords = await fetchAssignedRequestsForHandler(userEmail, userName);
    }

    if (sourceRecords.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No assigned Source requests found to sync.",
        synced: [],
      });
    }

    // 2. Pre-fetch departments and users in Procurement DB for fast resolution
    const [departments, allUsers] = await Promise.all([
      prisma.department.findMany(),
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
    ]);

    const defaultManager = allUsers.find((u) => u.role === "MANAGER") || allUsers[0];

    const synced: string[] = [];

    // 3. Process each source record into Procurement DB
    for (const src of sourceRecords) {
      const sourceNo = src.id.trim();
      const rawDeptName = (src.department_name || "").trim();

      // Resolve or auto-create Department
      let department = departments.find(
        (d) => d.name.toLowerCase() === rawDeptName.toLowerCase()
      );

      if (!department && rawDeptName) {
        try {
          const baseCode = rawDeptName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "DEPT";
          let deptCode = baseCode;
          let counter = 1;
          while (departments.some((d) => d.code === deptCode && d.name.toLowerCase() !== rawDeptName.toLowerCase())) {
            deptCode = `${baseCode.slice(0, 5)}_${counter++}`;
          }

          department = await prisma.department.upsert({
            where: { code: deptCode },
            update: { name: rawDeptName },
            create: { name: rawDeptName, code: deptCode, head: "Manager" },
          });
          departments.push(department);
        } catch {
          // If code collision or fail, fallback to first department
          department = departments[0];
        }
      }

      if (!department) {
        department = departments[0];
      }

      // Resolve Handler in Procurement DB
      let targetHandlerId = userId;
      let targetHandlerName = userName;

      if (isManager) {
        // Find matching handler for this specific source request
        const matched = allUsers.find(
          (u) =>
            (src.handler_email && u.email.toLowerCase() === src.handler_email.toLowerCase()) ||
            (src.handler_name && u.name.toLowerCase() === src.handler_name.toLowerCase())
        );
        if (matched) {
          targetHandlerId = matched.id;
          targetHandlerName = matched.name;
        } else {
          targetHandlerId = userId;
          targetHandlerName = userName;
        }
      }

      // Resolve Created By in Procurement DB (try matching requester email)
      const requesterUser = allUsers.find(
        (u) => src.requester_email && u.email.toLowerCase() === src.requester_email.toLowerCase()
      );
      const createdById = requesterUser?.id || defaultManager?.id || userId;

      const sourceDate = src.request_date
        ? new Date(src.request_date)
        : src.created_at
        ? new Date(src.created_at)
        : new Date();

      const sourceDescription = formatSourceDescription(src);

      // Check if ProcurementRequest already exists (case-insensitive across all records)
      const existing = await prisma.procurementRequest.findFirst({
        where: { sourceNo: { equals: sourceNo, mode: "insensitive" } },
      });

      if (existing) {
        // Update handler, department, description, and sourceDate while preserving stage progress and preventing duplicates
        await prisma.procurementRequest.update({
          where: { id: existing.id },
          data: {
            handlerId: targetHandlerId,
            nameOfHandler: targetHandlerName,
            departmentId: department ? department.id : existing.departmentId,
            sourceDate,
            sourceDescription,
            isDeleted: false,
            pendingFrom: existing.pendingFrom || new Date(),
            ...(!existing.procurementReceivedDate ? { procurementReceivedDate: existing.createdAt || new Date() } : {}),
          },
        });
      } else {
        // Create new ProcurementRequest
        const createdReq = await prisma.procurementRequest.create({
          data: {
            sourceNo,
            sourceDate,
            sourceDescription,
            procurementReceivedDate: new Date(),
            departmentId: department.id,
            handlerId: targetHandlerId,
            nameOfHandler: targetHandlerName,
            createdById,
            currentStage: "CS",
            csStatus: "PENDING",
            prStatus: "PENDING",
            poStatus: "PENDING",
            paymentStatus: "PENDING",
            slaStatus: "ON_TRACK",
            pendingFrom: new Date(),
            pendingDays: 0,
            noOfDays: 0,
            slaCS: 7,
            slaPR: 14,
            slaPO: 7,
            slaMDD: 7,
            slaMRD: 5,
            slaWCD: 30,
            slaPRL: 5,
            slaPAR: 5,
            slaPDD: 10,
            daysForCS: 0,
            daysForPR: 0,
            daysForPO: 0,
            daysForPayment: 0,
          },
        });

        // Add assignment notification for the handler
        const srfNo = src.srf_number || sourceNo.replace("SRC-", "SRF-");
        await prisma.notification.create({
          data: {
            userId: targetHandlerId,
            requestId: createdReq.id,
            type: "ASSIGNMENT",
            title: `New Assignment & SRF: ${srfNo}`,
            message: `Source Request ${sourceNo} has been assigned to you with official SRF details.`,
            isRead: false,
          },
        });
      }

      synced.push(sourceNo);
    }

    return NextResponse.json({
      success: true,
      count: synced.length,
      message: `Successfully synchronized ${synced.length} request(s) with Source application.`,
      synced,
    });
  } catch (err: any) {
    console.error("Error in sync-source API:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to synchronize source requests" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
