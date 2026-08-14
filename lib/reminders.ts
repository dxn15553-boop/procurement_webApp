import { prisma } from "./prisma";
import { sendBatchReminderEmail } from "./email";
import { differenceInDays, startOfDay } from "date-fns";

export async function runReminderCheck() {
  const today = new Date();
  const todayStart = startOfDay(today);

  // 1. Fetch all active requests
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

  // 2. Filter requests based on exact stage-specific thresholds
  const overdueRequests = activeRequests.filter((req) => {
    if (req.currentStage === "PR") {
      const dateToCheck = req.prDate || req.sourceDate;
      const days = differenceInDays(today, dateToCheck);
      return days >= 23;
    } else {
      const days = differenceInDays(today, req.sourceDate);
      return days >= 21;
    }
  });

  if (overdueRequests.length === 0) {
    return {
      success: true,
      message: "No requests crossed thresholds.",
      checked: activeRequests.length,
      qualifying: 0,
      notificationsCreated: 0,
      emailsSent: 0,
    };
  }

  // 3. Get unique target users
  const targetUserIds = overdueRequests
    .map((r) => (r.handler || r.createdBy)?.id)
    .filter((id): id is string => Boolean(id));

  // 4. Fetch existing notifications for today
  const existingTodayNotifications = await prisma.notification.findMany({
    where: {
      userId: { in: targetUserIds },
      type: "REMINDER",
      createdAt: { gte: todayStart },
    },
    select: { userId: true, requestId: true },
  });

  const alreadyNotifiedSet = new Set(
    existingTodayNotifications.map((n) => `${n.userId}:${n.requestId}`)
  );

  // 5. Track new notifications to create
  const notificationsToCreate: {
    userId: string;
    requestId: string;
    type: string;
    title: string;
    message: string;
  }[] = [];

  // Track which users actually got a new notification today
  const usersWithNewNotifications = new Set<string>();

  for (const request of overdueRequests) {
    const targetUser = request.handler || request.createdBy;
    if (!targetUser) continue;

    const key = `${targetUser.id}:${request.id}`;
    if (!alreadyNotifiedSet.has(key)) {
      const noOfDays = differenceInDays(today, request.sourceDate);
      const pendingDays = request.pendingFrom
        ? differenceInDays(today, request.pendingFrom)
        : noOfDays;

      notificationsToCreate.push({
        userId: targetUser.id,
        requestId: request.id,
        type: "REMINDER",
        title: "Daily Reminder: Pending Source Request",
        message: `Source Request ${request.sourceNo} has been pending for ${noOfDays} days (Stage: ${request.currentStage}, Stage Days: ${pendingDays}). Please take action.`,
      });
      usersWithNewNotifications.add(targetUser.email);
    }
  }

  // Bulk insert new notifications
  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });
  }

  // 6. Group ALL overdue requests by user for batch emailing
  // We only send emails to users who had at least one *new* notification created in this run
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

    // Only email users who have a new reminder triggered right now
    if (!usersWithNewNotifications.has(targetUser.email)) continue;

    if (!groupedRequests.has(targetUser.email)) {
      groupedRequests.set(targetUser.email, {
        user: targetUser as { id: string; name: string; email: string; role: string },
        requests: [],
      });
    }
    groupedRequests.get(targetUser.email)!.requests.push(request);
  }

  // 7. Escalation CC Check
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

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  let emailsSent = 0;
  const emailErrors: string[] = [];

  // Send batch email per user who qualified for a new reminder
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
        
        let stageOrStatus = r.currentStage as string;
        if (r.currentStage === "PO") {
          const prDays = r.daysForPR ?? (r.prDate && r.comparativeDate ? differenceInDays(r.prDate, r.comparativeDate) : 0);
          const prStatusStr = r.prStatus ? r.prStatus.replace("_", " ") : "PENDING";
          stageOrStatus = `PR: ${prStatusStr} (${prDays} days)`;
        }

        return {
          id: r.id,
          sourceNo: r.sourceNo,
          sourceDate: r.sourceDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          noOfDays,
          stageOrStatus,
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

  return {
    success: true,
    message: `Processed ${activeRequests.length} requests.`,
    checked: activeRequests.length,
    qualifying: overdueRequests.length,
    notificationsCreated: notificationsToCreate.length,
    emailsSent,
    errors: emailErrors.length > 0 ? emailErrors : undefined,
  };
}
