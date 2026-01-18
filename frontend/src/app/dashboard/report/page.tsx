'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Lock,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  // Outbound Activity
  outbound_dials: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  pickups: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  conversations_30s_plus: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),

  // Booking & Appointments
  sales_call_booked_from_outbound: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  sales_call_on_calendar: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  no_show: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  reschedule_request: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  cancel: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),

  // Sales Performance
  deposits: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  sales_one_call_close: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  followup_sales: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),

  // Upsells
  upsell_conversation_taken: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),
  upsells: z.coerce.number().int().min(0, 'Valoare pozitivă necesară.'),

  // Financials
  contract_value: z.coerce.number().min(0, 'Valoarea trebuie să fie pozitivă.'),
  new_cash_collected: z.coerce.number().min(0, 'Valoarea trebuie să fie pozitivă.'),
  
  // Observations
  observations: z.string().max(1000, 'Maxim 1000 de caractere.').optional(),

  // Confirmation
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'Trebuie să confirmi corectitudinea datelor.' }),
  }),
});


type ReportStatus = 'draft' | 'submitted' | 'locked';
const statusConfig = {
  draft: { text: 'Draft', icon: Pencil, color: 'text-yellow-500' },
  submitted: { text: 'Trimis', icon: CheckCircle, color: 'text-green-500' },
  locked: { text: 'Blocat', icon: Lock, color: 'text-muted-foreground' },
};

export default function DailyReportPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ReportStatus>('draft');

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
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
      observations: '',
      confirmation: false,
    },
  });

  function onSubmit(values: z.infer<typeof reportSchema>) {
    console.log(values);
    setStatus('submitted');
    toast({
      title: 'Raport trimis cu succes!',
      description: 'Managerul tău a fost notificat.',
    });
  }

  const isReadOnly = status === 'submitted' || status === 'locked';
  const { isValid } = form.formState;
  const currentStatusInfo = statusConfig[status];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-xl">
                Raport zilnic:{' '}
                {format(new Date(), 'eeee, dd MMMM yyyy', { locale: ro })}
              </h1>
              <div className="flex items-center gap-2 text-sm">
                <currentStatusInfo.icon
                  className={cn('h-4 w-4', currentStatusInfo.color)}
                />
                <span className={cn('font-semibold', currentStatusInfo.color)}>
                  Status: {currentStatusInfo.text}
                </span>
                <span className="text-muted-foreground">|</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Publicare automată la 19:00
                </span>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                type="button"
                disabled={isReadOnly}
                onClick={() => toast({ title: 'Draft salvat!' })}
              >
                Salvează draft
              </Button>
              <Button type="submit" disabled={isReadOnly || !isValid}>
                Trimite raportul
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* Section: Outbound Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activitate Outbound</CardTitle>
              <CardDescription>
                Indicatori principali legați de efortul de contactare.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="outbound_dials" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apeluri outbound efectuate</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="pickups" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apeluri preluate</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="conversations_30s_plus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversații &gt; 30s</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section: Booking & Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Management Apeluri de Vânzări</CardTitle>
              <CardDescription>Rezultatele apelurilor programate.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <FormField control={form.control} name="sales_call_booked_from_outbound" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Programări Outbound</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="sales_call_on_calendar" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apeluri pe Calendar</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="no_show" render={({ field }) => (
                  <FormItem>
                    <FormLabel>No Show</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="reschedule_request" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cereri reprogramare</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="cancel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anulări</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

           {/* Section: Sales Performance */}
           <Card>
            <CardHeader>
              <CardTitle>Performanță Vânzări</CardTitle>
              <CardDescription>Indicatori cheie de performanță în vânzări.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="deposits" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avansuri încasate</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="sales_one_call_close" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vânzări închise la primul apel</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="followup_sales" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vânzări din follow-up</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section: Upsells */}
          <Card>
            <CardHeader>
              <CardTitle>Oportunități Upsell</CardTitle>
              <CardDescription>Urmărirea vânzărilor adiționale.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="upsell_conversation_taken" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discuții de upsell purtate</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="upsells" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upsell-uri realizate</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section: Financials */}
          <Card>
            <CardHeader>
              <CardTitle>Valori Financiare</CardTitle>
              <CardDescription>Totalurile financiare pentru ziua de azi.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="contract_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valoare totală contracte (RON)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="new_cash_collected" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bani noi încasați (RON)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} readOnly={isReadOnly} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>


          {/* Section D */}
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
                      placeholder="Adaugă observații, probleme întâmpinate sau alt context relevant pentru managerul tău..."
                      className="min-h-[100px]"
                      maxLength={1000}
                      readOnly={isReadOnly}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section E */}
          <Card>
            <CardHeader>
              <CardTitle>Secțiunea E — Confirmare & Responsabilitate</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Confirm că datele introduse sunt corecte și complete.
                      </FormLabel>
                      <FormDescription>
                        Prin bifarea acestei căsuțe, îți asumi responsabilitatea
                        pentru informațiile din acest raport.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
