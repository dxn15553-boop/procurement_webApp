import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVendorsFromMaster } from "@/lib/vendorDb";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || "all";

    const vendors = await getVendorsFromMaster({ search, category, status });
    return NextResponse.json({ vendors });
  } catch (error: any) {
    console.error("Error in /api/vendors/master:", error);
    return NextResponse.json({ error: "Failed to fetch vendor master", details: error.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
