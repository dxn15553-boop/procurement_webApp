import { Metadata } from "next";
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
      </div>
      <ProcurementSpreadsheet session={session} />
    </div>
  );
}
