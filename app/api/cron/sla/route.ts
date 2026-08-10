import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcPendingDays, calcNoOfDays, calcSLAStatus } from "@/lib/calculations";
import type { CurrentStage } from "@/types";

// This endpoint should be triggered by a Cron Job (e.g. Vercel Cron)
// Make sure to protect it in production using a secret token or Vercel's authorization header.

export async function GET(req: Request) {
  try {
    // 1. Fetch all active requests
    const activeRequests = await prisma.procurementRequest.findMany({
      where: {
        isDeleted: false,
        currentStage: {
          notIn: ["COMPLETED", "CANCELLED"]
        }
      },
      select: {
        id: true,
        sourceDate: true,
        pendingFrom: true,
        currentStage: true,
        pendingDays: true,
        noOfDays: true,
        slaStatus: true,
      }
    });

    let updatedCount = 0;

    // 2. Recalculate for each and update if changed
    // We could optimize this with a single raw query, but doing it in code allows reusing the calculation logic.
    for (const request of activeRequests) {
      const newPendingDays = calcPendingDays(request.pendingFrom);
      const newNoOfDays = calcNoOfDays(request.sourceDate);
      const newSlaStatus = calcSLAStatus(
        request.currentStage as CurrentStage, 
        newPendingDays
      );

      // Only update if something actually changed
      if (
        newPendingDays !== request.pendingDays || 
        newNoOfDays !== request.noOfDays || 
        newSlaStatus !== request.slaStatus
      ) {
        await prisma.procurementRequest.update({
          where: { id: request.id },
          data: {
            pendingDays: newPendingDays,
            noOfDays: newNoOfDays,
            slaStatus: newSlaStatus
          }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Checked ${activeRequests.length} active requests. Updated ${updatedCount} requests.` 
    });

  } catch (error: any) {
    console.error("Cron SLA Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

// Ensure the function isn't cached if running on Vercel Edge / Node
export const revalidate = 0;
export const runtime = "nodejs";
