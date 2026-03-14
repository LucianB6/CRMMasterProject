"use client";

import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function DashboardHeader({ showNotifications = true }: { showNotifications?: boolean }) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = React.useState("Cont");
  const [initials, setInitials] = React.useState("?");
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const currentPageLabel = React.useMemo(() => {
    if (breadcrumbLabelByPath[pathname]) return breadcrumbLabelByPath[pathname];
    const normalized = pathname.replace(/\/$/, "");
    const lastSegment = normalized.split("/").filter(Boolean).pop();
    if (!lastSegment) return "Dashboard";
    return toTitleCase(lastSegment);
  }, [pathname]);

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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-900">{currentPageLabel}</span>
        </div>
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
            className="flex items-center gap-3 rounded-full p-1 transition-all hover:bg-slate-50 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600 shadow-sm">
              {initials}
            </div>
            <span className="hidden text-sm font-semibold text-slate-700 md:block">{displayName}</span>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isProfileOpen && (
            <div className="animate-in fade-in zoom-in absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white py-2 shadow-2xl duration-100">
              <div className="mb-1 px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">My Account</p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User size={18} className="text-slate-400" />
                <span>Profile</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Settings size={18} className="text-slate-400" />
                <span>Settings</span>
              </Link>

              <div className="my-2 border-t border-slate-100" />

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
