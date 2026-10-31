"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Building,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Calendar,
  Copy,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { VendorSelectionModal } from "@/components/procurement/VendorSelectionModal";
import { ComparativeStatementModal } from "@/components/procurement/ComparativeStatementModal";
import { Trophy } from "lucide-react";

interface RfqItem {
  id: string;
  rfqNumber: string;
  sourceNo: string;
  title: string;
  description: string;
  status: string;
  submissionDeadline: string;
  createdAt: string;
  createdBy: { name: string; email: string };
  vendors: {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    status: string;
    accessKey?: string;
    quotations: {
      id: string;
      quotationNo: string;
      totalAmount: number;
      status: string;
      submittedAt: string;
    }[];
  }[];
  comparativeStatement?: {
    id: string;
    csNumber: string;
    status: string;
    recommendedVendorName?: string;
  } | null;
}

interface SourceRequestItem {
  id: string;
  description: string;
  department_name?: string;
  requester_name?: string;
  priority?: string;
  status: string;
  created_at: string;
  required_by_date?: string | null;
  purpose_justification?: string | null;
  rfq?: {
    id: string;
    rfqNumber: string;
    status: string;
    _count?: { vendors: number };
    vendors?: { vendorId: string; vendorEmail: string }[];
  } | null;
}

export function RfqDashboardClient({ userRole }: { userRole: string }) {
  const [activeTab, setActiveTab] = useState<"sources" | "rfqs" | "comparative">("sources");
  const [sources, setSources] = useState<SourceRequestItem[]>([]);
  const [rfqs, setRfqs] = useState<RfqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [selectedSourceForRfq, setSelectedSourceForRfq] = useState<SourceRequestItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRfqForCs, setSelectedRfqForCs] = useState<string | null>(null);
  const [isCsModalOpen, setIsCsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch eligible sources from Source App
      const sourcesRes = await fetch("/api/rfqs?view=eligible_sources");
      const sourcesData = await sourcesRes.json();
      if (sourcesData.sources) {
        setSources(sourcesData.sources);
      }

      // 2. Fetch created RFQs with quotations
      const rfqsRes = await fetch("/api/rfqs");
      const rfqsData = await rfqsRes.json();
      if (rfqsData.rfqs) {
        setRfqs(rfqsData.rfqs);
      }
    } catch (err) {
      console.error("Error loading RFQ dashboard data:", err);
      toast.error("Failed to load RFQ and Source data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVendorSelection = (source: SourceRequestItem | null, rfq?: RfqItem) => {
    if (source) {
      const matchingRfq = rfq || rfqs.find((r) => r.sourceNo.toUpperCase() === source.id.toUpperCase());
      const enrichedSource: SourceRequestItem = {
        ...source,
        rfq: matchingRfq
          ? {
              id: matchingRfq.id,
              rfqNumber: matchingRfq.rfqNumber,
              status: matchingRfq.status,
              vendors: matchingRfq.vendors.map((v) => ({
                vendorId: v.vendorId,
                vendorEmail: v.vendorEmail,
              })),
            }
          : source.rfq,
      };
      setSelectedSourceForRfq(enrichedSource);
    } else if (rfq) {
      const foundSource = sources.find((s) => s.id.toUpperCase() === rfq.sourceNo.toUpperCase());
      const synthesizedSource: SourceRequestItem = {
        id: rfq.sourceNo,
        description: foundSource?.description || rfq.description || rfq.title,
        department_name: foundSource?.department_name,
        requester_name: foundSource?.requester_name || rfq.createdBy?.name,
        status: foundSource?.status || "APPROVED",
        created_at: foundSource?.created_at || rfq.createdAt,
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfqNumber,
          status: rfq.status,
          vendors: rfq.vendors.map((v) => ({
            vendorId: v.vendorId,
            vendorEmail: v.vendorEmail,
          })),
        },
      };
      setSelectedSourceForRfq(synthesizedSource);
    }
    setIsModalOpen(true);
  };

  const filteredSources = sources.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      s.id.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.department_name?.toLowerCase().includes(q) ||
      s.requester_name?.toLowerCase().includes(q)
    );
  });

  const filteredRfqs = rfqs.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      r.rfqNumber.toLowerCase().includes(q) ||
      r.sourceNo.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.vendors.some((v) => v.vendorName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
            <Layers className="w-4 h-4" />
            <span>Procurex · Vendor Web App Integration</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Source Requests & Vendor RFQ Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Select approved vendors from the master catalog, dispatch RFQs, receive vendor quotations, and generate Comparative Statements (CS).
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "sources"
                ? "border-red-600 text-red-600 dark:text-red-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <span>Eligible Source Requests</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono">
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("rfqs")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "rfqs"
                ? "border-red-600 text-red-600 dark:text-red-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <span>Source Request Biddings</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono">
              {rfqs.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search request ID, description, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-md dark:bg-neutral-900"
          />
        </div>
      </div>

      {/* TAB 1: Eligible Source Requests */}
      {activeTab === "sources" && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px] border-b">
                <tr>
                  <th className="py-3 px-4">Source ID</th>
                  <th className="py-3 px-4">Description / Specs</th>
                  <th className="py-3 px-4">Department & Requester</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4">RFQ Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                      <span>Loading approved Source Requests from database...</span>
                    </td>
                  </tr>
                ) : filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-500">
                      No approved source requests found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredSources.map((source) => (
                    <tr
                      key={source.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {source.id}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                          {source.description}
                        </div>
                        {source.purpose_justification && (
                          <div className="text-[11px] text-neutral-500 line-clamp-1">
                            {source.purpose_justification}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {source.department_name || "Department"}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {source.requester_name || "Employee"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          {source.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {source.rfq ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{source.rfq.rfqNumber}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
                            RFQ Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenVendorSelection(source)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[11px] uppercase tracking-wider transition-colors shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          <span>{source.rfq ? "Add More Vendors" : "Select Vendors & RFQ"}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Source Request Biddings & Quotations */}
      {activeTab === "rfqs" && (
        <div className="space-y-6">
          {filteredRfqs.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
              No active Source Request biddings found. Go to "Eligible Source Requests" and click "Select Vendors & RFQ" to initiate invitations.
            </div>
          ) : (
            filteredRfqs.map((rfq) => {
              const allQuotesList = rfq.vendors.flatMap((vendor) =>
                (vendor.quotations || []).map((quote) => ({
                  ...quote,
                  vendorId: vendor.vendorId,
                  vendorName: vendor.vendorName,
                  vendorEmail: vendor.vendorEmail,
                  accessKey: vendor.accessKey,
                }))
              );
              const pendingVendorsList = rfq.vendors.filter(
                (vendor) => !vendor.quotations || vendor.quotations.length === 0
              );
              const quotedCount = allQuotesList.length;
              const validAmounts = allQuotesList
                .map((q) => Number(q.totalAmount))
                .filter((amt) => !isNaN(amt) && amt > 0);
              const lowestBid = validAmounts.length > 0 ? Math.min(...validAmounts) : null;
              const isCsApproved = !!rfq.comparativeStatement;

              return (
                <div
                  key={rfq.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Top Bar: Source Request & Synchronized RFQ Info */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700">
                          Source Ref: {rfq.sourceNo}
                        </span>
                        <span className="font-mono font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/60 text-xs">
                          RFQ: {rfq.rfqNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rfq.status === "CLOSED" || isCsApproved
                              ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                              : quotedCount > 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                          }`}
                        >
                          {isCsApproved ? "CS APPROVED" : rfq.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {rfq.title}
                      </h3>
                      {rfq.description && rfq.description !== rfq.title && (
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {rfq.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
                      <div className="text-right text-xs text-neutral-500 hidden sm:block">
                        <div className="flex items-center gap-1 md:justify-end">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Deadline: {new Date(rfq.submissionDeadline).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">Created by {rfq.createdBy?.name || "Procurement"}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenVendorSelection(null, rfq)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                        title="Add additional vendors to this Source Request under the same RFQ number"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Invite More Vendors</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-neutral-500">
                        Invited Vendors: <strong className="text-neutral-900 dark:text-neutral-100">{rfq.vendors.length}</strong>
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700">·</span>
                      <span className="text-neutral-500">
                        Quotations Submitted: <strong className="text-neutral-900 dark:text-neutral-100">{allQuotesList.length}</strong>
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700">·</span>
                      <span className="text-neutral-500">
                        Lowest Landed Bid (L1):{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {lowestBid !== null ? `₹${lowestBid.toLocaleString()}` : "Awaiting Quotes"}
                        </strong>
                      </span>
                    </div>

                    {rfq.comparativeStatement && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Winning Bidder: {rfq.comparativeStatement.recommendedVendorName}</span>
                      </span>
                    )}
                  </div>

                  {/* Tabular Quotations & Bids Table */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-neutral-100/80 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800">
                          <tr>
                            <th className="py-3 px-4 w-28">Rank</th>
                            <th className="py-3 px-4">Quotation Ref</th>
                            <th className="py-3 px-4">Vendor Company</th>
                            <th className="py-3 px-4 font-mono">Quoted Amount (₹)</th>
                            <th className="py-3 px-4">Submitted Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                          {allQuotesList.length === 0 && pendingVendorsList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-neutral-400 italic">
                                No vendors invited yet. Click "Invite More Vendors" to dispatch RFQ.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {/* Submitted Quotations (sorted ascending by amount) */}
                              {allQuotesList
                                .slice()
                                .sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount))
                                .map((quote, idx) => {
                                  const isWinningQuote =
                                    rfq.comparativeStatement?.recommendedVendorName?.toLowerCase().trim() ===
                                    quote.vendorName?.toLowerCase().trim();
                                  const isL1 = idx === 0;

                                  return (
                                    <tr
                                      key={quote.id}
                                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                                        isWinningQuote
                                          ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                                          : isL1
                                          ? "bg-emerald-50/20 dark:bg-emerald-950/10"
                                          : ""
                                      }`}
                                    >
                                      {/* Rank */}
                                      <td className="py-3 px-4">
                                        {isWinningQuote ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                            <CheckCircle2 className="w-3 h-3" /> Winner
                                          </span>
                                        ) : isL1 ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                                            <Trophy className="w-3 h-3" /> L1 Best
                                          </span>
                                        ) : (
                                          <span className="font-mono text-xs font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                            L{idx + 1}
                                          </span>
                                        )}
                                      </td>

                                      {/* Quotation Ref */}
                                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                                        {quote.quotationNo}
                                      </td>

                                      {/* Vendor Company */}
                                      <td className="py-3 px-4">
                                        <div className="font-bold text-neutral-900 dark:text-neutral-100">
                                          {quote.vendorName}
                                        </div>
                                        <div className="text-[11px] text-neutral-500 font-mono">
                                          {quote.vendorEmail}
                                        </div>
                                      </td>

                                      {/* Quoted Amount */}
                                      <td className="py-3 px-4 font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                                        ₹{Number(quote.totalAmount).toLocaleString()}
                                      </td>

                                      {/* Date */}
                                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400 text-xs">
                                        {new Date(quote.submittedAt).toLocaleDateString()}
                                      </td>

                                      {/* Status */}
                                      <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                          {quote.status || "SUBMITTED"}
                                        </span>
                                      </td>

                                      {/* Actions */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-3 text-xs">
                                          {quote.accessKey && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const prodUrl = `https://www.dxnmanufacturing.com/vendor/rfqs/${quote.accessKey}`;
                                                  navigator.clipboard.writeText(prodUrl);
                                                  toast.success(`Copied link for ${quote.vendorName}!`);
                                                }}
                                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                                                title="Copy official link"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy Link</span>
                                              </button>
                                              <a
                                                href={
                                                  typeof window !== "undefined" && window.location.hostname === "localhost"
                                                    ? `http://localhost:5173/vendor/rfqs/${quote.accessKey}`
                                                    : `https://www.dxnmanufacturing.com/vendor/rfqs/${quote.accessKey}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-bold"
                                              >
                                                <span>Open Form</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                              {/* Pending / Invited Vendors who haven't quoted yet */}
                              {pendingVendorsList.map((vendor) => (
                                <tr
                                  key={vendor.id}
                                  className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors opacity-80"
                                >
                                  <td className="py-3 px-4 font-mono text-neutral-400 text-xs">
                                    -
                                  </td>
                                  <td className="py-3 px-4 font-mono italic text-neutral-400 text-xs">
                                    Awaiting Quote
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                      {vendor.vendorName}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 font-mono">
                                      {vendor.vendorEmail}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-neutral-400 italic font-mono text-xs">
                                    Pending Submission
                                  </td>
                                  <td className="py-3 px-4 text-neutral-400 text-xs">-</td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
                                      <Clock className="w-3 h-3" /> INVITED
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-3 text-xs">
                                      {vendor.accessKey && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const prodUrl = `https://www.dxnmanufacturing.com/vendor/rfqs/${vendor.accessKey}`;
                                              navigator.clipboard.writeText(prodUrl);
                                              toast.success(`Copied link for ${vendor.vendorName}!`);
                                            }}
                                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium cursor-pointer"
                                            title="Copy official link"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Link</span>
                                          </button>
                                          <a
                                            href={
                                              typeof window !== "undefined" && window.location.hostname === "localhost"
                                                ? `http://localhost:5173/vendor/rfqs/${vendor.accessKey}`
                                                : `https://www.dxnmanufacturing.com/vendor/rfqs/${vendor.accessKey}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-bold"
                                          >
                                            <span>Open Form</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CS Action Bar */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs text-neutral-500">
                      {rfq.comparativeStatement ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            CS Confirmed · Winning Vendor:{" "}
                            <strong>{rfq.comparativeStatement.recommendedVendorName}</strong> · Advanced to PR
                          </span>
                        </span>
                      ) : (
                        <span>
                          {allQuotesList.length} quotation(s) received across {rfq.vendors.length} invited vendor(s)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRfqForCs(rfq.id);
                        setIsCsModalOpen(true);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                        rfq.comparativeStatement
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : allQuotesList.length > 0
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>
                        {rfq.comparativeStatement
                          ? "View Confirmed CS"
                          : "Evaluate Comparative Statement (CS)"}
                      </span>
                    </button>
                  </div>
                </div>
              );
          }))}
        </div>
      )}

      {/* Modal for selecting vendors & dispatching RFQ */}
      <VendorSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceRequest={selectedSourceForRfq}
        onRfqCreated={() => {
          loadData();
        }}
      />

      {/* Modal for viewing & approving Comparative Statement */}
      <ComparativeStatementModal
        isOpen={isCsModalOpen}
        onClose={() => setIsCsModalOpen(false)}
        rfqId={selectedRfqForCs}
        onCsApproved={() => {
          loadData();
        }}
      />
    </div>
  );
}
