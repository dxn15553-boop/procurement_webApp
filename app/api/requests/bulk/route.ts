import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, all, employee, hardDelete } = body;

    if (!all && (!Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    // Branch 1: Bulk delete matching filter or entire database
    if (all) {
      const where: any = {};
      if (!hardDelete) {
        where.isDeleted = false;
      }

      if (employee && employee !== "All") {
        const cleanName = employee.trim();
        where.OR = [
          { createdBy: { name: { equals: cleanName, mode: "insensitive" } } },
          { handler: { name: { equals: cleanName, mode: "insensitive" } } },
          { nameOfHandler: { contains: cleanName, mode: "insensitive" } },
        ];
        if (cleanName.toLowerCase() === "madhukumar") {
          where.OR.push({ nameOfHandler: { contains: "Madhu", mode: "insensitive" } });
        }
      }

      if (hardDelete) {
        const targets = await prisma.procurementRequest.findMany({
          where,
          select: { id: true },
        });
        const targetIds = targets.map((t) => t.id);

        if (targetIds.length > 0) {
          try {
            await prisma.activityLog.deleteMany({ where: { requestId: { in: targetIds } } });
            await prisma.notification.deleteMany({ where: { requestId: { in: targetIds } } });
          } catch (e) {
            console.warn("Could not clean related logs/notifications:", e);
          }

          const result = await prisma.procurementRequest.deleteMany({
            where: { id: { in: targetIds } },
          });
          return NextResponse.json({ success: true, count: result.count, hardDeleted: true });
        }
        return NextResponse.json({ success: true, count: 0, hardDeleted: true });
      } else {
        // Soft delete all matching
        const result = await prisma.procurementRequest.updateMany({
          where,
          data: { isDeleted: true },
        });

        try {
          await prisma.activityLog.create({
            data: {
              userId: session.user.id!,
              action: "BULK_DELETED",
              newValue: `Bulk soft-deleted all matching requests (Count: ${result.count}${employee ? `, Employee: ${employee}` : ""})`,
            },
          });
        } catch (e) {
          console.warn("Failed to create bulk activity log:", e);
        }

        return NextResponse.json({ success: true, count: result.count, hardDeleted: false });
      }
    }

    // Branch 2: Bulk delete specific selected IDs
    if (hardDelete) {
      try {
        await prisma.activityLog.deleteMany({ where: { requestId: { in: ids } } });
        await prisma.notification.deleteMany({ where: { requestId: { in: ids } } });
      } catch (e) {
        console.warn("Could not clean related logs/notifications:", e);
      }

      const result = await prisma.procurementRequest.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, count: result.count, hardDeleted: true });
    } else {
      // Soft delete selected IDs
      const result = await prisma.procurementRequest.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: true },
      });

      try {
        const logs = ids.map((id: string) => ({
          requestId: id,
          userId: session.user.id!,
          action: "DELETED",
          newValue: "Record was bulk soft-deleted",
        }));
        await prisma.activityLog.createMany({ data: logs });
      } catch (e) {
        console.warn("Failed to create activity logs:", e);
      }

      return NextResponse.json({ success: true, count: result.count, hardDeleted: false });
    }
  } catch (error: any) {
    console.error("Bulk DELETE Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
