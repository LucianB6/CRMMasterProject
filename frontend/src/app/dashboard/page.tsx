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
  Bell,
  Clock,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { useToast } from '../../hooks/use-toast';
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
    buttonText: 'Completează raportul',
  },
  draft: {
    text: 'Draft',
    icon: Pencil,
    color: 'text-yellow-500',
    buttonText: 'Continuă raportul',
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

const notifications = [
  {
    id: 1,
    text: 'Managerul a aprobat raportul de Vineri.',
    time: 'Acum 15 minute',
  },
  {
    id: 2,
    text: 'Ai primit permisiunea de a edita raportul de Joi.',
    time: 'Acum 2 ore',
  },
  {
    id: 3,
    text: 'Raportul de Miercuri a fost marcat ca întârziat.',
    time: 'Ieri',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [reportStatus, setReportStatus] = useState<ReportStatus>('draft');
  const [report, setReport] = useState<NormalizedReport>(emptyReport);
  const [historyLast7Days, setHistoryLast7Days] = useState<ChartPoint[]>([]);
  const [historyCurrentMonth, setHistoryCurrentMonth] = useState<ChartPoint[]>([]);
  const [deadline] = useState(new Date(new Date().setHours(19, 0, 0, 0)));
  const [countdown, setCountdown] = useState('');

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081',
    []
  );

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

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
        const response = await fetch(`${apiBaseUrl}/reports/daily/today`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Status ${response.status}`);
        }

        const data = (await response.json()) as ApiReportResponse;
        const normalized = normalizeReport(data);
        setReport(normalized);
        setReportStatus(resolveStatus(data.status, data.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Eroare necunoscută';
        toast({
          title: 'Nu am putut încărca datele dashboard-ului',
          description: message,
          variant: 'destructive',
        });
      }
    };

    void fetchDashboardReport();
  }, [apiBaseUrl, getAuthToken, normalizeReport, resolveStatus, toast]);

  useEffect(() => {
    const fetchChartHistory = async () => {
      try {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const [recentResponse, monthResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/reports/daily/recent?days=7`, { headers }),
          fetch(`${apiBaseUrl}/reports/daily/current-month`, { headers }),
        ]);

        if (!recentResponse.ok) {
          const message = await recentResponse.text();
          throw new Error(message || `Status ${recentResponse.status}`);
        }

        if (!monthResponse.ok) {
          const message = await monthResponse.text();
          throw new Error(message || `Status ${monthResponse.status}`);
        }

        const recentData = (await recentResponse.json()) as ApiReportResponse[];
        const monthData = (await monthResponse.json()) as ApiReportResponse[];
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
          error instanceof Error ? error.message : 'Eroare necunoscută';
        toast({
          title: 'Nu am putut încărca graficele',
          description: message,
          variant: 'destructive',
        });
      }
    };

    void fetchChartHistory();
  }, [apiBaseUrl, buildHistorySeries, getAuthToken, toast]);

  const currentStatus = statusConfig[reportStatus];
  const Icon = currentStatus.icon;

  const quickStats = useMemo(
    () => [
      {
        title: 'Apeluri făcute',
        value: formatNumber(report.inputs.outbound_dials),
        icon: Phone,
      },
      {
        title: 'Conversii',
        value: formatNumber(report.inputs.pickups),
        icon: Target,
      },
      {
        title: 'Vânzări închise',
        value: formatNumber(
          report.inputs.sales_one_call_close + report.inputs.followup_sales
        ),
        icon: TrendingUp,
      },
      {
        title: 'Valoare vânzări',
        value: formatCurrency(report.inputs.contract_value),
        icon: DollarSign,
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_auto] sm:gap-6">
            <div className="space-y-1">
              <p className="font-headline text-xl">
                {new Date().toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', currentStatus.color)} />
                <span className={cn('font-semibold', currentStatus.color)}>
                  Status raport: {currentStatus.text}
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex items-center justify-start gap-2 text-muted-foreground sm:justify-end">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold">{countdown}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                până la publicare automată
              </p>
            </div>
            <Button
              size="lg"
              disabled={reportStatus === 'locked'}
              className="w-full shrink-0 sm:w-auto"
              onClick={() => router.push('/dashboard/report')}
            >
              {currentStatus.buttonText}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Quick Stats - Azi</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {reportStatus === 'draft' && (
                  <p className="text-xs text-yellow-500">date nefinalizate</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Raportul zilei</h3>
            <p className="text-sm text-muted-foreground">
              Stare:{' '}
              {reportStatus === 'draft'
                ? 'Draft salvat, netrimis.'
                : 'Niciun draft activ.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/report')}
            className="w-full shrink-0 sm:w-auto"
          >
            Editează raportul de azi
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Istoric personal</CardTitle>
              <CardDescription>Sumarul activității tale.</CardDescription>
            </div>
            <Button variant="link" className="pr-0">
              Vezi istoricul complet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="7">
            <TabsList className="mb-4">
              <TabsTrigger value="7">Ultimele 7 zile</TabsTrigger>
              <TabsTrigger value="month">Luna curentă</TabsTrigger>
            </TabsList>
            <TabsContent value="7">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historyLast7Days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend iconSize={10} />
                  <Bar
                    dataKey="calls"
                    name="Apeluri"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sales"
                    name="Vânzări"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="month">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historyCurrentMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend iconSize={10} />
                  <Bar
                    dataKey="calls"
                    name="Apeluri"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sales"
                    name="Vânzări"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificări personale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.time}
                    </p>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
