import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.user.findMany({
    include: { department: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  // Remove password hashes
  const safe = employees.map(({ passwordHash: _pw, ...e }) => e);
  return NextResponse.json({ employees: safe });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password ?? "changeme123", 12);
  const mustChangePassword = !password; // If no password provided, they must change it

  const user = await prisma.user.create({
    data: { ...rest, passwordHash, mustChangePassword },
  });

  const { passwordHash: _pw, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 201 });
}
