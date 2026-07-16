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
  
  if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({ 
    where: { id },
    data: { isActive: false }
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id!,
      action: "DELETED",
      newValue: `User ${targetUser.name} was soft-deleted`,
    },
  });

  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";
