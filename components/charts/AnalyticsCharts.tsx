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

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#6366f1", "#ec4899"];

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

interface SLADepartmentData {
  name: string;
  onTrack: number;
  atRisk: number;
  overdue: number;
}

export function SLADepartmentChart({ data }: { data: SLADepartmentData[] }) {
  return (
    <ChartCard title="SLA Adherence by Department" subtitle="On Track vs At Risk vs Overdue">
      <ResponsiveContainer width="100%" height={300}>
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

interface StageTimeData {
  stage: string;
  avgDays: number;
}

export function AverageProcessingTimeChart({ data }: { data: StageTimeData[] }) {
  return (
    <ChartCard title="Average Processing Time" subtitle="Average days spent in each stage">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="avgDays" fill="#3b82f6" name="Average Days" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

export function HandlerWorkloadChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Handler Workload" subtitle="Active requests assigned per handler">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VendorPerformanceChart({ data }: { data: PieData[] }) {
  return (
    <ChartCard title="Vendor Distribution" subtitle="Procurement requests by vendor">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
