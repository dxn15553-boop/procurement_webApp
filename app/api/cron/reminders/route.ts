import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBatchReminderEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("authorization");
    
    const isAuthorized = 
      secret === process.env.CRON_SECRET || 
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Check for cron secret to prevent unauthorized execution
    if (!isAuthorized) {
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

    // Group requests by user email
    const groupedRequests = new Map<string, {
      user: any;
      requests: any[];
    }>();

    for (const request of overdueRequests) {
      const targetUser = request.handler || request.createdBy;
      if (!targetUser?.email) continue;

      if (!groupedRequests.has(targetUser.email)) {
        groupedRequests.set(targetUser.email, { user: targetUser, requests: [] });
      }
      groupedRequests.get(targetUser.email)!.requests.push(request);
      
      // Create an individual in-app notification for each request
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

    // Fetch managers for escalation if needed
    let managerEmails: string[] = [];
    const hasAnyEscalation = Array.from(groupedRequests.values()).some(({ requests }) => 
      requests.some(req => (req.pendingDays || req.noOfDays || 21) > 40)
    );

    if (hasAnyEscalation) {
      const managers = await prisma.user.findMany({
        where: { role: "MANAGER", isActive: true },
        select: { email: true }
      });
      managerEmails = managers.map(m => m.email);
    }

    // Determine the base URL for links
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";

    // Send one batch email per user
    for (const [email, { user, requests }] of groupedRequests) {
      const isEscalation = requests.some(req => (req.pendingDays || req.noOfDays || 21) > 40);
      
      const success = await sendBatchReminderEmail({
        to: email,
        cc: isEscalation && managerEmails.length > 0 ? managerEmails : undefined,
        handlerName: user.name,
        isEscalation,
        requests: requests.map(req => ({
          id: req.id,
          sourceNo: req.sourceNo,
          pendingDays: req.pendingDays || req.noOfDays || 21,
          currentStage: req.currentStage,
        })),
        baseUrl
      });

      if (success) {
        emailsSent++;
      } else {
        errors.push(`Failed to send batch email to ${email}`);
      }
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
