"use client";

import { useRef, useEffect } from "react";
import { Check, Clock, AlertCircle, Sparkles, Ban, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestStageStepperProps {
  currentStage: string;
  csStatus?: string;
  prStatus?: string;
  poStatus?: string;
}

const STAGES = [
  { id: "CS", label: "Comparative Statement", short: "CS" },
  { id: "PR", label: "Purchase Requisition", short: "PR" },
  { id: "PO", label: "Purchase Order", short: "PO" },
  { id: "MDD", label: "Material Dispatch", short: "MDD" },
  { id: "MRD", label: "Material Received", short: "MRD" },
  { id: "WCD", label: "Work Completion", short: "WCD" },
  { id: "PRL", label: "Pre-Receipt Logistics", short: "PRL" },
  { id: "PAR", label: "Payment Approval", short: "PAR" },
  { id: "PDD", label: "Payment Done", short: "PDD" },
  { id: "COMPLETED", label: "Completed", short: "Done" },
];

const STAGE_ORDER = ["CS", "PR", "PO", "MDD", "MRD", "WCD", "PRL", "PAR", "PDD", "COMPLETED"];

export function RequestStageStepper({
  currentStage,
}: RequestStageStepperProps) {
  const isCancelled = currentStage === "CANCELLED";
  const activeIndex = STAGE_ORDER.indexOf(currentStage);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active stage on mount/update for mobile & tablet screens
  useEffect(() => {
    if (activeStepRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeEl = activeStepRef.current;
      const left = activeEl.offsetLeft - (container.offsetWidth / 2) + (activeEl.offsetWidth / 2);
      container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [currentStage]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Procurement Lifecycle</h3>
          <p className="text-sm font-bold text-slate-800 mt-0.5">10-Stage Sequential Progress</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 lg:hidden">
            ⇄ Swipe stages
          </span>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border",
            isCancelled
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : currentStage === "COMPLETED"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-indigo-50 border-indigo-100 text-indigo-700"
          )}>
            {isCancelled ? (
              <>
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>CANCELLED</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Stage: {currentStage}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>This procurement request was CANCELLED. All remaining operations are halted.</span>
        </div>
      )}

      {/* 10-Stage Visual Stepper with responsive scroll container */}
      <div 
        ref={containerRef}
        className="relative overflow-x-auto pb-2 scrollbar-thin [WebkitOverflowScrolling:touch]"
      >
        <div className="flex lg:grid lg:grid-cols-10 gap-2 min-w-[760px] lg:min-w-0 relative z-10 py-1">
          {/* Connecting line that spans across all nodes seamlessly */}
          <div className="absolute top-[22px] left-6 right-6 h-0.5 bg-slate-200 z-0 pointer-events-none" />

          {STAGES.map((stage, idx) => {
            const isCompleted = !isCancelled && (currentStage === "COMPLETED" || (activeIndex >= 0 && idx < activeIndex));
            const isCurrent = !isCancelled && activeIndex >= 0 && idx === activeIndex;
            const isStepCancelled = isCancelled;
            const isUpcoming = !isCancelled && !isCompleted && !isCurrent;

            return (
              <div 
                key={stage.id} 
                ref={isCurrent ? activeStepRef : null}
                className="flex-1 flex flex-col items-center text-center group min-w-[70px] relative z-10"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-sm relative z-10",
                    isCompleted && "bg-emerald-500 text-white shadow-emerald-500/20 ring-3 ring-emerald-50",
                    isCurrent && "bg-indigo-600 text-white shadow-indigo-600/30 ring-3 ring-indigo-100 animate-pulse",
                    isStepCancelled && "bg-rose-100 text-rose-500 border border-rose-200",
                    isUpcoming && "bg-slate-100 text-slate-400 border border-slate-200"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : isStepCancelled ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-2 w-full px-1">
                  <span
                    className={cn(
                      "text-[9px] font-extrabold uppercase tracking-wider block",
                      isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : isStepCancelled ? "text-rose-400" : "text-slate-400"
                    )}
                  >
                    {stage.short}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] font-bold block mt-0.5 leading-tight line-clamp-2",
                      isCurrent ? "text-slate-900" : isCompleted ? "text-slate-700" : isStepCancelled ? "text-rose-400 line-through" : "text-slate-400"
                    )}
                    title={stage.label}
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
