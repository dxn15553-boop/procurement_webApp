"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Eye, EyeOff, LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/building-bg.png')" }}
      />
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Futuristic Glowing Card */}
      <div className="relative w-full max-w-[420px] mx-4 p-8 rounded-2xl bg-slate-950/70 backdrop-blur-2xl border border-blue-500/30 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] z-10 fade-in slide-in-bottom-4 group hover:border-blue-500/50 transition-colors duration-500">

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl-xl opacity-50" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr-xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl-xl opacity-50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br-xl opacity-50" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-black/50 border border-blue-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] mb-4 transform group-hover:scale-110 transition-transform duration-500">
            <ShieldCheck className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Procurement</h1>
          <p className="text-xs font-mono text-blue-400/80 uppercase tracking-widest mt-1">Authentication</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-mono text-blue-300/70 uppercase tracking-wider">
              Network ID (Email)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
              className="w-full px-4 py-3 rounded-lg border border-blue-500/20 bg-slate-950/50 text-blue-50 placeholder:text-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:bg-blue-950/30 transition-all text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] font-mono"
            />
            {errors.email && (
              <p className="text-xs text-red-400 font-mono mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-mono text-blue-300/70 uppercase tracking-wider">
              Access Code (Password)
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full px-4 py-3 pr-11 rounded-lg border border-blue-500/20 bg-slate-950/50 text-blue-50 placeholder:text-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:bg-blue-950/30 transition-all text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500/50 hover:text-blue-400 hover:drop-shadow-[0_0_5px_rgba(96,165,250,0.8)] transition-all p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400 font-mono mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg bg-blue-600/20 text-blue-300 font-bold text-sm border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:bg-blue-500/30 hover:text-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:opacity-50 disabled:pointer-events-none mt-6 uppercase tracking-widest font-mono group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isLoading ? "Authenticating..." : "Initialize Session"}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-8 pt-6 border-t border-blue-500/20">
          <p className="text-[10px] font-mono font-bold text-blue-500/50 mb-3 uppercase tracking-widest text-center">Authorized Personnel Only</p>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
            <div className="p-3 rounded border border-blue-900/50 bg-black/40 flex flex-col gap-1 hover:border-blue-500/40 hover:bg-blue-950/30 transition-colors cursor-default group/demo">
              <span className="text-[9px] font-bold text-blue-400 group-hover/demo:text-blue-300">OP-LEVEL 1 (MANAGER)</span>
              <span className="truncate text-slate-400">manager@procurex.com</span>
              <span className="text-slate-500">manager123</span>
            </div>
            <div className="p-3 rounded border border-emerald-900/50 bg-black/40 flex flex-col gap-1 hover:border-emerald-500/40 hover:bg-emerald-950/30 transition-colors cursor-default group/demo">
              <span className="text-[9px] font-bold text-emerald-400 group-hover/demo:text-emerald-300">OP-LEVEL 2 (TEAM)</span>
              <span className="truncate text-slate-400">john@procurex.com</span>
              <span className="text-slate-500">team123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
