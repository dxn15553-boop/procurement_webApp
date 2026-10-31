"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Trophy,
  DollarSign,
  Download,
  Calendar,
  Layers,
  X,
  Loader2,
  Clock,
  ShieldCheck,
  Send,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { downloadRfqPdf, downloadBiddingsPdf, downloadBiddingsExcel, QuoteExportData } from "@/lib/rfqExportHelper";

interface EvaluatedQuote {
  quotationId: string;
  quotationNo: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  baseAmount: number;
  taxAmount: number;
  freightCharges: number;
  otherCharges: number;
  totalAmount: number;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  validityDays?: number | null;
  documentUrl?: string | null;
  remarks?: string | null;
  submittedAt: string;
  rank: string; // 'L1', 'L2', 'L3'
  isLowest: boolean;
}

interface ComparativeStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfqId: string | null;
  onCsApproved?: (cs: any) => void;
}

export function ComparativeStatementModal({
  isOpen,
  onClose,
  rfqId,
  onCsApproved,
}: ComparativeStatementModalProps) {
  const [rfq, setRfq] = useState<any>(null);
  const [quotes, setQuotes] = useState<EvaluatedQuote[]>([]);
  const [existingCs, setExistingCs] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [justificationReason, setJustificationReason] = useState<string>("");
  const [isApproving, setIsApproving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && rfqId) {
      loadComparativeData(rfqId);
    }
  }, [isOpen, rfqId]);

  const loadComparativeData = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comparative-statements?rfqId=${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load comparative statement data");
      }
      setRfq(data.rfq);
      setQuotes(data.quotes || []);
      setExistingCs(data.existingCs || null);

      if (data.existingCs && (data.existingCs.status === "APPROVED" || data.rfq?.status === "CLOSED")) {
        const winningQuote = (data.quotes || []).find(
          (q: EvaluatedQuote) => q.vendorId === data.existingCs.recommendedVendorId
        );
        if (winningQuote) {
          setSelectedQuoteId(winningQuote.quotationId);
        } else if (data.quotes && data.quotes.length > 0) {
          setSelectedQuoteId(data.quotes[0].quotationId);
        }
        if (data.existingCs.recommendationReason) {
          setJustificationReason(data.existingCs.recommendationReason);
        }
      } else if (data.quotes && data.quotes.length > 0) {
        // Default select L1 vendor
        const l1 = data.quotes[0];
        setSelectedQuoteId(l1.quotationId);
      }
    } catch (err: any) {
      console.error("Error loading CS data:", err);
      toast.error(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const selectedQuote = quotes.find((q) => q.quotationId === selectedQuoteId);
  const isL1Selected = selectedQuote?.isLowest || false;
  const isAlreadyApproved = (existingCs && existingCs.status === "APPROVED") || rfq?.status === "CLOSED";

  const exportableQuotes: QuoteExportData[] = quotes.map((q) => ({
    id: q.quotationId,
    quotationNo: q.quotationNo,
    vendorId: q.vendorId,
    vendorName: q.vendorName,
    vendorEmail: q.vendorEmail,
    baseAmount: q.baseAmount,
    taxAmount: q.taxAmount,
    freightCharges: q.freightCharges,
    otherCharges: q.otherCharges,
    totalAmount: q.totalAmount,
    leadTimeDays: q.leadTimeDays,
    paymentTerms: q.paymentTerms,
    deliveryTerms: q.deliveryTerms,
    validityDays: q.validityDays,
    remarks: q.remarks,
    submittedAt: q.submittedAt,
  }));

  const handleApproveCs = async () => {
    if (!selectedQuote) {
      toast.error("Please select a winning vendor.");
      return;
    }

    if (!isL1Selected && !justificationReason.trim()) {
      toast.error("Please provide a justification reason for not choosing the lowest bidder (L1).");
      return;
    }

    setIsApproving(true);
    try {
      const payload = {
        rfqId,
        recommendedVendorId: selectedQuote.vendorId,
        recommendedVendorName: selectedQuote.vendorName,
        recommendationReason: isL1Selected
          ? "Lowest evaluated conforming bidder (L1)"
          : justificationReason.trim(),
        isLowestSelected: isL1Selected,
        quotes,
      };

      const res = await fetch("/api/comparative-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve Comparative Statement");
      }

      toast.success(data.message || "Comparative Statement approved!");
      if (onCsApproved) {
        onCsApproved(data.cs);
      }
      onClose();
    } catch (err: any) {
      console.error("Error approving CS:", err);
      toast.error(err.message || "Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <Trophy className="w-4 h-4" />
              <span>Comparative Statement (CS) Evaluation</span>
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1 flex-wrap">
              <span>Commercial Bid Comparison for</span>
              <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/60 text-sm font-bold">
                {rfq?.rfqNumber || "RFQ"}
              </span>
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                (Ref: {rfq?.sourceNo})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rfq && (
              <>
                <button
                  type="button"
                  onClick={() => downloadRfqPdf(rfq)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
                  title="Download Official RFQ Document (PDF)"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span className="hidden sm:inline">RFQ PDF</span>
                </button>
                {quotes.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadBiddingsPdf(rfq, exportableQuotes)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
                      title="Download Bidding Comparative Statement (PDF)"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">CS PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBiddingsExcel(rfq, exportableQuotes)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
                      title="Export Biddings to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="text-center py-16 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-600" />
              <span>Compiling quotations from invited vendors...</span>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border">
              <Clock className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                No Quotations Received Yet
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Invited vendors have not yet submitted their quotations through the Vendor Portal. Once quotes are submitted, they will appear here side by side.
              </p>
            </div>
          ) : (
            <>
              {/* Existing CS Approved Banner */}
              {isAlreadyApproved && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <div className="font-black text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                        <span>Comparative Statement Confirmed ({existingCs?.csNumber || "CS Approved"})</span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-600 text-white">
                          Confirmed & Advanced
                        </span>
                      </div>
                      <div className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Winning Vendor: <strong>{existingCs?.recommendedVendorName || selectedQuote?.vendorName}</strong>
                        {existingCs?.recommendationReason && (
                          <span className="ml-1 text-emerald-700/80 dark:text-emerald-400/80">
                            · Justification: {existingCs.recommendationReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-emerald-600 text-white shadow-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>PR Stage Active</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Table */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[11px] font-bold">
                      <th className="py-3 px-4 border-r">Evaluation Parameter</th>
                      {quotes.map((q) => (
                        <th
                          key={q.quotationId}
                          className={`py-3 px-4 min-w-[200px] border-r last:border-r-0 ${
                            q.isLowest
                              ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold">{q.rank} Bidder</span>
                            {q.isLowest && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-black">
                                <Trophy className="w-3 h-3" />
                                <span>L1 Best Price</span>
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-black text-neutral-900 dark:text-neutral-100 mt-1 line-clamp-1">
                            {q.vendorName}
                          </div>
                          <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400 lowercase">
                            {q.vendorEmail}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {/* Quotation No & Date */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Quotation No. & Date
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r font-mono text-[11px] text-neutral-900 dark:text-neutral-100"
                        >
                          <div className="font-bold">{q.quotationNo}</div>
                          <div className="text-neutral-500 dark:text-neutral-400 text-[10px]">
                            {new Date(q.submittedAt).toLocaleDateString()}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Base Amount */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Base Amount (₹)
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r font-mono font-semibold text-neutral-900 dark:text-neutral-100"
                        >
                          ₹{q.baseAmount.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Taxes & GST */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Taxes / GST (₹)
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r font-mono text-neutral-700 dark:text-neutral-300"
                        >
                          ₹{q.taxAmount.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Freight & Handling */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Freight & Other Charges (₹)
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r font-mono text-neutral-700 dark:text-neutral-300"
                        >
                          ₹{(q.freightCharges + q.otherCharges).toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* TOTAL EVALUATED AMOUNT */}
                    <tr className="bg-neutral-100/70 dark:bg-neutral-800/70 font-bold">
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-100 border-r">
                        Total Evaluated Cost (Landed)
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className={`py-3 px-4 border-r font-mono text-sm ${
                            q.isLowest
                              ? "text-emerald-700 dark:text-emerald-400 font-black text-base"
                              : "text-neutral-900 dark:text-neutral-100 font-bold"
                          }`}
                        >
                          ₹{q.totalAmount.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Lead Time */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Delivery Lead Time
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r text-neutral-900 dark:text-neutral-100 font-semibold text-xs"
                        >
                          {q.leadTimeDays ? `${q.leadTimeDays} Days` : "Not specified"}
                        </td>
                      ))}
                    </tr>

                    {/* Payment Terms */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Payment Terms
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r text-neutral-900 dark:text-neutral-100 font-medium text-xs"
                        >
                          {q.paymentTerms || "Standard 30 Days"}
                        </td>
                      ))}
                    </tr>

                    {/* Quotation PDF Document */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Original Quotation Doc
                      </td>
                      {quotes.map((q) => (
                        <td key={q.quotationId} className="py-2.5 px-4 border-r text-xs">
                          {q.documentUrl ? (
                            <a
                              href={q.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:underline font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500 italic">None attached</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Technical Remarks */}
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30 border-r">
                        Compliance & Remarks
                      </td>
                      {quotes.map((q) => (
                        <td
                          key={q.quotationId}
                          className="py-2.5 px-4 border-r text-[11px] text-neutral-800 dark:text-neutral-200"
                        >
                          {q.remarks || "Fully compliant with specifications"}
                        </td>
                      ))}
                    </tr>

                    {/* WINNER SELECTION OR CONFIRMED BADGE */}
                    <tr className="bg-neutral-50/80 dark:bg-neutral-800/50">
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100 border-r">
                        {isAlreadyApproved ? "Selected Winner" : "Select Winning Vendor"}
                      </td>
                      {quotes.map((q) => {
                        const isWinningVendor = isAlreadyApproved
                          ? existingCs?.recommendedVendorId
                            ? q.vendorId === existingCs.recommendedVendorId
                            : selectedQuoteId === q.quotationId
                          : selectedQuoteId === q.quotationId;

                        return (
                          <td key={q.quotationId} className="py-3 px-4 border-r">
                            {isAlreadyApproved ? (
                              isWinningVendor ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Confirmed Winner</span>
                                </div>
                              ) : (
                                <span className="text-neutral-400 dark:text-neutral-500 text-xs font-medium">
                                  Not Selected
                                </span>
                              )
                            ) : (
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs select-none">
                                <input
                                  type="radio"
                                  name="winningVendor"
                                  checked={isWinningVendor}
                                  onChange={() => setSelectedQuoteId(q.quotationId)}
                                  className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                                />
                                <span
                                  className={
                                    isWinningVendor
                                      ? "text-red-600 dark:text-red-400 font-black"
                                      : "text-neutral-700 dark:text-neutral-200 font-semibold hover:text-neutral-900 dark:hover:text-white"
                                  }
                                >
                                  Select as Winner
                                </span>
                              </label>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Justification if non-L1 selected */}
              {!isL1Selected && selectedQuote && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Non-L1 Selection Justification {isAlreadyApproved ? "Recorded" : "Required"}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Selected <strong>{selectedQuote.vendorName}</strong> ({selectedQuote.rank}), which is not the lowest bidder (L1). DXN procurement policy requires recorded justification.
                  </p>
                  {isAlreadyApproved ? (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-xs font-medium text-slate-900 dark:text-slate-100">
                      {existingCs?.recommendationReason || justificationReason || "Selected based on technical compliance and superior lead time."}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      required
                      value={justificationReason}
                      onChange={(e) => setJustificationReason(e.target.value)}
                      placeholder="Enter justification reasons for choosing this vendor over L1..."
                      className="w-full text-xs p-3 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 selection:bg-amber-500 selection:text-white font-medium"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900"
            >
              Close
            </button>
            {quotes.length > 0 && rfq && (
              <>
                <button
                  type="button"
                  onClick={() => downloadBiddingsPdf(rfq, exportableQuotes)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
                  title="Download CS Bidding Statement as PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download CS (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadBiddingsExcel(rfq, exportableQuotes)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
                  title="Export Bidding Data to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export to Excel</span>
                </button>
              </>
            )}
          </div>

          {isAlreadyApproved ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Vendor Confirmed & Advanced to PR</span>
            </div>
          ) : (
            quotes.length > 0 && (
              <button
                type="button"
                onClick={handleApproveCs}
                disabled={isApproving || !selectedQuoteId}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isApproving
                    ? "Approving & Advancing to PR..."
                    : `Approve Selection (${selectedQuote?.vendorName || "Vendor"}) & Advance to PR`}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
