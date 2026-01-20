'use client';

import { useMemo, useState } from 'react';
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
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { agents, teamPerformanceData, quickStats } from '@/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManagerOverviewPage() {
  const [selectedAgentId, setSelectedAgentId] = useState('all');

  const currentStats = useMemo(() => {
    return quickStats[selectedAgentId as keyof typeof quickStats];
  }, [selectedAgentId]);

  const chartData = useMemo(() => {
    if (selectedAgentId === 'all') {
      return teamPerformanceData;
    }
    const agentName = agents.find((a) => a.id === selectedAgentId)?.name;
    if (!agentName) return { calls: [], sales: [] };

    const filterByAgent = (data: Array<Record<string, number | string>>) =>
      data.map((d) => ({
        day: d.day,
        [agentName]: d[agentName],
      }));

    return {
      calls: filterByAgent(teamPerformanceData.calls['7']),
      sales: filterByAgent(teamPerformanceData.sales['7']),
    };
  }, [selectedAgentId]);

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
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Quick Stats - Azi
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
                <BarChart
                  data={
                    selectedAgentId === 'all'
                      ? teamPerformanceData.calls['7']
                      : chartData.calls
                  }
                >
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
                  {agents.map((agent, index) => {
                    if (
                      selectedAgentId === 'all' ||
                      selectedAgentId === agent.id
                    ) {
                      return (
                        <Bar
                          key={agent.id}
                          dataKey={agent.name}
                          fill={`hsl(var(--chart-${index + 1}))`}
                          radius={[4, 4, 0, 0]}
                        />
                      );
                    }
                    return null;
                  })}
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="sales">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={
                    selectedAgentId === 'all'
                      ? teamPerformanceData.sales['7']
                      : chartData.sales
                  }
                >
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
                  {agents.map((agent, index) => {
                    if (
                      selectedAgentId === 'all' ||
                      selectedAgentId === agent.id
                    ) {
                      return (
                        <Bar
                          key={agent.id}
                          dataKey={agent.name}
                          fill={`hsl(var(--chart-${index + 1}))`}
                          radius={[4, 4, 0, 0]}
                        />
                      );
                    }
                    return null;
                  })}
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
