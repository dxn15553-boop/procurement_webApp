"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Table, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

interface TeamRequestActionsProps {
  requestId: string;
  sourceNo: string;
  csStatus: string;
  currentStatusByHandler?: string | null;
  currentStage: string;
}

export function TeamRequestActions({
  requestId,
  sourceNo,
  csStatus,
  currentStatusByHandler,
  currentStage,
}: TeamRequestActionsProps) {
  const router = useRouter();
  const [statusText, setStatusText] = useState(currentStatusByHandler || "");
  const [savingStatus, setSavingStatus] = useState(false);

  const handleSaveStatus = async () => {
    if (!statusText.trim()) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStatusByHandler: statusText.trim(),
          action: "STATUS_UPDATE",
          actionDetails: `Handler status updated to: ${statusText.trim()}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to update status");
      }

      toast.success("Status note updated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status note");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 lg:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Task Workflow
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Active Assignment
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Task Assigned to You
          </h2>
          <p className="text-sm text-indigo-200/80 mt-1 max-w-2xl">
            Current Stage is <span className="font-bold text-white">{currentStage}</span>. Keep your handler notes and spreadsheet dates updated as you make progress on sourcing milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Link
            href={`/team/requests?search=${sourceNo}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 backdrop-blur transition-all active:scale-95"
          >
            <Table className="w-4 h-4 text-indigo-300" />
            Open in Spreadsheet
          </Link>
        </div>
      </div>

      {/* Quick Handler Note Updater */}
      <div className="mt-6 pt-6 border-t border-indigo-800/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
        <div className="flex-1">
          <input
            type="text"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Add quick handler status note (e.g., Quotations received from 3 vendors)..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-indigo-700/40 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          onClick={handleSaveStatus}
          disabled={savingStatus || !statusText.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {savingStatus ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Save Note
        </button>
      </div>
    </div>
  );
}
