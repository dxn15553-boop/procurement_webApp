import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBatchReminderEmail } from "@/lib/email";
import { differenceInDays, startOfDay } from "date-fns";

/**
 * Daily Reminder Cron Job
 * Schedule: 30 4 * * *  (= 10:00 AM IST / 4:30 AM UTC)
 *
 * Rules:
 *  - Fires once per day automatically via Vercel Cron.
 *  - Finds all active (non-COMPLETED, non-CANCELLED) requests where
 *    total days from Source Date >= 21 days.
 *    For PR stage specifically: >= 23 days.
 *  - In-app notifications: one per (request, day) — no daily duplicates.
 *  - Email: one batch summary email per user covering ALL their qualifying requests.
 *  - Escalation: CC managers when any request is > 40 days old.
 *  - Completed/Cancelled requests are automatically excluded.
 *
 * Security: requires CRON_SECRET via query param or Authorization header.
 */

export async function GET(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("authorization");

    const isAuthorized =
      secret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Fetch active requests ─────────────────────────────────────────────────
    const today = new Date();
    const todayStart = startOfDay(today);

    const activeRequests = await prisma.procurementRequest.findMany({
      where: {
        isDeleted: false,
        currentStage: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        handler: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // ── Filter: only requests past the threshold ─────────────────────────────
    // Threshold: 21 days from sourceDate for all stages; 23 days for PR stage.
    const overdueRequests = activeRequests.filter((req) => {
      const noOfDays = differenceInDays(today, req.sourceDate);
      const threshold = req.currentStage === "PR" ? 23 : 21;
      return noOfDays >= threshold;
    });

    if (overdueRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No requests have exceeded the reminder threshold today.",
        checked: activeRequests.length,
        qualifying: 0,
      });
    }

    // ── In-app notifications (individual, deduplicated per day) ──────────────
    // IMPORTANT: Do NOT use findFirst inside a for-loop — it creates N sequential
    // DB queries which exhausts the connection pool on Neon/serverless Postgres.
    // Instead: one batch read → Set lookup → one bulk insert.
    let notificationsCreated = 0;

    const targetUserIds = overdueRequests
      .map((r) => (r.handler || r.createdBy)?.id)
      .filter((id): id is string => Boolean(id));

    // Single query: fetch all REMINDER notifications already created today for these users
    const existingTodayNotifications = await prisma.notification.findMany({
      where: {
        userId: { in: targetUserIds },
        type: "REMINDER",
        createdAt: { gte: todayStart },
      },
      select: { userId: true, requestId: true },
    });

    // Build O(1) lookup Set: "userId:requestId"
    const alreadyNotifiedSet = new Set(
      existingTodayNotifications.map((n) => `${n.userId}:${n.requestId}`)
    );

    // Build the list of new notifications to create
    const notificationsToCreate: {
      userId: string;
      requestId: string;
      type: string;
      title: string;
      message: string;
    }[] = [];

    for (const request of overdueRequests) {
      const targetUser = request.handler || request.createdBy;
      if (!targetUser) continue;

      const noOfDays = differenceInDays(today, request.sourceDate);
      const pendingDays = request.pendingFrom
        ? differenceInDays(today, request.pendingFrom)
        : noOfDays;

      const key = `${targetUser.id}:${request.id}`;
      if (!alreadyNotifiedSet.has(key)) {
        notificationsToCreate.push({
          userId: targetUser.id,
          requestId: request.id,
          type: "REMINDER",
          title: "Daily Reminder: Pending Source Request",
          message: `Source Request ${request.sourceNo} has been pending for ${noOfDays} days (Stage: ${request.currentStage}, Stage Days: ${pendingDays}). Please take action.`,
        });
        notificationsCreated++;
      }
    }

    // Single bulk insert for all new notifications
    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({ data: notificationsToCreate });
    }

    // ── Group requests by responsible user for batch email ───────────────────
    const groupedRequests = new Map<
      string,
      {
        user: { id: string; name: string; email: string; role: string };
        requests: typeof overdueRequests;
      }
    >();

    for (const request of overdueRequests) {
      const targetUser = request.handler || request.createdBy;
      if (!targetUser?.email) continue;

      if (!groupedRequests.has(targetUser.email)) {
        groupedRequests.set(targetUser.email, {
          user: targetUser as { id: string; name: string; email: string; role: string },
          requests: [],
        });
      }
      groupedRequests.get(targetUser.email)!.requests.push(request);
    }

    // ── Fetch managers for escalation CC ────────────────────────────────────
    const hasEscalation = overdueRequests.some(
      (r) => differenceInDays(today, r.sourceDate) > 40
    );

    let managerEmails: string[] = [];
    if (hasEscalation) {
      const managers = await prisma.user.findMany({
        where: { role: "MANAGER", isActive: true },
        select: { email: true },
      });
      managerEmails = managers.map((m) => m.email);
    }

    // ── Base URL ─────────────────────────────────────────────────────────────
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // ── Send one batch email per user ────────────────────────────────────────
    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const [email, { user, requests }] of groupedRequests) {
      const isEscalation = requests.some(
        (r) => differenceInDays(today, r.sourceDate) > 40
      );

      const success = await sendBatchReminderEmail({
        to: email,
        cc: isEscalation && managerEmails.length > 0 ? managerEmails : undefined,
        handlerName: user.name,
        userRole: (user.role as "MANAGER" | "TEAM") ?? "TEAM",
        isEscalation,
        requests: requests.map((r) => {
          const noOfDays = differenceInDays(today, r.sourceDate);
          const pendingDays = r.pendingFrom
            ? differenceInDays(today, r.pendingFrom)
            : noOfDays;
          return {
            id: r.id,
            sourceNo: r.sourceNo,
            sourceDate: r.sourceDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            noOfDays,
            pendingDays,
            currentStage: r.currentStage,
          };
        }),
        baseUrl,
      });

      if (success) {
        emailsSent++;
      } else {
        emailErrors.push(`Failed to send email to ${email}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron executed successfully.`,
      checked: activeRequests.length,
      qualifying: overdueRequests.length,
      notificationsCreated,
      emailsSent,
      errors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron Reminders Error:", error);
    return NextResponse.json(
      { error: "Internal server error during cron execution", details: message },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
