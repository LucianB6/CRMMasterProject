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
import { ro } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
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
    label: 'Apeluri Facute',
    dataKey: 'calls',
    unitLabel: 'Apeluri',
    icon: Phone,
    showValue: false,
    barName: 'Apeluri',
  },
  followUpSales: {
    label: 'Vanzari Follow-up',
    dataKey: 'followUpSales',
    unitLabel: 'Unitati',
    icon: RefreshCw,
    showValue: false,
    barName: 'Vanzari Follow-up',
  },
  outboundBookings: {
    label: 'Programari Outbound',
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
        const email = report.agent_email ?? 'Agent necunoscut';
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
          period: format(day, 'EEE dd MMM', { locale: ro }),
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
        period: `Sapt. ${index + 1}`,
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
          period: format(date, 'MMM', { locale: ro }),
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
        error instanceof Error ? error.message : 'Eroare necunoscuta';
      toast({
        title: 'Eroare',
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
          error instanceof Error ? error.message : 'Eroare necunoscuta';
        toast({
          title: 'Eroare',
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
                Medie / Perioada
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
                  Valoare Totala (RON)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totals.totalValue > 0
                    ? totals.totalValue.toLocaleString('ro-RO')
                    : '-'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{`Grafic ${metric.label} - ${title}`}</CardTitle>
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
              <CardTitle>{`Tabel ${metric.label} - ${title}`}</CardTitle>
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

  const currentData = historyData;
  const topStats = useMemo(() => {
    if (selectedAgentId !== 'all') {
      return null;
    }
    return buildTopStats(reportsByPeriod[periodKey]);
  }, [buildTopStats, periodKey, reportsByPeriod, selectedAgentId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Istoric Echipa</h1>
        <p className="text-muted-foreground">
          Analizeaza performanta istorica a echipei sau a unui agent specific.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtru Agent</CardTitle>
          <CardDescription>
            Selecteaza &quot;Toti Agentii&quot; pentru date agregate sau alege un agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecteaza o optiune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toti Agentii</SelectItem>
              {agents.map((agent) => (
                <SelectItem
                  key={agent.membership_id}
                  value={agent.membership_id}
                >
                  {agent.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Se incarca istoricul...
        </p>
      )}

      {selectedAgentId !== 'all' ? (
        <p className="text-sm text-muted-foreground">
          Selecteaza &quot;Toti Agentii&quot; pentru topuri pe echipa.
        </p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Top performanta echipa
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Vanzari</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topStats?.sales.sales ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topStats?.sales.email ?? '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Apeluri</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topStats?.calls.calls ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topStats?.calls.email ?? '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Vanzari Follow-up
                </CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topStats?.followUpSales.followUpSales ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topStats?.followUpSales.email ?? '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Programari Outbound
                </CardTitle>
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topStats?.outboundBookings.outboundBookings ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topStats?.outboundBookings.email ?? '-'}
                </p>
              </CardContent>
            </Card>
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="last7Days">Ultimele 7 zile</TabsTrigger>
          <TabsTrigger value="currentMonth">Luna curenta</TabsTrigger>
          <TabsTrigger value="currentYear">Anul curent</TabsTrigger>
          <TabsTrigger value="previousYear">Anul precedent</TabsTrigger>
        </TabsList>
        <TabsContent value="last7Days" className="mt-6">
          {renderPeriodContent(
            'Ultimele 7 zile',
            currentData.last7Days,
            'Ziua'
          )}
        </TabsContent>
        <TabsContent value="currentMonth" className="mt-6">
          {renderPeriodContent(
            'Luna Curenta',
            currentData.currentMonth,
            'Saptamana'
          )}
        </TabsContent>
        <TabsContent value="currentYear" className="mt-6">
          {renderPeriodContent(
            'Anul Curent',
            currentData.currentYear,
            'Luna'
          )}
        </TabsContent>
        <TabsContent value="previousYear" className="mt-6">
          {renderPeriodContent(
            'Anul Precedent',
            currentData.previousYear,
            'Luna'
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
