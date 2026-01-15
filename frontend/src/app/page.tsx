import Link from "next/link";

const features = [
  { label: "Realtime transparency", value: "Live activity" },
  { label: "KPI reporting", value: "Sales metrics" },
  { label: "Team alignment", value: "Shared goals" }
];

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr]">
      <aside className="bg-ink text-slate-200 px-8 py-10 flex flex-col gap-10">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-2xl bg-sky-400 text-slate-950 font-semibold flex items-center justify-center">
            SW
          </span>
          <div>
            <p className="text-lg font-semibold">SalesWay</p>
            <p className="text-sm text-slate-400">Workspace for sales teams</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Quick links
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <span className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2">
              Login
            </span>
            <span className="rounded-xl border border-slate-700 px-4 py-2">
              Dashboard preview
            </span>
            <span className="rounded-xl border border-slate-700 px-4 py-2">
              Activity reports
            </span>
          </div>
        </div>
        <div className="mt-auto flex gap-2 text-xs text-slate-400">
          <span className="rounded-full bg-slate-800 px-3 py-1">Manager</span>
          <span className="rounded-full bg-slate-800 px-3 py-1">Company</span>
        </div>
      </aside>

      <section className="bg-slate-100 px-6 py-12 lg:px-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="bg-white rounded-3xl shadow-card p-8">
            <h1 className="text-3xl font-semibold text-ink">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to track daily performance and team momentum.
            </p>
            <form className="mt-8 flex flex-col gap-5">
              <label className="text-sm font-medium text-slate-700">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                  type="email"
                  placeholder="name@company.com"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Password
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </label>
              <button
                type="button"
                className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-glow"
              >
                Login
              </button>
            </form>
            <div className="mt-6 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Need access?</span>
              <button className="font-semibold text-sky-500">Ask your manager</button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-ink">
              Daily clarity for every sales rep.
            </h2>
            <p className="text-sm text-slate-500">
              SalesWay keeps the team aligned with live metrics, automated KPIs,
              and a clear view of performance across calls, conversions, and
              cash collected.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-2xl bg-white p-4 shadow-card"
                >
                  <p className="text-lg font-semibold text-ink">
                    {feature.value}
                  </p>
                  <p className="text-xs text-slate-500">{feature.label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              Preview dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
