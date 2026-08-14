import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runReminderCheck } from "@/lib/reminders";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Dynamically trigger reminder check when count is requested
    // This allows real-time automated reminders on app interaction
    await runReminderCheck();
  } catch (error) {
    console.error("Failed to run background reminders check:", error);
  }

  const count = await prisma.notification.count({
    where: { 
      userId: session.user.id,
      isRead: false 
    },
  });

  return NextResponse.json({ count });
}

export const runtime = "nodejs";

