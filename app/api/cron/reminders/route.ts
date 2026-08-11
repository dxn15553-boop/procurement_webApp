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

    // Find all incomplete requests that have exceeded their SLA (OVERDUE) and have a handler linked
    const overdueRequests = await prisma.procurementRequest.findMany({
      where: {
        slaStatus: "OVERDUE",
        currentStage: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      include: {
        createdBy: true,
      },
    });

    if (overdueRequests.length === 0) {
      return NextResponse.json({ message: "No overdue requests found." });
    }

    let emailsSent = 0;
    const errors: any[] = [];

    for (const request of overdueRequests) {
      if (!request.createdBy?.email) continue;

      const success = await sendReminderEmail({
        to: request.createdBy.email,
        handlerName: request.createdBy.name,
        sourceNo: request.sourceNo,
        pendingDays: request.pendingDays || 21,
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
          userId: request.createdBy.id,
          requestId: request.id,
          type: "REMINDER",
          title: "SLA Overdue Reminder",
          message: `Source Request ${request.sourceNo} is overdue (Pending for ${request.pendingDays || 21} days in stage ${request.currentStage}). Please take action.`,
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
