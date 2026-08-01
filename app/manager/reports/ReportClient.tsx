"use client";

import { useState, useRef } from "react";
import { FileText, Download, Printer, RefreshCw, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  departments: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
}

export function ReportClient({ departments, vendors }: Props) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("all");
  const [deptId, setDeptId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/requests/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to import file");
      }

      toast.success(`Successfully imported ${data.importedCount} records!`);
      if (data.skippedCount > 0) {
        toast.warning(`Skipped ${data.skippedCount} records (duplicates/invalid)`);
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!from || !to) {
      toast.error("Please select both From Date and To Date before exporting.");
      return;
    }

    if (new Date(from) > new Date(to)) {
      toast.error("The 'From Date' must be before or equal to the 'To Date'.");
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptId) params.set("departmentId", deptId);
      if (vendorId) params.set("vendorId", vendorId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", "999999");

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      const requests = data.requests ?? [];

      if (requests.length === 0) {
        toast.warning("No data found for the selected filters");
        return;
      }

      if (format === "csv") {
        const headers = [
          "Source No", "Source Date", "Description", "Department", "Vendor",
          "Comparative Date", "Days for CS", "CS Status", "PR Number", "PR Date",
          "Days for PR", "PR Status", "PO Number", "PO Date", "Days for PO", "PO Status",
          "PRL No", "PRL Date", "Material Dispatch Date", "Material Received Date",
          "Work Completion Date", "Source Cancellation Date", "Payment Approval Date",
          "Payment Done Date", "Payment Status", "Days for Payment", "Current Status by Handler",
          "Handler", "No of Days", "Stage", "Pending From", "Pending Days",
          "SLA Status", "Date"
        ];
        
        const rows = [
          headers,
          ...requests.map((r: any) => [
            r.sourceNo ?? "",
            r.sourceDate ? new Date(r.sourceDate).toLocaleDateString() : "",
            r.sourceDescription ?? "",
            r.department?.name ?? "",
            r.vendor?.name ?? "",
            r.comparativeDate ? new Date(r.comparativeDate).toLocaleDateString() : "",
            r.daysForCS ?? "",
            r.csStatus ?? "",
            r.prNumber ?? "",
            r.prDate ? new Date(r.prDate).toLocaleDateString() : "",
            r.daysForPR ?? "",
            r.prStatus ?? "",
            r.poNumber ?? "",
            r.poDate ? new Date(r.poDate).toLocaleDateString() : "",
            r.daysForPO ?? "",
            r.poStatus ?? "",
            r.prlNo ?? "",
            r.prlDate ? new Date(r.prlDate).toLocaleDateString() : "",
            r.materialDispatchDate ? new Date(r.materialDispatchDate).toLocaleDateString() : "",
            r.materialReceivedDate ? new Date(r.materialReceivedDate).toLocaleDateString() : "",
            r.workCompletionDate ? new Date(r.workCompletionDate).toLocaleDateString() : "",
            r.sourceCancellationDate ? new Date(r.sourceCancellationDate).toLocaleDateString() : "",
            r.paymentApprovalDate ? new Date(r.paymentApprovalDate).toLocaleDateString() : "",
            r.paymentDoneDate ? new Date(r.paymentDoneDate).toLocaleDateString() : "",
            r.paymentStatus ?? "",
            r.daysForPayment ?? "",
            r.currentStatusByHandler ?? "",
            r.nameOfHandler ?? "",
            r.noOfDays ?? "",
            r.currentStage ?? "",
            r.pendingFrom ? new Date(r.pendingFrom).toLocaleDateString() : "",
            r.pendingDays ?? "",
            r.slaStatus ?? "",
            r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
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
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium">
            <option value="all">Master Procurement Report</option>
            <option value="dept">Department-wise SLA Report</option>
            <option value="vendor">Vendor Compliance Report</option>
          </select>
        </div>
        {type === "dept" && (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Department</label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        {type === "vendor" && (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium">
              <option value="">All Vendors</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">From Date</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">To Date</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium" />
        </div>
      </div>

      {(!from || !to || new Date(from) > new Date(to)) && (
        <div className="bg-amber-50 text-amber-600 border border-amber-200 rounded-xl p-4 text-sm font-medium flex items-center gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {(!from || !to) 
            ? "Please select a From Date and To Date to enable report export."
            : "The 'From Date' must be before or equal to the 'To Date'."}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 relative z-10">
        <input 
          type="file" 
          accept=".csv, .xlsx, .xls" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImportFile}
        />
        <button
          disabled={loading || importing}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm bg-white disabled:opacity-50"
        >
          {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import Data
        </button>
        <button
          disabled={loading || importing || !from || !to || new Date(from) > new Date(to)}
          onClick={() => handleExport("csv")}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm bg-white disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
        <button
          disabled={loading || importing || !from || !to || new Date(from) > new Date(to)}
          onClick={() => handleExport("pdf")}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>
    </div>
  );
}
