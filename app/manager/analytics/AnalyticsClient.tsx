"use client";

import {
  SLADepartmentChart,
  AverageProcessingTimeChart,
  HandlerWorkloadChart,
  VendorPerformanceChart,
} from "@/components/charts/AnalyticsCharts";
import {
  Download,
  Filter,
  FileText,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useState } from "react";

export interface AnalyticsData {
  slaDepartmentData: Array<{ name: string; onTrack: number; atRisk: number; overdue: number }>;
  stageTimeData: Array<{ stage: string; avgDays: number }>;
  handlerWorkloadData: Array<{ name: string; value: number }>;
  vendorPerformanceData: Array<{ name: string; value: number }>;
  overview: {
    totalRequests: number;
    avgSLA: number;
    criticalRequests: number;
  };
}

interface KpiCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

function KpiCard({ title, value, suffix = "", icon: Icon, trend, trendUp, iconBg, iconColor, valueColor }: KpiCardProps) {
  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 ${iconBg} rounded-2xl flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            trendUp
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : "bg-rose-50 text-rose-600 border border-rose-100"
          }`}
        >
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend}</span>
        </div>
      </div>
      <p className={`text-4xl font-black tracking-tight ${valueColor}`}>
        {value}{suffix}
      </p>
      <p className="text-sm font-semibold text-slate-500 mt-1.5">{title}</p>
    </div>
  );
}

interface Props {
  data: AnalyticsData;
}

export function AnalyticsClient({ data }: Props) {
  const [timeRange, setTimeRange] = useState("all");

  return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Analytics{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              & Reports
            </span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Real-time insights into your procurement operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Control */}
          <div className="flex bg-slate-100/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/60">
            {["all", "30", "90"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === range
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {range === "all" ? "All Time" : `${range}d`}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-200/80 hover:bg-white/80 transition-colors font-bold text-slate-600 shadow-sm bg-white/60 backdrop-blur-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all duration-200 active:scale-[0.98]">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Total Requests"
          value={data.overview.totalRequests}
          icon={FileText}
          trend="+12%"
          trendUp
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          valueColor="text-slate-900"
        />
        <KpiCard
          title="SLA Score"
          value={data.overview.avgSLA}
          suffix="%"
          icon={Activity}
          trend="+4.2%"
          trendUp
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          valueColor="text-violet-600"
        />
        <KpiCard
          title="Critical Requests"
          value={data.overview.criticalRequests}
          icon={AlertOctagon}
          trend="-2.1%"
          trendUp={false}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          valueColor="text-rose-600"
        />
        <KpiCard
          title="On Track"
          value={data.slaDepartmentData.reduce((a, d) => a + d.onTrack, 0)}
          icon={CheckCircle}
          trend="+8.5%"
          trendUp
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
        />
      </div>

      {/* Bento Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SLADepartmentChart data={data.slaDepartmentData} />
        </div>
        <div className="lg:col-span-1">
          <HandlerWorkloadChart data={data.handlerWorkloadData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AverageProcessingTimeChart data={data.stageTimeData} />
        <VendorPerformanceChart data={data.vendorPerformanceData} />
      </div>
    </div>
  );
}
