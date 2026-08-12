"use client";

import { useState } from "react";
import { triggerCronAction } from "./actions";
import { toast } from "sonner";
import { BellRing, Loader2 } from "lucide-react";

export function SettingsClient() {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerNotifications = async () => {
    setIsTriggering(true);
    try {
      const res = await triggerCronAction();
      if (res.success) {
        toast.success(`Notifications triggered successfully! Processed ${res.data.emailsSent} emails.`);
      } else {
        toast.error(res.error || "Failed to trigger notifications");
      }
    } catch (err) {
      toast.error("Failed to trigger notifications");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-indigo-500" />
              Manual Notification Trigger
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Your notifications will be sent automatically every day at midnight. 
              Use this button if you need to test the notification system or force it to run immediately.
            </p>
          </div>
          
          <button
            onClick={handleTriggerNotifications}
            disabled={isTriggering}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isTriggering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellRing className="w-4 h-4" />
            )}
            {isTriggering ? "Triggering..." : "Trigger Notifications Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
