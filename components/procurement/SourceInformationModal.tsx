"use client";

import React from "react";
import {
  X,
  FileText,
  Building,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Layers,
  ShieldCheck,
  Send,
} from "lucide-react";
import { format } from "date-fns";

export interface SourceDetailsData {
  id: string;
  description: string;
  department_name?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_designation?: string | null;
  priority?: string | null;
  purpose_justification?: string | null;
  required_by_date?: string | Date | null;
  handler_name?: string | null;
  handler_email?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  srf_number?: string | null;
}

interface SourceInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: SourceDetailsData | null;
  linkedRfq?: {
    rfqNumber: string;
    status: string;
    vendorsCount: number;
    quotesCount: number;
  } | null;
}

export function SourceInformationModal({
  isOpen,
  onClose,
  source,
  linkedRfq,
}: SourceInformationModalProps) {
  if (!isOpen || !source) return null;

  const formattedDate = source.created_at
    ? format(new Date(source.created_at), "dd MMMM yyyy")
    : "—";

  const formattedRequiredDate = source.required_by_date
    ? format(new Date(source.required_by_date), "dd MMMM yyyy")
    : "Not specified";

  const srfNo = source.srf_number || source.id.replace("SRC-", "SRF-");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <Layers className="w-4 h-4" />
              <span>Official Source Request Dossier</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-black text-neutral-900 dark:text-white font-mono">
                {source.id}
              </h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                SRF: {srfNo}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${
                  source.priority === "URGENT" || source.priority === "HIGH"
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                }`}
              >
                {source.priority || "NORMAL"} Priority
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Key Identification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                <Building className="w-3.5 h-3.5 text-red-600" />
                <span>Originating Department</span>
              </div>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {source.department_name || "Enterprise Operations"}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Requisition Initiator</span>
              </div>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {source.requester_name || "Staff Member"}
              </div>
              {source.requester_designation && (
                <div className="text-[11px] text-neutral-500">{source.requester_designation}</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Delivery Deadline</span>
              </div>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {formattedRequiredDate}
              </div>
              <div className="text-[11px] text-neutral-400">Created: {formattedDate}</div>
            </div>
          </div>

          {/* Assigned Handler & Requisition Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                Assigned Procurement Handler
              </div>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {source.handler_name || "Procurement Team"}
              </div>
              {source.handler_email && (
                <div className="text-[11px] text-neutral-500 font-mono">{source.handler_email}</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                Internal Source Status
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {source.status || "Approved"}
                </span>
              </div>
            </div>
          </div>

          {/* Requisition Requirement & Technical Specifications */}
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              <FileText className="w-4 h-4 text-red-600" />
              <span>Technical Scope & Item Description</span>
            </div>
            <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans text-xs whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">
              {source.description || "No detailed technical description specified."}
            </p>
          </div>

          {/* Purpose & Justification */}
          {source.purpose_justification && (
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Business Justification & Departmental Purpose
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-xs italic bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">
                "{source.purpose_justification}"
              </p>
            </div>
          )}

          {/* Linked RFQ Synchronization */}
          {linkedRfq && (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-700 dark:text-red-400 uppercase tracking-wider">
                  Linked Synchronized RFQ: {linkedRfq.rfqNumber}
                </span>
                <span className="text-[11px] font-bold text-neutral-500 uppercase">
                  Status: {linkedRfq.status}
                </span>
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-4">
                <span>Invited Vendors: <strong>{linkedRfq.vendorsCount}</strong></span>
                <span>•</span>
                <span>Quotations Received: <strong>{linkedRfq.quotesCount}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500 font-mono">
            DXN Procurement Database Synchronization
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer bg-white dark:bg-neutral-900 shadow-2xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
