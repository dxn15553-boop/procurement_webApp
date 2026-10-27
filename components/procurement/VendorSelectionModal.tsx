"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Building,
  Mail,
  Tag,
  Send,
  Loader2,
  FileText,
  Calendar,
  Layers,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface SupabaseVendor {
  id: string | number;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  vendor_category?: string | null;
  category_list?: string[];
  status: string;
  pan_number?: string | null;
  gst_number?: string | null;
}

interface SourceRequest {
  id: string; // SRC-YYYY-XXXX
  description: string;
  department_name?: string;
  requester_name?: string;
  required_by_date?: string | null;
  priority?: string | null;
  purpose_justification?: string | null;
}

interface VendorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRequest: SourceRequest | null;
  onRfqCreated?: (rfq: any) => void;
}

export function VendorSelectionModal({
  isOpen,
  onClose,
  sourceRequest,
  onRfqCreated,
}: VendorSelectionModalProps) {
  const [vendors, setVendors] = useState<SupabaseVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedVendors, setSelectedVendors] = useState<SupabaseVendor[]>([]);

  // RFQ Form state
  const [title, setTitle] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Lots / Units");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(
    "Mandapally, Siddipet (DXN Flagship Plant)"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize defaults when sourceRequest changes
  useEffect(() => {
    if (sourceRequest) {
      setTitle(`RFQ for ${sourceRequest.description.slice(0, 60)}`);
      setSpecifications(
        sourceRequest.purpose_justification
          ? `Purpose: ${sourceRequest.purpose_justification}\nOriginal Description: ${sourceRequest.description}`
          : sourceRequest.description
      );

      // Default submission deadline 7 days from now
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setSubmissionDeadline(d.toISOString().split("T")[0]);
      setSelectedVendors([]);
    }
  }, [sourceRequest]);

  // Fetch vendors from Supabase Master
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const res = await fetch("/api/vendors/master?status=all");
      const data = await res.json();
      if (data.vendors) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.error("Error loading vendors:", err);
      toast.error("Failed to load approved vendor master.");
    } finally {
      setLoadingVendors(false);
    }
  };

  const toggleVendorSelection = (vendor: SupabaseVendor) => {
    const isAlready = selectedVendors.some((v) => v.id === vendor.id);
    if (isAlready) {
      setSelectedVendors(selectedVendors.filter((v) => v.id !== vendor.id));
    } else {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      v.company_name?.toLowerCase().includes(q) ||
      v.contact_person?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.vendor_category?.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "all" ||
      v.vendor_category?.toLowerCase().includes(categoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const handleCreateAndSendRfq = async () => {
    if (!sourceRequest) return;
    if (!title.trim()) {
      toast.error("Please enter an RFQ title.");
      return;
    }
    if (!submissionDeadline) {
      toast.error("Please select a quotation submission deadline.");
      return;
    }
    if (selectedVendors.length === 0) {
      toast.error("Please select at least one vendor to invite.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sourceNo: sourceRequest.id,
        title,
        description: sourceRequest.description,
        specifications,
        quantity: parseInt(quantity, 10) || 1,
        unit,
        submissionDeadline,
        deliveryLocation,
        selectedVendors: selectedVendors.map((v) => ({
          id: v.id,
          company_name: v.company_name,
          email: v.email,
        })),
      };

      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create RFQ");
      }

      toast.success(
        `RFQ ${data.rfq.rfqNumber} created & dispatched to ${selectedVendors.length} vendors!`
      );
      if (onRfqCreated) {
        onRfqCreated(data.rfq);
      }
      onClose();
    } catch (err: any) {
      console.error("Error creating RFQ:", err);
      toast.error(err.message || "Failed to dispatch RFQ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              <Layers className="w-4 h-4" />
              <span>Procurement · Vendor Selection & RFQ Dispatch</span>
            </div>
            <div className="text-lg md:text-xl font-extrabold flex items-center gap-2 mt-1 text-slate-900 dark:text-white">
              <span>Issue RFQ for</span>
              <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-md border border-red-200 dark:border-red-900/60 text-sm font-semibold">
                {sourceRequest?.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* LEFT: RFQ Details Form */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>1. RFQ Specification</span>
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                RFQ Subject / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Supply of High-Speed Packing Material"
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Lots / Units / Sets"
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 block mb-1">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                <span>Quotation Submission Deadline</span>
              </label>
              <input
                type="date"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Specifications & Requirements
              </label>
              <textarea
                rows={4}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="Include key technical specifications, OEM requirements, tolerances, or test criteria..."
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Delivery Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          </div>

          {/* RIGHT: Vendor Selection Catalog */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-red-500" />
                <span>
                  2. Select Approved Vendors ({selectedVendors.length} chosen · {vendors.length} available)
                </span>
              </h4>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search vendor name, category, email, contact person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>

            {/* Vendor List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex-1 max-h-[340px] overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-slate-950/30">
              {loadingVendors ? (
                <div className="flex flex-col items-center justify-center p-10 text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-red-600" />
                  <span>Loading Vendor Master ({vendors.length} records)...</span>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  <Building className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">No vendors found matching your filter.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or verify vendor approvals in Supabase.</p>
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const isSelected = selectedVendors.some((v) => v.id === vendor.id);
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => toggleVendorSelection(vendor)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-red-500/10 border-red-500 dark:bg-red-950/50 dark:border-red-600 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/70 hover:dark:bg-slate-900"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {vendor.company_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                              vendor.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {vendor.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {vendor.email}
                          </span>
                          {vendor.contact_person && (
                            <span>Attn: {vendor.contact_person}</span>
                          )}
                        </div>
                        {vendor.vendor_category && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            <Tag className="w-2.5 h-2.5 inline mr-1 text-slate-400" />
                            {vendor.vendor_category}
                          </div>
                        )}
                      </div>

                      <div className="pt-0.5">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-red-600 border-red-600 text-white shadow-sm"
                              : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Summary */}
            {selectedVendors.length > 0 && (
              <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-2.5 rounded-lg flex items-center justify-between">
                <span>
                  <strong>Selected ({selectedVendors.length}):</strong>{" "}
                  {selectedVendors.map((v) => v.company_name).join(", ")}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVendors([])}
                  className="text-red-600 dark:text-red-400 font-bold hover:underline text-[10px] ml-2 shrink-0"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateAndSendRfq}
            disabled={isSubmitting || selectedVendors.length === 0}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? "Dispatching..."
                : `Dispatch RFQ to ${selectedVendors.length} ${
                    selectedVendors.length === 1 ? "Vendor" : "Vendors"
                  }`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
