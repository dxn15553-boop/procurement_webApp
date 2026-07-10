import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Performance metrics and insights</p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Coming Soon</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          We are currently building the Analytics dashboard. Check back soon for deep insights into your procurement SLA performance.
        </p>
      </div>
    </div>
  );
}
