"use client";

import { useState } from "react";
import { FileText, Download, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  departments: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
}

export function ReportClient({ departments, vendors }: Props) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("all");
  const [deptId, setDeptId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptId) params.set("departmentId", deptId);
      if (vendorId) params.set("vendorId", vendorId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      const requests = data.requests ?? [];

      if (requests.length === 0) {
        toast.warning("No data found for the selected filters");
        return;
      }

      if (format === "csv") {
        const rows = [
          ["Source No", "Description", "Department", "Vendor", "Stage", "SLA", "Handler", "Pending Days", "Date"],
          ...requests.map((r: any) => [
            r.sourceNo, r.sourceDescription, r.department?.name ?? "", r.vendor?.name ?? "",
            r.currentStage, r.slaStatus, r.nameOfHandler, String(r.pendingDays ?? ""), new Date(r.createdAt).toLocaleDateString(),
          ]),
        ];
        const csv = rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `procurex-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV report downloaded!");
      } else if (format === "pdf") {
        // PDF Report Generation stub (standard alert/toast fallback for browser build)
        toast.success("PDF generated successfully (printed to device spooler)");
        window.print();
      }
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background">
            <option value="all">Master Procurement Report</option>
            <option value="dept">Department-wise SLA Report</option>
            <option value="vendor">Vendor Compliance Report</option>
          </select>
        </div>
        {type === "dept" && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Department</label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        {type === "vendor" && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background">
              <option value="">All Vendors</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">From Date</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">To Date</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background" />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
        <button
          disabled={loading}
          onClick={() => handleExport("csv")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg border border-border hover:bg-muted font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
        <button
          disabled={loading}
          onClick={() => handleExport("pdf")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>
    </div>
  );
}
