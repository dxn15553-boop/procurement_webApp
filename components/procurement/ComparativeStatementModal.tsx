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
} from "lucide-react";
import { toast } from "sonner";

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

      // Default select L1 vendor
      if (data.quotes && data.quotes.length > 0) {
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
        recommendationReason: isL1Selected ? "Lowest evaluated conforming bidder (L1)" : justificationReason.trim(),
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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <Trophy className="w-4 h-4" />
              <span>Comparative Statement (CS) Evaluation</span>
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
              <span>Commercial Bid Comparison for</span>
              <span className="font-mono text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 text-sm">
                {rfq?.rfqNumber || "RFQ"}
              </span>
              <span className="text-xs font-normal text-neutral-400">
                (Ref: {rfq?.sourceNo})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
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
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Quotations Received Yet</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Invited vendors have not yet submitted their quotations through the Vendor Portal. Once quotes are submitted, they will appear here side by side.
              </p>
            </div>
          ) : (
            <>
              {/* Existing CS Approved Banner */}
              {existingCs && existingCs.status === "APPROVED" && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                        Comparative Statement Approved ({existingCs.csNumber})
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        Winning Vendor: <strong>{existingCs.recommendedVendorName}</strong> · Justification: {existingCs.recommendationReason}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-600 text-white">
                    Approved & Advanced to PR
                  </span>
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
                            <span className="font-mono text-xs">{q.rank} Bidder</span>
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
                          <div className="text-[11px] font-normal text-neutral-500 lowercase">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r font-mono text-[11px]">
                          <div>{q.quotationNo}</div>
                          <div className="text-neutral-400 text-[10px]">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r font-mono">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r font-mono text-neutral-500">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r font-mono text-neutral-500">
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
                              : "text-neutral-900 dark:text-neutral-100"
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r">
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r">
                          {q.documentUrl ? (
                            <a
                              href={q.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:underline font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 italic">None attached</span>
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
                        <td key={q.quotationId} className="py-2.5 px-4 border-r text-[11px] text-neutral-600 dark:text-neutral-400">
                          {q.remarks || "Fully compliant with specifications"}
                        </td>
                      ))}
                    </tr>

                    {/* WINNER SELECTION RADIO */}
                    <tr className="bg-neutral-50 dark:bg-neutral-800/30">
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100 border-r">
                        Select Winning Vendor
                      </td>
                      {quotes.map((q) => {
                        const isSelected = selectedQuoteId === q.quotationId;
                        return (
                          <td key={q.quotationId} className="py-3 px-4 border-r">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                              <input
                                type="radio"
                                name="winningVendor"
                                checked={isSelected}
                                onChange={() => setSelectedQuoteId(q.quotationId)}
                                className="w-4 h-4 text-red-600 focus:ring-red-500"
                              />
                              <span className={isSelected ? "text-red-600 dark:text-red-400" : ""}>
                                Select as Winner
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Justification if non-L1 selected */}
              {!isL1Selected && selectedQuote && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Non-L1 Selection Justification Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    You have selected <strong>{selectedQuote.vendorName}</strong> ({selectedQuote.rank}), which is not the lowest bidder. DXN procurement policy requires recorded justification (e.g., shorter lead time, superior OEM quality, technical superiority).
                  </p>
                  <textarea
                    rows={2}
                    required
                    value={justificationReason}
                    onChange={(e) => setJustificationReason(e.target.value)}
                    placeholder="Enter justification reasons for choosing this vendor over L1..."
                    className="w-full text-xs p-2.5 border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border rounded-md"
          >
            Close
          </button>

          {quotes.length > 0 && (
            <button
              type="button"
              onClick={handleApproveCs}
              disabled={isApproving || !selectedQuoteId}
              className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg shadow-md flex items-center gap-2 transition-all"
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {isApproving
                  ? "Approving & Advancing to PR..."
                  : `Approve Selection (${selectedQuote?.vendorName || "Vendor"}) & Advance to PR`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
