import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { NotificationsClient } from "../../manager/notifications/NotificationsClient";

export const metadata: Metadata = { title: "Notifications Log" };

export default async function TeamNotificationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">SLA status changes and requests updates</p>
      </div>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
