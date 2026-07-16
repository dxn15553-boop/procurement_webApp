"use client";

import { useState } from "react";
import { Plus, Store, User, Mail, Phone, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vendorSchema, type VendorInput } from "@/lib/validations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Vendor {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  _count: { procurementRequests: number };
}

export function VendorListClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
  });

  const onSubmit = async (data: VendorInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        toast.error("Failed to create vendor");
        return;
      }

      const newVendor = await res.json();
      setVendors((prev) => [...prev, { ...newVendor.vendor, _count: { procurementRequests: 0 } }]);
      toast.success("Vendor added successfully!");
      setIsOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setVendors((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vendor deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete vendor");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 border border-border bg-card rounded-xl shadow-sm max-w-xl space-y-4 slide-in">
          <h3 className="text-sm font-bold text-foreground">Add Vendor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Code *</label>
              <input {...register("code")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. V005" />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Name *</label>
              <input {...register("name")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Acme Corp" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Contact Person</label>
              <input {...register("contactPerson")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Email</label>
              <input {...register("email")} type="email" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. contacts@acme.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Phone</label>
              <input {...register("phone")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. +1-555-0105" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Address</label>
              <input {...register("address")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. 123 Industrial Way" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
              {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full flex items-center justify-center pointer-events-none">
              <Store className="w-8 h-8 text-primary/10" />
            </div>
            <button 
              onClick={() => handleDelete(v.id)}
              className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors z-10 bg-background/50 backdrop-blur-sm"
              title="Delete Vendor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">{v.code}</span>
                <span className="text-xs text-muted-foreground">{v.isActive ? "Active" : "Inactive"}</span>
              </div>
              <h3 className="font-semibold text-foreground text-sm mt-2">{v.name}</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {v.contactPerson && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Contact: <span className="font-medium text-foreground">{v.contactPerson}</span></span>
                </div>
              )}
              {v.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{v.email}</span>
                </div>
              )}
              {v.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{v.phone}</span>
                </div>
              )}
              {v.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate" title={v.address}>{v.address}</span>
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-border/50">
                <span className="block text-foreground font-semibold text-xs">{v._count.procurementRequests} requests handled</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
