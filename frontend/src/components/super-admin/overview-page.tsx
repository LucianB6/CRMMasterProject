'use client';

import { Activity, Building2, MousePointerClick, TrendingUp, UserCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  fetchSuperAdminOverview,
  getSuperAdminAnalyticsCompanies,
  getSuperAdminAnalyticsOverview,
  getSuperAdminTopPages,
  type SuperAdminAnalyticsOverviewResponse,
  type SuperAdminCompanyActivityResponse,
  type SuperAdminOverviewResponse,
  type SuperAdminTopPageResponse,
} from '../../lib/super-admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { formatDateTime, getAuthToken } from './ui';

const stats: Array<{
  key: keyof SuperAdminOverviewResponse;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  {
    key: 'totalCompanies',
    label: 'Total companies',
    helper: 'Companii existente in platforma',
    icon: Building2,
  },
  {
    key: 'activeCompanies',
    label: 'Active companies',
    helper: 'Companii active operational',
    icon: Activity,
  },
  {
    key: 'totalUsers',
    label: 'Total users',
    helper: 'Utilizatori inregistrati',
    icon: Users,
  },
  {
    key: 'activeUsers',
    label: 'Active users',
    helper: 'Utilizatori activi',
    icon: UserCheck,
  },
  {
    key: 'totalLeads',
    label: 'Total leads',
    helper: 'Lead-uri aggregate la nivel de platforma',
    icon: TrendingUp,
  },
];

export function SuperAdminOverviewPage() {
  const [overview, setOverview] = React.useState<SuperAdminOverviewResponse | null>(null);
  const [analyticsOverview, setAnalyticsOverview] =
    React.useState<SuperAdminAnalyticsOverviewResponse | null>(null);
  const [analyticsCompanies, setAnalyticsCompanies] = React.useState<
    SuperAdminCompanyActivityResponse[]
  >([]);
  const [topPages, setTopPages] = React.useState<SuperAdminTopPageResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadOverview = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const token = getAuthToken();
        const [overviewData, analyticsOverviewData, analyticsCompaniesData, topPagesData] =
          await Promise.all([
            fetchSuperAdminOverview(token),
            getSuperAdminAnalyticsOverview(token),
            getSuperAdminAnalyticsCompanies(token),
            getSuperAdminTopPages(token),
          ]);
        setOverview(overviewData);
        setAnalyticsOverview(analyticsOverviewData);
        setAnalyticsCompanies(analyticsCompaniesData);
        setTopPages(topPagesData);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load platform overview.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[420px] rounded-3xl xl:col-span-1" />
          <Skeleton className="h-[420px] rounded-3xl xl:col-span-2" />
        </div>
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
    );
  }

  if (errorMessage || !overview || !analyticsOverview) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load platform overview</AlertTitle>
        <AlertDescription>{errorMessage ?? 'No overview data returned.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
          Platform overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Dimensiunea curenta a platformei
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Indicatori agregati pentru companii, utilizatori si volum total de lead-uri.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <section
              key={item.key}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                    {overview[item.key]}
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                  <Icon size={20} />
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">{item.helper}</p>
            </section>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Analytics
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Utilizare platforma
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Activitate agregata pe ultimele 7 si 30 de zile, plus top companii si pagini.
            </p>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
            Page views
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnalyticsCard
            label="Active companies · 7d"
            value={analyticsOverview.activeCompaniesLast7Days}
            helper="Companii cu activitate recenta"
            icon={Building2}
          />
          <AnalyticsCard
            label="Active users · 7d"
            value={analyticsOverview.activeUsersLast7Days}
            helper="Utilizatori activi in ultimele 7 zile"
            icon={Users}
          />
          <AnalyticsCard
            label="Page views · 7d"
            value={analyticsOverview.pageViewsLast7Days}
            helper="Vizualizari de pagina in ultima saptamana"
            icon={MousePointerClick}
          />
          <AnalyticsCard
            label="Active companies · 30d"
            value={analyticsOverview.activeCompaniesLast30Days}
            helper="Companii active in ultimele 30 de zile"
            icon={Building2}
          />
          <AnalyticsCard
            label="Active users · 30d"
            value={analyticsOverview.activeUsersLast30Days}
            helper="Utilizatori activi in ultimele 30 de zile"
            icon={Users}
          />
          <AnalyticsCard
            label="Page views · 30d"
            value={analyticsOverview.pageViewsLast30Days}
            helper="Vizualizari de pagina in ultimele 30 de zile"
            icon={MousePointerClick}
          />
        </div>

        {analyticsOverview.pageViewsLast30Days === 0 &&
        analyticsCompanies.length === 0 &&
        topPages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">No activity data yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Tracking data will appear after users navigate through the platform.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <AnalyticsCompaniesSection companies={analyticsCompanies} />
            <TopPagesSection topPages={topPages} />
          </div>
        )}
      </section>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{helper}</p>
    </section>
  );
}

function AnalyticsCompaniesSection({
  companies,
}: {
  companies: SuperAdminCompanyActivityResponse[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.3)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Most active companies</p>
        <p className="mt-1 text-xs text-slate-500">Ordinea vine direct din backend.</p>
      </div>

      {companies.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No activity data yet for companies.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Views · 7d</TableHead>
              <TableHead>Active users · 7d</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.companyId}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-slate-900">{company.companyName}</p>
                    <p className="text-xs text-slate-500">{company.companyId}</p>
                  </div>
                </TableCell>
                <TableCell>{company.pageViewsLast7Days}</TableCell>
                <TableCell>{company.activeUsersLast7Days}</TableCell>
                <TableCell>{formatDateTime(company.lastActivityAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function TopPagesSection({
  topPages,
}: {
  topPages: SuperAdminTopPageResponse[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.3)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Most visited pages</p>
        <p className="mt-1 text-xs text-slate-500">Top rute folosite in ultimele 7 zile.</p>
      </div>

      {topPages.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No activity data yet for pages.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Route name</TableHead>
              <TableHead>Views · 7d</TableHead>
              <TableHead>Companies · 7d</TableHead>
              <TableHead>Users · 7d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPages.map((page) => (
              <TableRow key={`${page.path}-${page.routeName ?? 'page'}`}>
                <TableCell className="font-mono text-xs text-slate-700">{page.path}</TableCell>
                <TableCell>{page.routeName ?? '—'}</TableCell>
                <TableCell>{page.viewsLast7Days}</TableCell>
                <TableCell>{page.uniqueCompaniesLast7Days}</TableCell>
                <TableCell>{page.uniqueUsersLast7Days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
