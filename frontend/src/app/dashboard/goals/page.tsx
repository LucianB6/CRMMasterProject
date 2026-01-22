'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { agentReports } from '../../../lib/mock-data';
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
import { Plus, Target, Trash2 } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

const availableMetrics = [
  { key: 'outbound_dials', label: 'Apeluri outbound efectuate' },
  { key: 'pickups', label: 'Apeluri preluate' },
  { key: 'conversations_30s_plus', label: 'Conversații > 30s' },
  { key: 'sales_call_booked_from_outbound', label: 'Programări din Outbound' },
  { key: 'sales_call_on_calendar', label: 'Apeluri pe Calendar' },
  { key: 'no_show', label: 'No Show' },
  { key: 'reschedule_request', label: 'Cereri reprogramare' },
  { key: 'cancel', label: 'Anulări' },
  { key: 'deposits', label: 'Avansuri încasate' },
  { key: 'sales_one_call_close', label: 'Vânzări închise la primul apel' },
  { key: 'followup_sales', label: 'Vânzări din follow-up' },
  { key: 'upsell_conversation_taken', label: 'Discuții de upsell purtate' },
  { key: 'upsells', label: 'Upsell-uri realizate' },
  { key: 'contract_value', label: 'Valoare totală contracte' },
  { key: 'new_cash_collected', label: 'Bani noi încasați' },
  { key: 'total_sales', label: 'Vânzări închise (Total)' },
];

const goalSchema = z
  .object({
    metricKey: z.string().min(1, 'Trebuie să selectezi o categorie.'),
    target: z.coerce.number().min(1, 'Ținta trebuie să fie mai mare ca 0.'),
    dateFrom: z.coerce.date({
      required_error: 'Data de început este obligatorie.',
    }),
    dateTo: z.coerce.date({
      required_error: 'Data de sfârșit este obligatorie.',
    }),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message:
      'Data de sfârșit trebuie să fie după sau în aceeași zi cu data de început.',
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

const currentReportData = agentReports['john-p'].data;

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      metricKey: '',
      target: 0,
    },
  });

  function handleAddGoal(values: z.infer<typeof goalSchema>) {
    const metric = availableMetrics.find((m) => m.key === values.metricKey);
    if (!metric) return;

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      title: metric.label,
      metricKey: values.metricKey,
      target: values.target,
      dateFrom: values.dateFrom,
      dateTo: values.dateTo,
    };

    setGoals((prev) => [...prev, newGoal]);
    setIsAddGoalDialogOpen(false);
    form.reset();
    toast({
      title: 'Obiectiv adăugat!',
      description: `Ai setat un nou obiectiv: ${newGoal.title}.`,
    });
  }

  function handleDeleteGoal(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    toast({
      title: 'Obiectiv șters.',
      variant: 'destructive',
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between sm:items-center">
        <div>
          <h1 className="font-headline text-2xl">Obiective</h1>
          <p className="text-muted-foreground">
            Adaugă și urmărește progresul obiectivelor tale.
          </p>
        </div>
        <Button onClick={() => setIsAddGoalDialogOpen(true)}>
          <Plus className="mr-0 h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Adaugă Obiectiv</span>
        </Button>
      </header>

      {goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Target className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Niciun obiectiv setat</h3>
          <p className="text-muted-foreground">
            Apasă pe &quot;Adaugă Obiectiv&quot; pentru a începe.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            let currentValue = 0;
            if (goal.metricKey === 'total_sales') {
              currentValue =
                (currentReportData.sales_one_call_close || 0) +
                (currentReportData.followup_sales || 0);
            } else {
              const reportValue =
                currentReportData[
                  goal.metricKey as keyof typeof currentReportData
                ];
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
              ? format(goal.dateFrom, 'dd-MM-yyyy', { locale: ro })
              : '';
            const toDate = goal.dateTo
              ? format(goal.dateTo, 'dd-MM-yyyy', { locale: ro })
              : '';
            const periodDisplay =
              fromDate && toDate
                ? `${fromDate} - ${toDate}`
                : 'Perioadă nedefinită';

            return (
              <Card key={goal.id} className="group relative">
                <CardHeader>
                  <CardTitle className="pr-12">{goal.title}</CardTitle>
                  <CardDescription>
                    {periodDisplay} | Țintă: {targetDisplay}
                  </CardDescription>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDeleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Șterge obiectiv</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={progressPercentage} />
                  <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>Progres</span>
                    <span>{fullDisplay}</span>
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
            <DialogTitle>Adaugă un Obiectiv Nou</DialogTitle>
            <DialogDescription>
              Selectează metrica, perioada și ținta pentru noul tău obiectiv.
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
                          <SelectValue placeholder="Selectează o categorie din raport" />
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
                      <FormLabel>Data de început</FormLabel>
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
                      <FormLabel>Data de sfârșit</FormLabel>
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
                    <FormLabel>Țintă</FormLabel>
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
                  Anulează
                </Button>
                <Button type="submit">Adaugă Obiectiv</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
