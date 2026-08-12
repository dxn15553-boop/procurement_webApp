"use server";

import { auth } from "@/lib/auth";

export async function triggerCronAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Determine the base URL
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
        
    const cronSecret = process.env.CRON_SECRET;

    const res = await fetch(`${baseUrl}/api/cron/reminders?secret=${cronSecret}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to execute cron");
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
