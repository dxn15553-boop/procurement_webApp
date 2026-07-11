"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully!");
      
      // Force session refresh so next-auth gets the updated token (if we had configured it to pull from DB, but usually just redirecting and reloading works)
      // We will redirect to the correct dashboard based on role
      if (session?.user?.role === "MANAGER") {
        window.location.href = "/manager";
      } else {
        window.location.href = "/team";
      }
      
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-600/20 blur-[100px] mix-blend-screen" />
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-cyan-600/20 blur-[90px] mix-blend-screen" />

      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-[40px] bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Inner Highlight */}
          <div className="absolute inset-0 rounded-3xl border border-white/[0.1] pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, white, transparent)' }} />
          
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] mb-4 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Shield className="w-6 h-6 text-white/90" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white/90 mb-2">Update Password</h1>
            <p className="text-sm text-white/50">Your administrator requires you to update your password before continuing.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium tracking-widest uppercase text-white/40 ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] focus:border-white/[0.2] focus:bg-white/[0.05] rounded-xl text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-white/[0.02] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium tracking-widest uppercase text-white/40 ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] focus:border-white/[0.2] focus:bg-white/[0.05] rounded-xl text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-white/[0.02] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-6 bg-white/[0.9] text-black rounded-xl text-sm font-semibold hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Secure Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
