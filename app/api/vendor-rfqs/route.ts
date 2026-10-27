import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper for CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Public vendor lookup of their assigned RFQs by email or vendor ID
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    const vendorId = searchParams.get("vendorId")?.trim();

    if (!email && !vendorId) {
      return NextResponse.json(
        { error: "Vendor email or vendor ID is required." },
        { status: 400, headers: corsHeaders() }
      );
    }

    const whereClause: any = {};
    if (email) {
      whereClause.vendorEmail = { equals: email, mode: "insensitive" };
    }
    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    const invitations = await prisma.rfqVendor.findMany({
      where: whereClause,
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
            status: true,
            createdAt: true,
          },
        },
        quotations: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            quotationNo: true,
            totalAmount: true,
            baseAmount: true,
            taxAmount: true,
            status: true,
            submittedAt: true,
            documentUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error in GET /api/vendor-rfqs:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor RFQs", details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * Vendor submits quotation for an assigned RFQ
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      accessKey,
      rfqVendorId,
      baseAmount,
      taxAmount,
      freightCharges,
      otherCharges,
      leadTimeDays,
      paymentTerms,
      deliveryTerms,
      validityDays,
      documentUrl,
      remarks,
      items, // Array of line items
    } = body;

    // Locate the RFQ Vendor invitation
    const invitation = await prisma.rfqVendor.findFirst({
      where: accessKey ? { accessKey } : { id: rfqVendorId },
      include: { rfq: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation or access token." },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Check submission deadline
    if (new Date() > new Date(invitation.rfq.submissionDeadline)) {
      return NextResponse.json(
        { error: "The quotation submission deadline for this RFQ has expired." },
        { status: 400, headers: corsHeaders() }
      );
    }

    const base = parseFloat(baseAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const freight = parseFloat(freightCharges) || 0;
    const other = parseFloat(otherCharges) || 0;
    const total = base + tax + freight + other;

    // Check previous submissions to increment version
    const prevCount = await prisma.quotation.count({
      where: { rfqVendorId: invitation.id },
    });

    const quotationNo = `QT-${invitation.rfq.rfqNumber.replace("RFQ-", "")}-${invitation.vendorId.slice(-4)}-V${prevCount + 1}`;

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          quotationNo,
          rfqVendorId: invitation.id,
          vendorId: invitation.vendorId,
          version: prevCount + 1,
          baseAmount: base,
          taxAmount: tax,
          freightCharges: freight,
          otherCharges: other,
          totalAmount: total,
          leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : null,
          paymentTerms: paymentTerms?.trim() || null,
          deliveryTerms: deliveryTerms?.trim() || null,
          validityDays: validityDays ? parseInt(validityDays, 10) : null,
          documentUrl: documentUrl?.trim() || null,
          remarks: remarks?.trim() || null,
          status: "SUBMITTED",
          items: items && items.length > 0 ? {
            create: items.map((it: any) => ({
              description: it.description || "Line Item",
              quantity: parseFloat(it.quantity) || 1,
              unit: it.unit || "Nos",
              unitPrice: parseFloat(it.unitPrice) || 0,
              taxRate: parseFloat(it.taxRate) || 0,
              totalPrice: parseFloat(it.totalPrice) || 0,
            }))
          } : undefined,
        },
      });

      // Update RFQ Vendor invitation status
      await tx.rfqVendor.update({
        where: { id: invitation.id },
        data: {
          status: "SUBMITTED",
          respondedAt: new Date(),
        },
      });

      // Update RFQ status to QUOTES_RECEIVED
      await tx.rfq.update({
        where: { id: invitation.rfqId },
        data: { status: "QUOTES_RECEIVED" },
      });

      return q;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quotation submitted successfully!",
        quotation,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error("Error submitting quotation:", error);
    return NextResponse.json(
      { error: "Failed to submit quotation", details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export const runtime = "nodejs";
