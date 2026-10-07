import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sourceNo = (searchParams.get("sourceNo") || "").trim();
    const excludeId = (searchParams.get("excludeId") || "").trim();

    if (!sourceNo) {
      return NextResponse.json({ exists: false });
    }

    const existing = await prisma.procurementRequest.findFirst({
      where: {
        sourceNo: { equals: sourceNo, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, sourceNo: true, nameOfHandler: true, isDeleted: true },
    });

    if (existing) {
      return NextResponse.json({
        exists: true,
        message: `Source No "${existing.sourceNo}" is already in use${existing.nameOfHandler ? ` by ${existing.nameOfHandler}` : ""}.`,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Check failed" }, { status: 500 });
  }
}
