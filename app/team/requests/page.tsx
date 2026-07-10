import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { ProcurementSpreadsheet } from "@/components/procurement/ProcurementSpreadsheet";

export const metadata: Metadata = { title: "My Requests" };

export default async function TeamRequestsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEAM") redirect("/login");

  return (
    <div className="space-y-5 fade-in max-w-[100vw] overflow-hidden">
      <div className="px-2">
        <h1 className="text-xl font-bold text-foreground">My Requests Database</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Inline editable database for your requests</p>
      </div>
      <ProcurementSpreadsheet session={session} />
    </div>
  );
}
