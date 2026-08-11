import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Check for cron secret to prevent unauthorized execution
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find incomplete requests based on the new total days rules:
    // - Non-PR stages: > 21 days
    // - PR stage: > 23 days
    const overdueRequests = await prisma.procurementRequest.findMany({
      where: {
        currentStage: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
        OR: [
          {
            currentStage: { not: "PR" },
            noOfDays: { gt: 21 },
          },
          {
            currentStage: "PR",
            noOfDays: { gt: 23 },
          },
        ],
      },
      include: {
        createdBy: true,
        handler: true,
      },
    });

    if (overdueRequests.length === 0) {
      return NextResponse.json({ message: "No overdue requests found." });
    }

    let emailsSent = 0;
    const errors: any[] = [];

    for (const request of overdueRequests) {
      const targetUser = request.handler || request.createdBy;
      
      if (!targetUser?.email) continue;

      const success = await sendReminderEmail({
        to: targetUser.email,
        handlerName: targetUser.name,
        sourceNo: request.sourceNo,
        pendingDays: request.pendingDays || request.noOfDays || 21,
        currentStage: request.currentStage,
      });

      if (success) {
        emailsSent++;
      } else {
        errors.push(`Failed to send email for request ${request.sourceNo}`);
      }

      // Create an in-app notification for the handler
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          requestId: request.id,
          type: "REMINDER",
          title: "SLA Overdue Reminder",
          message: `Source Request ${request.sourceNo} is overdue (Pending for ${request.pendingDays || request.noOfDays || 21} days in stage ${request.currentStage}). Please take action.`,
        }
      });
    }

    return NextResponse.json({
      message: `Cron executed successfully. Processed ${overdueRequests.length} requests.`,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json(
      { error: "Internal server error during cron execution" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
