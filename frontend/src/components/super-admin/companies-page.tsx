'use client';

import { Building2, Plus, Search } from 'lucide-react';
import * as React from 'react';

import { createSuperAdminCompany, fetchSuperAdminCompanies, type SuperAdminCompanyCreateRequest, type SuperAdminCompanyListItemResponse, updateSuperAdminCompanyStatus } from '../../lib/super-admin';
import { useToast } from '../../hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ActivityBadge, formatDateTime, getAuthToken } from './ui';

const emptyCreateForm: SuperAdminCompanyCreateRequest = {
  companyName: '',
  planCode: 'STARTER',
  timezone: 'Europe/Bucharest',
  managerEmail: '',
  managerFirstName: '',
  managerLastName: '',
  temporaryPassword: '',
};

export function SuperAdminCompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<SuperAdminCompanyListItemResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<SuperAdminCompanyCreateRequest>(emptyCreateForm);
  const [isCreating, setIsCreating] = React.useState(false);
  const [pendingCompanyId, setPendingCompanyId] = React.useState<string | null>(null);

  const loadCompanies = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await fetchSuperAdminCompanies(getAuthToken());
      setCompanies(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load companies.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = React.useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    if (!normalizedQuery) return companies;

    return companies.filter((company) =>
      [
        company.name,
        company.planCode ?? '',
        company.active ? 'active' : 'inactive',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [companies, searchValue]);

  const handleCreateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsCreating(true);
      const payload = {
        ...createForm,
        planCode: createForm.planCode?.trim() || undefined,
        timezone: createForm.timezone?.trim() || undefined,
        temporaryPassword: createForm.temporaryPassword?.trim() || undefined,
      };
      const result = await createSuperAdminCompany(payload, getAuthToken());

      toast({
        title: 'Company created',
        description: result.usedExistingUser
          ? `Compania a fost creata si managerul existent ${result.managerEmail} a fost reutilizat.`
          : `Compania a fost creata cu managerul ${result.managerEmail}.`,
      });

      setCreateForm(emptyCreateForm);
      setIsCreateOpen(false);
      await loadCompanies();
    } catch (error) {
      toast({
        title: 'Unable to create company',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCompanyStatus = async (
    companyId: string,
    nextActive: boolean
  ) => {
    try {
      setPendingCompanyId(companyId);
      const response = await updateSuperAdminCompanyStatus(
        companyId,
        { active: nextActive },
        getAuthToken()
      );
      setCompanies((current) =>
        current.map((company) =>
          company.companyId === response.companyId
            ? { ...company, active: response.active }
            : company
        )
      );
      toast({
        title: response.active ? 'Company activated' : 'Company deactivated',
      });
    } catch (error) {
      toast({
        title: 'Unable to update company status',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingCompanyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            Companies
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Companii din platforma
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Backoffice list pentru plan, activare, volum de utilizatori si activitate recenta.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by company, plan, status..."
              className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
            />
          </div>
          <Button
            type="button"
            className="h-11 rounded-2xl bg-[#0f172a] text-white hover:bg-slate-800"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create company
          </Button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Company directory</p>
              <p className="text-xs text-slate-500">
                {filteredCompanies.length} rezultate afisate
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
            Internal tool
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="p-5">
            <Alert variant="destructive">
              <AlertTitle>Unable to load companies</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Managers</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    No companies match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.companyId}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-500">{company.companyId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{company.planCode ?? '—'}</TableCell>
                    <TableCell>
                      <ActivityBadge active={company.active} />
                    </TableCell>
                    <TableCell>{formatDateTime(company.createdAt)}</TableCell>
                    <TableCell>{company.userCount}</TableCell>
                    <TableCell>{company.managerCount}</TableCell>
                    <TableCell>{company.leadCount}</TableCell>
                    <TableCell>{formatDateTime(company.lastActivityAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-200"
                        disabled={pendingCompanyId === company.companyId}
                        onClick={() =>
                          void handleToggleCompanyStatus(company.companyId, !company.active)
                        }
                      >
                        {company.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-slate-200 p-0">
          <form onSubmit={handleCreateCompany}>
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>Create company</DialogTitle>
              <DialogDescription>
                Tool intern pentru creare companie si asociere manager initial.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
              <Field label="Company name">
                <Input
                  required
                  value={createForm.companyName}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, companyName: event.target.value }))
                  }
                  placeholder="selfCRM"
                />
              </Field>

              <Field label="Plan code">
                <select
                  value={createForm.planCode ?? ''}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, planCode: event.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="STARTER">STARTER</option>
                  <option value="GROWTH">GROWTH</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </Field>

              <Field label="Timezone">
                <Input
                  value={createForm.timezone ?? ''}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, timezone: event.target.value }))
                  }
                  placeholder="Europe/Bucharest"
                />
              </Field>

              <Field label="Manager email">
                <Input
                  required
                  type="email"
                  value={createForm.managerEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, managerEmail: event.target.value }))
                  }
                  placeholder="manager@company.com"
                />
              </Field>

              <Field label="Manager first name">
                <Input
                  required
                  value={createForm.managerFirstName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      managerFirstName: event.target.value,
                    }))
                  }
                  placeholder="Ana"
                />
              </Field>

              <Field label="Manager last name">
                <Input
                  required
                  value={createForm.managerLastName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      managerLastName: event.target.value,
                    }))
                  }
                  placeholder="Popescu"
                />
              </Field>

              <Field
                label="Temporary password"
                className="md:col-span-2"
                hint="Necesar cand backend-ul creeaza un user nou. Daca email-ul exista deja si poate fi reutilizat, backend-ul poate ignora aceasta parola."
              >
                <Input
                  value={createForm.temporaryPassword ?? ''}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      temporaryPassword: event.target.value,
                    }))
                  }
                  placeholder="Secret123"
                />
              </Field>
            </div>

            <DialogFooter className="border-t border-slate-200 px-6 py-5">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0f172a] text-white hover:bg-slate-800"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </label>
  );
}
