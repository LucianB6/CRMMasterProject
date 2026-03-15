"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeDollarSign,
  CalendarRange,
  CheckCircle,
  Clock,
  Lock,
  Pencil,
  Phone
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Form,
  FormDescription
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/utils";

const reportSchema = z.object({
  outbound_dials: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  pickups: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  conversations_30s_plus: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  sales_call_booked_from_outbound: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  sales_call_on_calendar: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  no_show: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  reschedule_request: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  cancel: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  deposits: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  sales_one_call_close: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  followup_sales: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  upsell_conversation_taken: z.coerce
    .number()
    .int()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  upsells: z.coerce.number().int().min(0, "Valoarea trebuie sa fie pozitiva."),
  contract_value: z.coerce.number().min(0, "Valoarea trebuie sa fie pozitiva."),
  new_cash_collected: z.coerce
    .number()
    .min(0, "Valoarea trebuie sa fie pozitiva."),
  observations: z
    .string()
    .max(1000, "Maxim 1000 de caractere.")
    .optional(),
  confirmation: z
    .boolean()
    .refine((value) => value, {
      message: "Trebuie sa confirmi ca datele sunt corecte."
    })
});

type ReportStatus = "draft" | "submitted" | "locked";

const statusConfig = {
  draft: { text: "Ciorna", icon: Pencil, color: "text-amber-500" },
  submitted: { text: "Trimis", icon: CheckCircle, color: "text-emerald-600" },
  locked: { text: "Blocat", icon: Lock, color: "text-slate-500" }
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
  const [userRole, setUserRole] = useState<"agent" | "manager">("agent");
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

  const resolveStatus = useCallback((apiStatus: ApiReportStatus, reportDate?: string | null) => {
    const today = new Date().toISOString().slice(0, 10);
    const normalizedReportDate = reportDate?.slice(0, 10) ?? null;

    if (normalizedReportDate && normalizedReportDate !== today) {
      return "locked";
    }

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
      setStatus(resolveStatus(data.status, data.reportDate));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Eroare necunoscuta";
      toast({
        title: "Eroare la incarcare",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, getAuthToken, resolveStatus, toast]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const role = window.localStorage.getItem("userRole");
    setUserRole(role === "manager" ? "manager" : "agent");
  }, []);

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
        setStatus(resolveStatus(data.status, data.reportDate));
        toast({
          title: endpoint === "submit" ? "Raport trimis cu succes!" : "Ciorna salvata!",
          description:
            endpoint === "submit"
              ? userRole === "manager"
                ? "Activitatea ta de azi a fost înregistrată."
                : "Managerul tau a fost notificat."
              : "Datele tale au fost salvate."
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Eroare necunoscuta";
        toast({
          title: "Eroare la salvare",
          description: message,
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    },
    [form, getAuthToken, resolveStatus, toast, userRole]
  );

  function onSubmit(values: ReportFormValues) {
    void saveReport("submit", values);
  }

  const isReadOnly = status === "submitted" || status === "locked";
  const { isValid } = form.formState;
  const currentStatusInfo = statusConfig[status];
  const isBusy = isLoading || isSaving;
  const watchedValues = form.watch();
  const toSafeNumber = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1700px] min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
          >
            <div className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 px-8 py-6 backdrop-blur-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Raport zilnic</h1>
                  <p className="text-slate-500">
                    {userRole === "manager"
                      ? "Înregistrează-ți activitatea zilnică în același format folosit de agenți."
                      : "Completează activitatea ta zilnică și trimite raportul către manager."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      {formattedDate}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <currentStatusInfo.icon className={cn("h-4 w-4", currentStatusInfo.color)} />
                      <span className={cn("font-semibold", currentStatusInfo.color)}>
                        {currentStatusInfo.text}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Trimitere automata la 23:59
                    </span>
                  </div>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isReadOnly || isBusy}
                    onClick={() => saveReport("draft", form.getValues())}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Salveaza ciorna
                  </Button>
                  <Button
                    type="submit"
                    disabled={isReadOnly || !isValid || isBusy}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Trimite raportul
                  </Button>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-b border-slate-200 bg-slate-50/60 px-8 py-5">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricSummaryCard
                  label="Outbound"
                  value={toSafeNumber(watchedValues.outbound_dials)}
                  icon={<Phone className="h-5 w-5 text-blue-600" />}
                />
                <MetricSummaryCard
                  label="Call-uri in calendar"
                  value={toSafeNumber(watchedValues.sales_call_on_calendar)}
                  icon={<CalendarRange className="h-5 w-5 text-amber-600" />}
                />
                <MetricSummaryCard
                  label="Vanzari totale"
                  value={
                    toSafeNumber(watchedValues.sales_one_call_close) +
                    toSafeNumber(watchedValues.followup_sales)
                  }
                  icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                />
                <MetricSummaryCard
                  label="Valoare contracte"
                  value={toSafeNumber(watchedValues.contract_value)}
                  icon={<BadgeDollarSign className="h-5 w-5 text-indigo-600" />}
                  formatter={(value) => `${value} RON`}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 px-8 py-6">
              <div className="space-y-6 pb-8">
                <SectionCard
                  title="Activitate Outbound"
                  description="Indicatorii principali pentru activitatea de prospectare."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <NumericField form={form} name="outbound_dials" label="Apeluri outbound efectuate" readOnly={isReadOnly} />
                    <NumericField form={form} name="pickups" label="Apeluri preluate" readOnly={isReadOnly} />
                    <NumericField
                      form={form}
                      name="conversations_30s_plus"
                      label="Conversatii > 30 sec"
                      readOnly={isReadOnly}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Management Sales Call"
                  description="Rezultatele apelurilor programate."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <NumericField
                      form={form}
                      name="sales_call_booked_from_outbound"
                      label="Sales call-uri din outbound"
                      readOnly={isReadOnly}
                    />
                    <NumericField
                      form={form}
                      name="sales_call_on_calendar"
                      label="Call-uri in calendar"
                      readOnly={isReadOnly}
                    />
                    <NumericField form={form} name="no_show" label="No-show" readOnly={isReadOnly} />
                    <NumericField
                      form={form}
                      name="reschedule_request"
                      label="Cereri de reprogramare"
                      readOnly={isReadOnly}
                    />
                    <NumericField form={form} name="cancel" label="Anulari" readOnly={isReadOnly} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Performanta vanzari"
                  description="Indicatorii principali de performanta in vanzari."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <NumericField form={form} name="deposits" label="Depozite colectate" readOnly={isReadOnly} />
                    <NumericField
                      form={form}
                      name="sales_one_call_close"
                      label="Vanzari inchise din primul apel"
                      readOnly={isReadOnly}
                    />
                    <NumericField
                      form={form}
                      name="followup_sales"
                      label="Vanzari din follow-up"
                      readOnly={isReadOnly}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Oportunitati de upsell"
                  description="Urmarirea vanzarilor suplimentare."
                >
                  <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
                    <NumericField
                      form={form}
                      name="upsell_conversation_taken"
                      label="Conversatii de upsell"
                      readOnly={isReadOnly}
                    />
                    <NumericField form={form} name="upsells" label="Upsell-uri realizate" readOnly={isReadOnly} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Valori financiare"
                  description="Totalurile financiare pentru ziua de azi."
                >
                  <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
                    <NumericField
                      form={form}
                      name="contract_value"
                      label="Valoare totala contracte (RON)"
                      readOnly={isReadOnly}
                      step="0.01"
                    />
                    <NumericField
                      form={form}
                      name="new_cash_collected"
                      label="Cash nou colectat (RON)"
                      readOnly={isReadOnly}
                      step="0.01"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Notite">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900" htmlFor="observations">
                      Notite
                    </label>
                    <Textarea
                      id="observations"
                      {...form.register("observations")}
                      placeholder={
                        userRole === "manager"
                          ? "Add notes, blockers, or any context relevant to your own activity today..."
                          : "Add notes, issues encountered, or other context relevant to your manager..."
                      }
                      className="min-h-[120px] border-slate-200"
                      maxLength={1000}
                      readOnly={isReadOnly}
                    />
                    {form.formState.errors.observations ? (
                      <p className="text-sm font-medium text-destructive">
                        {String(form.formState.errors.observations.message ?? "")}
                      </p>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard title="Confirmare si responsabilitate">
                  <div className="flex flex-row items-start space-x-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Checkbox
                      checked={Boolean(form.watch("confirmation"))}
                      onCheckedChange={(checked) =>
                        form.setValue("confirmation", checked === true, { shouldValidate: true })
                      }
                      disabled={isReadOnly}
                    />
                    <div className="space-y-1 leading-none">
                      <label className="text-sm font-medium text-slate-900">
                        Confirm ca datele introduse sunt corecte si complete.
                      </label>
                      <FormDescription>
                        Bifand aceasta casuta, iti asumi responsabilitatea pentru informatiile din acest raport.
                      </FormDescription>
                      {form.formState.errors.confirmation ? (
                        <p className="text-sm font-medium text-destructive">
                          {String(form.formState.errors.confirmation.message ?? "")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function MetricSummaryCard({
  label,
  value,
  icon,
  formatter
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  formatter?: (value: number) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatter ? formatter(value) : value}
          </p>
        </div>
        <div className="rounded-full bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}

function NumericField({
  form,
  name,
  label,
  readOnly,
  step
}: {
  form: ReturnType<typeof useForm<ReportFormValues>>;
  name: keyof ReportFormValues;
  label: string;
  readOnly: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900" htmlFor={String(name)}>
        {label}
      </label>
      <Input
        id={String(name)}
        type="number"
        min="0"
        step={step}
        {...form.register(name)}
        readOnly={readOnly}
        className="h-12 border-slate-200 px-4 text-base"
      />
      {form.formState.errors[name] ? (
        <p className="text-sm font-medium text-destructive">
          {String(form.formState.errors[name]?.message ?? "")}
        </p>
      ) : null}
    </div>
  );
}
