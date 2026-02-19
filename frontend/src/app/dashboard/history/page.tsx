'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
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
} from 'lucide-react';

const metricsConfig = {
  sales: {
    label: 'Sales',
    dataKey: 'sales',
    unitLabel: 'Units',
    icon: ShoppingCart,
    showValue: true,
    barName: 'Sales',
  },
  calls: {
    label: 'Calls Made',
    dataKey: 'calls',
    unitLabel: 'Calls',
    icon: Phone,
    showValue: false,
    barName: 'Calls',
  },
  followUpSales: {
    label: 'Follow-up Sales',
    dataKey: 'followUpSales',
    unitLabel: 'Units',
    icon: RefreshCw,
    showValue: false,
    barName: 'Follow-up Sales',
  },
  outboundBookings: {
    label: 'Bookings Outbound',
    dataKey: 'outboundBookings',
    unitLabel: 'Bookings',
    icon: CalendarPlus,
    showValue: false,
    barName: 'Bookings',
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
  const formatted = date.toLocaleString('en-US', { month: 'short' }).replace('.', '');
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
    let periodLabel = `${diffDays} days ago`;
    if (diffDays === 0) {
      periodLabel = 'Today';
    } else if (diffDays === 1) {
      periodLabel = 'Yesterday';
    } else {
      periodLabel = `${diffDays} days ago`;
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
      period: `Wk ${weekNumber}`,
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
        title: 'Unable to load history',
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total ({metric.unitLabel})
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalUnits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average / Period
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.averageUnits.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          {metric.showValue && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Value (RON)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totals.totalValue > 0
                    ? totals.totalValue.toLocaleString('en-US')
                    : '-'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{`Chart ${metric.label} - ${title}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Bar
                    dataKey={metric.dataKey}
                    name={metric.barName}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{`Table ${metric.label} - ${title}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{periodLabel}</TableHead>
                    <TableHead className="text-right">
                      {metric.label} ({metric.unitLabel})
                    </TableHead>
                    {metric.showValue && (
                      <TableHead className="text-right">Value (RON)</TableHead>
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
                          {(item.value || 0).toLocaleString('en-US')}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Sales & Activity History</h1>
        <p className="text-muted-foreground">
          Analyze your performance across different time periods.
        </p>
      </header>
      {isLoading ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading history...
        </div>
      ) : (
        <Tabs defaultValue="7days" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="7days">Last 7 days</TabsTrigger>
            <TabsTrigger value="currentMonth">Current month</TabsTrigger>
            <TabsTrigger value="currentYear">Current year</TabsTrigger>
            <TabsTrigger value="previousYear">Previous year</TabsTrigger>
          </TabsList>
          <TabsContent value="7days" className="mt-6">
            {renderPeriodContent(
              'Last 7 days',
              historyData.last7Days,
              'Day'
            )}
          </TabsContent>
          <TabsContent value="currentMonth" className="mt-6">
            {renderPeriodContent(
              'Current Month',
              historyData.currentMonth,
              'Week'
            )}
          </TabsContent>
          <TabsContent value="currentYear" className="mt-6">
            {renderPeriodContent('Current Year', historyData.currentYear, 'Month')}
          </TabsContent>
          <TabsContent value="previousYear" className="mt-6">
            {renderPeriodContent(
              'Previous Year',
              historyData.previousYear,
              'Month'
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
