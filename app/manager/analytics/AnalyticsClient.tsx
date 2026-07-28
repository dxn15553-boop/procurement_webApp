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
            className="text-sm border border-slate-200 rounded-xl bg-white px-4 py-2 font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-bold text-slate-700 shadow-sm bg-white">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group bg-white border border-slate-100 rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Total Requests</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tight">{data.overview.totalRequests}</p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
        </div>
        
        <div className="group bg-white border border-slate-100 rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Average SLA Score</p>
            <p className="text-4xl font-black text-emerald-600 mt-2 tracking-tight">{data.overview.avgSLA}%</p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border border-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
          </div>
        </div>

        <div className="group bg-white border border-slate-100 rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(239,68,68,0.15)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex items-center justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Critical Requests</p>
            <p className="text-4xl font-black text-red-600 mt-2 tracking-tight">{data.overview.criticalRequests}</p>
          </div>
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center relative z-10 shadow-sm border border-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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
