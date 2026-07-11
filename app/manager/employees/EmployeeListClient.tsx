"use client";

import { useState } from "react";
import { Plus, Users, User, Mail, Shield, Building2, RefreshCw, KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema, type UserInput } from "@/lib/validations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: "TEAM" | "MANAGER";
  departmentId: string | null;
  isActive: boolean;
  department: { name: string } | null;
}

interface Dept {
  id: string;
  name: string;
}

export function EmployeeListClient({ initialEmployees, departments }: { initialEmployees: Employee[]; departments: Dept[] }) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        toast.error("Failed to create user");
        return;
      }

      const newEmp = await res.json();
      const matchedDept = departments.find((d) => d.id === data.departmentId);
      setEmployees((prev) => [
        ...prev,
        {
          ...newEmp.user,
          department: matchedDept ? { name: matchedDept.name } : null,
        },
      ]);
      toast.success("Employee created successfully!");
      setIsOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reset ${name}'s password to 'changeme123'?`)) return;
    
    setResettingId(id);
    try {
      const res = await fetch(`/api/employees/${id}/reset-password`, {
        method: "PATCH",
      });

      if (!res.ok) {
        toast.error("Failed to reset password");
        return;
      }

      toast.success(`${name}'s password has been reset successfully!`);
    } catch {
      toast.error("An error occurred while resetting password");
    } finally {
      setResettingId(null);
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
          Add Employee
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 border border-border bg-card rounded-xl shadow-sm max-w-xl space-y-4 slide-in">
          <h3 className="text-sm font-bold text-foreground">Add Employee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Name *</label>
              <input {...register("name")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Robert Downy" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Email *</label>
              <input {...register("email")} type="email" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. robert@company.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Password *</label>
              <input {...register("password")} type="password" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="••••••••" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Role *</label>
              <select {...register("role")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="TEAM">Procurement Team</option>
                <option value="MANAGER">Procurement Manager</option>
              </select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Department</label>
              <select {...register("departmentId")} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
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
        {employees.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full flex items-center justify-center pointer-events-none">
              <Users className="w-8 h-8 text-primary/10" />
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.role === "MANAGER" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {e.role}
                </span>
                <span className="text-xs text-muted-foreground">{e.isActive ? "Active" : "Inactive"}</span>
              </div>
              <h3 className="font-semibold text-foreground text-sm mt-2 pr-8">{e.name}</h3>
              
              {/* Reset Password Button */}
              <button
                onClick={() => handleResetPassword(e.id, e.name)}
                disabled={resettingId === e.id}
                className="absolute right-0 top-6 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Reset Password to default"
              >
                {resettingId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="space-y-1.5 text-xs text-muted-foreground relative">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{e.email}</span>
              </div>
              {e.department && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{e.department.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
