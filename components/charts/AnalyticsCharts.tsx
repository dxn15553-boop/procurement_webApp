"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Palette matching the app's indigo/violet/sky primary colors
const COLORS = [
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#0ea5e9", // sky-500
  "#14b8a6", // teal-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#64748b", // slate-500
];

const STATUS_COLORS = {
  onTrack: "#10b981", // emerald-500
  atRisk:  "#f59e0b", // amber-500
  overdue: "#ef4444", // red-500
};

const lightTooltipStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#1e293b",
  boxShadow: "0 10px 40px -8px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(0,0,0,0.06)",
  padding: "12px 16px",
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="glass-card rounded-[1.5rem] p-6 flex flex-col h-full relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
      {/* Subtle indigo top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400/60 via-violet-400/60 to-transparent rounded-t-[1.5rem]" />
      {/* Corner orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-50/60 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="mb-6 relative z-10">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs font-medium text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex-1 relative z-10 w-full min-h-[280px]">{children}</div>
    </div>
  );
}

interface SLADepartmentData {
  name: string;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

export function SLADepartmentChart({ data }: { data: SLADepartmentData[] }) {
  return (
    <ChartCard title="SLA Adherence by Department" subtitle="On Track · At Risk · Overdue">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.8)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={lightTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", fontWeight: 600, color: "#64748b", paddingTop: "16px" }} />
          <Bar dataKey="onTrack" stackId="a" fill={STATUS_COLORS.onTrack} name="On Track" radius={[0, 0, 4, 4]} barSize={28} />
          <Bar dataKey="atRisk" stackId="a" fill={STATUS_COLORS.atRisk} name="At Risk" />
          <Bar dataKey="overdue" stackId="a" fill={STATUS_COLORS.overdue} name="Overdue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface StageTimeData {
  stage: string;
  avgDays: number;
}

export function AverageProcessingTimeChart({ data }: { data: StageTimeData[] }) {
  return (
    <ChartCard title="Average Processing Time" subtitle="Average days per procurement stage">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.8)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
          <Tooltip contentStyle={lightTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Bar dataKey="avgDays" name="Avg Days" radius={[0, 8, 8, 0]} barSize={22}>
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface PieData {
  name: string;
  value: number;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) => {
  if (!cx || !cy || midAngle == null || !innerRadius || !outerRadius || !percent || percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function HandlerWorkloadChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Handler Workload" subtitle="Active requests assigned per handler">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={100}
            innerRadius={55}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={lightTooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VendorPerformanceChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Vendor Distribution" subtitle="Requests grouped by vendor">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.8)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={lightTooltipStyle} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
          <Bar dataKey="value" name="Requests" radius={[8, 8, 0, 0]} barSize={36}>
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
