import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ accessKey: string }> }
) {
  try {
    const { accessKey } = await params;

    const invitation = await prisma.rfqVendor.findUnique({
      where: { accessKey },
      include: {
        rfq: {
          select: {
            id: true,
            rfqNumber: true,
            sourceNo: true,
            title: true,
            description: true,
            specifications: true,
            quantity: true,
            unit: true,
            submissionDeadline: true,
            deliveryLocation: true,
            termsAndConditions: true,
            status: true,
            createdAt: true,
          },
        },
        quotations: {
          orderBy: { version: "desc" },
          include: {
            items: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found." },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Mark as VIEWED if still INVITED
    if (invitation.status === "INVITED") {
      await prisma.rfqVendor.update({
        where: { id: invitation.id },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ invitation }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching RFQ by access key:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ", details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export const runtime = "nodejs";
