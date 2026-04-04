"use client";

import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

import { Button } from "../ui/button";
import { apiFetch } from "../../lib/api";

const breadcrumbLabelByPath: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/history": "History",
  "/dashboard/report": "Daily Report",
  "/dashboard/calendar": "Calendar",
  "/dashboard/tasks": "Tasks",
  "/dashboard/goals": "Goals",
  "/dashboard/ai-assistant": "AI Assistant",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
  "/dashboard/notifications": "Notifications",
  "/dashboard/billing": "Billing",
  "/dashboard/manager/overview": "Overview",
  "/dashboard/manager/history": "Team History",
  "/dashboard/manager/forecast": "Sales Forecast",
  "/dashboard/manager/leads": "Active Leads",
  "/dashboard/manager/lead-form": "Form Editor",
  "/dashboard/manager/reports": "Team Reports",
  "/dashboard/manager/create-agent": "Create Employee Account",
};

const toTitleCase = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function DashboardHeader({
  showNotifications = true,
  onOpenMobileNav
}: {
  showNotifications?: boolean;
  onOpenMobileNav?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPathname = React.useMemo(
    () => pathname.replace(/\/+$/, '') || '/',
    [pathname]
  );
  const [displayName, setDisplayName] = React.useState("Cont");
  const [initials, setInitials] = React.useState("?");
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const currentPageLabel = React.useMemo(() => {
    if (breadcrumbLabelByPath[normalizedPathname]) return breadcrumbLabelByPath[normalizedPathname];
    const normalized = normalizedPathname.replace(/\/$/, "");
    const lastSegment = normalized.split("/").filter(Boolean).pop();
    if (!lastSegment) return "Dashboard";
    return toTitleCase(lastSegment);
  }, [normalizedPathname]);
  const dashboardHref = React.useMemo(() => {
    if (normalizedPathname.startsWith("/dashboard/manager")) {
      return "/dashboard/manager/overview";
    }
    return "/dashboard";
  }, [normalizedPathname]);

  React.useEffect(() => {
    const fetchUser = async () => {
      if (typeof window === "undefined") return;
      const token = window.localStorage.getItem("salesway_token");
      if (!token) return;

      try {
        const data = await apiFetch<{
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
        }>("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const fullName = [data.firstName, data.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const fallbackName = data.email?.split("@")[0] ?? "Cont";
        const resolvedName = fullName || fallbackName;
        setDisplayName(resolvedName);
        const nextInitials = resolvedName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("");
        setInitials(nextInitials || "?");
      } catch (error) {
        console.error("Failed to load user info", error);
      }
    };

    void fetchUser();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileRef.current) return;
      const target = event.target;
      if (target instanceof Node && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        {onOpenMobileNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        ) : null}
        {normalizedPathname === dashboardHref ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">Overview</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link
              href={dashboardHref}
              className="rounded-sm transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            >
              Overview
            </Link>
            <ChevronRight size={14} />
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-sm font-medium text-slate-900 transition-colors hover:text-[#38bdf8] dark:text-slate-100 dark:hover:text-sky-300"
            >
              {currentPageLabel}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {showNotifications && (
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/dashboard/notifications">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>
        )}

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((current) => !current)}
            className="flex items-center gap-3 rounded-full p-1 transition-all hover:bg-slate-50 focus:outline-none dark:hover:bg-slate-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {initials}
            </div>
            <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-100 md:block">{displayName}</span>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform dark:text-slate-500 ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isProfileOpen && (
            <div className="animate-in fade-in zoom-in absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white py-2 shadow-2xl duration-100 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">My Account</p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <User size={18} className="text-slate-400 dark:text-slate-500" />
                <span>Profile</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Settings size={18} className="text-slate-400 dark:text-slate-500" />
                <span>Settings</span>
              </Link>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              <Link
                href="/"
                onClick={() => setIsProfileOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut size={18} className="text-red-400" />
                <span>Log out</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
