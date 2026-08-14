import { NextResponse } from "next/server";
import { runReminderCheck } from "@/lib/reminders";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("authorization");

    const isAuthorized =
      secret === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runReminderCheck();
    return NextResponse.json(result);
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

