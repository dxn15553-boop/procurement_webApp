"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Calendar, AlertTriangle, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useLayoutStore } from "@/lib/store";
import { useSession } from "next-auth/react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const decrementUnreadCount = useLayoutStore((s) => s.decrementUnreadNotificationCount);
  const { data: session } = useSession();
  const basePath = session?.user?.role === "MANAGER" ? "/manager" : "/team";

  const totalItems = notifications.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Automatically adjust page if items are deleted and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [notifications.length, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentNotifications = notifications.slice(startIndex, endIndex);


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
        decrementUnreadCount();
        toast.success("Notification marked as read");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteNotification = async (id: string, isRead: boolean) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (!isRead) {
          decrementUnreadCount();
        }
        toast.success("Notification deleted");
      } else {
        toast.error("Failed to delete notification");
      }
    } catch {
      toast.error("Failed to delete notification");
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
      {notifications.length > 0 && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2 px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            All Notifications ({notifications.length})
          </span>
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-indigo-50 text-indigo-600 rounded-full animate-pulse">
              {notifications.filter((n) => !n.isRead).length} Unread
            </span>
          )}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center text-slate-500 flex flex-col items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
            <BellOff className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold tracking-tight text-slate-600">All caught up! No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {currentNotifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "rounded-[1.5rem] border p-5 lg:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all flex items-start gap-5 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
                  !n.isRead ? "border-indigo-100 bg-white" : "border-slate-100 bg-slate-50/50"
                )}
              >
                {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}

                <div className="flex-shrink-0 mt-0.5 p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-bold text-slate-900 truncate tracking-tight">{n.title}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(n.createdAt)}
                      </span>
                      <button
                        onClick={() => deleteNotification(n.id, n.isRead)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">{n.message}</p>

                  <div className="mt-4 flex items-center gap-4">
                    {n.requestId && (
                      <Link
                        href={`${basePath}/requests/${n.requestId}`}
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors"
                      >
                        View Request →
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-slate-400 hover:text-slate-700 font-bold transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {totalItems > pageSize && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
