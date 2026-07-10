import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">System preferences and configuration</p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800 dark:text-slate-400">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Coming Soon</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Global application settings will be available here shortly.
        </p>
      </div>
    </div>
  );
}
