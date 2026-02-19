'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { DollarSign, Phone, Target, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../../components/ui/card';
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
      from.setUTCDate(from.getUTCDate() - 364);
    } else {
      from.setUTCDate(from.getUTCDate() - 29);
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

        const summaryPath =
          selectedAgentId === 'all'
            ? `/manager/overview/summary?from=${from}&to=${to}`
            : `/manager/overview/agents/${selectedAgentId}/summary?from=${from}&to=${to}`;

        const summaryData = await apiFetch<DailySummaryResponse>(summaryPath, {
          headers,
        });
        setSummary(summaryData);

        if (selectedAgentId === 'all') {
          const performanceData = await apiFetch<TeamPerformancePoint[]>(
            `/manager/overview/team-performance?from=${from}&to=${to}`,
            { headers }
          );
          const mapped = performanceData.map((point) => ({
            day: formatDayLabel(point.report_date),
            calls: point.outbound_dials ?? 0,
            sales: point.total_sales ?? 0,
          }));
          setTeamPerformance(mapped);
        } else {
          const reports = await apiFetch<ManagerReportResponse[]>(
            `/manager/reports?from=${from}&to=${to}&agent_membership_id=${selectedAgentId}`,
            { headers }
          );
          const mapped = reports.map((report) => {
            const totalSales =
              (report.inputs.sales_one_call_close ?? 0) +
              (report.inputs.followup_sales ?? 0) +
              (report.inputs.upsells ?? 0);
            return {
              day: formatDayLabel(report.report_date),
              calls: report.inputs.outbound_dials ?? 0,
              sales: totalSales,
            };
          });
          setAgentPerformance(mapped);
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
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Team overview</h1>
        <p className="text-muted-foreground">
          Analyze overall performance or filter by a specific agent.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Select &quot;All agents&quot; to see aggregated data or choose an agent to
            view individual performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.membership_id} value={agent.membership_id}>
                  {agent.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={rangePreset} onValueChange={(value) => setRangePreset(value as 'month' | 'year')}>
            <TabsList>
              <TabsTrigger value="month">Last month</TabsTrigger>
              <TabsTrigger value="year">Last year</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Quick Stats - {rangePreset === 'year' ? 'last year' : 'last month'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Calls made
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.calls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentStats.conversions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Closed sales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.sales}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sales value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.value}</div>
            </CardContent>
          </Card>
        </div>
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            Updating data...
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team performance</CardTitle>
          <CardDescription>
            {rangePreset === 'year' ? 'Last year' : 'Last month'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calls">
            <TabsList className="mb-4">
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
            </TabsList>
            <TabsContent value="calls">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend iconSize={10} />
                  <Bar
                    dataKey="calls"
                    name="Calls"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="sales">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend iconSize={10} />
                  <Bar
                    dataKey="sales"
                    name="Sales"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
