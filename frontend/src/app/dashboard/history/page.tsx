'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { useToast } from '../../../hooks/use-toast';
import { apiFetch } from '../../../lib/api';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Phone,
  RefreshCw,
  CalendarPlus,
  User,
} from 'lucide-react';

const metricsConfig = {
  sales: {
    label: 'Vanzari',
    dataKey: 'sales',
    unitLabel: 'Unitati',
    icon: ShoppingCart,
    showValue: true,
    barName: 'Vanzari',
  },
  calls: {
    label: 'Apeluri efectuate',
    dataKey: 'calls',
    unitLabel: 'Apeluri',
    icon: Phone,
    showValue: false,
    barName: 'Apeluri',
  },
  followUpSales: {
    label: 'Vanzari follow-up',
    dataKey: 'followUpSales',
    unitLabel: 'Unitati',
    icon: RefreshCw,
    showValue: false,
    barName: 'Vanzari follow-up',
  },
  outboundBookings: {
    label: 'Programari outbound',
    dataKey: 'outboundBookings',
    unitLabel: 'Programari',
    icon: CalendarPlus,
    showValue: false,
    barName: 'Programari',
  },
} as const;

type MetricKey = keyof typeof metricsConfig;

type HistoryData = {
  period: string;
  sales: number;
  calls: number;
  followUpSales: number;
  outboundBookings: number;
  value?: number;
  [key: string]: any;
};

type ApiReportInputs = {
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

type ApiReportResponse = {
  id: string;
  reportDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  submittedAt?: string;
  inputs: ApiReportInputs;
};

type HistoryPayload = {
  last7Days: HistoryData[];
  currentMonth: HistoryData[];
  currentYear: HistoryData[];
  previousYear: HistoryData[];
};

const SUBMITTED_STATUSES = new Set<ApiReportResponse['status']>([
  'SUBMITTED',
  'AUTO_SUBMITTED',
]);

const defaultHistory: HistoryPayload = {
  last7Days: [],
  currentMonth: [],
  currentYear: [],
  previousYear: [],
};

const getUtcStartOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const formatIsoDate = (date: Date) => date.toISOString().split('T')[0];

const parseReportDate = (date: string) => new Date(`${date}T00:00:00Z`);

const formatMonthLabel = (date: Date) => {
  const formatted = date.toLocaleString('ro-RO', { month: 'short' }).replace('.', '');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getTotalsFromReport = (report: ApiReportResponse) => {
  const inputs = report.inputs;
  const totalSales =
    (inputs.sales_one_call_close ?? 0) +
    (inputs.followup_sales ?? 0) +
    (inputs.upsells ?? 0);
  return {
    sales: totalSales,
    calls: inputs.outbound_dials ?? 0,
    followUpSales: inputs.followup_sales ?? 0,
    outboundBookings: inputs.sales_call_booked_from_outbound ?? 0,
    value: inputs.contract_value ?? 0,
  };
};

const buildDailySeries = (
  reports: ApiReportResponse[],
  from: Date,
  to: Date,
  today: Date
): HistoryData[] => {
  const totalsByDate = new Map<string, ReturnType<typeof getTotalsFromReport>>();
  reports.forEach((report) => {
    if (!SUBMITTED_STATUSES.has(report.status)) {
      return;
    }
    totalsByDate.set(report.reportDate, getTotalsFromReport(report));
  });

  const data: HistoryData[] = [];
  let cursor = getUtcStartOfDay(from);
  const end = getUtcStartOfDay(to);
  const todayUtc = getUtcStartOfDay(today);

  while (cursor <= end) {
    const iso = formatIsoDate(cursor);
    const diffDays = Math.round(
      (todayUtc.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24)
    );
    let periodLabel = `Acum ${diffDays} zile`;
    if (diffDays === 0) {
      periodLabel = 'Astazi';
    } else if (diffDays === 1) {
      periodLabel = 'Ieri';
    } else {
      periodLabel = `Acum ${diffDays} zile`;
    }
    const totals = totalsByDate.get(iso);
    data.push({
      period: periodLabel,
      sales: totals?.sales ?? 0,
      calls: totals?.calls ?? 0,
      followUpSales: totals?.followUpSales ?? 0,
      outboundBookings: totals?.outboundBookings ?? 0,
      value: totals?.value ?? 0,
    });
    cursor = addUtcDays(cursor, 1);
  }

  return data;
};

const buildWeeklySeries = (
  reports: ApiReportResponse[],
  monthStart: Date,
  monthEnd: Date
): HistoryData[] => {
  const totalsByWeek = new Map<number, ReturnType<typeof getTotalsFromReport>>();
  reports.forEach((report) => {
    if (!SUBMITTED_STATUSES.has(report.status)) {
      return;
    }
    const reportDate = parseReportDate(report.reportDate);
    if (reportDate < monthStart || reportDate > monthEnd) {
      return;
    }
    const weekIndex = Math.floor((reportDate.getUTCDate() - 1) / 7) + 1;
    const current = totalsByWeek.get(weekIndex) ?? {
      sales: 0,
      calls: 0,
      followUpSales: 0,
      outboundBookings: 0,
      value: 0,
    };
    const totals = getTotalsFromReport(report);
    totalsByWeek.set(weekIndex, {
      sales: current.sales + totals.sales,
      calls: current.calls + totals.calls,
      followUpSales: current.followUpSales + totals.followUpSales,
      outboundBookings: current.outboundBookings + totals.outboundBookings,
      value: current.value + totals.value,
    });
  });

  const daysInMonth = monthEnd.getUTCDate();
  const totalWeeks = Math.ceil(daysInMonth / 7);
  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
      const totals = totalsByWeek.get(weekNumber);
      return {
      period: `Sapt. ${weekNumber}`,
      sales: totals?.sales ?? 0,
      calls: totals?.calls ?? 0,
      followUpSales: totals?.followUpSales ?? 0,
      outboundBookings: totals?.outboundBookings ?? 0,
      value: totals?.value ?? 0,
    };
  });
};

const buildMonthlySeries = (
  reports: ApiReportResponse[],
  year: number
): HistoryData[] => {
  const totalsByMonth = new Map<number, ReturnType<typeof getTotalsFromReport>>();
  reports.forEach((report) => {
    if (!SUBMITTED_STATUSES.has(report.status)) {
      return;
    }
    const reportDate = parseReportDate(report.reportDate);
    if (reportDate.getUTCFullYear() !== year) {
      return;
    }
    const monthIndex = reportDate.getUTCMonth();
    const current = totalsByMonth.get(monthIndex) ?? {
      sales: 0,
      calls: 0,
      followUpSales: 0,
      outboundBookings: 0,
      value: 0,
    };
    const totals = getTotalsFromReport(report);
    totalsByMonth.set(monthIndex, {
      sales: current.sales + totals.sales,
      calls: current.calls + totals.calls,
      followUpSales: current.followUpSales + totals.followUpSales,
      outboundBookings: current.outboundBookings + totals.outboundBookings,
      value: current.value + totals.value,
    });
  });

  return Array.from({ length: 12 }, (_, index) => {
    const label = formatMonthLabel(new Date(Date.UTC(year, index, 1)));
    const totals = totalsByMonth.get(index);
    return {
      period: label,
      sales: totals?.sales ?? 0,
      calls: totals?.calls ?? 0,
      followUpSales: totals?.followUpSales ?? 0,
      outboundBookings: totals?.outboundBookings ?? 0,
      value: totals?.value ?? 0,
    };
  });
};

const calculateTotals = (data: HistoryData[], metricKey: MetricKey) => {
  const dataKey = metricsConfig[metricKey].dataKey;
  const totalUnits = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
  const totalValue =
    metricKey === 'sales'
      ? data.reduce((sum, item) => sum + (item.value || 0), 0)
      : 0;
  const averageUnits = data.length > 0 ? totalUnits / data.length : 0;
  return { totalUnits, totalValue, averageUnits };
};

export default function HistoryPage() {
  const { toast } = useToast();
  const [historyData, setHistoryData] = useState<HistoryPayload>(defaultHistory);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const today = getUtcStartOfDay(new Date());
      const currentYearStart = new Date(
        Date.UTC(today.getUTCFullYear(), 0, 1)
      );
      const previousYearStart = new Date(
        Date.UTC(today.getUTCFullYear() - 1, 0, 1)
      );
      const previousYearEnd = new Date(
        Date.UTC(today.getUTCFullYear() - 1, 11, 31)
      );

      const [
        recentReports,
        monthReports,
        currentYearReports,
        previousYearReports,
      ] = await Promise.all([
        apiFetch<ApiReportResponse[]>('/reports/daily/recent?days=7', { headers }),
        apiFetch<ApiReportResponse[]>('/reports/daily/current-month', { headers }),
        apiFetch<ApiReportResponse[]>(
          `/reports/daily?from=${formatIsoDate(
            currentYearStart
          )}&to=${formatIsoDate(today)}`,
          { headers }
        ),
        apiFetch<ApiReportResponse[]>(
          `/reports/daily?from=${formatIsoDate(
            previousYearStart
          )}&to=${formatIsoDate(previousYearEnd)}`,
          { headers }
        ),
      ]);

      const last7Start = addUtcDays(today, -6);
      const monthStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
      );
      const monthEnd = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
      );

      setHistoryData({
        last7Days: buildDailySeries(recentReports, last7Start, today, today),
        currentMonth: buildWeeklySeries(monthReports, monthStart, monthEnd),
        currentYear: buildMonthlySeries(currentYearReports, today.getUTCFullYear()),
        previousYear: buildMonthlySeries(
          previousYearReports,
          today.getUTCFullYear() - 1
        ),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Nu am putut incarca istoricul',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, toast]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const renderMetricSection = (
    title: string,
    data: HistoryData[],
    metricKey: MetricKey,
    periodLabel: string
  ) => {
    const metric = metricsConfig[metricKey];
    const totals = calculateTotals(data, metricKey);
    const Icon = metric.icon;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HistoryMetricCard
            label={`Total (${metric.unitLabel})`}
            value={totals.totalUnits.toLocaleString('ro-RO')}
            icon={<Icon className="h-5 w-5" />}
            tone="blue"
          />
          <HistoryMetricCard
            label="Media / perioada"
            value={totals.averageUnits.toFixed(1)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="emerald"
          />
          {metric.showValue && (
            <HistoryMetricCard
              label="Valoare totala (RON)"
              value={
                totals.totalValue > 0
                  ? totals.totalValue.toLocaleString('ro-RO')
                  : '-'
              }
              icon={<DollarSign className="h-5 w-5" />}
              tone="indigo"
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">{`Grafic ${metric.label} - ${title}`}</h3>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis
                    dataKey="period"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <Bar
                    dataKey={metric.dataKey}
                    name={metric.barName}
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">{`Tabel ${metric.label} - ${title}`}</h3>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{periodLabel}</TableHead>
                    <TableHead className="text-right">
                      {metric.label} ({metric.unitLabel})
                    </TableHead>
                    {metric.showValue && (
                      <TableHead className="text-right">Valoare (RON)</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.period}>
                      <TableCell className="font-medium">{item.period}</TableCell>
                      <TableCell className="text-right">
                        {item[metric.dataKey]}
                      </TableCell>
                      {metric.showValue && (
                        <TableCell className="text-right">
                          {(item.value || 0).toLocaleString('ro-RO')}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPeriodContent = (
    periodTitle: string,
    data: HistoryData[],
    periodLabel: string
  ) => {
    return (
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          {(Object.keys(metricsConfig) as MetricKey[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {metricsConfig[key].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(metricsConfig) as MetricKey[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-6">
            {renderMetricSection(periodTitle, data, key, periodLabel)}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Istoric</h2>
          <p className="mt-1 font-medium text-slate-500">
            Analyzeaza-ti performanta istorica pe baza rapoartelor zilnice trimise.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:w-auto">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            <User className="h-3.5 w-3.5" />
            Activitatea mea
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">
          Se incarca istoricul...
        </p>
      ) : (
        <Tabs defaultValue="7days" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">
            <TabsTrigger value="7days">Ultimele 7 zile</TabsTrigger>
            <TabsTrigger value="currentMonth">Luna curenta</TabsTrigger>
            <TabsTrigger value="currentYear">Anul curent</TabsTrigger>
            <TabsTrigger value="previousYear">Anul precedent</TabsTrigger>
          </TabsList>
          <TabsContent value="7days" className="mt-6">
            {renderPeriodContent(
              'Ultimele 7 zile',
              historyData.last7Days,
              'Zi'
            )}
          </TabsContent>
          <TabsContent value="currentMonth" className="mt-6">
            {renderPeriodContent(
              'Luna curenta',
              historyData.currentMonth,
              'Saptamana'
            )}
          </TabsContent>
          <TabsContent value="currentYear" className="mt-6">
            {renderPeriodContent('Anul curent', historyData.currentYear, 'Luna')}
          </TabsContent>
          <TabsContent value="previousYear" className="mt-6">
            {renderPeriodContent(
              'Anul precedent',
              historyData.previousYear,
              'Luna'
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function HistoryMetricCard({
  label,
  value,
  subtitle,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'orange' | 'indigo';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/35">
      <div className="mb-3 flex items-start justify-between">
        <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 truncate text-xs font-medium text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
