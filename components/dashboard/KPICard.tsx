"use client";

import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  FileText,
  BarChart3,
  TrendingUp,
  HelpCircle,
  Package,
  XCircle,
  LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  "clock": Clock,
  "check-circle": CheckCircle2,
  "alert-triangle": AlertTriangle,
  "truck": Truck,
  "file-text": FileText,
  "bar-chart": BarChart3,
  "trending-up": TrendingUp,
  "package": Package,
  "x-circle": XCircle,
};

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon | string;
  trend?: { value: number; label: string; positive?: boolean };
  color?: "blue" | "green" | "amber" | "red" | "purple" | "cyan" | "indigo" | "slate";
  className?: string;
  layout?: "default" | "vertical";
}

const colorMap = {
  blue: {
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    badge: "bg-blue-50 border-blue-100",
    accent: "from-blue-500/10",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    badge: "bg-emerald-50 border-emerald-100",
    accent: "from-emerald-500/10",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    badge: "bg-amber-50 border-amber-100",
    accent: "from-amber-500/10",
  },
  red: {
    icon: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    badge: "bg-red-50 border-red-100",
    accent: "from-red-500/10",
  },
  purple: {
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    badge: "bg-purple-50 border-purple-100",
    accent: "from-purple-500/10",
  },
  cyan: {
    icon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    badge: "bg-cyan-50 border-cyan-100",
    accent: "from-cyan-500/10",
  },
  indigo: {
    icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    badge: "bg-indigo-50 border-indigo-100",
    accent: "from-indigo-500/10",
  },
  slate: {
    icon: "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900",
    badge: "bg-slate-100 border-slate-200",
    accent: "from-slate-500/10",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "blue",
  className,
  layout = "default",
}: KPICardProps) {
  const colors = colorMap[color];

  // Resolve icon component
  const IconComponent = typeof icon === "string" ? (iconMap[icon] ?? HelpCircle) : icon;

  return (
    <div
      className={cn(
        "group bg-white border border-slate-100 rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Premium Glow effect on hover */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      {/* Decorative subtle border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      {/* Background gradient accent */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
          colors.accent,
          "to-transparent"
        )}
      />

      {layout === "vertical" ? (
        <div className="relative flex flex-col items-start">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-4", colors.icon)}>
            <IconComponent className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      ) : (
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.positive === false ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  {trend.positive !== false ? "+" : ""}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>

          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", colors.icon)}>
            <IconComponent className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}
