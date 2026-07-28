import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const changePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    // Only Managers can change passwords
    if (!session?.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized. Only managers can change passwords." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.password?.[0] || "Invalid input" },
        { status: 400 }
      );
    }

    const { password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user in DB
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        passwordHash, 
        mustChangePassword: false 
      },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
