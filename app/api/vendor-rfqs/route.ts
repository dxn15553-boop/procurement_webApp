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
 * Public vendor lookup is disabled for confidentiality.
 * RFQs can only be accessed via the unique token endpoint: GET /api/vendor-rfqs/:accessKey
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Public email lookup is disabled for confidentiality. RFQs are strictly accessible via the unique secure token link issued in your official invitation email.",
    },
    { status: 403, headers: corsHeaders() }
  );
}

/**
 * Vendor submits quotation for an assigned RFQ - STRICT TOKEN REQUIRED
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      accessKey,
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

    if (!accessKey || typeof accessKey !== "string") {
      return NextResponse.json(
        { error: "Access token is required. Quotations can only be submitted via your authorized invitation link." },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Locate the RFQ Vendor invitation strictly by secret accessKey
    const invitation = await prisma.rfqVendor.findUnique({
      where: { accessKey: accessKey.trim() },
      include: { rfq: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired RFQ access token." },
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
