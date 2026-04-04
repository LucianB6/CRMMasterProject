import { apiFetch } from './api';

export type BillingCurrentPlanResponse = {
  planCode?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  includedSeats?: number | null;
  aiAssistantLimit?: number | null;
  aiInsightsLimit?: number | null;
};

export type BillingUsageMetric = {
  code?: string | null;
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
};

export type BillingUsageResponse = {
  metrics?: BillingUsageMetric[] | null;
  aiAssistantUsed?: number | null;
  aiAssistantLimit?: number | null;
  aiAssistantRemaining?: number | null;
  aiInsightsUsed?: number | null;
  aiInsightsLimit?: number | null;
  aiInsightsRemaining?: number | null;
};

export type BillingEntitlementsResponse = {
  planCode?: string | null;
  subscriptionStatus?: string | null;
  aiAssistantEnabled?: boolean | null;
  aiInsightsEnabled?: boolean | null;
  canInviteUsers?: boolean | null;
  canCreateAgents?: boolean | null;
  includedSeats?: number | null;
  activeSeats?: number | null;
  pendingInvites?: number | null;
  availableSeats?: number | null;
  aiAssistantLimit?: number | null;
  aiAssistantUsed?: number | null;
  aiAssistantRemaining?: number | null;
  aiInsightsLimit?: number | null;
  aiInsightsUsed?: number | null;
  aiInsightsRemaining?: number | null;
};

const withAuthHeaders = (token: string | null) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const getBillingCurrentPlan = (token: string | null) =>
  apiFetch<BillingCurrentPlanResponse>('/billing/current-plan', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });

export const getBillingUsage = (token: string | null) =>
  apiFetch<BillingUsageResponse>('/billing/usage', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });

export const getBillingEntitlements = (token: string | null) =>
  apiFetch<BillingEntitlementsResponse>('/billing/entitlements', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
