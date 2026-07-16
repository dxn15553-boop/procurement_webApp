"use client";

import { useState } from "react";
import { Plus, Building2, User, RefreshCw, Trash2, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { departmentSchema, type DepartmentInput } from "@/lib/validations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Dept {
  id: string;
  name: string;
  code: string;
  head: string | null;
  isActive: boolean;
  _count: { users: number; procurementRequests: number };
}

export function DepartmentListClient({ initialDepartments }: { initialDepartments: Dept[] }) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Dept[]>(initialDepartments);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
  });

  const onSubmit = async (data: DepartmentInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        toast.error("Failed to create department");
        return;
      }

      const newDept = await res.json();
      setDepartments((prev) => [...prev, { ...newDept.department, _count: { users: 0, procurementRequests: 0 } }]);
      toast.success("Department created successfully!");
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
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Department deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete department");
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
          Add Department
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 border border-border bg-card rounded-xl shadow-sm max-w-xl space-y-4 slide-in">
          <h3 className="text-sm font-bold text-foreground">Create Department</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Code *</label>
              <input {...register("code")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. IT, MFG" />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Name *</label>
              <input {...register("name")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Information Technology" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Department Head</label>
              <input {...register("head")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. John Smith" />
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
        {departments.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full flex items-center justify-center pointer-events-none">
              <Building2 className="w-8 h-8 text-primary/10" />
            </div>
            <button 
              onClick={() => handleDelete(d.id)}
              className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors z-10 bg-background/50 backdrop-blur-sm"
              title="Delete Department"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">{d.code}</span>
                <span className="text-xs text-muted-foreground">{d.isActive ? "Active" : "Inactive"}</span>
              </div>
              <h3 className="font-semibold text-foreground text-sm mt-2">{d.name}</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Head: <span className="font-medium text-foreground">{d.head ?? "Not assigned"}</span></span>
              </div>
              <div className="flex gap-4 mt-2">
                <div>
                  <span className="block text-foreground font-semibold text-sm">{d._count.users}</span>
                  <span>Employees</span>
                </div>
                <div>
                  <span className="block text-foreground font-semibold text-sm">{d._count.procurementRequests}</span>
                  <span>Requests</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
