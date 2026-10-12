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
    where: {
      isDeleted: false,
      OR: [
        { createdById: session.user.id },
        { handlerId: session.user.id },
        ...(session.user.name ? [{ nameOfHandler: { equals: session.user.name, mode: "insensitive" as const } }] : []),
      ],
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] fade-in max-w-[100vw] overflow-hidden gap-3">
      <div className="px-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">My Requests Database</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Total: {totalCount}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Inline editable database for your requests</p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <ProcurementSpreadsheet session={session} />
      </div>
    </div>
  );
}
