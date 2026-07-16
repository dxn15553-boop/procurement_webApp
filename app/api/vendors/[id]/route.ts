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
  
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendor.update({ 
    where: { id },
    data: { isActive: false }
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id!,
      action: "DELETED",
      newValue: `Vendor ${vendor.name} was soft-deleted`,
    },
  });

  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";
