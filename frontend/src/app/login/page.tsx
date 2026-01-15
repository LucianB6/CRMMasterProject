"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const payload = (await response.json()) as { token: string };
      localStorage.setItem("salesway_token", payload.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Email or password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 lg:px-16">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Login</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your company credentials to access your workspace.
          </p>
          <div className="mt-8 space-y-4 rounded-3xl bg-white p-6 shadow-card">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Secure access
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Your manager creates your account and assigns roles.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Need access? Reach out to your manager for an invite.
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-8 shadow-card"
        >
          <h2 className="text-2xl font-semibold text-ink">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to track daily performance and KPIs.
          </p>
          <div className="mt-6 flex flex-col gap-5">
            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
