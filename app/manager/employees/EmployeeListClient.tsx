"use client";

import { useState } from "react";
import { 
  Plus, Users, Mail, Building2, RefreshCw, Pencil, Loader2, 
  Trash2, Copy, Check, X, Shield, Eye, EyeOff, KeyRound, 
  Search, Crown
} from "lucide-react";
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
  tempPassword?: string | null;
}

interface Dept {
  id: string;
  name: string;
}

interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
}

// Generates consistent initials
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Deterministically picks a beautiful gradient based on the employee's name
function getAvatarGradient(name: string) {
  const gradients = [
    "from-indigo-500 to-cyan-400",
    "from-pink-500 to-rose-400",
    "from-violet-500 to-fuchsia-500",
    "from-emerald-400 to-cyan-500",
    "from-amber-400 to-orange-500",
    "from-blue-600 to-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % gradients.length;
  return `bg-gradient-to-tr ${gradients[index]}`;
}

// --- Credentials Modal ---
function CredentialsModal({ credentials, onClose }: { credentials: CreatedCredentials; onClose: () => void }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    await navigator.clipboard.writeText(text);
    if (type === "email") { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] p-8 w-full max-w-md transform transition-all overflow-hidden border border-indigo-100">
        
        {/* Decorative background blob */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors z-10">
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Account Created</h2>
            <p className="text-sm text-indigo-600 font-medium mt-0.5">Ready to be shared</p>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Email / Username</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-800 truncate">{credentials.email}</span>
              <button onClick={() => copyToClipboard(credentials.email, "email")} className="flex-shrink-0 p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-indigo-500 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95">
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Temporary Password</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-mono font-bold text-slate-800 tracking-widest">{credentials.password}</span>
              <button onClick={() => copyToClipboard(credentials.password, "password")} className="flex-shrink-0 p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-indigo-500 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95">
                {copiedPassword ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        <button onClick={onClose} className="mt-8 w-full py-3.5 px-4 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98] relative z-10">
          Done
        </button>
      </div>
    </div>
  );
}

// --- Password Display ---
function PasswordDisplay({ password }: { password: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-4 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl">
      <KeyRound className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-1" />
      <span className="text-xs font-mono font-bold text-slate-700 flex-1">
        {visible ? password : "••••••••"}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setVisible(!visible)} className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 transition-all" title={visible ? "Hide" : "Show"}>
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={handleCopy} className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 transition-all" title="Copy password">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// --- Inline Account Edit ---
function InlineAccountEdit({ employeeId, currentEmail, onSave, onCancel }: {
  employeeId: string; currentEmail: string; onSave: (password: string, email: string) => void; onCancel: () => void;
}) {
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    const emailChanged = newEmail.trim() !== currentEmail && newEmail.trim() !== "";
    const passChanged = newPassword.trim() !== "";
    if (!emailChanged && !passChanged) return onCancel();
    if (passChanged && newPassword.trim().length < 6) return toast.error("Password must be at least 6 characters");

    setSaving(true);
    try {
      if (emailChanged) {
        const res = await fetch(`/api/users/${employeeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail.trim() }) });
        if (!res.ok) { const err = await res.json(); toast.error(err.error || "Failed to update email"); setSaving(false); return; }
      }
      if (passChanged) {
        const res = await fetch(`/api/employees/${employeeId}/reset-password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: newPassword.trim() }) });
        if (!res.ok) { toast.error("Failed to update password"); setSaving(false); return; }
      }
      onSave(passChanged ? newPassword.trim() : "", emailChanged ? newEmail.trim() : currentEmail);
    } catch { toast.error("An error occurred"); } finally { setSaving(false); }
  };

  return (
    <div className="mt-5 pt-5 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
        <p className="text-xs font-bold text-slate-800 tracking-tight">Update Details</p>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Email Address</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} 
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
        </div>
        <div className="relative">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">New Password <span className="text-slate-300 normal-case">(Optional)</span></label>
          <input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" 
            className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[28px] text-slate-400 hover:text-indigo-500 transition-colors p-1">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-3">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 bg-white">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
      </div>
    </div>
  );
}

// --- Main List Component ---
export function EmployeeListClient({ initialEmployees, departments }: { initialEmployees: Employee[]; departments: Dept[] }) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [search, setSearch] = useState("");
  
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const emp of initialEmployees) if (emp.tempPassword) map[emp.id] = emp.tempPassword;
    return map;
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserInput>({ resolver: zodResolver(userSchema) });

  const onSubmit = async (data: UserInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json().catch(() => null); toast.error(err?.error || "Failed to create user"); return; }
      const newEmp = await res.json();
      const matchedDept = departments.find((d) => d.id === data.departmentId);
      const password = data.password || "changeme123";
      setEmployees((prev) => [...prev, { ...newEmp.user, department: matchedDept ? { name: matchedDept.name } : null }]);
      setKnownPasswords((prev) => ({ ...prev, [newEmp.user.id]: password }));
      setCreatedCredentials({ name: data.name, email: data.email, password });
      setIsOpen(false); reset(); router.refresh();
    } catch { toast.error("An error occurred"); } finally { setIsSubmitting(false); }
  };

  const handleAccountSaved = (employeeId: string, newPassword?: string, newEmail?: string) => {
    if (newPassword) setKnownPasswords((prev) => ({ ...prev, [employeeId]: newPassword }));
    if (newEmail) setEmployees((prev) => prev.map(e => e.id === employeeId ? { ...e, email: newEmail } : e));
    setEditingId(null); toast.success("Account updated successfully!"); router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "Failed to delete"); return; }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success("Employee deleted successfully"); router.refresh();
    } catch { toast.error("Failed to delete employee"); }
  };

  const filteredEmployees = employees.filter((e) => {
    const term = search.toLowerCase();
    return e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term) || (e.department?.name && e.department.name.toLowerCase().includes(term));
  });

  const stats = {
    total: employees.length,
    managers: employees.filter(e => e.role === "MANAGER").length,
    team: employees.filter(e => e.role === "TEAM").length
  };

  return (
    <>
      {createdCredentials && (
        <CredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />
      )}

      {/* Background ambient accent for the page */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none -z-10"></div>

      <div className="space-y-8 relative z-0">
        
        {/* Vibrant Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Total Employees", value: stats.total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Procurement Team", value: stats.team, icon: Shield, color: "text-cyan-600", bg: "bg-cyan-50" },
            { label: "Managers", value: stats.managers, icon: Crown, color: "text-amber-600", bg: "bg-amber-50" }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 relative overflow-hidden group">
              {/* Decorative side glow */}
              <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} relative z-10`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees or departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-sm font-medium border border-slate-200 bg-white rounded-2xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Add New Employee
          </button>
        </div>

        {/* Add Employee Form */}
        {isOpen && (
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
            {/* Form decorative background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-violet-50/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Create Account</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Generate a new profile for a team member or manager.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Full Name</label>
                <input {...register("name")} className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. Jane Doe" />
                {errors.name && <p className="text-xs font-semibold text-rose-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email Address</label>
                <input {...register("email")} type="email" className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="jane@company.com" />
                {errors.email && <p className="text-xs font-semibold text-rose-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
                <input {...register("password")} type="password" className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="••••••••" />
                {errors.password && <p className="text-xs font-semibold text-rose-500 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Access Role</label>
                <select {...register("role")} className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm">
                  <option value="TEAM">Procurement Team</option>
                  <option value="MANAGER">Procurement Manager</option>
                </select>
                {errors.role && <p className="text-xs font-semibold text-rose-500 mt-1">{errors.role.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Assigned Department</label>
                <select {...register("departmentId")} className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm">
                  <option value="">No Department Assigned</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 relative z-10">
              <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 bg-white shadow-sm">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        {/* Empty State */}
        {filteredEmployees.length === 0 && (
          <div className="text-center py-24 bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No employees found</h3>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm mx-auto">We couldn't find any employees matching your search criteria.</p>
          </div>
        )}

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((e) => (
            <div key={e.id} className="group bg-white border border-slate-100 rounded-[2rem] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
              
              {/* Premium Glow effect on hover */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-100 to-transparent rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              {/* Decorative subtle border top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Header: Avatar and Role */}
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20 ${getAvatarGradient(e.name)}`}>
                    {getInitials(e.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight text-slate-900 pr-14 leading-tight">{e.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {e.role === "MANAGER" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[10px] font-bold text-amber-600 tracking-wider">
                          <Crown className="w-3 h-3" /> MANAGER
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 tracking-wider">
                          TEAM
                        </span>
                      )}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    </div>
                  </div>
                </div>

                {/* Top Right Actions */}
                <div className="absolute right-0 top-0 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-100 shadow-sm">
                  <button onClick={() => setEditingId(editingId === e.id ? null : e.id)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit Account">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(e.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete Employee">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 relative z-10 flex-1 bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 truncate">{e.email}</span>
                </div>
                {e.department && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 truncate">{e.department.name}</span>
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-auto">
                {/* Temporary Password Display */}
                {knownPasswords[e.id] && editingId !== e.id && (
                  <PasswordDisplay password={knownPasswords[e.id]} />
                )}

                {/* Inline Edit Form */}
                {editingId === e.id && (
                  <InlineAccountEdit employeeId={e.id} currentEmail={e.email} onSave={(pw, email) => handleAccountSaved(e.id, pw, email)} onCancel={() => setEditingId(null)} />
                )}
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
