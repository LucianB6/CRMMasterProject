'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';

import { ApiError } from '../../../../lib/api';
import { apiFetch } from '../../../../lib/api';
import {
  fetchManagerAgents,
  fetchManagerLeads,
  type LeadSort,
  type LeadSource,
  type LeadStatus,
  type ManagerAgent,
  type ManagerLead,
  type PageResponse,
} from '../../../../lib/leads';
import { useToast } from '../../../../hooks/use-toast';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';

type HasOpenTasksFilter = 'any' | 'true' | 'false';
type AssignedToMode = 'all' | 'me' | 'manual';

type LeadsFiltersState = {
  q: string;
  status: '' | LeadStatus;
  createdFrom: string;
  createdTo: string;
  assignedToMode: AssignedToMode;
  assignedToManual: string;
  hasOpenTasks: HasOpenTasksFilter;
  source: '' | LeadSource;
  sort: '' | LeadSort;
  page: number;
  size: number;
};

type ParsedApiError = {
  message: string;
  fieldErrors: string[];
};

const DEFAULT_FILTERS: LeadsFiltersState = {
  q: '',
  status: '',
  createdFrom: '',
  createdTo: '',
  assignedToMode: 'all',
  assignedToManual: '',
  hasOpenTasks: 'any',
  source: '',
  sort: '',
  page: 0,
  size: 20,
};

const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost'];
const VALID_SOURCES: LeadSource[] = ['META', 'GOOGLE', 'ORGANIC', 'OTHER', 'FORM'];
const VALID_SORTS: LeadSort[] = [
  'submittedAt,asc',
  'submittedAt,desc',
  'lastActivityAt,asc',
  'lastActivityAt,desc',
];

const SORT_FIELDS = ['submittedAt', 'lastActivityAt'] as const;
type SortField = (typeof SORT_FIELDS)[number];

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return parsed;
};

const toSafeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const parseQueryParams = (searchParams: URLSearchParams): LeadsFiltersState => {
  const rawStatus = searchParams.get('status')?.toLowerCase() ?? '';
  const rawSource = searchParams.get('source')?.toUpperCase() ?? '';
  const rawSort = searchParams.get('sort') ?? '';
  const rawAssignedTo = searchParams.get('assignedTo') ?? '';
  const rawHasOpenTasks = searchParams.get('hasOpenTasks');

  const status = VALID_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : '';
  const source = VALID_SOURCES.includes(rawSource as LeadSource)
    ? (rawSource as LeadSource)
    : '';
  const sort = VALID_SORTS.includes(rawSort as LeadSort) ? (rawSort as LeadSort) : '';

  const page = Math.max(0, parsePositiveInt(searchParams.get('page'), DEFAULT_FILTERS.page));
  const size = Math.min(
    100,
    Math.max(1, parsePositiveInt(searchParams.get('size'), DEFAULT_FILTERS.size))
  );

  let assignedToMode: AssignedToMode = 'all';
  let assignedToManual = '';

  if (rawAssignedTo.toLowerCase() === 'me') {
    assignedToMode = 'me';
  } else if (rawAssignedTo.trim()) {
    assignedToMode = 'manual';
    assignedToManual = rawAssignedTo.trim();
  }

  let hasOpenTasks: HasOpenTasksFilter = 'any';
  if (rawHasOpenTasks === 'true') hasOpenTasks = 'true';
  if (rawHasOpenTasks === 'false') hasOpenTasks = 'false';

  return {
    q: searchParams.get('q') ?? '',
    status,
    createdFrom: searchParams.get('createdFrom') ?? '',
    createdTo: searchParams.get('createdTo') ?? '',
    assignedToMode,
    assignedToManual,
    hasOpenTasks,
    source,
    sort,
    page,
    size,
  };
};

const buildQueryParams = (filters: LeadsFiltersState) => {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.status) params.set('status', filters.status);
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);
  if (filters.assignedToMode === 'me') params.set('assignedTo', 'me');
  if (filters.assignedToMode === 'manual' && filters.assignedToManual.trim()) {
    params.set('assignedTo', filters.assignedToManual.trim());
  }
  if (filters.hasOpenTasks !== 'any') params.set('hasOpenTasks', filters.hasOpenTasks);
  if (filters.source) params.set('source', filters.source);
  if (filters.sort) params.set('sort', filters.sort);
  params.set('page', String(Math.max(0, filters.page)));
  params.set('size', String(Math.min(100, Math.max(1, filters.size))));

  return params;
};

const validateFilters = (filters: LeadsFiltersState): string[] => {
  const errors: string[] = [];

  if (filters.page < 0) {
    errors.push('Page index must be 0 or greater.');
  }
  if (filters.size < 1 || filters.size > 100) {
    errors.push('Page size must be between 1 and 100.');
  }
  if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) {
    errors.push('createdFrom cannot be later than createdTo.');
  }
  if (filters.assignedToMode === 'manual' && !filters.assignedToManual.trim()) {
    errors.push('Assigned user id is required in manual mode.');
  }

  return errors;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
};

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const resolveLeadName = (lead: ManagerLead) => {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (lead.email) return lead.email;
  if (lead.phone) return lead.phone;
  return 'Unknown lead';
};

const statusLabel = (status: LeadStatus) => {
  switch (status) {
    case 'new':
      return 'New';
    case 'contacted':
      return 'Contacted';
    case 'qualified':
      return 'Qualified';
    case 'lost':
      return 'Lost';
    default:
      return status;
  }
};

const normalizeLeadStatus = (status: string): LeadStatus => {
  if (VALID_STATUSES.includes(status as LeadStatus)) {
    return status as LeadStatus;
  }
  return 'new';
};

const statusClasses = (status: LeadStatus) => {
  switch (status) {
    case 'new':
      return 'border-blue-200 bg-blue-100 text-blue-700';
    case 'contacted':
      return 'border-sky-200 bg-sky-100 text-sky-700';
    case 'qualified':
      return 'border-cyan-200 bg-cyan-100 text-cyan-700';
    case 'lost':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-blue-200 bg-blue-100 text-blue-700';
  }
};

const parseApiError = (error: unknown): ParsedApiError => {
  if (!(error instanceof ApiError)) {
    return {
      message: error instanceof Error ? error.message : 'Unable to load leads.',
      fieldErrors: [],
    };
  }

  const fallback = error.message || 'Unable to load leads.';
  if (!error.body) {
    return { message: fallback, fieldErrors: [] };
  }

  try {
    const parsed = JSON.parse(error.body) as {
      message?: string;
      fieldErrors?: Array<{ field?: string; message?: string }>;
    };

    const fieldErrors = Array.isArray(parsed.fieldErrors)
      ? parsed.fieldErrors
          .map((entry) => {
            const field = entry.field?.trim();
            const message = entry.message?.trim();
            if (!field && !message) return '';
            if (!field) return message ?? '';
            if (!message) return field;
            return `${field}: ${message}`;
          })
          .filter(Boolean)
      : [];

    return {
      message: parsed.message?.trim() || fallback,
      fieldErrors,
    };
  } catch {
    return {
      message: error.body || fallback,
      fieldErrors: [],
    };
  }
};

export default function ManagerLeadsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<'manager' | 'agent'>('agent');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [agents, setAgents] = useState<ManagerAgent[]>([]);

  const [filters, setFilters] = useState<LeadsFiltersState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<ParsedApiError | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pageData, setPageData] = useState<PageResponse<ManagerLead>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: DEFAULT_FILTERS.size,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  });

  const lastQueryRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = window.localStorage.getItem('userRole');
    setUserRole(role === 'manager' ? 'manager' : 'agent');
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const data = await apiFetch<{
          user_id?: string | null;
          userId?: string | null;
        }>('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCurrentUserId(data.user_id ?? data.userId ?? null);
      } catch {
        setCurrentUserId(null);
      }
    };

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await fetchManagerAgents(getAuthToken());
        setAgents(data);
      } catch {
        setAgents([]);
      }
    };

    void loadAgents();
  }, []);

  useEffect(() => {
    const parsed = parseQueryParams(new URLSearchParams(searchParams.toString()));
    setFilters((prev) => {
      const nextSerialized = JSON.stringify(parsed);
      const prevSerialized = JSON.stringify(prev);
      if (nextSerialized === prevSerialized) return prev;
      return parsed;
    });
    setSearchInput(parsed.q);
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((prev) => {
        const nextQuery = searchInput;
        if (prev.q === nextQuery) return prev;
        return { ...prev, q: nextQuery, page: 0 };
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const params = buildQueryParams(filters);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery || nextQuery === lastQueryRef.current) {
      return;
    }

    lastQueryRef.current = nextQuery;
    const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(url, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  const loadLeads = useCallback(async () => {
    const nextValidationErrors = validateFilters(filters);
    setValidationErrors(nextValidationErrors);
    setServerError(null);

    if (nextValidationErrors.length > 0) {
      return;
    }

    try {
      setIsLoading(true);
      const assignedTo =
        filters.assignedToMode === 'me'
          ? 'me'
          : filters.assignedToMode === 'manual'
            ? filters.assignedToManual.trim()
            : undefined;

      const data = await fetchManagerLeads(
        {
          q: filters.q.trim() || undefined,
          status: filters.status || undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined,
          assignedTo: assignedTo || undefined,
          hasOpenTasks:
            filters.hasOpenTasks === 'any'
              ? undefined
              : filters.hasOpenTasks === 'true',
          source: filters.source || undefined,
          sort: filters.sort || undefined,
          page: filters.page,
          size: filters.size,
        },
        getAuthToken()
      );

      if (userRole === 'agent') {
        const filteredContent = data.content.filter(
          (lead) => !lead.assignedToUserId || (currentUserId && lead.assignedToUserId === currentUserId)
        );

        setPageData({
          ...data,
          content: filteredContent,
          numberOfElements: filteredContent.length,
          totalElements: filteredContent.length,
          totalPages: filteredContent.length > 0 ? 1 : 0,
          number: 0,
          first: true,
          last: true,
          empty: filteredContent.length === 0,
        });
        return;
      }

      setPageData(data);
    } catch (error) {
      const parsed = parseApiError(error);
      setServerError(parsed);
      toast({
        title: 'Unable to load leads',
        description: parsed.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, filters, toast, userRole]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const updateFilters = useCallback((patch: Partial<LeadsFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const onToggleSort = (field: SortField) => {
    updateFilters({
      sort:
        !filters.sort || !filters.sort.startsWith(field)
          ? (`${field},desc` as LeadSort)
          : filters.sort.endsWith('desc')
            ? (`${field},asc` as LeadSort)
            : (`${field},desc` as LeadSort),
      page: 0,
    });
  };

  const currentSortFor = (field: SortField) => {
    if (!filters.sort || !filters.sort.startsWith(field)) return null;
    return filters.sort.endsWith('asc') ? 'asc' : 'desc';
  };

  const renderSortIcon = (field: SortField) => {
    const sort = currentSortFor(field);
    if (sort === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sort === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const hasResults = pageData.content.length > 0;
  const safePageNumber = Math.max(0, toSafeNumber(pageData.number, 0));
  const safePageSize = Math.max(1, toSafeNumber(pageData.size, DEFAULT_FILTERS.size));
  const safeTotalElements = Math.max(0, toSafeNumber(pageData.totalElements, 0));
  const safeTotalPages = Math.max(0, toSafeNumber(pageData.totalPages, 0));
  const safeNumberOfElements = Math.max(
    0,
    toSafeNumber(pageData.numberOfElements, pageData.content.length)
  );
  const displayedResultsLabel =
    safeNumberOfElements === 1 ? '1 rezultat afișat' : `${safeNumberOfElements} rezultate afișate`;

  const fallbackFromItem = safeNumberOfElements === 0 ? 0 : safePageNumber * safePageSize + 1;
  const fallbackToItem =
    safeNumberOfElements === 0 ? 0 : fallbackFromItem + safeNumberOfElements - 1;
  const fromItem = safeTotalElements === 0 ? fallbackFromItem : safePageNumber * safePageSize + 1;
  const toItem =
    safeTotalElements === 0
      ? fallbackToItem
      : Math.min(safeTotalElements, (safePageNumber + 1) * safePageSize);

  const canGoPrevious = safePageNumber > 0;
  const canGoNext = safePageNumber + 1 < safeTotalPages;
  const resolveAssignedToLabel = (assignedToUserId: string | null) => {
    if (!assignedToUserId) return '-';
    const matchedAgent = agents.find((agent) => agent.user_id === assignedToUserId);
    if (matchedAgent?.email) return matchedAgent.email;
    if (currentUserId && assignedToUserId === currentUserId) return 'Eu';
    return assignedToUserId;
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-auto bg-slate-50 p-8">
      <div className="mx-auto flex w-full max-w-[1700px] min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Leads Active</h2>
            <p className="text-slate-500">{displayedResultsLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void loadLeads()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Invalid filter values</AlertTitle>
            <AlertDescription>{validationErrors.join(' ')}</AlertDescription>
          </Alert>
        )}

        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>{serverError.message}</AlertTitle>
            {serverError.fieldErrors.length > 0 && (
              <AlertDescription>{serverError.fieldErrors.join(' | ')}</AlertDescription>
            )}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 border-slate-200 pl-9"
              placeholder="Caută lead după nume, email sau telefon..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              updateFilters({
                status: value === 'all' ? '' : (value as LeadStatus),
                page: 0,
              })
            }
          >
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Status: Toate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: Toate</SelectItem>
              {VALID_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.source || 'all'}
            onValueChange={(value) =>
              updateFilters({
                source: value === 'all' ? '' : (value as LeadSource),
                page: 0,
              })
            }
          >
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Sursă: Toate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sursă: Toate</SelectItem>
              {VALID_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <Filter className="h-4 w-4 text-slate-500" />
            <Select
              value={filters.assignedToMode}
              onValueChange={(value) =>
                updateFilters({
                  assignedToMode: value as AssignedToMode,
                  page: 0,
                })
              }
            >
              <SelectTrigger className="h-10 border-0 bg-transparent px-0 text-slate-600 shadow-none focus:ring-0">
                <SelectValue placeholder="Filtre avansate: Assigned by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Assigned by: Any</SelectItem>
                <SelectItem value="me">Assigned by: Me</SelectItem>
                <SelectItem value="manual">Assigned by: Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filters.assignedToMode === 'manual' && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <Input
              className="h-10 border-slate-200"
              placeholder="Assigned user UUID"
              value={filters.assignedToManual}
              onChange={(event) =>
                updateFilters({ assignedToManual: event.target.value, page: 0 })
              }
            />
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Lead Info
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Source
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assigned To
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onToggleSort('submittedAt')}
                    >
                      Submitted
                      {renderSortIcon('submittedAt')}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onToggleSort('lastActivityAt')}
                    >
                      Last Activity
                      {renderSortIcon('lastActivityAt')}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-sm text-slate-500">
                      Loading leads...
                    </td>
                  </tr>
                )}

                {!isLoading && !hasResults && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-sm text-slate-500">
                      No leads found for the current filters.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  pageData.content.map((lead) => {
                    const normalizedStatus = normalizeLeadStatus(lead.status);
                    return (
                      <tr key={lead.leadId} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-sm font-bold text-blue-600">
                            {resolveLeadName(lead)
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((token) => token[0]?.toUpperCase())
                              .join('') || 'L'}
                          </div>
                          <div>
                            <Link
                              href={`/manager/leads/${encodeURIComponent(lead.leadId)}`}
                              className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                            >
                              {resolveLeadName(lead)}
                            </Link>
                            <p className="break-all text-[10px] uppercase tracking-wide text-slate-400">
                              {lead.leadId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusClasses(normalizedStatus)}`}
                        >
                          {statusLabel(normalizedStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{lead.source ?? '-'}</span>
                          <span className="text-xs text-slate-400">
                            {lead.isDuplicate
                              ? `Duplicate group ${lead.duplicateGroupId ?? '-'}`
                              : 'Marketing Lead'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="break-words">{resolveAssignedToLabel(lead.assignedToUserId)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDateTime(lead.submittedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{formatDateTime(lead.lastActivityAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <a
                            href={lead.email ? `mailto:${lead.email}` : undefined}
                            className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="max-w-[200px] truncate">{lead.email ?? '-'}</span>
                          </a>
                          <a
                            href={lead.phone ? `tel:${lead.phone}` : undefined}
                            className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lead.phone ?? '-'}</span>
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/manager/leads/${encodeURIComponent(lead.leadId)}`}
                          className="inline-flex rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Link>
                      </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/40 px-6 py-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm">
                Rows
              </Label>
              <Select
                value={String(filters.size)}
                onValueChange={(value) =>
                  updateFilters({
                    size: Math.min(100, Math.max(1, Number(value))),
                    page: 0,
                  })
                }
              >
                <SelectTrigger id="page-size" className="w-[96px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                Page {safeTotalPages === 0 ? 0 : safePageNumber + 1} / {safeTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoPrevious || isLoading}
                onClick={() => updateFilters({ page: Math.max(0, filters.page - 1) })}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoNext || isLoading}
                onClick={() => updateFilters({ page: filters.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
