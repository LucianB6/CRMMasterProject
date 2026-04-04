'use client';

import { CreditCard, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';
import {
  getBillingCurrentPlan,
  getBillingEntitlements,
  getBillingUsage,
  type BillingCurrentPlanResponse,
  type BillingEntitlementsResponse,
  type BillingUsageResponse,
} from '../../../lib/billing';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
};

const safeNumber = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, value);
};

const formatPeriodEnd = (value: string | null | undefined) => {
  if (!value) return 'Nedisponibil';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(date);
};

const formatPlan = (value: string | null | undefined) => (value?.trim() ? value : 'N/A');

const formatStatus = (value: string | null | undefined) =>
  value?.trim() ? value.replaceAll('_', ' ').toLowerCase() : 'unknown';

export default function BillingPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<BillingCurrentPlanResponse | null>(null);
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null);

  const refreshBilling = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setErrorMessage('Nu există sesiune activă.');
      return;
    }

    setErrorMessage(null);
    setIsRefreshing(true);
    try {
      const [currentPlanData, usageData, entitlementsData] = await Promise.all([
        getBillingCurrentPlan(token),
        getBillingUsage(token),
        getBillingEntitlements(token),
      ]);
      setCurrentPlan(currentPlanData);
      setUsage(usageData);
      setEntitlements(entitlementsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load billing information.';
      setErrorMessage(message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  const planCode = entitlements?.planCode ?? currentPlan?.planCode ?? null;
  const subscriptionStatus = entitlements?.subscriptionStatus ?? currentPlan?.subscriptionStatus ?? null;
  const periodEnd = currentPlan?.currentPeriodEnd ?? null;

  const seatSummary = useMemo(() => {
    const includedSeats = safeNumber(entitlements?.includedSeats ?? currentPlan?.includedSeats);
    const activeSeats = safeNumber(entitlements?.activeSeats);
    const pendingInvites = safeNumber(entitlements?.pendingInvites);
    const availableSeats = safeNumber(entitlements?.availableSeats);
    const usedSeatSlots = activeSeats + pendingInvites;
    const seatProgress = includedSeats > 0 ? Math.min(100, Math.round((usedSeatSlots / includedSeats) * 100)) : 0;
    return {
      includedSeats,
      activeSeats,
      pendingInvites,
      availableSeats,
      usedSeatSlots,
      seatProgress,
    };
  }, [currentPlan?.includedSeats, entitlements?.activeSeats, entitlements?.availableSeats, entitlements?.includedSeats, entitlements?.pendingInvites]);

  const aiAssistantUsed = safeNumber(entitlements?.aiAssistantUsed ?? usage?.aiAssistantUsed);
  const aiAssistantLimit = safeNumber(entitlements?.aiAssistantLimit ?? usage?.aiAssistantLimit);
  const aiAssistantRemaining = safeNumber(entitlements?.aiAssistantRemaining ?? usage?.aiAssistantRemaining);
  const aiAssistantProgress =
    aiAssistantLimit > 0 ? Math.min(100, Math.round((aiAssistantUsed / aiAssistantLimit) * 100)) : 0;

  const aiInsightsUsed = safeNumber(entitlements?.aiInsightsUsed ?? usage?.aiInsightsUsed);
  const aiInsightsLimit = safeNumber(entitlements?.aiInsightsLimit ?? usage?.aiInsightsLimit);
  const aiInsightsRemaining = safeNumber(entitlements?.aiInsightsRemaining ?? usage?.aiInsightsRemaining);
  const aiInsightsProgress =
    aiInsightsLimit > 0 ? Math.min(100, Math.round((aiInsightsUsed / aiInsightsLimit) * 100)) : 0;

  useEffect(() => {
    if (!errorMessage || isLoading) return;
    toast({
      title: 'Billing unavailable',
      description: errorMessage,
      variant: 'destructive',
    });
  }, [errorMessage, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6 bg-slate-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500">Plan curent, usage și entitlement-uri active.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshBilling()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<CreditCard className="h-5 w-5 text-sky-600" />}
          label="Plan curent"
          value={formatPlan(planCode)}
          description={`Status: ${formatStatus(subscriptionStatus)}`}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-indigo-600" />}
          label="Seats incluse"
          value={`${seatSummary.includedSeats}`}
          description={`${seatSummary.activeSeats} active, ${seatSummary.pendingInvites} pending`}
        />
        <SummaryCard
          icon={<RefreshCw className="h-5 w-5 text-emerald-600" />}
          label="Perioadă curentă"
          value={formatPeriodEnd(periodEnd)}
          description={`Locuri disponibile: ${seatSummary.availableSeats}`}
        />
      </div>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Team / Seats</h2>
        <Progress value={seatSummary.seatProgress} className="h-2 bg-slate-100 [&>div]:bg-[#38bdf8]" />
        <p className="text-sm text-slate-600">
          Folosite: {seatSummary.usedSeatSlots}/{seatSummary.includedSeats} (active + pending invites)
        </p>
        {entitlements?.canInviteUsers === false ? (
          <p className="text-sm font-medium text-amber-700">Limită atinsă: nu mai poți trimite invitații noi.</p>
        ) : null}
      </section>

      <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Usage</h2>

        <UsageBar
          title="AI Assistant"
          used={aiAssistantUsed}
          limit={aiAssistantLimit}
          remaining={aiAssistantRemaining}
          progress={aiAssistantProgress}
          enabled={entitlements?.aiAssistantEnabled !== false}
        />

        <UsageBar
          title="AI Insights"
          used={aiInsightsUsed}
          limit={aiInsightsLimit}
          remaining={aiInsightsRemaining}
          progress={aiInsightsProgress}
          enabled={entitlements?.aiInsightsEnabled !== false}
        />
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="rounded-full bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}

function UsageBar({
  title,
  used,
  limit,
  remaining,
  progress,
  enabled,
}: {
  title: string;
  used: number;
  limit: number;
  remaining: number;
  progress: number;
  enabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">
          {used}/{limit} used
        </p>
      </div>
      <Progress value={progress} className="h-2 bg-slate-100 [&>div]:bg-[#38bdf8]" />
      <p className="text-xs text-slate-500">Remaining: {remaining}</p>
      {!enabled ? (
        <p className="text-xs font-medium text-amber-700">
          Această funcționalitate este blocată de planul curent sau de limita lunară.
        </p>
      ) : null}
    </div>
  );
}
