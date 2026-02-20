'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Lock } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../lib/utils';
import { useToast } from '../../../../hooks/use-toast';
import { apiFetch } from '../../../../lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Label } from '../../../../components/ui/label';

const reportSchema = z.object({
  outbound_dials: z.coerce.number().int().min(0, 'Positive value required.'),
  pickups: z.coerce.number().int().min(0, 'Positive value required.'),
  conversations_30s_plus: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  sales_call_booked_from_outbound: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  sales_call_on_calendar: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  no_show: z.coerce.number().int().min(0, 'Positive value required.'),
  reschedule_request: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  cancel: z.coerce.number().int().min(0, 'Positive value required.'),
  deposits: z.coerce.number().int().min(0, 'Positive value required.'),
  sales_one_call_close: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  followup_sales: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  upsell_conversation_taken: z.coerce
    .number()
    .int()
    .min(0, 'Positive value required.'),
  upsells: z.coerce.number().int().min(0, 'Positive value required.'),
  contract_value: z.coerce.number().min(0, 'Value must be positive.'),
  new_cash_collected: z.coerce
    .number()
    .min(0, 'Value must be positive.'),
  observations: z
    .string()
    .max(1000, 'Maxim 1000 de caractere.')
    .optional(),
});

type ManagerAgent = {
  membership_id: string;
  email: string;
};

type ManagerReportStatus = 'DRAFT' | 'SUBMITTED' | 'AUTO_SUBMITTED';

type ManagerReportResponse = {
  id: string;
  report_date: string;
  status: ManagerReportStatus;
  agent_membership_id: string;
  agent_email: string;
  inputs: {
    outbound_dials: number | null;
    pickups: number | null;
    conversations_30s_plus: number | null;
    sales_call_booked_from_outbound: number | null;
    sales_call_on_calendar: number | null;
    no_show: number | null;
    reschedule_request: number | null;
    cancel: number | null;
    deposits: number | null;
    sales_one_call_close: number | null;
    followup_sales: number | null;
    upsell_conversation_taken: number | null;
    upsells: number | null;
    contract_value: number | null;
    new_cash_collected: number | null;
  };
};

const statusConfig = {
  DRAFT: { text: 'Draft', icon: Clock, color: 'text-yellow-500' },
  SUBMITTED: { text: 'Submitted', icon: CheckCircle, color: 'text-green-500' },
  AUTO_SUBMITTED: { text: 'Auto-submitted', icon: Lock, color: 'text-muted-foreground' },
};

const baseReportValues = {
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
};

export default function ManagerReportsPage() {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agents, setAgents] = useState<ManagerAgent[]>([]);
  const [currentReport, setCurrentReport] =
    useState<ManagerReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: baseReportValues,
  });

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const formatDateKey = useCallback((date: Date) => {
    return date.toISOString().slice(0, 10);
  }, []);

  const normalizeInputs = useCallback((report: ManagerReportResponse | null) => {
    if (!report) {
      return baseReportValues;
    }
    const safe = (value: number | null | undefined) => value ?? 0;
    return {
      outbound_dials: safe(report.inputs.outbound_dials),
      pickups: safe(report.inputs.pickups),
      conversations_30s_plus: safe(report.inputs.conversations_30s_plus),
      sales_call_booked_from_outbound: safe(report.inputs.sales_call_booked_from_outbound),
      sales_call_on_calendar: safe(report.inputs.sales_call_on_calendar),
      no_show: safe(report.inputs.no_show),
      reschedule_request: safe(report.inputs.reschedule_request),
      cancel: safe(report.inputs.cancel),
      deposits: safe(report.inputs.deposits),
      sales_one_call_close: safe(report.inputs.sales_one_call_close),
      followup_sales: safe(report.inputs.followup_sales),
      upsell_conversation_taken: safe(report.inputs.upsell_conversation_taken),
      upsells: safe(report.inputs.upsells),
      contract_value: safe(report.inputs.contract_value),
      new_cash_collected: safe(report.inputs.new_cash_collected),
      observations: baseReportValues.observations,
    };
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = getAuthToken();
        const data = await apiFetch<ManagerAgent[]>('/manager/overview/agents', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setAgents(data);
        if (data.length > 0) {
          setSelectedAgentId((prev) => prev || data[0].membership_id);
        }
      } catch (error) {
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
  }, [getAuthToken, toast]);

  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedAgentId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const today = new Date();
        const from = formatDateKey(today);
        const to = formatDateKey(today);
        const data = await apiFetch<ManagerReportResponse[]>(
          `/manager/reports?from=${from}&to=${to}&agent_membership_id=${selectedAgentId}`,
          { headers }
        );
        const sorted = [...data].sort((a, b) =>
          a.report_date < b.report_date ? 1 : -1
        );
        const latest = sorted[0] ?? null;
        setCurrentReport(latest);
        form.reset(normalizeInputs(latest));
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to load the agent report.',
          variant: 'destructive',
        });
        setCurrentReport(null);
        form.reset(baseReportValues);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [form, formatDateKey, getAuthToken, normalizeInputs, selectedAgentId, toast]);

  const submitReport = useCallback(
    async (values: z.infer<typeof reportSchema>, status: ManagerReportStatus) => {
      if (!currentReport) {
        toast({
          title: 'Missing report',
          description: 'There is no report to update for the selected agent.',
          variant: 'destructive',
        });
        return;
      }
      try {
        setIsSaving(true);
        const token = getAuthToken();
        const { observations, ...payload } = values;
        const updated = await apiFetch<ManagerReportResponse>(
          `/manager/reports/${currentReport.id}`,
          {
            method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              ...payload,
              status,
            }),
          }
        );
        setCurrentReport(updated);
        form.reset(normalizeInputs(updated));
        toast({
          title: status === 'SUBMITTED' ? 'Report published!' : 'Report saved!',
          description: `Data for ${updated.agent_email} has been updated.`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to save report.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [currentReport, form, getAuthToken, normalizeInputs, toast]
  );

  const currentStatusInfo =
    (currentReport && statusConfig[currentReport.status]) || statusConfig.DRAFT;
  const Icon = currentStatusInfo.icon;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Team Reports</h1>
        <p className="text-muted-foreground">
          View and edit your agents' daily reports.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Select Agent</CardTitle>
          <CardDescription>
            Choose an agent to view today's daily report.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:w-auto">
            <Label>Agent</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="mt-2 w-full sm:w-[280px]">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
            <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.membership_id} value={agent.membership_id}>
                    {agent.email}
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
        <form
          onSubmit={form.handleSubmit((values) => submitReport(values, 'SUBMITTED'))}
          className="space-y-6"
        >
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={form.handleSubmit((values) => submitReport(values, 'DRAFT'))}
              disabled={isLoading || isSaving}
            >
              Save changes
            </Button>
            <Button type="submit" disabled={isLoading || isSaving}>
              Publish report
            </Button>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activitate Outbound</CardTitle>
                <CardDescription>
                  Key indicators tied to outreach effort.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="outbound_dials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outbound calls made</FormLabel>
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
                      <FormLabel>Calls answered</FormLabel>
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
                      <FormLabel>Conversations &gt; 30s</FormLabel>
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
                <CardTitle>Sales Call Management</CardTitle>
                <CardDescription>
                  Results of scheduled calls.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <FormField
                  control={form.control}
                  name="sales_call_booked_from_outbound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outbound bookings</FormLabel>
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
                      <FormLabel>Calls on Calendar</FormLabel>
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
                      <FormLabel>Reschedule requests</FormLabel>
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
                      <FormLabel>Cancellations</FormLabel>
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
                <CardTitle>Sales Performance</CardTitle>
                <CardDescription>
                  Key sales performance indicators.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="deposits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposits collected</FormLabel>
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
                      <FormLabel>Sales closed on first call</FormLabel>
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
                      <FormLabel>Follow-up sales</FormLabel>
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
                <CardTitle>Upsell Opportunities</CardTitle>
                <CardDescription>Tracking additional sales.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="upsell_conversation_taken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upsell conversations held</FormLabel>
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
                <CardTitle>Financial Values</CardTitle>
                <CardDescription>Financial totals for today.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contract_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total contract value (RON)</FormLabel>
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
                      <FormLabel>New cash collected (RON)</FormLabel>
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
                <CardTitle>Section D — Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <Textarea
                        {...field}
                        placeholder="Add notes, issues encountered, or other relevant context..."
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
