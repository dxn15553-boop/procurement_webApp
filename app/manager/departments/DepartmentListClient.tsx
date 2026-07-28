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
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 lg:p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-xl space-y-6 slide-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight relative z-10">Create Department</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Code *</label>
              <input {...register("code")} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900" placeholder="e.g. IT, MFG" />
              {errors.code && <p className="text-xs text-red-500 font-medium mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Name *</label>
              <input {...register("name")} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900" placeholder="e.g. Information Technology" />
              {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Department Head</label>
              <input {...register("head")} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900" placeholder="e.g. John Smith" />
            </div>
          </div>
          <div className="flex gap-3 justify-end relative z-10">
            <button type="button" onClick={() => setIsOpen(false)} className="px-6 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm bg-white">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 disabled:opacity-50">
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div key={d.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100/50 to-transparent rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none group-hover:from-indigo-50/50 transition-colors"></div>
            <button 
              onClick={() => handleDelete(d.id)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors z-10 bg-white shadow-sm border border-slate-100"
              title="Delete Department"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">{d.code}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{d.isActive ? "Active" : "Inactive"}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mt-3 tracking-tight">{d.name}</h3>
            </div>
            <div className="space-y-2 text-sm font-medium text-slate-500 mt-4 relative z-10">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Head: <span className="font-bold text-slate-700">{d.head ?? "Not assigned"}</span></span>
              </div>
              <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <span className="block text-slate-900 font-bold text-base">{d._count.users}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employees</span>
                </div>
                <div>
                  <span className="block text-slate-900 font-bold text-base">{d._count.procurementRequests}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Requests</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
