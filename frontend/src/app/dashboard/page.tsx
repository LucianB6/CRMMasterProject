"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "../../hooks/use-toast";

type ApiReportStatus = "DRAFT" | "SUBMITTED" | "AUTO_SUBMITTED";

type ApiReportResponse = {
  id: string;
  reportDate: string;
  status: ApiReportStatus;
  submittedAt: string | null;
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

const emptyReport: ApiReportResponse = {
  id: "",
  reportDate: "",
  status: "DRAFT",
  submittedAt: null,
  inputs: {
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
    new_cash_collected: 0
  }
};

type NormalizedReport = {
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
  };
};

type KpiCard = {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
};

type ActivityRow = {
  label: string;
  value: string;
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<NormalizedReport>(emptyReport);
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    []
  );

  const getAuthToken = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem("token");
  }, []);

  const normalizeReport = useCallback((data: ApiReportResponse): NormalizedReport => {
    const valueOrZero = (value: number | null) => value ?? 0;
    return {
      ...data,
      inputs: {
        outbound_dials: valueOrZero(data.inputs.outbound_dials),
        pickups: valueOrZero(data.inputs.pickups),
        conversations_30s_plus: valueOrZero(data.inputs.conversations_30s_plus),
        sales_call_booked_from_outbound: valueOrZero(
          data.inputs.sales_call_booked_from_outbound
        ),
        sales_call_on_calendar: valueOrZero(data.inputs.sales_call_on_calendar),
        no_show: valueOrZero(data.inputs.no_show),
        reschedule_request: valueOrZero(data.inputs.reschedule_request),
        cancel: valueOrZero(data.inputs.cancel),
        deposits: valueOrZero(data.inputs.deposits),
        sales_one_call_close: valueOrZero(data.inputs.sales_one_call_close),
        followup_sales: valueOrZero(data.inputs.followup_sales),
        upsell_conversation_taken: valueOrZero(
          data.inputs.upsell_conversation_taken
        ),
        upsells: valueOrZero(data.inputs.upsells),
        contract_value: valueOrZero(data.inputs.contract_value),
        new_cash_collected: valueOrZero(data.inputs.new_cash_collected)
      }
    };
  }, []);

  const formatNumber = useCallback((value: number) => {
    return new Intl.NumberFormat("ro-RO").format(value);
  }, []);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }, []);

  const formatPercent = useCallback((value: number) => {
    return `${new Intl.NumberFormat("ro-RO", {
      maximumFractionDigits: 0
    }).format(value)}%`;
  }, []);

  const closingRate = useMemo(() => {
    const totalSales = report.inputs.sales_one_call_close + report.inputs.followup_sales;
    const denominator = report.inputs.sales_call_on_calendar;
    if (denominator <= 0) {
      return 0;
    }
    return (totalSales / denominator) * 100;
  }, [report.inputs.followup_sales, report.inputs.sales_call_on_calendar, report.inputs.sales_one_call_close]);

  const kpis: KpiCard[] = useMemo(
    () => [
      {
        label: "Outbound dials",
        value: formatNumber(report.inputs.outbound_dials),
        deltaLabel: "astăzi"
      },
      {
        label: "Conversations 30s+",
        value: formatNumber(report.inputs.conversations_30s_plus),
        deltaLabel: "astăzi"
      },
      {
        label: "Deposits",
        value: formatCurrency(report.inputs.deposits),
        deltaLabel: "astăzi"
      },
      {
        label: "Total closing rate",
        value: formatPercent(closingRate),
        deltaLabel: "astăzi"
      }
    ],
    [
      closingRate,
      formatCurrency,
      formatNumber,
      formatPercent,
      report.inputs.conversations_30s_plus,
      report.inputs.deposits,
      report.inputs.outbound_dials
    ]
  );

  const activity: ActivityRow[] = useMemo(
    () => [
      {
        label: "Outbound dials",
        value: formatNumber(report.inputs.outbound_dials)
      },
      {
        label: "Calendar booked",
        value: formatNumber(report.inputs.sales_call_on_calendar)
      },
      {
        label: "No show",
        value: formatNumber(report.inputs.no_show)
      }
    ],
    [
      formatNumber,
      report.inputs.no_show,
      report.inputs.outbound_dials,
      report.inputs.sales_call_on_calendar
    ]
  );

  useEffect(() => {
    const fetchDashboardReport = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const response = await fetch(`${apiBaseUrl}/reports/daily/today`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Status ${response.status}`);
        }
        const data = (await response.json()) as ApiReportResponse;
        setReport(normalizeReport(data));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Eroare necunoscută";
        toast({
          title: "Nu am putut încărca datele dashboard-ului",
          description: message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboardReport();
  }, [apiBaseUrl, getAuthToken, normalizeReport, toast]);

  const managerAlertText = isLoading
    ? "Se încarcă activitatea..."
    : "Datele sunt actualizate pe baza raportului zilnic.";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-14">
      <header className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-500">SalesWay</p>
          <h1 className="text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Live overview of today’s activity and team performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-ink">
            Export
          </button>
          <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-glow">
            New report
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              AM
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-ink">Alex Manager</p>
              <p className="text-xs text-slate-500">Manager</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-white p-5 shadow-card"
          >
            <p className="text-xs font-semibold uppercase text-slate-400">
              {kpi.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-ink">{kpi.value}</p>
            {kpi.delta ? (
              <p
                className={`mt-2 text-xs font-semibold ${
                  kpi.delta.startsWith("-") ? "text-rose-500" : "text-emerald-500"
                }`}
              >
                {kpi.delta} vs yesterday
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {kpi.deltaLabel ?? "astăzi"}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Team activity</h2>
          <div className="mt-5 space-y-4">
            {activity.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="text-sm font-semibold text-ink">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Manager alerts</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Status raport zilnic</p>
              <p className="mt-1 text-xs text-amber-700">{managerAlertText}</p>
              <button className="mt-3 text-xs font-semibold text-amber-900 underline">
                Review
              </button>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-semibold">Forecast: $38k this week</p>
              <p className="mt-1 text-xs text-sky-700">
                Based on current activity signals.
              </p>
              <button className="mt-3 text-xs font-semibold text-sky-900 underline">
                Open expected
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
