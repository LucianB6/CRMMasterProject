'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DollarSign,
  Phone,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Pencil,
  Lock,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '../../hooks/use-toast';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/utils';

type ReportStatus = 'unfilled' | 'draft' | 'submitted' | 'locked';

type ApiReportStatus = 'DRAFT' | 'SUBMITTED' | 'AUTO_SUBMITTED';

type ApiReportResponse = {
  id: string;
  reportDate: string;
  status: ApiReportStatus;
  submittedAt: string | null;
  inputs: {
    outbound_dials: number | null;
    pickups: number | null;
    conversations_30s_plus: number | null;
    sales_call_booked_from_outbound: number | null;
    sales_call_on_calendar: number | null;
    no_show: number | null;
    reschedule_request: number | null;
    cancel: number | null;
    deposits: number | null;
    sales_one_call_close: number | null;
    followup_sales: number | null;
    upsell_conversation_taken: number | null;
    upsells: number | null;
    contract_value: number | null;
    new_cash_collected: number | null;
  };
};

type NormalizedReport = {
  id: string;
  reportDate: string;
  status: ApiReportStatus;
  submittedAt: string | null;
  inputs: {
    outbound_dials: number;
    pickups: number;
    conversations_30s_plus: number;
    sales_call_booked_from_outbound: number;
    sales_call_on_calendar: number;
    no_show: number;
    reschedule_request: number;
    cancel: number;
    deposits: number;
    sales_one_call_close: number;
    followup_sales: number;
    upsell_conversation_taken: number;
    upsells: number;
    contract_value: number;
    new_cash_collected: number;
  };
};

const emptyReport: NormalizedReport = {
  id: '',
  reportDate: '',
  status: 'DRAFT',
  submittedAt: null,
  inputs: {
    outbound_dials: 0,
    pickups: 0,
    conversations_30s_plus: 0,
    sales_call_booked_from_outbound: 0,
    sales_call_on_calendar: 0,
    no_show: 0,
    reschedule_request: 0,
    cancel: 0,
    deposits: 0,
    sales_one_call_close: 0,
    followup_sales: 0,
    upsell_conversation_taken: 0,
    upsells: 0,
    contract_value: 0,
    new_cash_collected: 0,
  },
};

const statusConfig = {
  unfilled: {
    text: 'Necompletat',
    icon: XCircle,
    color: 'text-destructive',
    buttonText: 'Completeaza raportul',
  },
  draft: {
    text: 'Draft',
    icon: Pencil,
    color: 'text-yellow-500',
    buttonText: 'Continua raportul',
  },
  submitted: {
    text: 'Trimis',
    icon: CheckCircle2,
    color: 'text-green-500',
    buttonText: 'Vezi raportul trimis',
  },
  locked: {
    text: 'Blocat',
    icon: Lock,
    color: 'text-muted-foreground',
    buttonText: 'Vezi raportul',
  },
};

type ChartPoint = {
  day: string;
  calls: number;
  sales: number;
};

const toUtcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getUtcStartOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isRoleChecked, setIsRoleChecked] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [isChartsLoading, setIsChartsLoading] = useState(true);
  const [reportStatus, setReportStatus] = useState<ReportStatus>('draft');
  const [report, setReport] = useState<NormalizedReport>(emptyReport);
  const [historyLast7Days, setHistoryLast7Days] = useState<ChartPoint[]>([]);
  const [historyCurrentMonth, setHistoryCurrentMonth] = useState<ChartPoint[]>([]);
  const [deadline] = useState(new Date(new Date().setHours(23, 59, 59, 0)));
  const [countdown, setCountdown] = useState('');

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const resolveStatus = useCallback(
    (apiStatus: ApiReportStatus, reportId: string): ReportStatus => {
      if (!reportId) {
        return 'unfilled';
      }
      if (apiStatus === 'SUBMITTED' || apiStatus === 'AUTO_SUBMITTED') {
        return 'submitted';
      }
      return 'draft';
    },
    []
  );

  const normalizeReport = useCallback((data: ApiReportResponse): NormalizedReport => {
    const valueOrZero = (value: number | null) => value ?? 0;
    return {
      ...data,
      inputs: {
        outbound_dials: valueOrZero(data.inputs.outbound_dials),
        pickups: valueOrZero(data.inputs.pickups),
        conversations_30s_plus: valueOrZero(data.inputs.conversations_30s_plus),
        sales_call_booked_from_outbound: valueOrZero(
          data.inputs.sales_call_booked_from_outbound
        ),
        sales_call_on_calendar: valueOrZero(data.inputs.sales_call_on_calendar),
        no_show: valueOrZero(data.inputs.no_show),
        reschedule_request: valueOrZero(data.inputs.reschedule_request),
        cancel: valueOrZero(data.inputs.cancel),
        deposits: valueOrZero(data.inputs.deposits),
        sales_one_call_close: valueOrZero(data.inputs.sales_one_call_close),
        followup_sales: valueOrZero(data.inputs.followup_sales),
        upsell_conversation_taken: valueOrZero(
          data.inputs.upsell_conversation_taken
        ),
        upsells: valueOrZero(data.inputs.upsells),
        contract_value: valueOrZero(data.inputs.contract_value),
        new_cash_collected: valueOrZero(data.inputs.new_cash_collected),
      },
    };
  }, []);

  const formatNumber = useCallback((value: number) => {
    return new Intl.NumberFormat('ro-RO').format(value);
  }, []);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  useEffect(() => {
    const role = window.localStorage.getItem('userRole');
    if (role === 'manager') {
      router.replace('/dashboard/manager/overview');
      return;
    }
    setIsRoleChecked(true);
  }, [router]);

  const buildHistorySeries = useCallback(
    (
      reports: ApiReportResponse[],
      start: Date,
      end: Date,
      labelFormatter: (date: Date) => string
    ) => {
      const map = new Map<string, NormalizedReport>();
      reports.forEach((item) => {
        const normalized = normalizeReport(item);
        map.set(normalized.reportDate, normalized);
      });

      const points: ChartPoint[] = [];
      for (
        let current = new Date(start);
        current <= end;
        current = addUtcDays(current, 1)
      ) {
        const key = toUtcDateKey(current);
        const inputs = map.get(key)?.inputs ?? emptyReport.inputs;
        points.push({
          day: labelFormatter(current),
          calls: inputs.outbound_dials,
          sales: inputs.sales_one_call_close + inputs.followup_sales,
        });
      }

      return points;
    },
    [normalizeReport]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Deadline atins');
        setReportStatus('locked');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    const fetchDashboardReport = async () => {
      try {
        const token = getAuthToken();
        const data = await apiFetch<ApiReportResponse>('/reports/daily/today', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const normalized = normalizeReport(data);
        setReport(normalized);
        setReportStatus(resolveStatus(data.status, data.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Unable to load dashboard data',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsReportLoading(false);
      }
    };

    void fetchDashboardReport();
  }, [getAuthToken, normalizeReport, resolveStatus, toast]);

  useEffect(() => {
    const fetchChartHistory = async () => {
      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const [recentData, monthData] = await Promise.all([
          apiFetch<ApiReportResponse[]>('/reports/daily/recent?days=7', { headers }),
          apiFetch<ApiReportResponse[]>('/reports/daily/current-month', { headers }),
        ]);
        const todayUtc = getUtcStartOfDay(new Date());
        const recentStart = addUtcDays(todayUtc, -6);
        const monthStart = new Date(
          Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1)
        );

        setHistoryLast7Days(
          buildHistorySeries(recentData, recentStart, todayUtc, (date) =>
            date.toLocaleDateString('ro-RO', { weekday: 'short' })
          )
        );
        setHistoryCurrentMonth(
          buildHistorySeries(monthData, monthStart, todayUtc, (date) =>
            date.toLocaleDateString('ro-RO', { day: 'numeric' })
          )
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Nu am putut incarca graficele',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsChartsLoading(false);
      }
    };

    void fetchChartHistory();
  }, [buildHistorySeries, getAuthToken, toast]);

  const currentStatus = statusConfig[reportStatus];
  const Icon = currentStatus.icon;

  const quickStats = useMemo(
    () => [
      {
        title: 'Apeluri efectuate',
        value: formatNumber(report.inputs.outbound_dials),
        icon: Phone,
        tone: 'blue' as const,
      },
      {
        title: 'Conectari',
        value: formatNumber(report.inputs.pickups),
        icon: Target,
        tone: 'emerald' as const,
      },
      {
        title: 'Vanzari inchise',
        value: formatNumber(
          report.inputs.sales_one_call_close + report.inputs.followup_sales
        ),
        icon: TrendingUp,
        tone: 'orange' as const,
      },
      {
        title: 'Valoare contracte',
        value: formatCurrency(report.inputs.contract_value),
        icon: DollarSign,
        tone: 'indigo' as const,
      },
    ],
    [
      formatCurrency,
      formatNumber,
      report.inputs.contract_value,
      report.inputs.followup_sales,
      report.inputs.outbound_dials,
      report.inputs.pickups,
      report.inputs.sales_one_call_close,
    ]
  );

  const isLoading = !isRoleChecked || isReportLoading || isChartsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-800">
                Overview
              </h2>
              <p className="mt-1 font-medium text-slate-500">
                Urmareste-ti activitatea zilnica si evolutia din perioada curenta.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {new Date().toLocaleDateString('ro-RO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:w-auto lg:min-w-[360px]">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', currentStatus.color)} />
            <span className={cn('text-sm font-bold', currentStatus.color)}>
              Status raport: {currentStatus.text}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Trimitere automata in {countdown}</span>
              </div>
            </div>
            <Button
              size="lg"
              disabled={reportStatus === 'locked'}
              className="shrink-0 bg-[#38bdf8] text-white hover:bg-sky-500"
              onClick={() => router.push('/dashboard/report')}
            >
              {currentStatus.buttonText}
            </Button>
          </div>
        </div>
      </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <OverviewStatCard
            key={stat.title}
            label={stat.title}
            value={stat.value}
            icon={<stat.icon className="h-5 w-5" />}
            tone={stat.tone}
            hint={
              reportStatus === 'draft' ? 'Datele pot fi inca incomplete.' : null
            }
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="w-full overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
          <div className="p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Istoric personal</h3>
                <p className="text-sm font-medium text-slate-400">
                  Activitatea ta din ultimele zile si din luna curenta.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-200 font-semibold text-slate-700 sm:w-auto"
                onClick={() => router.push('/dashboard/history')}
              >
                Vezi istoricul complet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <Tabs defaultValue="7">
              <TabsList className="mb-6 h-auto rounded-xl bg-slate-100 p-1">
                <TabsTrigger
                  value="7"
                  className="rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]"
                >
                  ULTIMELE 7 ZILE
                </TabsTrigger>
                <TabsTrigger
                  value="month"
                  className="rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]"
                >
                  LUNA CURENTA
                </TabsTrigger>
              </TabsList>
              <TabsContent value="7">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={historyLast7Days}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <Legend iconSize={10} />
                    <Bar
                      dataKey="calls"
                      name="Apeluri"
                      fill="#38bdf8"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="sales"
                      name="Vanzari"
                      fill="#14b8a6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="month">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={historyCurrentMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <Legend iconSize={10} />
                    <Bar
                      dataKey="calls"
                      name="Apeluri"
                      fill="#38bdf8"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="sales"
                      name="Vanzari"
                      fill="#14b8a6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="space-y-6">
          <DashboardInfoCard
            title="Raportul de azi"
            description={
              reportStatus === 'draft'
                ? 'Ai un draft salvat. Il poti completa sau trimite mai tarziu.'
                : 'Deschide raportul zilnic si completeaza activitatea curenta.'
            }
            icon={<FileTextBlockIcon />}
            actionLabel="Editeaza raportul"
            onAction={() => router.push('/dashboard/report')}
          />
          <DashboardInfoCard
            title="Perioada activa"
            description="Lucrezi pe intervalul curent si iti vezi rezultatele actualizate in dashboard."
            icon={<Calendar className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'orange' | 'indigo';
  hint?: string | null;
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all hover:scale-[1.01]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border p-3 ${colorMap[tone]}`}>{icon}</div>
      </div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs font-medium text-amber-500">{hint}</p> : null}
    </div>
  );
}

function DashboardInfoCard({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <Button
          variant="outline"
          className="mt-5 w-full border-slate-200 font-semibold text-slate-700"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function FileTextBlockIcon() {
  return <Clock className="h-5 w-5" />;
}
