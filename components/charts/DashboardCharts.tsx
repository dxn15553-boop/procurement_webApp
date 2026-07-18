"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", 
  "#ef4444", "#06b6d4", "#6366f1", "#ec4899",
  "#f97316", "#84cc16", "#14b8a6", "#d946ef",
  "#eab308", "#a855f7", "#0ea5e9", "#22c55e",
  "#f43f5e", "#64748b", "#fb923c", "#34d399"
];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface MonthlyData {
  month: string;
  total: number;
  completed: number;
  overdue: number;
}

export function MonthlyTrendChart({ data }: { data: MonthlyData[] }) {
  return (
    <ChartCard title="Monthly Procurement Trend" subtitle="Requests over the last 6 months">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold", marginBottom: "4px" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
          <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 6 }} name="Total Requests" />
          <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 6 }} name="Completed" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface PieData { name: string; value: number; }

export function DepartmentChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Department-wise Requests" subtitle="Distribution by department">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="35%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", lineHeight: "1.5", maxHeight: "200px", overflowY: "auto", width: "45%" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StageDistributionChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Current Stage Distribution" subtitle="Active requests by stage">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Requests">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface SLAData { name: string; onTrack: number; atRisk: number; overdue: number; }

export function SLAPerformanceChart({ data }: { data: SLAData[] }) {
  return (
    <ChartCard title="SLA Performance" subtitle="On-track vs at-risk vs overdue">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="onTrack" stackId="a" fill="#10b981" name="On Track" radius={[0, 0, 0, 0]} />
          <Bar dataKey="atRisk" stackId="a" fill="#f59e0b" name="At Risk" />
          <Bar dataKey="overdue" stackId="a" fill="#ef4444" name="Overdue" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
