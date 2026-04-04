import { apiFetch } from './api';

const withAuthHeaders = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export type PageViewTrackRequest = {
  path: string;
  routeName?: string | null;
  source?: string | null;
  durationSeconds?: number | null;
};

export type PageViewTrackResponse = {
  status: string;
};

const ROUTE_NAME_PREFIXES: Array<{ prefix: string; routeName: string }> = [
  { prefix: '/super-admin/users', routeName: 'Super Admin Users' },
  { prefix: '/super-admin/companies', routeName: 'Super Admin Companies' },
  { prefix: '/super-admin', routeName: 'Super Admin Overview' },
  { prefix: '/dashboard/manager/leads', routeName: 'Lead Dashboard' },
  { prefix: '/dashboard/tasks', routeName: 'Task Board' },
  { prefix: '/dashboard/report', routeName: 'Daily Report' },
  { prefix: '/dashboard/manager/overview', routeName: 'Manager Overview' },
  { prefix: '/dashboard/history', routeName: 'History' },
  { prefix: '/dashboard/calendar', routeName: 'Calendar' },
  { prefix: '/dashboard/ai-assistant', routeName: 'AI Assistant' },
  { prefix: '/dashboard', routeName: 'Dashboard Overview' },
  { prefix: '/login', routeName: 'Login' },
  { prefix: '/signup', routeName: 'Signup' },
];

export const resolveRouteName = (path: string) => {
  const matched = ROUTE_NAME_PREFIXES.find((entry) => path.startsWith(entry.prefix));
  return matched?.routeName ?? path;
};

export const trackPageView = async (
  payload: PageViewTrackRequest,
  token: string | null
): Promise<PageViewTrackResponse> => {
  return apiFetch<PageViewTrackResponse>('/analytics/page-view', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify({
      path: payload.path,
      routeName: payload.routeName ?? null,
      source: payload.source ?? 'web',
      durationSeconds: payload.durationSeconds ?? null,
    }),
  });
};
