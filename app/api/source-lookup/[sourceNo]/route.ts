import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSourceRequestByNo, formatSourceDescription } from "@/lib/sourceDb";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sourceNo: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceNo } = await params;
    if (!sourceNo?.trim()) {
      return NextResponse.json({ error: "Source number is required" }, { status: 400 });
    }

    const src = await fetchSourceRequestByNo(sourceNo);
    if (!src) {
      return NextResponse.json({
        found: false,
        message: `No matching Source Request found for "${sourceNo}" in Source database.`,
      });
    }

    // Resolve matching department in Procurement DB
    let departmentId = "";
    if (src.department_name) {
      const dept = await prisma.department.findFirst({
        where: { name: { equals: src.department_name.trim(), mode: "insensitive" } },
      });
      if (dept) {
        departmentId = dept.id;
      }
    }

    // Resolve matching handler in Procurement DB
    let handlerId = "";
    let handlerName = src.handler_name || "";
    if (src.handler_email) {
      const handlerUser = await prisma.user.findFirst({
        where: { email: { equals: src.handler_email.trim(), mode: "insensitive" } },
      });
      if (handlerUser) {
        handlerId = handlerUser.id;
        handlerName = handlerUser.name;
      }
    }

    const srfNo = src.srf_number || src.id.replace("SRC-", "SRF-");
    const sourceDate = src.request_date
      ? new Date(src.request_date).toISOString().split("T")[0]
      : src.created_at
      ? new Date(src.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const sourceDescription = formatSourceDescription(src);

    return NextResponse.json({
      found: true,
      sourceNo: src.id,
      srfNo,
      sourceDate,
      departmentId,
      departmentName: src.department_name || "",
      handlerId: handlerId || (session.user.role === "TEAM" ? session.user.id : ""),
      handlerName: handlerName || (session.user.role === "TEAM" ? session.user.name : ""),
      sourceDescription,
      priority: src.priority || "NORMAL",
      requesterName: src.requester_name || "",
      requesterDesignation: src.requester_designation || "",
      purposeJustification: src.purpose_justification || "",
    });
  } catch (err: any) {
    console.error("Error in source-lookup API:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to lookup source request" },
      { status: 500 }
    );
  }
}
