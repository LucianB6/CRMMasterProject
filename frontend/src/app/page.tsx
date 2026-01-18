import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 lg:px-16">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center gap-12">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-sky-400 text-slate-950 font-semibold flex items-center justify-center">
              SW
            </span>
            <div>
              <p className="text-lg font-semibold text-ink">SalesWay</p>
              <p className="text-sm text-slate-500">
                Workspace for sales teams
              </p>
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-ink">
            Welcome to SalesWay
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Track daily activity, monitor KPIs, and keep every sales rep aligned
            without adding friction to their workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-glow"
          >
            Login
          </Link>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink">
            Contact admin
          </button>
        </div>
      </div>
    </main>
  );
}
