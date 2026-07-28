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

  // Return all fields except the hash; include tempPassword for manager view
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

  const { password, departmentId, ...rest } = parsed.data;

  const plainPassword = password || "changeme123";
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const mustChangePassword = !password;

  const validDepartmentId = departmentId === "" ? null : departmentId;

  try {
    const user = await prisma.user.create({
      data: { ...rest, departmentId: validDepartmentId, passwordHash, mustChangePassword, tempPassword: plainPassword },
    });

    const { passwordHash: _pw, ...safeUser } = user;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export const runtime = "nodejs";
