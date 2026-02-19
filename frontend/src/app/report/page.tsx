"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle,
  Clock,
  Lock,
  Pencil
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/utils";


const reportSchema = z.object({
  outbound_dials: z.coerce.number().int().min(0, "Positive value required."),
  pickups: z.coerce.number().int().min(0, "Positive value required."),
  conversations_30s_plus: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  sales_call_booked_from_outbound: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  sales_call_on_calendar: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  no_show: z.coerce.number().int().min(0, "Positive value required."),
  reschedule_request: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  cancel: z.coerce.number().int().min(0, "Positive value required."),
  deposits: z.coerce.number().int().min(0, "Positive value required."),
  sales_one_call_close: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  followup_sales: z.coerce.number().int().min(0, "Positive value required."),
  upsell_conversation_taken: z.coerce
    .number()
    .int()
    .min(0, "Positive value required."),
  upsells: z.coerce.number().int().min(0, "Positive value required."),
  contract_value: z.coerce.number().min(0, "Value must be positive."),
  new_cash_collected: z.coerce
    .number()
    .min(0, "Value must be positive."),
  observations: z
    .string()
    .max(1000, "Maxim 1000 de caractere.")
    .optional(),
  confirmation: z
    .boolean()
    .refine((value) => value, {
      message: "You must confirm the data is correct."
    })
});

type ReportStatus = "draft" | "submitted" | "locked";
const statusConfig = {
  draft: { text: "Draft", icon: Pencil, color: "text-yellow-500" },
  submitted: { text: "Submitted", icon: CheckCircle, color: "text-green-500" },
  locked: { text: "Locked", icon: Lock, color: "text-muted-foreground" }
};

type ReportFormValues = z.infer<typeof reportSchema>;

type ApiReportStatus = "DRAFT" | "SUBMITTED" | "AUTO_SUBMITTED";

type ApiReportResponse = {
  id: string;
  reportDate: string;
  status: ApiReportStatus;
  submittedAt: string | null;
  inputs: {
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
    observations?: string;
  };
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
  observations: "",
  confirmation: false
};

export default function DailyReportPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ReportStatus>("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      ...baseReportValues
    }
  });

  const resolveStatus = useCallback((apiStatus: ApiReportStatus) => {
    if (apiStatus === "SUBMITTED" || apiStatus === "AUTO_SUBMITTED") {
      return "submitted";
    }
    return "draft";
  }, []);

  const getAuthToken = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem("salesway_token");
  }, []);

  const fetchTodayReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const data = await apiFetch<ApiReportResponse>("/reports/daily/today", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const nextValues: ReportFormValues = {
        ...baseReportValues,
        ...data.inputs,
        observations: data.inputs?.observations ?? baseReportValues.observations
      };
      form.reset(nextValues);
      setStatus(resolveStatus(data.status));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Load error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, getAuthToken, resolveStatus, toast]);

  useEffect(() => {
    void fetchTodayReport();
  }, [fetchTodayReport]);

  const saveReport = useCallback(
    async (endpoint: "draft" | "submit", values: ReportFormValues) => {
      setIsSaving(true);
      try {
        const token = getAuthToken();
        const { confirmation, ...payload } = values;
        const data = await apiFetch<ApiReportResponse>(`/reports/daily/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
        form.reset({ ...values, confirmation });
        setStatus(resolveStatus(data.status));
        toast({
          title:
            endpoint === "submit"
              ? "Report submitted successfully!"
              : "Draft salvat!",
          description:
            endpoint === "submit"
              ? "Your manager has been notified."
              : "Datele tale au fost salvate."
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast({
          title: "Save error",
          description: message,
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    },
    [form, getAuthToken, resolveStatus, toast]
  );

  function onSubmit(values: ReportFormValues) {
    void saveReport("submit", values);
  }

  const isReadOnly = status === "submitted" || status === "locked";
  const { isValid } = form.formState;
  const currentStatusInfo = statusConfig[status];
  const isBusy = isLoading || isSaving;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 px-4 pb-10 pt-4 md:px-6"
      >
        <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-xl">
                Daily report: {formattedDate}
              </h1>
              <div className="flex items-center gap-2 text-sm">
                <currentStatusInfo.icon
                  className={cn("h-4 w-4", currentStatusInfo.color)}
                />
                <span className={cn("font-semibold", currentStatusInfo.color)}>
                  Status: {currentStatusInfo.text}
                </span>
                <span className="text-muted-foreground">|</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Auto-publish at 19:00
                </span>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                type="button"
                disabled={isReadOnly || isBusy}
                onClick={() => saveReport("draft", form.getValues())}
              >
                Save draft
              </Button>
              <Button type="submit" disabled={isReadOnly || !isValid || isBusy}>
                Submit report
              </Button>
            </div>
          </div>
        </header>

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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
              <CardDescription>Results of scheduled calls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <FormField
                control={form.control}
                name="sales_call_booked_from_outbound"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outbound</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        readOnly={isReadOnly}
                      />
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
                      placeholder="Add notes, issues encountered, or other context relevant to your manager..."
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

          <Card>
            <CardHeader>
              <CardTitle>Section E — Confirmation & Responsibility</CardTitle>
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
                        I confirm the entered data is correct and complete.
                      </FormLabel>
                      <FormDescription>
                        By checking this box, you take responsibility
                        for the information in this report.
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
