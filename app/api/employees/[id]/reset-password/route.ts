import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Default reset password
    const newPasswordHash = await bcrypt.hash("changeme123", 12);

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash: newPasswordHash, mustChangePassword: true },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
