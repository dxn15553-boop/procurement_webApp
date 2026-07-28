"use client";

import { useState } from "react";
import { Plus, Users, Mail, Building2, RefreshCw, Pencil, Loader2, Trash2, Copy, Check, X, Shield, Eye, EyeOff, KeyRound } from "lucide-react";
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

// Modal to show newly created credentials
function CredentialsModal({ credentials, onClose }: { credentials: CreatedCredentials; onClose: () => void }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    await navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Account Created!</h2>
            <p className="text-xs text-slate-500">Share these credentials with {credentials.name}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email / Username</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{credentials.email}</span>
              <button onClick={() => copyToClipboard(credentials.email, "email")} className="flex-shrink-0 p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 tracking-wider">{credentials.password}</span>
              <button onClick={() => copyToClipboard(credentials.password, "password")} className="flex-shrink-0 p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                {copiedPassword ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-slate-400 text-center">Please copy and share these credentials now. The password cannot be retrieved later.</p>
        <button onClick={onClose} className="mt-4 w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors">
          Done, I've noted the credentials
        </button>
      </div>
    </div>
  );
}

// Inline password display with show/hide toggle and copy button
function PasswordDisplay({ password }: { password: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg">
      <KeyRound className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex-1">
        {visible ? password : "••••••••"}
      </span>
      <button onClick={() => setVisible(!visible)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title={visible ? "Hide" : "Show"}>
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button onClick={handleCopy} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Copy password">
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// Inline edit password form inside the card
function InlinePasswordEdit({ employeeId, onSave, onCancel }: { employeeId: string; onSave: (password: string) => void; onCancel: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      if (!res.ok) {
        toast.error("Failed to update password");
        return;
      }
      onSave(newPassword.trim());
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Update Password</p>
      <div className="relative mb-2">
        <input
          type={showPw ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          placeholder="Enter new password..."
          autoFocus
          className="w-full px-3 py-2 pr-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition-all"
          style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
      </div>
    </div>
  );
}


export function EmployeeListClient({ initialEmployees, departments }: { initialEmployees: Employee[]; departments: Dept[] }) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  // Initialize from DB-persisted tempPassword so passwords survive page refresh
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const emp of initialEmployees) {
      if (emp.tempPassword) map[emp.id] = emp.tempPassword;
    }
    return map;
  });

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
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.error || "Failed to create user");
        return;
      }

      const newEmp = await res.json();
      const matchedDept = departments.find((d) => d.id === data.departmentId);
      const password = data.password || "changeme123";

      setEmployees((prev) => [
        ...prev,
        { ...newEmp.user, department: matchedDept ? { name: matchedDept.name } : null },
      ]);

      // Store initial password
      setKnownPasswords((prev) => ({ ...prev, [newEmp.user.id]: password }));

      // Show credentials modal
      setCreatedCredentials({ name: data.name, email: data.email, password });
      setIsOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSaved = (employeeId: string, newPassword: string) => {
    setKnownPasswords((prev) => ({ ...prev, [employeeId]: newPassword }));
    setEditingId(null);
    toast.success("Password updated!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete employee");
        return;
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success("Employee deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete employee");
    }
  };

  return (
    <>
      {createdCredentials && (
        <CredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />
      )}

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
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* BG Icon */}
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
                <h3 className="font-semibold text-foreground text-sm mt-2 pr-16">{e.name}</h3>

                {/* Action buttons – top right */}
                <div className="absolute right-0 top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit / Pencil button */}
                  <button
                    onClick={() => setEditingId(editingId === e.id ? null : e.id)}
                    className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                    title="Edit Password"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Delete Employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-1.5 text-xs text-muted-foreground mt-3">
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

              {/* Password display (shown after manager sets it) */}
              {knownPasswords[e.id] && editingId !== e.id && (
                <PasswordDisplay password={knownPasswords[e.id]} />
              )}

              {/* Inline password edit form */}
              {editingId === e.id && (
                <InlinePasswordEdit
                  employeeId={e.id}
                  onSave={(pw) => handlePasswordSaved(e.id, pw)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
