import { apiFetch } from './api';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';
export type LeadSource = 'META' | 'GOOGLE' | 'ORGANIC' | 'OTHER' | 'FORM';
export type LeadSort =
  | 'submittedAt,asc'
  | 'submittedAt,desc'
  | 'lastActivityAt,asc'
  | 'lastActivityAt,desc';

export type ManagerLead = {
  leadId: string;
  status: string;
  submittedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  assignedToUserId: string | null;
  lastActivityAt: string | null;
  source: LeadSource | string | null;
  isDuplicate: boolean;
  duplicateGroupId: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
};

export type LeadsQuery = {
  status?: string;
  page: number;
  size: number;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  assignedTo?: string;
  hasOpenTasks?: boolean;
  source?: string;
  sort?: string;
};

const withAuthHeaders = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const fetchManagerLeads = async (
  query: LeadsQuery,
  token: string | null
): Promise<PageResponse<ManagerLead>> => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('size', String(query.size));

  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.createdFrom) params.set('createdFrom', query.createdFrom);
  if (query.createdTo) params.set('createdTo', query.createdTo);
  if (query.assignedTo) params.set('assignedTo', query.assignedTo);
  if (typeof query.hasOpenTasks === 'boolean') {
    params.set('hasOpenTasks', String(query.hasOpenTasks));
  }
  if (query.source) params.set('source', query.source);
  if (query.sort) params.set('sort', query.sort);

  return apiFetch<PageResponse<ManagerLead>>(`/manager/leads?${params.toString()}`, {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};
