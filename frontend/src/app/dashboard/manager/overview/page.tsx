'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgeDollarSign,
  Calendar,
  Phone,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { useToast } from '../../../../hooks/use-toast';
import { ApiError, apiFetch } from '../../../../lib/api';

type ManagerAgent = {
  membership_id: string;
  email: string;
  team_name: string | null;
};

type DailySummaryResponse = {
  outbound_dials: number | null;
  sales_call_on_calendar: number | null;
  total_sales: number | null;
  contract_value: number | null;
};

type PersonalReportResponse = {
  id: string;
  reportDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  inputs: {
    outbound_dials: number | null;
    sales_call_on_calendar: number | null;
    sales_one_call_close: number | null;
    followup_sales: number | null;
    upsells: number | null;
    contract_value: number | null;
  };
};

type TeamPerformancePoint = {
  report_date: string;
  outbound_dials: number | null;
  total_sales: number | null;
};

type ManagerReportResponse = {
  report_date: string;
  inputs: {
    outbound_dials: number | null;
    sales_one_call_close: number | null;
    followup_sales: number | null;
    upsells: number | null;
  };
};

type ChartPoint = {
  day: string;
  calls: number;
  sales: number;
};

const mergeSummary = (
  base: DailySummaryResponse | null,
  extra: DailySummaryResponse | null
): DailySummaryResponse => ({
  outbound_dials: (base?.outbound_dials ?? 0) + (extra?.outbound_dials ?? 0),
  sales_call_on_calendar:
    (base?.sales_call_on_calendar ?? 0) + (extra?.sales_call_on_calendar ?? 0),
  total_sales: (base?.total_sales ?? 0) + (extra?.total_sales ?? 0),
  contract_value: (base?.contract_value ?? 0) + (extra?.contract_value ?? 0),
});

const mergeChartPoints = (base: ChartPoint[], extra: ChartPoint[]) => {
  const byDay = new Map<string, ChartPoint>();

  for (const point of base) {
    byDay.set(point.day, { ...point });
  }

  for (const point of extra) {
    const existing = byDay.get(point.day);
    if (existing) {
      existing.calls += point.calls;
      existing.sales += point.sales;
      continue;
    }
    byDay.set(point.day, { ...point });
  }

  return Array.from(byDay.values());
};

export default function ManagerOverviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [rangePreset, setRangePreset] = useState<'month' | 'year'>('month');
  const [agents, setAgents] = useState<ManagerAgent[]>([]);
  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<ChartPoint[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'calls' | 'sales'>('calls');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const buildDateRange = useCallback((preset: 'month' | 'year') => {
    const today = new Date();
    const from = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );
    if (preset === 'year') {
      from.setUTCMonth(0, 1);
    } else {
      from.setUTCDate(1);
    }
    const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const toKey = to.toISOString().slice(0, 10);
    const fromKey = from.toISOString().slice(0, 10);
    return { from: fromKey, to: toKey };
  }, []);

  const formatDayLabel = useCallback((dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(date);
  }, []);

  const currentStats = useMemo(() => {
    const safe = (value: number | null | undefined) => value ?? 0;
    return {
      calls: safe(summary?.outbound_dials),
      conversions: safe(summary?.sales_call_on_calendar),
      sales: safe(summary?.total_sales),
      value: safe(summary?.contract_value),
    };
  }, [summary]);

  const chartData = useMemo(() => {
    return selectedAgentId === 'all' ? teamPerformance : agentPerformance;
  }, [agentPerformance, selectedAgentId, teamPerformance]);

  const chartSummary = useMemo(() => {
    if (chartData.length === 0) {
      return { average: 0, peak: 0, total: 0 };
    }
    const today = new Date();
    const currentMonthDayCount = today.getUTCDate();
    const currentYearStart = Date.UTC(today.getUTCFullYear(), 0, 1);
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );
    const currentYearDayCount =
      Math.floor((todayUtc - currentYearStart) / (1000 * 60 * 60 * 24)) + 1;
    const values = chartData.map((point) =>
      activeMetric === 'calls' ? point.calls : point.sales
    );
    const total = values.reduce((acc, value) => acc + value, 0);
    const peak = Math.max(...values);
    const divisor = rangePreset === 'year' ? currentYearDayCount : currentMonthDayCount;
    const average = total / divisor;
    return { average, peak, total };
  }, [activeMetric, chartData, rangePreset]);

  const selectedAgentLabel = useMemo(() => {
    if (selectedAgentId === 'all') return 'All agents';
    if (selectedAgentId === 'self') return currentUserEmail ?? 'Activitatea mea';
    return agents.find((agent) => agent.membership_id === selectedAgentId)?.email ?? 'Selected agent';
  }, [agents, currentUserEmail, selectedAgentId]);

  const rangeLabel = rangePreset === 'month' ? 'Current month' : 'Current year';

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        const data = await apiFetch<ManagerAgent[]>('/manager/overview/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAgents(data);
        const me = await apiFetch<{ email?: string | null }>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUserEmail(me.email ?? null);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          router.replace('/login');
          return;
        }
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to load agents.',
          variant: 'destructive',
        });
      }
    };

    fetchAgents();
  }, [getAuthToken, router, toast]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const { from, to } = buildDateRange(rangePreset);

        if (selectedAgentId === 'all') {
          const [teamSummaryData, performanceData, personalReports] = await Promise.all([
            apiFetch<DailySummaryResponse>(`/manager/overview/summary?from=${from}&to=${to}`, {
              headers,
            }),
            apiFetch<TeamPerformancePoint[]>(
              `/manager/overview/team-performance?from=${from}&to=${to}`,
              { headers }
            ),
            apiFetch<PersonalReportResponse[]>(`/reports/daily?from=${from}&to=${to}`, {
              headers,
            }),
          ]);

          const personalSummaryData = personalReports.reduce<DailySummaryResponse>(
            (acc, report) => ({
              outbound_dials: (acc.outbound_dials ?? 0) + (report.inputs.outbound_dials ?? 0),
              sales_call_on_calendar:
                (acc.sales_call_on_calendar ?? 0) + (report.inputs.sales_call_on_calendar ?? 0),
              total_sales:
                (acc.total_sales ?? 0) +
                (report.inputs.sales_one_call_close ?? 0) +
                (report.inputs.followup_sales ?? 0),
              contract_value:
                (acc.contract_value ?? 0) + (report.inputs.contract_value ?? 0),
            }),
            {
              outbound_dials: 0,
              sales_call_on_calendar: 0,
              total_sales: 0,
              contract_value: 0,
            }
          );

          const teamMapped = performanceData.map((point) => ({
            day: formatDayLabel(point.report_date),
            calls: point.outbound_dials ?? 0,
            sales: point.total_sales ?? 0,
          }));
          const personalMapped = personalReports.map((report) => ({
            day: formatDayLabel(report.reportDate),
            calls: report.inputs.outbound_dials ?? 0,
            sales:
              (report.inputs.sales_one_call_close ?? 0) +
              (report.inputs.followup_sales ?? 0),
          }));

          setSummary(mergeSummary(teamSummaryData, personalSummaryData));
          setTeamPerformance(mergeChartPoints(teamMapped, personalMapped));
          setAgentPerformance([]);
        } else if (selectedAgentId === 'self') {
          const reports = await apiFetch<PersonalReportResponse[]>(
            `/reports/daily?from=${from}&to=${to}`,
            { headers }
          );
          const summaryData = reports.reduce<DailySummaryResponse>(
            (acc, report) => ({
              outbound_dials: (acc.outbound_dials ?? 0) + (report.inputs.outbound_dials ?? 0),
              sales_call_on_calendar:
                (acc.sales_call_on_calendar ?? 0) + (report.inputs.sales_call_on_calendar ?? 0),
              total_sales:
                (acc.total_sales ?? 0) +
                (report.inputs.sales_one_call_close ?? 0) +
                (report.inputs.followup_sales ?? 0),
              contract_value:
                (acc.contract_value ?? 0) + (report.inputs.contract_value ?? 0),
            }),
            {
              outbound_dials: 0,
              sales_call_on_calendar: 0,
              total_sales: 0,
              contract_value: 0,
            }
          );
          setSummary(summaryData);
          const mapped = reports.map((report) => ({
            day: formatDayLabel(report.reportDate),
            calls: report.inputs.outbound_dials ?? 0,
            sales:
              (report.inputs.sales_one_call_close ?? 0) +
              (report.inputs.followup_sales ?? 0),
          }));
          setAgentPerformance(mapped);
          setTeamPerformance([]);
        } else {
          const summaryData = await apiFetch<DailySummaryResponse>(
            `/manager/overview/agents/${selectedAgentId}/summary?from=${from}&to=${to}`,
            { headers }
          );
          setSummary(summaryData);
          const reports = await apiFetch<ManagerReportResponse[]>(
            `/manager/reports?from=${from}&to=${to}&agent_membership_id=${selectedAgentId}`,
            { headers }
          );
          const mapped = reports.map((report) => {
            const totalSales =
              (report.inputs.sales_one_call_close ?? 0) +
              (report.inputs.followup_sales ?? 0);
            return {
              day: formatDayLabel(report.report_date),
              calls: report.inputs.outbound_dials ?? 0,
              sales: totalSales,
            };
          });
          setAgentPerformance(mapped);
          setTeamPerformance([]);
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          router.replace('/login');
          return;
        }
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to load overview data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [buildDateRange, formatDayLabel, getAuthToken, rangePreset, selectedAgentId, router, toast]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Team Overview</h2>
          <p className="mt-1 font-medium text-slate-500">
            Analyze team performance with real-time metrics from your reports database.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm md:w-auto">
          <div className="min-w-0 flex-1 md:min-w-[220px]">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="h-10 border-none bg-slate-50 px-3 font-bold text-slate-700 shadow-none">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                <SelectItem value="self">Activitatea mea</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.membership_id} value={agent.membership_id}>
                    {agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <Tabs value={rangePreset} onValueChange={(value) => setRangePreset(value as 'month' | 'year')}>
            <TabsList className="h-auto rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="month" className="rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]">
                CURRENT MONTH
              </TabsTrigger>
              <TabsTrigger value="year" className="rounded-lg px-4 py-1.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#38bdf8]">
                CURRENT YEAR
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStatCard label="Calls made" value={currentStats.calls} icon={<Phone className="h-5 w-5" />} tone="blue" />
        <OverviewStatCard label="Conversions" value={currentStats.conversions} icon={<Target className="h-5 w-5" />} tone="emerald" />
        <OverviewStatCard label="Closed sales" value={currentStats.sales} icon={<TrendingUp className="h-5 w-5" />} tone="orange" />
        <OverviewStatCard label="Sales value" value={currentStats.value} icon={<BadgeDollarSign className="h-5 w-5" />} tone="indigo" isCurrency />
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">Refreshing overview data...</p>
      )}

      <div className="w-full overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
        <div className="p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Team Performance</h3>
              <p className="text-sm font-medium text-slate-400">
                {selectedAgentLabel} • {rangeLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveMetric('calls')}
                className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                  activeMetric === 'calls'
                    ? 'bg-[#38bdf8] text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Calls
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('sales')}
                className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                  activeMetric === 'sales'
                    ? 'bg-[#38bdf8] text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Sales
              </button>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fill="url(#overviewFill)"
                  name={activeMetric === 'calls' ? 'Calls' : 'Sales'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-around gap-4 border-t border-slate-100 bg-slate-50/60 p-6">
          <ChartSummaryItem label="Daily average" value={chartSummary.average.toFixed(1)} />
          <ChartSummaryItem label="Peak activity" value={String(chartSummary.peak)} />
          <ChartSummaryItem label="Total period" value={String(chartSummary.total)} />
          <ChartSummaryItem label="Range" value={rangeLabel} icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />} />
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
  isCurrency = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'orange' | 'indigo';
  isCurrency?: boolean;
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  const formattedValue = isCurrency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US').format(value);

  return (
    <div className="group cursor-default rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 transition-all hover:scale-[1.01]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border p-3 ${colorMap[tone]}`}>{icon}</div>
      </div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900">{formattedValue}</p>
    </div>
  );
}

function ChartSummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {icon}
        {label}
      </p>
      <p className="text-lg font-black text-slate-700">{value}</p>
    </div>
  );
}
