import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { ProcurementSpreadsheet } from "@/components/procurement/ProcurementSpreadsheet";

export const metadata: Metadata = { title: "My Requests" };

export default async function TeamRequestsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  const totalCount = await prisma.procurementRequest.count({
    where: { createdById: session.user.id, isDeleted: false }
  });

  return (
    <div className="space-y-5 fade-in max-w-[100vw] overflow-hidden">
      <div className="px-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">My Requests Database</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Total: {totalCount}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Inline editable database for your requests</p>
      </div>
      <ProcurementSpreadsheet session={session} />
    </div>
  );
}
