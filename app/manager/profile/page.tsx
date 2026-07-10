import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { User } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your account details</p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Profile Module Coming Soon</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          You will soon be able to update your profile photo, password, and notification preferences.
        </p>
      </div>
    </div>
  );
}
