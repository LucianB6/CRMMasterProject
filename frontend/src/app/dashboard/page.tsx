const kpis = [
  { label: "Outbound dials", value: "128", delta: "+12%" },
  { label: "Conversations 30s+", value: "54", delta: "+5%" },
  { label: "Deposits", value: "$6,400", delta: "+9%" },
  { label: "Total closing rate", value: "23%", delta: "-2%" }
];

const activity = [
  { label: "Outbound dials", value: "610" },
  { label: "Calendar booked", value: "42" },
  { label: "No show", value: "7" }
];

export default function DashboardPage() {
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
            <p
              className={`mt-2 text-xs font-semibold ${
                kpi.delta.startsWith("-") ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {kpi.delta} vs yesterday
            </p>
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
              <p className="font-semibold">2 agents missing updates</p>
              <p className="mt-1 text-xs text-amber-700">
                Remind them to submit daily activity.
              </p>
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
