"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Eye, EyeOff, Loader2, Package, Quote, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans selection:bg-white/30 selection:text-white">
      
      {/* Immersive VisionOS Abstract Background */}
      <div className="absolute inset-0 bg-slate-900 z-0"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/40 blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '15s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-fuchsia-500/30 blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '20s' }}></div>
      <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-cyan-500/30 blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>

      {/* Subtle glass texture overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      <div className="w-full max-w-[420px] p-4 relative z-10">
        
        {/* VisionOS Frosted Glass Panel */}
        <div className="bg-white/10 backdrop-blur-[40px] p-10 rounded-[32px] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 relative overflow-hidden">
          
          {/* Inner highlights */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-[32px]"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"></div>

          {/* Header */}
          <div className="flex flex-col items-center mb-8 relative z-10 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <Package className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-white mb-1">
              ProcureX
            </h1>
            <p className="text-sm font-light text-white/60">
              Authorized Personnel Only
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium text-white/70 ml-1">
                Workspace Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                {...register("email")}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
              />
              {errors.email && (
                <p className="text-xs font-medium text-red-300 mt-1.5 ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1 mr-1">
                <label htmlFor="password" className="block text-xs font-medium text-white/70">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full pl-5 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-red-300 mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2 px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border border-white/20 rounded-md bg-white/5 peer-checked:bg-white peer-checked:border-white transition-all backdrop-blur-sm"></div>
                  <svg className="absolute w-3.5 h-3.5 text-black pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">Remember me</span>
              </label>
              
              <a href="#" className="text-sm font-light text-white/70 hover:text-white transition-colors">
                Recover access
              </a>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 focus:outline-none active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.3)] text-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                ) : null}
                {isLoading ? "Authenticating..." : "Enter Workspace"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
