'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  addDays,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { useToast } from '../../../../hooks/use-toast';
import { apiFetch } from '../../../../lib/api';
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
    label: 'Sales Follow-up',
    dataKey: 'followUpSales',
    unitLabel: 'Units',
    icon: RefreshCw,
    showValue: false,
    barName: 'Sales Follow-up',
  },
  outboundBookings: {
    label: 'Outbound Bookings',
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

type ManagerAgent = {
  membership_id: string;
  email: string;
};

type ManagerReportResponse = {
  report_date: string;
  agent_membership_id?: string | null;
  agent_email?: string | null;
  inputs: {
    outbound_dials: number | null;
    sales_call_booked_from_outbound: number | null;
    sales_one_call_close: number | null;
    followup_sales: number | null;
    upsells: number | null;
    contract_value: number | null;
  };
};

type HistoryState = {
  last7Days: HistoryData[];
  currentMonth: HistoryData[];
  currentYear: HistoryData[];
  previousYear: HistoryData[];
};

const calculateTotals = (data: HistoryData[], metricKey: MetricKey) => {
  const dataKey = metricsConfig[metricKey].dataKey;
  const totalUnits = data.reduce(
    (sum, item) => sum + (item[dataKey as keyof typeof item] || 0),
    0
  );
  const totalValue =
    metricKey === 'sales'
      ? data.reduce((sum, item) => sum + (item.value || 0), 0)
      : 0;
  const averageUnits = data.length > 0 ? totalUnits / data.length : 0;
  return { totalUnits, totalValue, averageUnits };
};

export default function ManagerHistoryPage() {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [periodKey, setPeriodKey] = useState<
    'last7Days' | 'currentMonth' | 'currentYear' | 'previousYear'
  >('last7Days');
  const [agents, setAgents] = useState<ManagerAgent[]>([]);
  const [historyData, setHistoryData] = useState<HistoryState>({
    last7Days: [],
    currentMonth: [],
    currentYear: [],
    previousYear: [],
  });
  const [reportsByPeriod, setReportsByPeriod] = useState<
    Record<keyof HistoryState, ManagerReportResponse[]>
  >({
    last7Days: [],
    currentMonth: [],
    currentYear: [],
    previousYear: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const buildRange = useCallback((preset: keyof HistoryState) => {
    const today = new Date();
    if (preset === 'last7Days') {
      const to = today;
      const from = subDays(today, 6);
      return { from, to };
    }
    if (preset === 'currentMonth') {
      return { from: startOfMonth(today), to: today };
    }
    if (preset === 'currentYear') {
      return { from: startOfYear(today), to: today };
    }
    const from = startOfYear(addDays(startOfYear(today), -365));
    const to = endOfYear(addDays(startOfYear(today), -365));
    return { from, to };
  }, []);

  const formatRangeQuery = useCallback((from: Date, to: Date) => {
    return {
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    };
  }, []);

  const mapReportToMetrics = useCallback((report: ManagerReportResponse) => {
    const inputs = report.inputs;
    const sales =
      (inputs.sales_one_call_close ?? 0) +
      (inputs.followup_sales ?? 0) +
      (inputs.upsells ?? 0);
    return {
      calls: inputs.outbound_dials ?? 0,
      outboundBookings: inputs.sales_call_booked_from_outbound ?? 0,
      followUpSales: inputs.followup_sales ?? 0,
      sales,
      value: inputs.contract_value ?? 0,
    };
  }, []);

  const buildTopStats = useCallback(
    (reports: ManagerReportResponse[]) => {
      const totalsByAgent = new Map<
        string,
        {
          email: string;
          calls: number;
          sales: number;
          followUpSales: number;
          outboundBookings: number;
        }
      >();

      reports.forEach((report) => {
        const agentId = report.agent_membership_id ?? 'unknown';
        const email = report.agent_email ?? 'Unknown agent';
        const metrics = mapReportToMetrics(report);
        const current = totalsByAgent.get(agentId) ?? {
          email,
          calls: 0,
          sales: 0,
          followUpSales: 0,
          outboundBookings: 0,
        };
        totalsByAgent.set(agentId, {
          email,
          calls: current.calls + metrics.calls,
          sales: current.sales + metrics.sales,
          followUpSales: current.followUpSales + metrics.followUpSales,
          outboundBookings: current.outboundBookings + metrics.outboundBookings,
        });
      });

      const totals = Array.from(totalsByAgent.values());
      const pickTop = (
        key: 'calls' | 'sales' | 'followUpSales' | 'outboundBookings'
      ) => {
        return totals.reduce(
          (best, current) => (current[key] > best[key] ? current : best),
          { email: '-', calls: 0, sales: 0, followUpSales: 0, outboundBookings: 0 }
        );
      };

      return {
        sales: pickTop('sales'),
        calls: pickTop('calls'),
        followUpSales: pickTop('followUpSales'),
        outboundBookings: pickTop('outboundBookings'),
      };
    },
    [mapReportToMetrics]
  );

  const aggregateByDay = useCallback(
    (reports: ManagerReportResponse[], from: Date, to: Date) => {
      const days = eachDayOfInterval({ start: from, end: to });
      const reportMap = new Map<string, ManagerReportResponse>();
      reports.forEach((report) => {
        reportMap.set(report.report_date, report);
      });

      return days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const report = reportMap.get(key);
        const metrics = report ? mapReportToMetrics(report) : null;
        return {
          period: format(day, 'EEE dd MMM', { locale: enUS }),
          calls: metrics?.calls ?? 0,
          outboundBookings: metrics?.outboundBookings ?? 0,
          followUpSales: metrics?.followUpSales ?? 0,
          sales: metrics?.sales ?? 0,
          value: metrics?.value ?? 0,
        };
      });
    },
    [mapReportToMetrics]
  );

  const aggregateByWeek = useCallback(
    (reports: ManagerReportResponse[], from: Date, to: Date) => {
      const firstWeekStart = startOfWeek(from, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(to, { weekStartsOn: 1 });
      const weekCount =
        differenceInCalendarWeeks(lastWeekStart, firstWeekStart, {
          weekStartsOn: 1,
        }) + 1;

      const buckets = Array.from({ length: weekCount }, (_, index) => ({
        period: `Wk. ${index + 1}`,
        calls: 0,
        outboundBookings: 0,
        followUpSales: 0,
        sales: 0,
        value: 0,
      }));

      reports.forEach((report) => {
        const date = new Date(report.report_date);
        const weekIndex = differenceInCalendarWeeks(date, firstWeekStart, {
          weekStartsOn: 1,
        });
        const metrics = mapReportToMetrics(report);
        const bucket = buckets[weekIndex];
        if (!bucket) {
          return;
        }
        bucket.calls += metrics.calls;
        bucket.outboundBookings += metrics.outboundBookings;
        bucket.followUpSales += metrics.followUpSales;
        bucket.sales += metrics.sales;
        bucket.value += metrics.value ?? 0;
      });

      return buckets;
    },
    [mapReportToMetrics]
  );

  const aggregateByMonth = useCallback(
    (reports: ManagerReportResponse[], from: Date, to: Date) => {
      const months = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(Date.UTC(from.getUTCFullYear(), index, 1));
        return {
          period: format(date, 'MMM', { locale: enUS }),
          calls: 0,
          outboundBookings: 0,
          followUpSales: 0,
          sales: 0,
          value: 0,
        };
      });

      reports.forEach((report) => {
        const date = new Date(report.report_date);
        if (date < from || date > to) {
          return;
        }
        const monthIndex = date.getUTCMonth();
        const metrics = mapReportToMetrics(report);
        const bucket = months[monthIndex];
        bucket.calls += metrics.calls;
        bucket.outboundBookings += metrics.outboundBookings;
        bucket.followUpSales += metrics.followUpSales;
        bucket.sales += metrics.sales;
        bucket.value += metrics.value ?? 0;
      });

      return months;
    },
    [mapReportToMetrics]
  );

  const fetchAgents = useCallback(async () => {
    try {
      const token = getAuthToken();
      const data = await apiFetch<ManagerAgent[]>('/manager/overview/agents', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setAgents(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [getAuthToken, toast]);

  const fetchReports = useCallback(
    async (from: Date, to: Date, agentId: string | null) => {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const range = formatRangeQuery(from, to);
      const query = new URLSearchParams(range);
      if (agentId) {
        query.set('agent_membership_id', agentId);
      }
      const data = await apiFetch<ManagerReportResponse[]>(
        `/manager/reports?${query.toString()}`,
        {
          headers,
        }
      );
      return data;
    },
    [formatRangeQuery, getAuthToken]
  );

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const agentId = selectedAgentId === 'all' ? null : selectedAgentId;

        const ranges = {
          last7Days: buildRange('last7Days'),
          currentMonth: buildRange('currentMonth'),
          currentYear: buildRange('currentYear'),
          previousYear: buildRange('previousYear'),
        };

        const [last7Reports, monthReports, yearReports, previousYearReports] =
          await Promise.all([
            fetchReports(ranges.last7Days.from, ranges.last7Days.to, agentId),
            fetchReports(
              ranges.currentMonth.from,
              ranges.currentMonth.to,
              agentId
            ),
            fetchReports(ranges.currentYear.from, ranges.currentYear.to, agentId),
            fetchReports(
              ranges.previousYear.from,
              ranges.previousYear.to,
              agentId
            ),
          ]);

        setHistoryData({
          last7Days: aggregateByDay(
            last7Reports,
            ranges.last7Days.from,
            ranges.last7Days.to
          ),
          currentMonth: aggregateByWeek(
            monthReports,
            ranges.currentMonth.from,
            ranges.currentMonth.to
          ),
          currentYear: aggregateByMonth(
            yearReports,
            ranges.currentYear.from,
            ranges.currentYear.to
          ),
          previousYear: aggregateByMonth(
            previousYearReports,
            ranges.previousYear.from,
            ranges.previousYear.to
          ),
        });
        setReportsByPeriod({
          last7Days: last7Reports,
          currentMonth: monthReports,
          currentYear: yearReports,
          previousYear: previousYearReports,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadHistory();
  }, [
    aggregateByDay,
    aggregateByMonth,
    aggregateByWeek,
    buildRange,
    fetchReports,
    selectedAgentId,
    toast,
  ]);

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
            value={totals.totalUnits.toLocaleString('en-US')}
            icon={<Icon className="h-5 w-5" />}
            tone="blue"
          />
          <HistoryMetricCard
            label="Average / Period"
            value={totals.averageUnits.toFixed(1)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="emerald"
          />
          {metric.showValue && (
            <HistoryMetricCard
              label="Total Value (RON)"
              value={totals.totalValue > 0 ? totals.totalValue.toLocaleString('en-US') : '-'}
              icon={<DollarSign className="h-5 w-5" />}
              tone="indigo"
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">{`Chart ${metric.label} - ${title}`}</h3>
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
              <h3 className="text-lg font-bold text-slate-800">{`Table ${metric.label} - ${title}`}</h3>
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

  const currentData = historyData;
  const selectedAgentLabel =
    selectedAgentId === 'all'
      ? 'All agents'
      : agents.find((agent) => agent.membership_id === selectedAgentId)?.email ?? 'Selected agent';

  const periodLabelMap: Record<typeof periodKey, string> = {
    last7Days: 'Last 7 days',
    currentMonth: 'Current month',
    currentYear: 'Current year',
    previousYear: 'Previous year',
  };

  const topStats = useMemo(() => {
    if (selectedAgentId !== 'all') {
      return null;
    }
    return buildTopStats(reportsByPeriod[periodKey]);
  }, [buildTopStats, periodKey, reportsByPeriod, selectedAgentId]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Team History</h2>
          <p className="mt-1 font-medium text-slate-500">
            Analyze historical team performance using real values from daily reports.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:w-auto">
          <div className="min-w-0 flex-1 md:min-w-[260px]">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="h-10 border-none bg-slate-50 px-3 font-bold text-slate-700 shadow-none">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.membership_id} value={agent.membership_id}>
                    {agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
            <User className="h-3.5 w-3.5" />
            {selectedAgentLabel}
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">
          Loading history...
        </p>
      )}

      {selectedAgentId !== 'all' ? (
        <p className="text-sm text-muted-foreground">
          Select &quot;All Agents&quot; for team rankings.
        </p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800">
            Team performance leaders
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <HistoryLeaderCard title="Top Sales" value={topStats?.sales.sales ?? 0} subtitle={topStats?.sales.email ?? '-'} icon={<ShoppingCart className="h-5 w-5" />} tone="indigo" />
            <HistoryLeaderCard title="Top Calls" value={topStats?.calls.calls ?? 0} subtitle={topStats?.calls.email ?? '-'} icon={<Phone className="h-5 w-5" />} tone="blue" />
            <HistoryLeaderCard title="Top Sales Follow-up" value={topStats?.followUpSales.followUpSales ?? 0} subtitle={topStats?.followUpSales.email ?? '-'} icon={<RefreshCw className="h-5 w-5" />} tone="emerald" />
            <HistoryLeaderCard title="Top Outbound Bookings" value={topStats?.outboundBookings.outboundBookings ?? 0} subtitle={topStats?.outboundBookings.email ?? '-'} icon={<CalendarPlus className="h-5 w-5" />} tone="orange" />
          </div>
        </div>
      )}

      <Tabs
        defaultValue="last7Days"
        className="w-full"
        value={periodKey}
        onValueChange={(value) =>
          setPeriodKey(
            value as 'last7Days' | 'currentMonth' | 'currentYear' | 'previousYear'
          )
        }
      >
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">
          <TabsTrigger value="last7Days">Last 7 days</TabsTrigger>
          <TabsTrigger value="currentMonth">Current month</TabsTrigger>
          <TabsTrigger value="currentYear">Current year</TabsTrigger>
          <TabsTrigger value="previousYear">Previous year</TabsTrigger>
        </TabsList>
        <p className="mt-3 text-sm font-medium text-slate-500">{periodLabelMap[periodKey]}</p>
        <TabsContent value="last7Days" className="mt-6">
          {renderPeriodContent(
            'Last 7 days',
            currentData.last7Days,
            'Day'
          )}
        </TabsContent>
        <TabsContent value="currentMonth" className="mt-6">
          {renderPeriodContent(
            'Current Month',
            currentData.currentMonth,
            'Week'
          )}
        </TabsContent>
        <TabsContent value="currentYear" className="mt-6">
          {renderPeriodContent(
            'Current Year',
            currentData.currentYear,
            'Month'
          )}
        </TabsContent>
        <TabsContent value="previousYear" className="mt-6">
          {renderPeriodContent(
            'Previous Year',
            currentData.previousYear,
            'Month'
          )}
        </TabsContent>
      </Tabs>
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

function HistoryLeaderCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'orange' | 'indigo';
}) {
  return (
    <HistoryMetricCard
      label={title}
      value={value.toLocaleString('en-US')}
      subtitle={subtitle}
      icon={icon}
      tone={tone}
    />
  );
}
