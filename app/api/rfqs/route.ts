import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchEligibleSourceRequestsForRfq } from "@/lib/sourceDb";
import { sendRfqInvitationEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    // If requesting eligible source requests from Source App
    if (view === "eligible_sources") {
      const eligibleSources = await fetchEligibleSourceRequestsForRfq();
      
      // Also get existing RFQs from Procurement DB to tag which sources already have RFQs
      const existingRfqs = await prisma.rfq.findMany({
        select: {
          id: true,
          rfqNumber: true,
          sourceNo: true,
          status: true,
          createdAt: true,
          _count: {
            select: { vendors: true }
          }
        }
      });

      const rfqMap = new Map();
      existingRfqs.forEach(r => rfqMap.set(r.sourceNo.toUpperCase(), r));

      const enriched = eligibleSources.map(src => ({
        ...src,
        rfq: rfqMap.get(src.id.toUpperCase()) || null
      }));

      return NextResponse.json({ sources: enriched });
    }

    // Default: Return list of RFQs with vendors & quotations
    const rfqs = await prisma.rfq.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        vendors: {
          include: {
            quotations: {
              select: {
                id: true,
                quotationNo: true,
                totalAmount: true,
                status: true,
                submittedAt: true,
              }
            }
          }
        },
        comparativeStatement: {
          select: {
            id: true,
            csNumber: true,
            status: true,
            recommendedVendorName: true,
          }
        }
      }
    });

    return NextResponse.json({ rfqs });
  } catch (error: any) {
    console.error("Error in GET /api/rfqs:", error);
    return NextResponse.json({ error: "Failed to fetch RFQs", details: error.message }, { status: 500 });
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
      sourceNo,
      title,
      description,
      specifications,
      quantity,
      unit,
      requiredDate,
      submissionDeadline,
      deliveryLocation,
      termsAndConditions,
      selectedVendors, // Array of { id, company_name, email }
    } = body;

    if (!sourceNo || !title || !submissionDeadline || !selectedVendors || selectedVendors.length === 0) {
      return NextResponse.json({
        error: "Missing required fields: sourceNo, title, submissionDeadline, and at least one selected vendor are required."
      }, { status: 400 });
    }

    // Auto-generate RFQ Number
    const count = await prisma.rfq.count();
    const year = new Date().getFullYear();
    const rfqNumber = `RFQ-${year}-${String(count + 1).padStart(4, "0")}`;

    // Create RFQ transaction with vendor invitations
    const newRfq = await prisma.$transaction(async (tx) => {
      const rfq = await tx.rfq.create({
        data: {
          rfqNumber,
          sourceNo: sourceNo.trim().toUpperCase(),
          title: title.trim(),
          description: description?.trim() || title.trim(),
          specifications: specifications?.trim() || null,
          quantity: quantity ? parseInt(quantity, 10) : null,
          unit: unit?.trim() || null,
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          submissionDeadline: new Date(submissionDeadline),
          deliveryLocation: deliveryLocation?.trim() || "DXN Plant, Mandapally, Siddipet",
          termsAndConditions: termsAndConditions?.trim() || null,
          status: "DISPATCHED",
          createdById: session.user.id,
          vendors: {
            create: selectedVendors.map((v: any) => ({
              vendorId: String(v.id),
              vendorName: v.company_name,
              vendorEmail: v.email,
              status: "INVITED",
            }))
          }
        },
        include: {
          vendors: true
        }
      });

      return rfq;
    });

    // Fire & forget: send invitation email with direct magic link to each invited vendor
    if (newRfq.vendors && newRfq.vendors.length > 0) {
      newRfq.vendors.forEach((vendor) => {
        sendRfqInvitationEmail({
          to: vendor.vendorEmail,
          vendorName: vendor.vendorName,
          rfqNumber: newRfq.rfqNumber,
          sourceNo: newRfq.sourceNo,
          title: newRfq.title,
          specifications: newRfq.specifications,
          quantity: newRfq.quantity,
          unit: newRfq.unit,
          submissionDeadline: newRfq.submissionDeadline.toISOString(),
          deliveryLocation: newRfq.deliveryLocation,
          accessKey: vendor.accessKey,
        }).catch((err) => {
          console.error(`Failed to send RFQ email to ${vendor.vendorEmail}:`, err);
        });
      });
    }

    return NextResponse.json({ success: true, rfq: newRfq }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating RFQ:", error);
    return NextResponse.json({ error: "Failed to create RFQ", details: error.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
