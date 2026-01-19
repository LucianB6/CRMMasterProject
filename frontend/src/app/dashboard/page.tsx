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
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_auto] sm:gap-6">
            <div className="space-y-1">
              <p className="font-headline text-xl">
                {new Date().toLocaleDateString("ro-RO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", currentStatus.color)} />
                <span className={cn("font-semibold", currentStatus.color)}>
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
                pana la publicare automata
              </p>
            </div>
            <Button
              size="lg"
              disabled={reportStatus === "locked"}
              className="w-full shrink-0 sm:w-auto"
              onClick={() => router.push("/dashboard/report")}
            >
              {currentStatus.buttonText}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Quick Stats - Azi
        </h2>
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
                {reportStatus === "draft" && (
                  <p className="text-xs text-yellow-500">date nefinalizate</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
                <BarChart data={personalHistoryData["7"]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))"
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
                    name="Vanzari"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="30">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={personalHistoryData["30"]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))"
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
                    name="Vanzari"
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
          <CardTitle>Notificari personale</CardTitle>
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
