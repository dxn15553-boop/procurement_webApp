import { Metadata } from "next";
import Link from "next/link";
import { ProcurementSpreadsheet } from "@/components/procurement/ProcurementSpreadsheet";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Procurement Requests" };

export default async function ManagerRequestsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const totalCount = await prisma.procurementRequest.count({
    where: { isDeleted: false }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] fade-in max-w-[100vw] overflow-hidden gap-3">
      <div className="flex items-center justify-between px-2 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Procurement Database</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Total: {totalCount}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and track all procurement requests</p>
        </div>
        <Link 
          href="/manager/requests/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Request
        </Link>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <ProcurementSpreadsheet session={session} />
      </div>
    </div>
  );
}
