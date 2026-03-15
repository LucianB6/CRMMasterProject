'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import {
  Plus,
  Target,
  Trash2,
  Trophy,
  TrendingUp,
  CalendarRange,
} from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { apiFetch } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const availableMetrics = [
  { key: 'outbound_dials', label: 'Calls outbound efectuate' },
  { key: 'pickups', label: 'Calls preluate' },
  { key: 'conversations_30s_plus', label: 'Conversations > 30s' },
  { key: 'sales_call_booked_from_outbound', label: 'Bookings din Outbound' },
  { key: 'sales_call_on_calendar', label: 'Calls on Calendar' },
  { key: 'no_show', label: 'No Show' },
  { key: 'reschedule_request', label: 'Cereri reprogramare' },
  { key: 'cancel', label: 'Cancellations' },
  { key: 'deposits', label: 'Deposits collected' },
  { key: 'sales_one_call_close', label: 'Sales closed on first call' },
  { key: 'followup_sales', label: 'Sales din follow-up' },
  { key: 'upsell_conversation_taken', label: 'Upsell conversations held' },
  { key: 'upsells', label: 'Upsell-uri realizate' },
  { key: 'contract_value', label: 'Total contract value' },
  { key: 'new_cash_collected', label: 'New cash collected' },
  { key: 'total_sales', label: 'Closed sales (Total)' },
];

const goalSchema = z
  .object({
    metricKey: z.string().min(1, 'You must select a category.'),
    target: z.coerce.number().min(1, 'Target must be greater than 0.'),
    dateFrom: z.coerce.date({
      required_error: 'Start date este obligatorie.',
    }),
    dateTo: z.coerce.date({
      required_error: 'End date is required.',
    }),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message:
      'End date must be after or on the same day as the start date.',
    path: ['dateTo'],
  });

type Goal = {
  id: string;
  title: string;
  metricKey: string;
  target: number;
  dateFrom: Date;
  dateTo: Date;
};

type ApiGoal = {
  id: string;
  title: string;
  metricKey: string;
  target: number;
  dateFrom: string;
  dateTo: string;
};

type ReportInputs = {
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

const emptyInputs: ReportInputs = {
  outbound_dials: 0,
  pickups: 0,
  conversations_30s_plus: 0,
  sales_call_booked_from_outbound: 0,
  sales_call_on_calendar: 0,
  no_show: 0,
  reschedule_request: 0,
  cancel: 0,
  deposits: 0,
  sales_one_call_close: 0,
  followup_sales: 0,
  upsell_conversation_taken: 0,
  upsells: 0,
  contract_value: 0,
  new_cash_collected: 0,
};

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [reportInputs, setReportInputs] = useState<ReportInputs>(emptyInputs);
  const [isReportLoading, setIsReportLoading] = useState(true);

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      metricKey: '',
      target: 0,
    },
  });

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const normalizeGoal = useCallback((goal: ApiGoal): Goal => {
    return {
      id: goal.id,
      title: goal.title,
      metricKey: goal.metricKey,
      target: goal.target,
      dateFrom: new Date(goal.dateFrom),
      dateTo: new Date(goal.dateTo),
    };
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      setIsGoalsLoading(true);
      const token = getAuthToken();
      const data = await apiFetch<ApiGoal[]>('/goals', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setGoals(data.map(normalizeGoal));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to load goals',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGoalsLoading(false);
    }
  }, [getAuthToken, normalizeGoal, toast]);

  useEffect(() => {
    const fetchReport = async () => {
      if (typeof window === 'undefined') return;
      const token = window.localStorage.getItem('salesway_token');
      if (!token) {
        setIsReportLoading(false);
        return;
      }

      try {
        const data = await apiFetch<{ inputs?: Partial<ReportInputs> }>(
          '/reports/daily/today',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setReportInputs({
          ...emptyInputs,
          ...(data.inputs ?? {}),
        });
      } catch (error) {
        console.error('Failed to load report inputs', error);
        toast({
          title: "Unable to load today's report.",
          description: 'Check your connection and try again.',
          variant: 'destructive',
        });
      } finally {
        setIsReportLoading(false);
      }
    };

    void fetchReport();
  }, [toast]);

  async function handleAddGoal(values: z.infer<typeof goalSchema>) {
    const metric = availableMetrics.find((m) => m.key === values.metricKey);
    if (!metric) return;

    try {
      const token = getAuthToken();
      const savedGoal = normalizeGoal(await apiFetch<ApiGoal>('/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: metric.label,
          metricKey: values.metricKey,
          target: values.target,
          dateFrom: format(values.dateFrom, 'yyyy-MM-dd'),
          dateTo: format(values.dateTo, 'yyyy-MM-dd'),
        }),
      }));
      setGoals((prev) => [savedGoal, ...prev]);
      setIsAddGoalDialogOpen(false);
      form.reset();
      toast({
        title: 'Goal added!',
        description: `You set a new goal: ${savedGoal.title}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to save goal',
        description: message,
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteGoal(goalId: string) {
    try {
      const token = getAuthToken();
      await apiFetch<unknown>(`/goals/${goalId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast({
        title: 'Goal deleted.',
        variant: 'destructive',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to delete goal',
        description: message,
        variant: 'destructive',
      });
    }
  }

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  const summary = goals.reduce(
    (acc, goal) => {
      let currentValue = 0;
      if (goal.metricKey === 'total_sales') {
        currentValue =
          reportInputs.sales_one_call_close + reportInputs.followup_sales;
      } else {
        const reportValue = reportInputs[goal.metricKey as keyof ReportInputs];
        currentValue = typeof reportValue === 'number' ? reportValue : 0;
      }

      const progressPercentage =
        goal.target > 0 ? Math.min((currentValue / goal.target) * 100, 100) : 0;

      acc.total += 1;
      if (progressPercentage >= 100) {
        acc.completed += 1;
      }
      acc.averageProgress += progressPercentage;
      return acc;
    },
    { total: 0, completed: 0, averageProgress: 0 }
  );

  const averageProgress =
    summary.total > 0 ? summary.averageProgress / summary.total : 0;

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Goals</h1>
          <p className="mt-1 font-medium text-slate-500">
            Defineste-ti obiectivele si urmareste progresul lor in acelasi stil cu restul dashboard-ului.
          </p>
        </div>
        <Button
          onClick={() => setIsAddGoalDialogOpen(true)}
          className="bg-[#38bdf8] text-white hover:bg-sky-500"
        >
          <Plus className="mr-0 h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Goal</span>
        </Button>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        <GoalSummaryCard
          label="Obiective active"
          value={summary.total.toLocaleString('ro-RO')}
          icon={<Target className="h-5 w-5" />}
          tone="blue"
        />
        <GoalSummaryCard
          label="Obiective atinse"
          value={summary.completed.toLocaleString('ro-RO')}
          icon={<Trophy className="h-5 w-5" />}
          tone="emerald"
        />
        <GoalSummaryCard
          label="Progres mediu"
          value={`${averageProgress.toFixed(0)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="orange"
        />
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-slate-200 bg-white py-16 text-center shadow-xl shadow-slate-200/30">
          <Target className="h-16 w-16 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-800">
            {isGoalsLoading ? 'Se incarca obiectivele...' : 'Nu exista obiective'}
          </h3>
          <p className="font-medium text-slate-500">
            {isGoalsLoading
              ? 'Te rog asteapta putin.'
              : 'Apasa pe "Add Goal" pentru a incepe.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            let currentValue = 0;
            if (goal.metricKey === 'total_sales') {
              currentValue =
                reportInputs.sales_one_call_close + reportInputs.followup_sales;
            } else {
              const reportValue =
                reportInputs[goal.metricKey as keyof ReportInputs];
              currentValue = typeof reportValue === 'number' ? reportValue : 0;
            }

            const progressPercentage =
              goal.target > 0 ? (currentValue / goal.target) * 100 : 0;
            const isCurrency =
              goal.metricKey.includes('value') ||
              goal.metricKey.includes('cash');
            const targetDisplay = isCurrency
              ? `${goal.target.toLocaleString('ro-RO')} RON`
              : goal.target;
            const currentDisplay = isCurrency
              ? `${currentValue.toLocaleString('ro-RO')}`
              : currentValue;
            const fullDisplay = isCurrency
              ? `${currentDisplay} / ${targetDisplay}`
              : `${currentValue} / ${goal.target}`;

            const fromDate = goal.dateFrom
              ? format(goal.dateFrom, 'dd-MM-yyyy', { locale: enUS })
              : '';
            const toDate = goal.dateTo
              ? format(goal.dateTo, 'dd-MM-yyyy', { locale: enUS })
              : '';
            const periodDisplay =
              fromDate && toDate
                ? `${fromDate} - ${toDate}`
                : 'Perioada nedefinita';

            return (
              <Card
                key={goal.id}
                className="group relative overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/35"
              >
                <CardHeader className="space-y-4 pb-3">
                  <div>
                    <div className="mb-4 inline-flex rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <CardTitle className="pr-12 text-xl text-slate-800">{goal.title}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                      <CalendarRange className="h-4 w-4" />
                      {periodDisplay}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:bg-red-50 group-hover:opacity-100"
                    onClick={() => handleDeleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete goal</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Target
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">{targetDisplay}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-slate-500">
                      <span>Progres</span>
                      <span>{Math.min(progressPercentage, 100).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={progressPercentage}
                      className={cn(
                        '[&>div]:bg-[#38bdf8]',
                        progressPercentage >= 100 && '[&>div]:bg-emerald-500'
                      )}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Valoare curenta</span>
                    <span>
                      {isReportLoading ? 'Se incarca...' : fullDisplay}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isAddGoalDialogOpen} onOpenChange={setIsAddGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a New Goal</DialogTitle>
            <DialogDescription>
              Select the metric, period, and target for your new goal.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddGoal)}
              className="space-y-6 py-4"
            >
              <FormField
                control={form.control}
                name="metricKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category from the report" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMetrics.map((metric) => (
                          <SelectItem key={metric.key} value={metric.key}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value instanceof Date
                              ? format(field.value, 'yyyy-MM-dd')
                              : field.value || ''
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value instanceof Date
                              ? format(field.value, 'yyyy-MM-dd')
                              : field.value || ''
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Ex: 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddGoalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Goal</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalSummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'orange';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-2xl border p-3 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
