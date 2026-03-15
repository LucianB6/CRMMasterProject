'use client';

import {
  LayoutDashboard,
  History,
  LineChart,
  FileText,
  Users,
  Bell,
  UserPlus,
  Calendar,
  Bot,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { DashboardHeader } from '../../components/dashboard/header';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { PlaceHolderImages } from '../../lib/placeholder-images';
import { Skeleton } from '../../components/ui/skeleton';
import { apiFetch } from '../../lib/api';

const managerAvatar = PlaceHolderImages.find((img) => img.id === 'avatar-4');

const agentMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/history', label: 'History', icon: LineChart },
  { href: '/dashboard/report', label: 'Daily Report', icon: FileText },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
];

const managerMenuItemsTop = [
  {
    href: '/dashboard/manager/overview',
    label: 'Overview',
    icon: Users,
  },
  {
    href: '/dashboard/manager/history',
    label: 'Team history',
    icon: History,
  },
  {
    href: '/dashboard/manager/forecast',
    label: 'Sales forecast',
    icon: LineChart,
  },
  {
    href: '/dashboard/report',
    label: 'Daily Report',
    icon: FileText,
  },
];

const toolsMenuItems = [
  { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Bot },
];

type NavItemProps = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
};

function NavItem({ href, icon: Icon, label, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        active
          ? 'bg-white text-[#38bdf8] shadow-sm font-bold'
          : 'text-blue-50 hover:bg-white/10 font-medium'
      }`}
    >
      <Icon size={20} />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden w-64 flex-col border-r bg-muted/40 p-4 md:flex">
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
  const router = useRouter();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState('Account');
  const [initials, setInitials] = React.useState('?');

  React.useEffect(() => {
    const token = localStorage.getItem('salesway_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    const role = localStorage.getItem('userRole');
    setUserRole(role || 'agent');
  }, [router]);

  React.useEffect(() => {
    const fetchUser = async () => {
      if (typeof window === 'undefined') return;
      const token = window.localStorage.getItem('salesway_token');
      if (!token) return;

      try {
        const data = await apiFetch<{
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
        }>('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const fullName = [data.firstName, data.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const fallbackName = data.email?.split('@')[0] ?? 'Account';
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
  }, []);
  const leadsSectionActive =
    pathname.startsWith('/dashboard/manager/leads') ||
    pathname.startsWith('/dashboard/manager/lead-form');

  if (!userRole) {
    return <DashboardSkeleton />;
  }

  const isManager = userRole === 'manager';

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col bg-[#38bdf8] text-white shadow-xl md:flex">
        <Link
          href={isManager ? '/dashboard/manager/overview' : '/dashboard'}
          className="flex items-center gap-3 p-6 transition-opacity hover:opacity-90"
        >
          <div className="rounded-lg bg-white p-2 shadow-inner">
            <Layers className="h-6 w-6 text-[#38bdf8]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SalesWay</h1>
        </Link>

        <nav className="flex-1 space-y-1 px-4 py-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-blue-100 opacity-70">
            {isManager ? 'Manager' : 'Personal'}
          </p>

          {isManager ? (
            <>
              {managerMenuItemsTop.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname.startsWith(item.href)}
                />
              ))}

              <NavItem
                href="/dashboard/manager/leads"
                icon={Users}
                label="Leads"
                active={leadsSectionActive}
              />
              <div className="ml-9 space-y-1 border-l border-white/20 py-1">
                <Link
                  href="/dashboard/manager/leads"
                  className={`ml-2 block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard/manager/leads')
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  Active Leads
                </Link>
                <Link
                  href="/dashboard/manager/lead-form"
                  className={`ml-2 block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard/manager/lead-form')
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  Form Editor
                </Link>
              </div>

            </>
          ) : (
            <>
              {agentMenuItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </>
          )}

          <div className="pt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-blue-100 opacity-70">
              Tools
            </p>
            {toolsMenuItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname.startsWith(item.href)}
              />
            ))}
            {isManager && (
              <>
                <NavItem
                  href="/dashboard/notifications"
                  icon={Bell}
                  label="Notifications"
                  active={pathname.startsWith('/dashboard/notifications')}
                />
                <NavItem
                  href="/dashboard/manager/create-agent"
                  icon={UserPlus}
                  label="Create account"
                  active={pathname.startsWith('/dashboard/manager/create-agent')}
                />
              </>
            )}
          </div>
        </nav>

        <div className="mt-auto bg-[#0ea5e9] p-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10 border border-white/30 bg-white/20">
              {managerAvatar && (
                <AvatarImage
                  src={managerAvatar.imageUrl}
                  alt={managerAvatar.description}
                  data-ai-hint={managerAvatar.imageHint}
                />
              )}
              <AvatarFallback className="bg-transparent font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="truncate">
              <p className="text-sm font-bold leading-tight">{displayName}</p>
              <p className="text-xs text-blue-100">{isManager ? 'Sales Manager' : 'Sales Agent'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader showNotifications={isManager} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
