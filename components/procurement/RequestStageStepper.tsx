"use client";

import { Check, Clock, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrentStage } from "@/types";

interface RequestStageStepperProps {
  currentStage: string;
  csStatus: string;
  prStatus: string;
  poStatus: string;
}

const STAGES = [
  { id: "SRF", label: "SRF Issued", short: "SRF" },
  { id: "CS", label: "Comparative Statement", short: "CS" },
  { id: "PR", label: "Purchase Requisition", short: "PR" },
  { id: "PO", label: "Purchase Order", short: "PO" },
  { id: "DELIVERY", label: "Dispatch & Delivery", short: "Delivery" },
  { id: "COMPLETED", label: "Work Done & Payment", short: "Completion" },
];

export function RequestStageStepper({
  currentStage,
  csStatus,
  prStatus,
  poStatus,
}: RequestStageStepperProps) {
  // Determine current active stage index (0 to 5)
  let activeIndex = 1; // Default to CS

  if (currentStage === "PR") activeIndex = 2;
  else if (currentStage === "PO" || currentStage === "PAR" || currentStage === "PDD") activeIndex = 3;
  else if (currentStage === "MDD" || currentStage === "MRD") activeIndex = 4;
  else if (currentStage === "WCD" || currentStage === "COMPLETED") activeIndex = 5;
  else if (currentStage === "CANCELLED") activeIndex = -1;

  return (
    <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Procurement Lifecycle</h3>
          <p className="text-sm font-bold text-slate-800 mt-0.5">Sourcing & Execution Progress</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stage: {currentStage}</span>
        </div>
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0 hidden md:block" />

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isUpcoming = idx > activeIndex;

            return (
              <div key={stage.id} className="flex flex-col items-start md:items-center text-left md:text-center group">
                <div
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-sm",
                    isCompleted && "bg-emerald-500 text-white shadow-emerald-500/20 ring-4 ring-emerald-50",
                    isCurrent && "bg-indigo-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-100 animate-pulse",
                    isUpcoming && "bg-slate-100 text-slate-400 border border-slate-200"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-2.5">
                  <span
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wider block",
                      isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                    )}
                  >
                    Step {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold block mt-0.5 leading-tight",
                      isCurrent ? "text-slate-900" : isCompleted ? "text-slate-700" : "text-slate-400"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
