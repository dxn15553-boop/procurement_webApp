import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveVendorId } from "@/lib/departmentHelper";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rfqId = searchParams.get("rfqId");

    if (!rfqId) {
      const csList = await prisma.comparativeStatement.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          rfq: {
            select: { rfqNumber: true, sourceNo: true, title: true }
          },
          items: {
            include: {
              quotation: {
                include: {
                  rfqVendor: true
                }
              }
            }
          },
          approvedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      return NextResponse.json({ comparativeStatements: csList });
    }

    // Single RFQ Comparative Statement calculation
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        vendors: {
          include: {
            quotations: {
              orderBy: { version: "desc" },
              include: { items: true }
            }
          }
        },
        comparativeStatement: {
          include: {
            items: true,
            approvedBy: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Extract all latest quotations
    const evaluatedQuotes: any[] = [];
    rfq.vendors.forEach(v => {
      if (v.quotations && v.quotations.length > 0) {
        const latest = v.quotations[0];
        evaluatedQuotes.push({
          quotationId: latest.id,
          quotationNo: latest.quotationNo,
          vendorId: v.vendorId,
          vendorName: v.vendorName,
          vendorEmail: v.vendorEmail,
          baseAmount: latest.baseAmount,
          taxAmount: latest.taxAmount,
          freightCharges: latest.freightCharges,
          otherCharges: latest.otherCharges,
          totalAmount: latest.totalAmount,
          leadTimeDays: latest.leadTimeDays,
          paymentTerms: latest.paymentTerms,
          deliveryTerms: latest.deliveryTerms,
          validityDays: latest.validityDays,
          documentUrl: latest.documentUrl,
          remarks: latest.remarks,
          submittedAt: latest.submittedAt,
        });
      }
    });

    // Sort by lowest price
    evaluatedQuotes.sort((a, b) => a.totalAmount - b.totalAmount);

    // Mark L1, L2, L3
    const rankedQuotes = evaluatedQuotes.map((q, idx) => ({
      ...q,
      rank: `L${idx + 1}`,
      isLowest: idx === 0,
    }));

    return NextResponse.json({
      rfq,
      quotes: rankedQuotes,
      existingCs: rfq.comparativeStatement || null,
    });
  } catch (error: any) {
    console.error("Error in GET /api/comparative-statements:", error);
    return NextResponse.json({ error: "Failed to fetch CS", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      rfqId,
      recommendedVendorId,
      recommendedVendorName,
      recommendationReason,
      isLowestSelected,
      quotes, // Array of evaluated quotes with rank
    } = body;

    if (!rfqId || !recommendedVendorId || !recommendedVendorName) {
      return NextResponse.json({
        error: "Missing required fields: rfqId, recommendedVendorId, and recommendedVendorName are required."
      }, { status: 400 });
    }

    if (!isLowestSelected && !recommendationReason?.trim()) {
      return NextResponse.json({
        error: "Justification reason is mandatory when selecting a vendor other than the lowest bidder (L1)."
      }, { status: 400 });
    }

    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Auto-generate CS Number
    const count = await prisma.comparativeStatement.count();
    const year = new Date().getFullYear();
    const csNumber = `CS-${year}-${String(count + 1).padStart(4, "0")}`;

    const cs = await prisma.$transaction(async (tx) => {
      // Create or update Comparative Statement
      const existing = await tx.comparativeStatement.findUnique({
        where: { rfqId }
      });

      let statement;
      if (existing) {
        statement = await tx.comparativeStatement.update({
          where: { id: existing.id },
          data: {
            recommendedVendorId,
            recommendedVendorName,
            recommendationReason: recommendationReason?.trim() || null,
            status: "APPROVED",
            approvedById: session.user.id,
            approvedAt: new Date(),
          }
        });
      } else {
        statement = await tx.comparativeStatement.create({
          data: {
            csNumber,
            rfqId,
            sourceNo: rfq.sourceNo,
            recommendedVendorId,
            recommendedVendorName,
            recommendationReason: recommendationReason?.trim() || null,
            status: "APPROVED",
            approvedById: session.user.id,
            approvedAt: new Date(),
            items: {
              create: (quotes || []).map((q: any) => ({
                quotationId: q.quotationId,
                evaluatedAmount: q.totalAmount,
                isLowest: q.isLowest || false,
                technicalStatus: "Compliant",
                commercialStatus: q.rank,
                remarks: q.remarks || null,
              }))
            }
          }
        });
      }

      // Update RFQ status
      await tx.rfq.update({
        where: { id: rfqId },
        data: { status: "CLOSED" }
      });

      // Update or link to ProcurementRequest in Procurement spreadsheet if exists
      const existingReq = await tx.procurementRequest.findFirst({
        where: { sourceNo: { equals: rfq.sourceNo, mode: "insensitive" } }
      });

      if (existingReq) {
        const resolvedVendorId = await resolveVendorId(recommendedVendorName);
        await tx.procurementRequest.update({
          where: { id: existingReq.id },
          data: {
            vendorId: resolvedVendorId,
            comparativeDate: new Date(),
            csStatus: "COMPLETED",
            currentStage: "PR",
          }
        });
      }

      return statement;
    });

    return NextResponse.json({
      success: true,
      message: `Comparative Statement ${cs.csNumber} approved! Winning vendor: ${recommendedVendorName}`,
      cs,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating/approving CS:", error);
    return NextResponse.json({ error: "Failed to approve CS", details: error.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
