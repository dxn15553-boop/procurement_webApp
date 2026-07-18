import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { User } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your personal information and security settings</p>
      </div>

      <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden max-w-3xl">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white dark:border-slate-800 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {session.user.name?.charAt(0).toUpperCase() ?? "M"}
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{session.user.name ?? "Manager User"}</h2>
            <p className="text-sm text-slate-500">{session.user.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border border-purple-200/50 mt-2">
              {session.user.role}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" value={session.user.name ?? "Manager"} disabled className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-md bg-slate-50/50 text-slate-600 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" value={session.user.email ?? ""} disabled className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-md bg-slate-50/50 text-slate-600 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Account Role</label>
            <input type="text" value="System Manager (Admin access)" disabled className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-md bg-slate-50/50 text-slate-600 cursor-not-allowed" />
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Security & Authentication</h3>
              <p className="text-xs text-slate-500">Contact the system administrator to change passwords or update permissions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
