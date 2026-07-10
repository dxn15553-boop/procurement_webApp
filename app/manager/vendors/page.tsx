import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { VendorListClient } from "./VendorListClient";

export const metadata: Metadata = { title: "Vendors Management" };

export default async function VendorsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const vendors = await prisma.vendor.findMany({
    include: {
      _count: { select: { procurementRequests: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Vendors</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage certified suppliers and vendors directory</p>
      </div>
      <VendorListClient initialVendors={vendors} />
    </div>
  );
}
