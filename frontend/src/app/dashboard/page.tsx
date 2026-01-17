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
import React, { useState, useEffect } from 'react';
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
import { cn } from '../../lib/utils';

type ReportStatus = 'unfilled' | 'draft' | 'submitted' | 'locked';

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

const quickStatsData = {
  draft: [
    { title: 'Apeluri făcute', value: '32', icon: Phone },
    { title: 'Conversii', value: '4', icon: Target },
    { title: 'Vânzări închise', value: '1', icon: TrendingUp },
    { title: 'Valoare vânzări', value: '$850', icon: DollarSign },
  ],
  final: [
    { title: 'Apeluri făcute', value: '0', icon: Phone },
    { title: 'Conversii', value: '0', icon: Target },
    { title: 'Vânzări închise', value: '0', icon: TrendingUp },
    { title: 'Valoare vânzări', value: '$0', icon: DollarSign },
  ],
};

const personalHistoryData = {
  '7': [
    { day: 'Luni', calls: 32, sales: 1 },
    { day: 'Marți', calls: 45, sales: 3 },
    { day: 'Miercuri', calls: 28, sales: 2 },
    { day: 'Joi', calls: 52, sales: 4 },
    { day: 'Vineri', calls: 61, sales: 5 },
    { day: 'Sâmbătă', calls: 20, sales: 1 },
    { day: 'Duminică', calls: 15, sales: 0 },
  ],
  '30': [
    { day: 'Săpt. 1', calls: 218, sales: 15 },
    { day: 'Săpt. 2', calls: 250, sales: 18 },
    { day: 'Săpt. 3', calls: 230, sales: 16 },
    { day: 'Săpt. 4', calls: 280, sales: 22 },
  ],
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
  const [reportStatus, setReportStatus] = useState<ReportStatus>('draft');
  const [deadline] = useState(new Date(new Date().setHours(19, 0, 0, 0)));
  const [countdown, setCountdown] = useState('');

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

  const currentStatus = statusConfig[reportStatus];
  const Icon = currentStatus.icon;

  const stats =
    reportStatus === 'draft' ? quickStatsData.draft : quickStatsData.final;

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
          {stats.map((stat) => (
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
          <Button variant="outline" onClick={() => router.push('/dashboard/report')} className="w-full shrink-0 sm:w-auto">Editează raportul de azi</Button>
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
              <TabsTrigger value="30">Ultimele 30 zile</TabsTrigger>
            </TabsList>
            <TabsContent value="7">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={personalHistoryData['7']}>
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
            <TabsContent value="30">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={personalHistoryData['30']}>
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
