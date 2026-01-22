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
import { personalHistory } from '../../../lib/mock-data';
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
    label: 'Vânzări',
    dataKey: 'sales',
    unitLabel: 'Unități',
    icon: ShoppingCart,
    showValue: true,
    barName: 'Vânzări',
  },
  calls: {
    label: 'Apeluri Făcute',
    dataKey: 'calls',
    unitLabel: 'Apeluri',
    icon: Phone,
    showValue: false,
    barName: 'Apeluri',
  },
  followUpSales: {
    label: 'Vânzări Follow-up',
    dataKey: 'followUpSales',
    unitLabel: 'Unități',
    icon: RefreshCw,
    showValue: false,
    barName: 'Vânzări Follow-up',
  },
  outboundBookings: {
    label: 'Programări Outbound',
    dataKey: 'outboundBookings',
    unitLabel: 'Programări',
    icon: CalendarPlus,
    showValue: false,
    barName: 'Programări',
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
                Medie / Perioadă
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
                  Valoare Totală (RON)
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Istoric Vânzări & Activitate</h1>
        <p className="text-muted-foreground">
          Analizează performanța ta pe diferite perioade de timp.
        </p>
      </header>
      <Tabs defaultValue="7days" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="7days">Ultimele 7 zile</TabsTrigger>
          <TabsTrigger value="currentMonth">Luna curentă</TabsTrigger>
          <TabsTrigger value="currentYear">Anul curent</TabsTrigger>
          <TabsTrigger value="previousYear">Anul precedent</TabsTrigger>
        </TabsList>
        <TabsContent value="7days" className="mt-6">
          {renderPeriodContent(
            'Ultimele 7 zile',
            personalHistory.last7Days,
            'Ziua'
          )}
        </TabsContent>
        <TabsContent value="currentMonth" className="mt-6">
          {renderPeriodContent(
            'Luna Curentă',
            personalHistory.currentMonth,
            'Săptămâna'
          )}
        </TabsContent>
        <TabsContent value="currentYear" className="mt-6">
          {renderPeriodContent('Anul Curent', personalHistory.currentYear, 'Luna')}
        </TabsContent>
        <TabsContent value="previousYear" className="mt-6">
          {renderPeriodContent(
            'Anul Precedent',
            personalHistory.previousYear,
            'Luna'
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
