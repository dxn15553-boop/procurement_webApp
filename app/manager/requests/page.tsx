import { Metadata } from "next";
import Link from "next/link";
import { ProcurementSpreadsheet } from "@/components/procurement/ProcurementSpreadsheet";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Procurement Requests" };

export default async function ManagerRequestsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  return (
    <div className="space-y-5 fade-in max-w-[100vw] overflow-hidden">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Procurement Database</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and track all procurement requests</p>
        </div>
        <Link 
          href="/manager/requests/new"
          className="bg-primary/90 hover:bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Request
        </Link>
      </div>
      <ProcurementSpreadsheet session={session} />
    </div>
  );
}
