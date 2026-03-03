'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { ApiError } from '../../../../lib/api';
import {
  fetchManagerLeads,
  type LeadSort,
  type LeadSource,
  type LeadStatus,
  type ManagerLead,
  type PageResponse,
} from '../../../../lib/leads';
import { useToast } from '../../../../hooks/use-toast';
import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
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
  }, [filters, toast]);

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

  const fromItem = pageData.totalElements === 0 ? 0 : pageData.number * pageData.size + 1;
  const toItem = Math.min(pageData.totalElements, (pageData.number + 1) * pageData.size);

  const canGoPrevious = pageData.number > 0;
  const canGoNext = pageData.number + 1 < pageData.totalPages;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6 overflow-hidden">
      <Card className="flex min-h-0 w-full max-w-full flex-1 flex-col">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
          <CardTitle>Lead List</CardTitle>
          <CardDescription>
            Showing {fromItem}-{toItem} of {pageData.totalElements} leads.
          </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Reset
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadLeads()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
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

          <div className="min-h-0 w-full max-w-full flex-1 overflow-auto rounded-md border">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Lead</TableHead>
                  <TableHead className="min-w-[130px]">Status</TableHead>
                  <TableHead className="min-w-[130px]">Source</TableHead>
                  <TableHead className="min-w-[210px]">Assigned To</TableHead>
                  <TableHead className="min-w-[170px]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => onToggleSort('submittedAt')}
                  >
                    Submitted
                    {renderSortIcon('submittedAt')}
                  </button>
                  </TableHead>
                  <TableHead className="min-w-[170px]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => onToggleSort('lastActivityAt')}
                  >
                    Last Activity
                    {renderSortIcon('lastActivityAt')}
                  </button>
                  </TableHead>
                  <TableHead className="min-w-[290px]">Contact</TableHead>
                  <TableHead className="min-w-[140px]">Duplicate</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead>
                  <Input
                    className="h-8 w-full min-w-[220px]"
                    placeholder="Search..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                  </TableHead>
                  <TableHead>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                      updateFilters({
                        status: value === 'all' ? '' : (value as LeadStatus),
                        page: 0,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {VALID_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </TableHead>
                  <TableHead>
                  <Select
                    value={filters.source || 'all'}
                    onValueChange={(value) =>
                      updateFilters({
                        source: value === 'all' ? '' : (value as LeadSource),
                        page: 0,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {VALID_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </TableHead>
                  <TableHead>
                  <div className="flex min-w-[170px] flex-col gap-1">
                    <Select
                      value={filters.assignedToMode}
                      onValueChange={(value) =>
                        updateFilters({
                          assignedToMode: value as AssignedToMode,
                          page: 0,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="me">Me</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    {filters.assignedToMode === 'manual' && (
                      <Input
                        className="h-8 w-[200px]"
                        placeholder="UUID"
                        value={filters.assignedToManual}
                        onChange={(event) =>
                          updateFilters({ assignedToManual: event.target.value, page: 0 })
                        }
                      />
                    )}
                  </div>
                  </TableHead>
                  <TableHead>
                  <Input
                    className="h-8 w-[150px]"
                    type="date"
                    value={filters.createdFrom}
                    onChange={(event) =>
                      updateFilters({ createdFrom: event.target.value, page: 0 })
                    }
                  />
                  </TableHead>
                  <TableHead>
                  <Input
                    className="h-8 w-[150px]"
                    type="date"
                    value={filters.createdTo}
                    onChange={(event) =>
                      updateFilters({ createdTo: event.target.value, page: 0 })
                    }
                  />
                  </TableHead>
                  <TableHead />
                  <TableHead>
                  <Select
                    value={filters.hasOpenTasks}
                    onValueChange={(value) =>
                      updateFilters({
                        hasOpenTasks: value as HasOpenTasksFilter,
                        page: 0,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All</SelectItem>
                      <SelectItem value="true">Open tasks</SelectItem>
                      <SelectItem value="false">No open tasks</SelectItem>
                    </SelectContent>
                  </Select>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading leads...
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !hasResults && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No leads found for the current filters.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                pageData.content.map((lead) => (
                  <TableRow key={lead.leadId}>
                    <TableCell className="min-w-[260px]">
                      <div className="font-medium">{resolveLeadName(lead)}</div>
                      <div className="break-all text-xs text-muted-foreground">{lead.leadId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.status}</Badge>
                    </TableCell>
                    <TableCell>{lead.source ?? '-'}</TableCell>
                    <TableCell className="min-w-[210px] break-all text-xs">
                      {lead.assignedToUserId ?? '-'}
                    </TableCell>
                    <TableCell>{formatDateTime(lead.submittedAt)}</TableCell>
                    <TableCell>{formatDateTime(lead.lastActivityAt)}</TableCell>
                    <TableCell className="min-w-[290px]">
                      <div>{lead.email ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">{lead.phone ?? '-'}</div>
                    </TableCell>
                    <TableCell>
                      {lead.isDuplicate ? (
                        <Badge variant="secondary">Group {lead.duplicateGroupId ?? '-'}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm">
                Rows per page
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
              <span className="text-sm text-muted-foreground">
                Page {pageData.totalPages === 0 ? 0 : pageData.number + 1} / {pageData.totalPages}
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
        </CardContent>
      </Card>
    </div>
  );
}
