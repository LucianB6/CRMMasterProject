'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { agents, agentReports, reportStatusConfig } from '@/lib/mock-data';
import { Label } from '@/components/ui/label';

const reportSchema = z.object({
  outbound_dials: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  pickups: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  conversations_30s_plus: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  sales_call_booked_from_outbound: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  sales_call_on_calendar: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  no_show: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  reschedule_request: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  cancel: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  deposits: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  sales_one_call_close: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  followup_sales: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  upsell_conversation_taken: z.coerce
    .number()
    .int()
    .min(0, 'Valoare pozitivă necesară.'),
  upsells: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  contract_value: z.coerce.number().min(0, 'Valoarea trebuie să fie pozitivă.'),
  new_cash_collected: z.coerce
    .number()
    .min(0, 'Valoarea trebuie să fie pozitivă.'),
  observations: z
    .string()
    .max(1000, 'Maxim 1000 de caractere.')
    .optional(),
  confirmation: z.boolean(),
});

export default function ManagerReportsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0].id);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: agentReports[selectedAgentId as keyof typeof agentReports]
      ?.data,
  });

  useEffect(() => {
    const report = agentReports[selectedAgentId as keyof typeof agentReports];
    if (report) {
      form.reset(report.data);
    }
  }, [selectedAgentId, form]);

  function onSubmit(values: z.infer<typeof reportSchema>) {
    console.log(`Manager submitted for ${selectedAgentId}:`, values);
    toast({
      title: 'Raport actualizat!',
      description: `Datele pentru ${
        agents.find((a) => a.id === selectedAgentId)?.name
      } au fost salvate.`,
    });
  }

  const selectedReport = agentReports[selectedAgentId as keyof typeof agentReports];
  const currentStatusInfo =
    reportStatusConfig[selectedReport.status as keyof typeof reportStatusConfig];
  const Icon = currentStatusInfo.Icon;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Rapoarte Echipă</h1>
        <p className="text-muted-foreground">
          Vizualizează și editează rapoartele zilnice ale agenților tăi.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Selectează Agent</CardTitle>
          <CardDescription>
            Alege un agent pentru a vedea raportul zilnic curent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:w-auto">
            <Label>Agent</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="mt-2 w-full sm:w-[280px]">
                <SelectValue placeholder="Selectează un agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-2">
            <Icon className={cn('h-5 w-5', currentStatusInfo.color)} />
            <span className={cn('text-sm font-semibold', currentStatusInfo.color)}>
              Status: {currentStatusInfo.text}
            </span>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                toast({ title: 'Modificările au fost salvate ca draft!' })
              }
            >
              Salvează modificări
            </Button>
            <Button type="submit">Publică raportul</Button>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activitate Outbound</CardTitle>
                <CardDescription>
                  Indicatori principali legați de efortul de contactare.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="outbound_dials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apeluri outbound efectuate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pickups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apeluri preluate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conversations_30s_plus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversații &gt; 30s</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Management Apeluri de Vânzări</CardTitle>
                <CardDescription>
                  Rezultatele apelurilor programate.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <FormField
                  control={form.control}
                  name="sales_call_booked_from_outbound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Programări Outbound</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sales_call_on_calendar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apeluri pe Calendar</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no_show"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Show</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reschedule_request"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cereri reprogramare</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cancel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anulări</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Performanță Vânzări</CardTitle>
                <CardDescription>
                  Indicatori cheie de performanță în vânzări.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="deposits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avansuri încasate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sales_one_call_close"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vânzări închise la primul apel</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followup_sales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vânzări din follow-up</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Oportunități Upsell</CardTitle>
                <CardDescription>Urmărirea vânzărilor adiționale.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="upsell_conversation_taken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discuții de upsell purtate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="upsells"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upsell-uri realizate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Valori Financiare</CardTitle>
                <CardDescription>Totalurile financiare pentru ziua de azi.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contract_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valoare totală contracte (RON)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="new_cash_collected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bani noi încasați (RON)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Secțiunea D — Observații</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <Textarea
                        {...field}
                        placeholder="Adaugă observații, probleme întâmpinate sau alt context relevant..."
                        className="min-h-[100px]"
                        maxLength={1000}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
