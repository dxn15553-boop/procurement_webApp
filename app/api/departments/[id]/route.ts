import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.department.update({ 
    where: { id },
    data: { isActive: false }
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id!,
      action: "DELETED",
      newValue: `Department ${department.name} was soft-deleted`,
    },
  });

  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";
