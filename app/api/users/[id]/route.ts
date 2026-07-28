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

  // Anonymize the email on soft-delete so the DB @unique constraint is freed up
  // and the email address can be reused or reassigned to another account later.
  const deletedEmail = `deleted_${Date.now()}_${targetUser.email}`;
  await prisma.user.update({ 
    where: { id },
    data: { isActive: false, email: deletedEmail }
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if any OTHER active user already holds this email.
  const conflictingUser = await prisma.user.findFirst({
    where: { email, isActive: true, NOT: { id } }
  });
  if (conflictingUser) {
    return NextResponse.json({ error: "Email is already in use by another active account" }, { status: 400 });
  }

  // Safety net: if a soft-deleted user still holds this email (legacy data before the fix),
  // free it up now so the DB unique constraint doesn't block the update.
  await prisma.user.updateMany({
    where: { email, isActive: false },
    data: { email: `deleted_legacy_${Date.now()}_${email}` },
  });

  const updated = await prisma.user.update({
    where: { id },
    data: { email }
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id!,
      action: "UPDATED",
      newValue: `User ${targetUser.name} email updated to ${email}`,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}
