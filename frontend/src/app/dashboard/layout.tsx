'use client';

import {
  LayoutGrid,
  LineChart,
  FileText,
  Users,
  Bell,
  UserPlus,
  Calendar,
  Bot,
  ListTodo,
  Target,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
} from '../../components/ui/sidebar';
import { Logo } from '../../components/logo';
import { DashboardHeader } from '../../components/dashboard/header';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { PlaceHolderImages } from '../../lib/placeholder-images';
import { Skeleton } from '../../components/ui/skeleton';

const managerAvatar = PlaceHolderImages.find((img) => img.id === 'avatar-4');

const agentMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard/history', label: 'Istoric', icon: LineChart },
  { href: '/dashboard/report', label: 'Raport Zilnic', icon: FileText },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/tasks', label: 'Task-uri', icon: ListTodo },
  { href: '/dashboard/goals', label: 'Obiective', icon: Target },
];

const managerMenuItems = [
  {
    href: '/dashboard/manager/overview',
    label: 'Privire de ansamblu',
    icon: Users,
  },
  {
    href: '/dashboard/manager/history',
    label: 'Istoric echipă',
    icon: LineChart,
  },
  {
    href: '/dashboard/manager/forecast',
    label: 'Prognoza vanzari',
    icon: LineChart,
  },
  { href: '/dashboard/manager/reports', label: 'Rapoarte Echipă', icon: FileText },
  { href: '/dashboard/notifications', label: 'Notificări', icon: Bell },
  {
    href: '/dashboard/manager/create-agent',
    label: 'Creează cont angajat',
    icon: UserPlus,
  },
];

const toolsMenuItems = [
  { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Bot },
];

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden h-full w-64 flex-col border-r bg-muted/40 p-4 md:flex">
        <div className="mb-8">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </header>
        <main className="p-6">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("Cont");
  const [initials, setInitials] = React.useState("?");
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

  React.useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role || 'agent');
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      if (typeof window === 'undefined') return;
      const token = window.localStorage.getItem('salesway_token');
      if (!token) return;

      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
        };
        const fullName = [data.firstName, data.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const fallbackName = data.email?.split('@')[0] ?? 'Cont';
        const resolvedName = fullName || fallbackName;
        setDisplayName(resolvedName);
        const nextInitials = resolvedName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
        setInitials(nextInitials || '?');
      } catch (error) {
        console.error('Failed to load user info', error);
      }
    };

    void fetchUser();
  }, [apiBaseUrl]);

  if (!userRole) {
    return <DashboardSkeleton />;
  }

  const isManager = userRole === 'manager';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          {isManager ? (
            <SidebarMenu>
              <p className="px-2 py-2 text-xs font-semibold text-sidebar-foreground/70">
                Manager
              </p>
              {managerMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
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
          ) : (
            <SidebarMenu>
              <p className="px-2 py-2 text-xs font-semibold text-sidebar-foreground/70">
                Personal
              </p>
              {agentMenuItems.map((item) => (
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
          )}
          <SidebarMenu>
            <p className="px-2 py-2 text-xs font-semibold text-sidebar-foreground/70">
              Instrumente
            </p>
            {toolsMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
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
              {managerAvatar && (
                <AvatarImage
                  src={managerAvatar.imageUrl}
                  alt={managerAvatar.description}
                  data-ai-hint={managerAvatar.imageHint}
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-grow truncate">
              <p className="font-semibold">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/70">
                {isManager ? 'Sales Manager' : 'Sales Agent'}
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <DashboardHeader />
        <main className="h-full flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
