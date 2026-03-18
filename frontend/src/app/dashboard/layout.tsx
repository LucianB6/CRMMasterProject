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
  ClipboardList,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import logoFullFundalTransparent from '../../assets/selfCRMLogo.svg';
import { DashboardHeader } from '../../components/dashboard/header';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { PlaceHolderImages } from '../../lib/placeholder-images';
import { Skeleton } from '../../components/ui/skeleton';
import { apiFetch } from '../../lib/api';

const managerAvatar = PlaceHolderImages.find((img) => img.id === 'avatar-4');

const agentMenuItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/history', label: 'History', icon: LineChart },
  { href: '/dashboard/report', label: 'Daily Report', icon: FileText },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/dashboard/goals', label: 'Goals', icon: Target },
  { href: '/dashboard/manager/leads', label: 'Active Leads', icon: Users },
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
          ? 'bg-white text-[#38bdf8] shadow-sm font-bold dark:bg-slate-800 dark:text-sky-300'
          : 'text-blue-50 hover:bg-white/10 font-medium dark:text-slate-200 dark:hover:bg-slate-900/80'
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
  const isDailyReportPage = pathname === '/dashboard/report';

  if (!userRole) {
    return <DashboardSkeleton />;
  }

  const isManager = userRole === 'manager';

  return (
    <div
      className={`dashboard-shell flex w-full ${
        isDailyReportPage ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      <aside
        className={`hidden w-64 shrink-0 bg-[#38bdf8] text-white shadow-xl dark:bg-slate-950 dark:text-slate-50 md:sticky md:top-0 md:flex md:h-screen md:flex-col ${
          isDailyReportPage ? 'h-screen' : ''
        }`}
      >
        <Link
          href={isManager ? '/dashboard/manager/overview' : '/dashboard'}
          className="shrink-0 p-4 transition-opacity hover:opacity-90"
        >
          <div className="relative inline-flex items-center justify-center px-3 py-2">
            <div className="absolute inset-x-3 top-1/2 h-[82px] -translate-y-1/2 rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200/60" />
            <Image
              src={logoFullFundalTransparent}
              alt="SalesWay"
              className="relative z-10 h-[130px] w-auto"
              priority
            />
          </div>
        </Link>

        <nav
          className={`flex-1 space-y-1 px-4 py-4 ${
            isDailyReportPage ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-blue-100 opacity-70 dark:text-slate-400">
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
                      ? 'bg-white/20 dark:bg-slate-800'
                      : 'hover:bg-white/10 dark:hover:bg-slate-900/80'
                  }`}
                >
                  Active Leads
                </Link>
                <Link
                  href="/dashboard/manager/lead-form"
                  className={`ml-2 block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname.startsWith('/dashboard/manager/lead-form')
                      ? 'bg-white/20 dark:bg-slate-800'
                      : 'hover:bg-white/10 dark:hover:bg-slate-900/80'
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
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-blue-100 opacity-70 dark:text-slate-400">
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

        <div className="shrink-0 bg-[#0ea5e9] p-4 dark:border-t dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10 border border-white/30 bg-white/20 dark:border-slate-700 dark:bg-slate-800">
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
              <p className="text-xs text-blue-100 dark:text-slate-400">{isManager ? 'Sales Manager' : 'Sales Agent'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`flex min-w-0 flex-1 flex-col ${
          isDailyReportPage ? 'h-screen overflow-hidden' : ''
        }`}
      >
        <DashboardHeader showNotifications={isManager} />
        <main
          className={`static min-w-0 flex-1 overflow-x-hidden p-4 md:p-6 ${
            isDailyReportPage ? 'h-[calc(100svh-4rem)] min-h-0 overflow-hidden p-0 md:p-0' : ''
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
