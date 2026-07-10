import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import type { SLAStatus, CurrentStage } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | string | null | undefined,
  fmt = "dd MMM yyyy"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, fmt);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function getSLAColor(status: SLAStatus): string {
  switch (status) {
    case "ON_TRACK":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "AT_RISK":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "OVERDUE":
      return "text-red-600 bg-red-50 border-red-200";
    case "COMPLETED":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getSLABadgeVariant(status: SLAStatus) {
  switch (status) {
    case "ON_TRACK": return "success";
    case "AT_RISK": return "warning";
    case "OVERDUE": return "destructive";
    case "COMPLETED": return "default";
    default: return "secondary";
  }
}

export function getStageColor(stage: CurrentStage): string {
  const colors: Record<CurrentStage, string> = {
    CS: "bg-blue-100 text-blue-700",
    PR: "bg-purple-100 text-purple-700",
    PO: "bg-orange-100 text-orange-700",
    PAR: "bg-cyan-100 text-cyan-700",
    PDD: "bg-pink-100 text-pink-700",
    MDD: "bg-indigo-100 text-indigo-700",
    MRD: "bg-teal-100 text-teal-700",
    WCD: "bg-green-100 text-green-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };
  return colors[stage] ?? "bg-gray-100 text-gray-700";
}

export function getStageName(stage: CurrentStage): string {
  const names: Record<CurrentStage, string> = {
    CS: "Comparative Statement",
    PR: "Purchase Requisition",
    PO: "Purchase Order",
    PAR: "PAR",
    PDD: "PDD",
    MDD: "Material Dispatch",
    MRD: "Material Received",
    WCD: "Work Completion",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return names[stage] ?? stage;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + "..." : str;
}

export function generateSourceNo(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `SRC-${year}${month}-${random}`;
}
