'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [agents, setAgents] = useState<ManagerAgent[]>([]);
  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<ChartPoint[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const buildDateRange = useCallback(() => {
    const today = new Date();
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    from.setUTCDate(from.getUTCDate() - 6);
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
    return new Intl.DateTimeFormat('ro-RO', {
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
        const response = await fetch(`${apiBaseUrl}/manager/overview/agents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error('Nu am putut încărca agenții.');
        }
        const data = (await response.json()) as ManagerAgent[];
        setAgents(data);
      } catch (error) {
        toast({
          title: 'Eroare',
          description:
            error instanceof Error
              ? error.message
              : 'Nu am putut încărca agenții.',
          variant: 'destructive',
        });
      }
    };

    fetchAgents();
  }, [apiBaseUrl, getAuthToken, toast]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const { from, to } = buildDateRange();

        const summaryUrl =
          selectedAgentId === 'all'
            ? `${apiBaseUrl}/manager/overview/summary?from=${from}&to=${to}`
            : `${apiBaseUrl}/manager/overview/agents/${selectedAgentId}/summary?from=${from}&to=${to}`;

        const summaryResponse = await fetch(summaryUrl, { headers });
        if (!summaryResponse.ok) {
          throw new Error('Nu am putut încărca sumarul.');
        }
        const summaryData = (await summaryResponse.json()) as DailySummaryResponse;
        setSummary(summaryData);

        if (selectedAgentId === 'all') {
          const performanceResponse = await fetch(
            `${apiBaseUrl}/manager/overview/team-performance?from=${from}&to=${to}`,
            { headers }
          );
          if (!performanceResponse.ok) {
            throw new Error('Nu am putut încărca performanța echipei.');
          }
          const performanceData = (await performanceResponse.json()) as TeamPerformancePoint[];
          const mapped = performanceData.map((point) => ({
            day: formatDayLabel(point.report_date),
            calls: point.outbound_dials ?? 0,
            sales: point.total_sales ?? 0,
          }));
          setTeamPerformance(mapped);
        } else {
          const reportsResponse = await fetch(
            `${apiBaseUrl}/manager/reports?from=${from}&to=${to}&agent_membership_id=${selectedAgentId}`,
            { headers }
          );
          if (!reportsResponse.ok) {
            throw new Error('Nu am putut încărca rapoartele agentului.');
          }
          const reports = (await reportsResponse.json()) as ManagerReportResponse[];
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
        toast({
          title: 'Eroare',
          description:
            error instanceof Error
              ? error.message
              : 'Nu am putut încărca datele de overview.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [
    apiBaseUrl,
    buildDateRange,
    formatDayLabel,
    getAuthToken,
    selectedAgentId,
    toast,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Privire de ansamblu echipă</h1>
        <p className="text-muted-foreground">
          Analizează performanța generală sau filtrează după un agent specific.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtru</CardTitle>
          <CardDescription>
            Selectează &quot;Toți Agenții&quot; pentru a vedea date agregate sau
            alege un agent pentru a-i vedea performanța individuală.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selectează o opțiune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toți Agenții</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.membership_id} value={agent.membership_id}>
                  {agent.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Quick Stats - ultimele 7 zile
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Apeluri făcute
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.calls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversii</CardTitle>
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
                Vânzări închise
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
                Valoare vânzări
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
            Se actualizează datele...
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performanță Echipă</CardTitle>
          <CardDescription>Ultimele 7 zile</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calls">
            <TabsList className="mb-4">
              <TabsTrigger value="calls">Apeluri</TabsTrigger>
              <TabsTrigger value="sales">Vânzări</TabsTrigger>
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
                    name="Apeluri"
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
    </div>
  );
}
