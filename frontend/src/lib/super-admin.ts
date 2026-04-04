import { apiFetch } from './api';

const withAuthHeaders = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export type SuperAdminOverviewResponse = {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
};

export type SuperAdminCompanyListItemResponse = {
  companyId: string;
  name: string;
  planCode: string | null;
  active: boolean;
  createdAt: string;
  userCount: number;
  leadCount: number;
  lastActivityAt: string | null;
  managerCount: number;
};

export type SuperAdminUserListItemResponse = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: string;
  active: boolean;
  lastLoginAt: string | null;
  companies: string[];
  companyRoles: string[];
};

export type SuperAdminCompanyCreateRequest = {
  companyName: string;
  planCode?: string;
  timezone?: string;
  managerEmail: string;
  managerFirstName: string;
  managerLastName: string;
  temporaryPassword?: string;
};

export type SuperAdminCompanyCreateResponse = {
  companyId: string;
  managerUserId: string;
  managerEmail: string;
  usedExistingUser: boolean;
};

export type SuperAdminCompanyStatusUpdateRequest = {
  active: boolean;
};

export type SuperAdminCompanyStatusUpdateResponse = {
  companyId: string;
  active: boolean;
};

export type SuperAdminAnalyticsOverviewResponse = {
  activeCompaniesLast7Days: number;
  activeUsersLast7Days: number;
  pageViewsLast7Days: number;
  activeCompaniesLast30Days: number;
  activeUsersLast30Days: number;
  pageViewsLast30Days: number;
};

export type SuperAdminCompanyActivityResponse = {
  companyId: string;
  companyName: string;
  pageViewsLast7Days: number;
  activeUsersLast7Days: number;
  lastActivityAt: string | null;
};

export type SuperAdminTopPageResponse = {
  path: string;
  routeName: string | null;
  viewsLast7Days: number;
  uniqueCompaniesLast7Days: number;
  uniqueUsersLast7Days: number;
};

export const fetchSuperAdminOverview = async (
  token: string | null
): Promise<SuperAdminOverviewResponse> => {
  return apiFetch<SuperAdminOverviewResponse>('/admin/overview', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchSuperAdminCompanies = async (
  token: string | null
): Promise<SuperAdminCompanyListItemResponse[]> => {
  return apiFetch<SuperAdminCompanyListItemResponse[]>('/admin/companies', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchSuperAdminUsers = async (
  token: string | null
): Promise<SuperAdminUserListItemResponse[]> => {
  return apiFetch<SuperAdminUserListItemResponse[]>('/admin/users', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const createSuperAdminCompany = async (
  payload: SuperAdminCompanyCreateRequest,
  token: string | null
): Promise<SuperAdminCompanyCreateResponse> => {
  return apiFetch<SuperAdminCompanyCreateResponse>('/admin/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const updateSuperAdminCompanyStatus = async (
  companyId: string,
  payload: SuperAdminCompanyStatusUpdateRequest,
  token: string | null
): Promise<SuperAdminCompanyStatusUpdateResponse> => {
  return apiFetch<SuperAdminCompanyStatusUpdateResponse>(
    `/admin/companies/${encodeURIComponent(companyId)}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(withAuthHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }
  );
};

export const getSuperAdminAnalyticsOverview = async (
  token: string | null
): Promise<SuperAdminAnalyticsOverviewResponse> => {
  return apiFetch<SuperAdminAnalyticsOverviewResponse>('/admin/analytics/overview', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const getSuperAdminAnalyticsCompanies = async (
  token: string | null
): Promise<SuperAdminCompanyActivityResponse[]> => {
  return apiFetch<SuperAdminCompanyActivityResponse[]>('/admin/analytics/companies', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const getSuperAdminTopPages = async (
  token: string | null
): Promise<SuperAdminTopPageResponse[]> => {
  return apiFetch<SuperAdminTopPageResponse[]>('/admin/analytics/top-pages', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};
