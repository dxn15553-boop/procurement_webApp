"use client";

import {
  SLADepartmentChart,
  AverageProcessingTimeChart,
  HandlerWorkloadChart,
  VendorPerformanceChart,
} from "@/components/charts/AnalyticsCharts";
import { Download, Filter } from "lucide-react";
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
          <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time insights into your procurement operations</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-border rounded-lg bg-card px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Requests</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{data.overview.totalRequests}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center dark:bg-blue-950/20 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Average SLA Score</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{data.overview.avgSLA}%</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center dark:bg-green-950/20 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Critical Requests</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{data.overview.criticalRequests}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center dark:bg-red-950/20 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SLADepartmentChart data={data.slaDepartmentData} />
        <AverageProcessingTimeChart data={data.stageTimeData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HandlerWorkloadChart data={data.handlerWorkloadData} />
        <VendorPerformanceChart data={data.vendorPerformanceData} />
      </div>
    </div>
  );
}
