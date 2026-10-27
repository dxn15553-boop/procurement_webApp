import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RfqDashboardClient } from "./RfqDashboardClient";

export const metadata = {
  title: "Vendor Selection & RFQs | DXN Procurement",
  description: "End-to-End Vendor Selection, RFQ dispatch, and Comparative Statements",
};

export default async function RfqsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <RfqDashboardClient userRole={session.user.role} />;
}
