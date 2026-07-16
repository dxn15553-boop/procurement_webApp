import { Metadata } from "next";
import { ProcurementForm } from "@/components/procurement/ProcurementForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "New Procurement Request" };

export default async function ManagerNewRequestPage() {
  const session = await auth();
  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/manager/requests" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Procurement Request</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Fill out all required fields and submit</p>
        </div>
      </div>
      <ProcurementForm 
        mode="create" 
        defaultValues={{ 
          nameOfHandler: session?.user?.name || "", 
          sourceDate: new Date().toISOString().split("T")[0] 
        }} 
      />
    </div>
  );
}
