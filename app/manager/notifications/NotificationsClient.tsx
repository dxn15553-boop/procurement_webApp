"use client";

import { useState } from "react";
import { Bell, BellOff, Calendar, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  requestId: string | null;
}

export function NotificationsClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        toast.success("Notification marked as read");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SLA_BREACH":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "PR_DELAY":
      case "PO_DELAY":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <BellOff className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">All caught up! No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "rounded-xl border p-4 shadow-sm transition-all flex items-start gap-4 bg-card",
                !n.isRead ? "border-primary/20 bg-primary/5" : "border-border"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-sm text-foreground truncate">{n.title}</h4>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                {n.requestId && (
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href={`/manager/requests/${n.requestId}`}
                      className="text-[10px] text-primary font-semibold hover:underline"
                    >
                      View Request →
                    </Link>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
