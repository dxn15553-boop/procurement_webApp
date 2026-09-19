import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      email: {
        notIn: [
          "sarah@procurex.com",
          "john@procurex.com",
          "team@procurex.com",
          "team2@procurex.com",
        ],
      },
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  const mappedUsers = await Promise.all(
    users.map(async (u) => {
      const cleanName = u.name.trim();
      const orConditions: any[] = [
        { createdById: u.id },
        { handlerId: u.id },
        { nameOfHandler: { contains: cleanName, mode: "insensitive" } },
      ];
      if (cleanName.toLowerCase() === "madhukumar") {
        orConditions.push({ nameOfHandler: { contains: "Madhu", mode: "insensitive" } });
      }
      const count = await prisma.procurementRequest.count({
        where: {
          isDeleted: false,
          OR: orConditions,
        },
      });
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        requestCount: count,
      };
    })
  );

  return NextResponse.json(
    { users: mappedUsers },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}

export const runtime = "nodejs";
