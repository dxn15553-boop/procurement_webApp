import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    // Perform soft delete
    await prisma.procurementRequest.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        isDeleted: true
      }
    });

    // Log the bulk activity
    const logs = ids.map(id => ({
      requestId: id,
      userId: session.user.id!,
      action: "DELETED",
      newValue: "Record was bulk soft-deleted",
    }));

    await prisma.activityLog.createMany({
      data: logs
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error("Bulk DELETE Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
