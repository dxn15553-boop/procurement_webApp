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

    // Default: Return list of RFQs with vendors & quotations (Synchronized per Source Request)
    const rawRfqs = await prisma.rfq.findMany({
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

    // Ensure each Source Request is listed as a single synchronized RFQ
    const sourceMap = new Map<string, typeof rawRfqs[0]>();
    for (const item of rawRfqs) {
      const key = item.sourceNo.trim().toUpperCase();
      if (!sourceMap.has(key)) {
        sourceMap.set(key, item);
      } else {
        // Merge vendors into the existing record if any legacy duplicates exist
        const existing = sourceMap.get(key)!;
        const existingVendorIds = new Set(existing.vendors.map(v => v.id));
        for (const v of item.vendors) {
          if (!existingVendorIds.has(v.id)) {
            existing.vendors.push(v);
          }
        }
        if (item.comparativeStatement && !existing.comparativeStatement) {
          existing.comparativeStatement = item.comparativeStatement;
        }
      }
    }

    const rfqs = Array.from(sourceMap.values());

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

    const normalizedSourceNo = sourceNo.trim().toUpperCase();

    // Check if an RFQ already exists for this Source Request
    const existingRfq = await prisma.rfq.findFirst({
      where: { sourceNo: normalizedSourceNo },
      include: {
        vendors: true
      },
      orderBy: { createdAt: "asc" }
    });

    let targetRfq: any;
    let newlyInvitedVendors: any[] = [];

    if (existingRfq) {
      // Re-use the existing RFQ number! Do not change RFQ number for the same Source Request.
      console.log(`Adding vendors to existing RFQ: ${existingRfq.rfqNumber} for Source: ${normalizedSourceNo}`);

      // Update RFQ details if provided
      await prisma.rfq.update({
        where: { id: existingRfq.id },
        data: {
          title: title.trim() || existingRfq.title,
          description: description?.trim() || existingRfq.description,
          specifications: specifications?.trim() || existingRfq.specifications,
          quantity: quantity ? parseInt(quantity, 10) : existingRfq.quantity,
          unit: unit?.trim() || existingRfq.unit,
          requiredDate: requiredDate ? new Date(requiredDate) : existingRfq.requiredDate,
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : existingRfq.submissionDeadline,
          deliveryLocation: deliveryLocation?.trim() || existingRfq.deliveryLocation,
          termsAndConditions: termsAndConditions?.trim() || existingRfq.termsAndConditions,
        }
      });

      // Avoid duplicate vendor invitations for the same RFQ
      const existingVendorIds = new Set(existingRfq.vendors.map((v) => String(v.vendorId)));
      const existingEmails = new Set(existingRfq.vendors.map((v) => (v.vendorEmail || "").toLowerCase().trim()));

      const vendorsToAdd = selectedVendors.filter((v: any) => {
        const vid = String(v.id);
        const email = (v.email || "").toLowerCase().trim();
        return !existingVendorIds.has(vid) && (!email || !existingEmails.has(email));
      });

      if (vendorsToAdd.length > 0) {
        for (const v of vendorsToAdd) {
          const createdVendor = await prisma.rfqVendor.create({
            data: {
              rfqId: existingRfq.id,
              vendorId: String(v.id),
              vendorName: v.company_name,
              vendorEmail: v.email,
              status: "INVITED",
            }
          });
          newlyInvitedVendors.push(createdVendor);
        }
      }

      // Fetch the full updated RFQ with all vendors
      targetRfq = await prisma.rfq.findUnique({
        where: { id: existingRfq.id },
        include: {
          vendors: {
            include: { quotations: true }
          },
          comparativeStatement: true
        }
      });
    } else {
      // First time creating an RFQ for this Source Request:
      // Auto-generate a new sequential RFQ Number
      const count = await prisma.rfq.count();
      const year = new Date().getFullYear();
      const rfqNumber = `RFQ-${year}-${String(count + 1).padStart(4, "0")}`;

      targetRfq = await prisma.$transaction(async (tx) => {
        const rfq = await tx.rfq.create({
          data: {
            rfqNumber,
            sourceNo: normalizedSourceNo,
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

      newlyInvitedVendors = targetRfq.vendors;
    }

    // Fire & forget: send invitation email with direct magic link ONLY to newly invited vendors
    if (newlyInvitedVendors.length > 0) {
      newlyInvitedVendors.forEach((vendor) => {
        sendRfqInvitationEmail({
          to: vendor.vendorEmail,
          vendorName: vendor.vendorName,
          rfqNumber: targetRfq.rfqNumber,
          sourceNo: targetRfq.sourceNo,
          title: targetRfq.title,
          specifications: targetRfq.specifications,
          quantity: targetRfq.quantity,
          unit: targetRfq.unit,
          submissionDeadline: targetRfq.submissionDeadline.toISOString(),
          deliveryLocation: targetRfq.deliveryLocation,
          accessKey: vendor.accessKey,
        }).catch((err) => {
          console.error(`Failed to send RFQ email to ${vendor.vendorEmail}:`, err);
        });
      });
    }

    return NextResponse.json({
      success: true,
      rfq: targetRfq,
      isExisting: !!existingRfq,
      addedVendorsCount: newlyInvitedVendors.length,
    }, { status: existingRfq ? 200 : 201 });
  } catch (error: any) {
    console.error("Error creating RFQ:", error);
    return NextResponse.json({ error: "Failed to create RFQ", details: error.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
