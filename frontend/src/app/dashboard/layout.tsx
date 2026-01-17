"use client";

import { FileText, LayoutGrid, LineChart } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "../../components/logo";
import { DashboardHeader } from "../../components/dashboard/header";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from "../../components/ui/sidebar";
import { PlaceHolderImages } from "../../lib/placeholder-images";

const agentAvatar = PlaceHolderImages.find((img) => img.id === "avatar-2");

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/history", label: "Istoric", icon: LineChart },
  { href: "/dashboard/report", label: "Raport Zilnic", icon: FileText }
];

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <a href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground">
            <Avatar className="h-8 w-8">
              {agentAvatar && (
                <AvatarImage
                  src={agentAvatar.imageUrl}
                  alt={agentAvatar.description}
                  data-ai-hint={agentAvatar.imageHint}
                />
              )}
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-grow truncate">
              <p className="font-semibold">Alex Doe</p>
              <p className="text-xs text-sidebar-foreground/70">Sales Agent</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
