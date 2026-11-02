"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Loader2,
  ArrowLeft,
  Upload,
  DollarSign,
  Truck,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface RfqInvitationData {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  status: string;
  accessKey: string;
  rfq: {
    id: string;
    rfqNumber: string;
    sourceNo: string;
    title: string;
    description: string;
    specifications?: string | null;
    quantity?: number | null;
    unit?: string | null;
    submissionDeadline: string;
    deliveryLocation?: string | null;
    termsAndConditions?: string | null;
  };
  quotations: any[];
}

export default function VendorQuotationSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const accessKey = params?.accessKey as string;

  const [invitation, setInvitation] = useState<RfqInvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(1);
  const [gstRate, setGstRate] = useState<number>(18);
  const [freightCharges, setFreightCharges] = useState<number | "">(0);
  const [otherCharges, setOtherCharges] = useState<number | "">(0);

  const [leadTimeDays, setLeadTimeDays] = useState<number | "">(15);
  const [paymentTerms, setPaymentTerms] = useState(
    "100% payment within 30 days after receipt of material with tax invoice"
  );
  const [deliveryTerms, setDeliveryTerms] = useState(
    "FOR Destination - DXN Plant, Mandapally, Siddipet"
  );
  const [validityDays, setValidityDays] = useState<number | "">(60);
  const [remarks, setRemarks] = useState("");
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);

  useEffect(() => {
    if (accessKey) {
      loadInvitation(accessKey);
    }
  }, [accessKey]);

  const loadInvitation = async (key: string, retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor-rfqs/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load RFQ details");
      }
      setInvitation(data.invitation);
      if (data.invitation?.rfq?.quantity) {
        setQuantity(data.invitation.rfq.quantity);
      }
      if (data.invitation?.quotations && data.invitation.quotations.length > 0) {
        const q = data.invitation.quotations[0];
        const qty = data.invitation.rfq?.quantity || 1;
        setUnitPrice(q.baseAmount / qty);
        setFreightCharges(q.freightCharges || 0);
        setOtherCharges(q.otherCharges || 0);
        if (q.leadTimeDays) setLeadTimeDays(q.leadTimeDays);
        if (q.paymentTerms) setPaymentTerms(q.paymentTerms);
        if (q.deliveryTerms) setDeliveryTerms(q.deliveryTerms);
        if (q.remarks) setRemarks(q.remarks);
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading invitation:", err);
      if (retryCount < 1) {
        setTimeout(() => {
          loadInvitation(key, retryCount + 1);
        }, 1200);
        return;
      }
      setError(err.message || "Unable to connect to Procurement RFQ system.");
      setLoading(false);
    }
  };

  // Calculations
  const numericUnitPrice = typeof unitPrice === "number" ? unitPrice : 0;
  const calcBaseAmount = numericUnitPrice * (quantity || 1);
  const calcTaxAmount = (calcBaseAmount * (typeof gstRate === "number" ? gstRate : 0)) / 100;
  const calcFreight = typeof freightCharges === "number" ? freightCharges : 0;
  const calcOther = typeof otherCharges === "number" ? otherCharges : 0;
  const calcTotalAmount = calcBaseAmount + calcTaxAmount + calcFreight + calcOther;

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !accessKey) return;
    if (typeof unitPrice !== "number" || unitPrice <= 0) {
      alert("Please enter a valid unit price.");
      return;
    }

    setIsSubmitting(true);
    try {
      let documentUrl: string | null = null;

      const payload = {
        accessKey,
        rfqVendorId: invitation.id,
        baseAmount: calcBaseAmount,
        taxAmount: calcTaxAmount,
        freightCharges: calcFreight,
        otherCharges: calcOther,
        leadTimeDays: leadTimeDays || null,
        paymentTerms,
        deliveryTerms,
        validityDays: validityDays || null,
        documentUrl,
        remarks,
        items: [
          {
            description: invitation.rfq.title,
            quantity: quantity || 1,
            unit: invitation.rfq.unit || "Nos",
            unitPrice: unitPrice,
            taxRate: gstRate,
            totalPrice: calcTotalAmount,
          },
        ],
      };

      const res = await fetch("/api/vendor-rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quotation.");
      }

      setSubmittedSuccessfully(true);
    } catch (err: any) {
      console.error("Error submitting quotation:", err);
      alert(err.message || "Quotation submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Loading RFQ details from DXN Procurement...
        </p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">RFQ Not Accessible</h2>
          <p className="text-sm text-slate-400">
            {error || "This RFQ invitation link is invalid or expired."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => accessKey && loadInvitation(accessKey)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submittedSuccessfully) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-emerald-800/80 p-8 rounded-2xl max-w-lg text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Quotation Submitted Successfully!
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Thank you, <strong className="text-white">{invitation.vendorName}</strong>. Your quotation for{" "}
            <strong className="text-red-400">{invitation.rfq.rfqNumber}</strong> (Source:{" "}
            <strong className="text-slate-200">{invitation.rfq.sourceNo}</strong>) has been securely transmitted to DXN Procurement for Comparative Statement evaluation.
          </p>
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-sm space-y-1 text-left">
            <div className="flex justify-between text-slate-400">
              <span>Basic Value:</span>
              <span className="text-slate-200">₹{calcBaseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST ({gstRate}%):</span>
              <span className="text-slate-200">₹{calcTaxAmount.toLocaleString()}</span>
            </div>
            {calcFreight > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Transportation:</span>
                <span className="text-slate-200">₹{calcFreight.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800 text-base font-bold">
              <span className="text-white">Total Quoted (Landed):</span>
              <span className="text-emerald-400">₹{calcTotalAmount.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            For any queries or updates regarding this submission, please contact the DXN Procurement team referencing {invitation.rfq.rfqNumber}.
          </p>
        </div>
      </div>
    );
  }

  const deadline = new Date(invitation.rfq.submissionDeadline);
  const isExpired = new Date() > deadline;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-600 selection:text-white">
      {/* Official DXN Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md">
              DXN
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                DXN MANUFACTURING (INDIA) PRIVATE LIMITED
              </h1>
              <p className="text-[11px] text-slate-400">
                Procurement & Supply Chain Management · Official Vendor Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Vendor Access · {invitation.vendorName}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* RFQ Dossier Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-black text-red-400 bg-red-950/60 px-2.5 py-1 rounded-md border border-red-900/80">
                  {invitation.rfq.rfqNumber}
                </span>
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-900/80">
                  Source: {invitation.rfq.sourceNo}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                  {invitation.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {invitation.rfq.title}
              </h2>
            </div>

            <div className="text-right text-xs space-y-1">
              <div className="flex items-center gap-1.5 lg:justify-end text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Deadline: {deadline.toLocaleDateString()}</span>
              </div>
              {isExpired ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  Deadline Passed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                  <Clock className="w-3 h-3" /> Submissions Open
                </span>
              )}
            </div>
          </div>

          {/* Scope & Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Scope of Supply / Requirement Description
              </div>
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                {invitation.rfq.description || invitation.rfq.title}
              </div>
              {invitation.rfq.specifications && (
                <div className="pt-2 border-t border-slate-800 text-slate-300">
                  <strong className="text-white">Technical Specifications:</strong>{" "}
                  {invitation.rfq.specifications}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Requisition Quantity
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {invitation.rfq.quantity || 1} {invitation.rfq.unit || "Nos"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Delivery Destination
                </div>
                <div className="text-xs text-slate-300">
                  {invitation.rfq.deliveryLocation || "DXN Plant, Mandapally, Siddipet"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Quotation Submission Form */}
        <form onSubmit={handleSubmitQuotation} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                <span>Commercial Bid Submission</span>
              </h3>
              <p className="text-xs text-slate-400">
                Enter your item rates and commercial terms below according to DXN procurement standards.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              Vendor: <strong className="text-white">{invitation.vendorName}</strong>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Unit Price (₹ Basic) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Quantity
              </label>
              <input
                type="number"
                disabled
                value={quantity}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 font-mono text-sm cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                GST Rate (%)
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Standard GST)</option>
                <option value={28}>28%</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Transportation / Freight (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={freightCharges}
                onChange={(e) => setFreightCharges(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Landed Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Basic Total:</span>
                <span className="text-sm font-bold text-white">₹{calcBaseAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">GST Amount ({gstRate}%):</span>
                <span className="text-sm font-bold text-slate-300">₹{calcTaxAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Freight / Shipping:</span>
                <span className="text-sm font-bold text-slate-300">₹{calcFreight.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Evaluated Cost (Landed)
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ₹{calcTotalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Terms & Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Delivery Lead Time (Days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Payment Terms <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">
                Delivery Terms / Point of Delivery
              </label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">
                Compliance & Technical Remarks / Warranty Details
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Mention warranty terms (e.g. 1 year against manufacturing defects), brand make, or technical deviations..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Submission Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-slate-500 max-w-md">
              By clicking "Submit Official Quotation", you certify that the quoted prices and terms are valid and binding for DXN evaluation.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || isExpired}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-900/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Quotation...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Official Quotation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
