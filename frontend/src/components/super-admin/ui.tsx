'use client';

import { Building2, LogOut, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const navItems = [
  {
    href: '/super-admin',
    label: 'Overview',
    icon: Shield,
  },
  {
    href: '/super-admin/companies',
    label: 'Companies',
    icon: Building2,
  },
  {
    href: '/super-admin/users',
    label: 'Users',
    icon: Users,
  },
];

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || '—';
}

export function ActivityBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('Operator');

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const email = window.localStorage.getItem('userEmail');
    if (email) {
      setDisplayName(email);
    }

    setIsReady(true);
  }, [router]);

  const handleSignOut = () => {
    window.localStorage.removeItem('salesway_token');
    window.localStorage.removeItem('userRole');
    window.localStorage.removeItem('userEmail');
    router.replace('/login');
  };

  if (!isReady) {
    return <div className="min-h-screen bg-[#eef2f7]" />;
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-[#0f172a] text-slate-100 xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col px-5 py-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-300">
                selfCRM
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Super Admin
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Backoffice separat pentru operare la nivel de platforma.
              </p>
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/super-admin'
                    ? pathname === '/super-admin'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sky-400/15 text-sky-200'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Session
              </p>
              <p className="mt-2 truncate text-sm font-medium text-white">{displayName}</p>
              <p className="mt-1 text-xs text-slate-400">
                Gating-ul final pentru `SUPER_ADMIN` poate fi legat cand contractul auth expune rolul global.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-slate-200 bg-white/80 px-6 py-5 backdrop-blur xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Platform backoffice
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Operare globala pentru companii, utilizatori si statistici de platforma.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="border-slate-200 bg-slate-100 text-slate-700" variant="outline">
                  SUPER_ADMIN MVP
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  onClick={handleSignOut}
                >
                  <LogOut size={14} />
                  Logout
                </Button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 xl:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
