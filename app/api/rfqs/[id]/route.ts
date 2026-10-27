import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        vendors: {
          include: {
            quotations: {
              include: {
                items: true
              },
              orderBy: { version: "desc" }
            }
          }
        },
        comparativeStatement: {
          include: {
            items: true,
            approvedBy: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    return NextResponse.json({ rfq });
  } catch (error: any) {
    console.error("Error fetching RFQ:", error);
    return NextResponse.json({ error: "Failed to fetch RFQ", details: error.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
