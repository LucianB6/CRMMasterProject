"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";
import { PlaceHolderImages } from "../../lib/placeholder-images";
import { apiFetch } from "../../lib/api";
const managerAvatar = PlaceHolderImages.find((img) => img.id === "avatar-4");

export function DashboardHeader({ showNotifications = true }: { showNotifications?: boolean }) {
  const [displayName, setDisplayName] = React.useState("Cont");
  const [initials, setInitials] = React.useState("?");

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

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-full p-1"
            >
              <Avatar className="h-8 w-8">
                {managerAvatar && (
                  <AvatarImage
                    src={managerAvatar.imageUrl}
                    alt={managerAvatar.description}
                  />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{displayName}</span>
              <ChevronDown className="hidden h-4 w-4 md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
