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
              const quotes = rfq.vendors.flatMap((v) => v.quotations || []);
              const quotedCount = rfq.vendors.filter((v) => v.quotations && v.quotations.length > 0).length;
              const validAmounts = quotes
                .map((q) => Number(q.totalAmount))
                .filter((amt) => !isNaN(amt) && amt > 0);
              const lowestBid = validAmounts.length > 0 ? Math.min(...validAmounts) : null;

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
                            rfq.status === "CLOSED"
                              ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                              : rfq.status === "QUOTES_RECEIVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                          }`}
                        >
                          {rfq.status}
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

                  {/* Synchronized Bidding Summary Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          Vendors Invited
                        </div>
                        <div className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                          {rfq.vendors.length}
                        </div>
                      </div>
                      <Building className="w-5 h-5 text-neutral-400" />
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          Quotes Submitted
                        </div>
                        <div className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                          {quotedCount} <span className="text-xs font-normal text-neutral-400">of {rfq.vendors.length}</span>
                        </div>
                      </div>
                      <FileText className="w-5 h-5 text-neutral-400" />
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          Lowest Bid (L1)
                        </div>
                        <div className={`text-lg font-black mt-0.5 ${lowestBid !== null ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 text-sm"}`}>
                          {lowestBid !== null ? `₹${lowestBid.toLocaleString()}` : "Awaiting Submissions"}
                        </div>
                      </div>
                      <TrendingDown className={`w-5 h-5 ${lowestBid !== null ? "text-emerald-500" : "text-neutral-400"}`} />
                    </div>
                  </div>

                  {/* Vendors Invited List */}
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                      <span>Synchronized Vendor Bids & Quotation Status ({rfq.vendors.length})</span>
                    </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rfq.vendors.map((vendor) => {
                      const hasQuote = vendor.quotations && vendor.quotations.length > 0;
                      const quote = hasQuote ? vendor.quotations[0] : null;

                      return (
                        <div
                          key={vendor.id}
                          className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between gap-2.5 transition-all ${
                            hasQuote
                              ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/80 shadow-xs"
                              : "bg-neutral-50/50 border-neutral-200 dark:bg-neutral-800/40 dark:border-neutral-800"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                {vendor.vendorName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                                  hasQuote
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                                }`}
                              >
                                {vendor.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">{vendor.vendorEmail}</div>
                          </div>

                          <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                            {hasQuote ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Quoted: ₹{quote?.totalAmount.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-neutral-500 flex items-center justify-between">
                                  <span>Ref: {quote?.quotationNo}</span>
                                  <span>{new Date(quote?.submittedAt || "").toLocaleDateString()}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-neutral-400 py-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Awaiting Quotation Submission</span>
                              </div>
                            )}
                          </div>

                          {/* One-Click Direct Link Actions */}
                          {vendor.accessKey && (
                            <div className="flex items-center justify-between pt-2 border-t border-neutral-200/40 dark:border-neutral-700/40 text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prodUrl = `https://www.dxnmanufacturing.com/vendor/rfqs/${vendor.accessKey}`;
                                  navigator.clipboard.writeText(prodUrl);
                                  toast.success(`Copied official link for ${vendor.vendorName}!`);
                                }}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                                title="Copy official link to send via WhatsApp or Email"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Official Link</span>
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
                                title="Open vendor quotation submission form"
                              >
                                <span>Open Form</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CS Action Bar */}
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs text-neutral-500">
                    {rfq.comparativeStatement ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          CS Approved · Winning Vendor:{" "}
                          <strong>{rfq.comparativeStatement.recommendedVendorName}</strong>
                        </span>
                      </span>
                    ) : (
                      <span>
                        {quotedCount} of {rfq.vendors.length} vendors responded
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
                        : quotedCount > 0
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>
                      {rfq.comparativeStatement
                        ? "View Approved CS"
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
