"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Building2,
  Store,
  BarChart3,
  Bell,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useLayoutStore } from "@/lib/store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ("TEAM" | "MANAGER")[];
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "ROLE_BASED",
    icon: LayoutDashboard,
    roles: ["TEAM", "MANAGER"],
  },
  {
    label: "Procurement",
    href: "ROLE_BASED_REQUESTS",
    icon: ShoppingCart,
    roles: ["TEAM", "MANAGER"],
  },
  {
    label: "Analytics",
    href: "/manager/analytics",
    icon: TrendingUp,
    roles: ["MANAGER"],
  },
  {
    label: "Reports",
    href: "/manager/reports",
    icon: FileText,
    roles: ["MANAGER"],
  },
  {
    label: "Employees",
    href: "/manager/employees",
    icon: Users,
    roles: ["MANAGER"],
  },
  {
    label: "Departments",
    href: "/manager/departments",
    icon: Building2,
    roles: ["MANAGER"],
  },
  {
    label: "Notifications",
    href: "ROLE_BASED_NOTIFICATIONS",
    icon: Bell,
    roles: ["TEAM", "MANAGER"],
  },
  {
    label: "Settings",
    href: "/manager/settings",
    icon: Settings,
    roles: ["MANAGER"],
  },
];

interface SidebarProps {
  role: "TEAM" | "MANAGER";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isMobileMenuOpen, closeMobileMenu } = useLayoutStore();

  const resolveHref = (item: NavItem): string => {
    if (item.href === "ROLE_BASED") return role === "MANAGER" ? "/manager" : "/team";
    if (item.href === "ROLE_BASED_REQUESTS") return role === "MANAGER" ? "/manager/requests" : "/team/requests";
    if (item.href === "ROLE_BASED_NOTIFICATIONS") return role === "MANAGER" ? "/manager/notifications" : "/team/notifications";
    return item.href;
  };

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={closeMobileMenu}
        />
      )}
      
      <aside
        className={cn(
          "flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0 z-50",
          collapsed ? "w-16" : "w-64",
          isMobileMenuOpen ? "fixed inset-y-0 left-0 h-full w-64 shadow-2xl" : "hidden md:flex md:h-screen md:relative"
        )}
      >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-slate-700/50",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-white">ProcureX</span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest">
              {role === "MANAGER" ? "Manager Portal" : "Team Portal"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const href = resolveHref(item);
          const isActive = pathname === href || (href !== "/manager" && href !== "/team" && pathname.startsWith(href));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={href}
              onClick={() => closeMobileMenu()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role badge at bottom */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">
              Logged in as <span className="text-blue-400 font-medium">{role}</span>
            </span>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-colors z-10"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-300" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-300" />
        )}
      </button>
    </aside>
    </>
  );
}
