"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Bell, Search, Sun, Moon, LogOut, User, Settings, ChevronDown, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLayoutStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface TopNavProps {
  title?: string;
}

export function TopNav({ title }: TopNavProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const role = session?.user?.role as string;
  const toggleMobileMenu = useLayoutStore((s) => s.toggleMobileMenu);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const base = role === "MANAGER" ? "/manager/requests" : "/team/requests";
    if (searchQuery.trim()) {
      router.push(`${base}?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(base);
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30 border-b border-slate-200/50">
      {/* Mobile Menu Toggle */}
      <div className="flex items-center md:hidden -ml-2">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Page Title */}
      {title && (
        <h1 className="text-base font-semibold text-foreground hidden md:block mr-2">{title}</h1>
      )}

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests, vendors, departments..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/40 border border-white/60 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground shadow-inner backdrop-blur-sm"
          />
        </form>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Notifications */}
        <Link
          href={role === "MANAGER" ? "/manager/notifications" : "/team/notifications"}
          className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-foreground leading-tight">
                {session?.user?.name ?? "User"}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">{role?.toLowerCase()}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl py-1 z-20 shadow-lg">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{session?.user?.name}</p>
                  <p className="text-xs text-slate-500">{session?.user?.email}</p>
                </div>
                <Link
                  href={role === "MANAGER" ? "/manager/profile" : "/team/profile"}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                {role === "MANAGER" && (
                  <Link
                    href="/manager/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                )}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
