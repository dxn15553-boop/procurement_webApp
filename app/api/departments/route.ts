import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { departmentSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const seen = new Set<string>();
  const uniqueDepartments = departments.filter((d) => {
    const key = d.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ departments: uniqueDepartments });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const trimmedName = parsed.data.name.trim();
  const trimmedCode = parsed.data.code.trim().toUpperCase();

  const existing = await prisma.department.findFirst({
    where: {
      OR: [
        { name: { equals: trimmedName, mode: "insensitive" } },
        { code: { equals: trimmedCode, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "A department with this name or code already exists" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: {
      ...parsed.data,
      name: trimmedName,
      code: trimmedCode,
    },
  });
  return NextResponse.json({ department }, { status: 201 });
}

export const runtime = "nodejs";
