'use client';

import { Search, Shield, Users } from 'lucide-react';
import * as React from 'react';

import { fetchSuperAdminUsers, type SuperAdminUserListItemResponse } from '../../lib/super-admin';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
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
import { ActivityBadge, formatDateTime, formatName, getAuthToken } from './ui';

export function SuperAdminUsersPage() {
  const [users, setUsers] = React.useState<SuperAdminUserListItemResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState('');

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await fetchSuperAdminUsers(getAuthToken());
        setUsers(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load users.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const filteredUsers = React.useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) =>
      [
        user.email,
        user.firstName ?? '',
        user.lastName ?? '',
        user.platformRole,
        user.companies.join(' '),
        user.companyRoles.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [searchValue, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            Users
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Utilizatori la nivel de platforma
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Vizibilitate rapida pe rol global, companii asociate si ultima autentificare.
          </p>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by email, role, company..."
            className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
          />
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-35px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Platform users</p>
              <p className="text-xs text-slate-500">
                {filteredUsers.length} rezultate afisate
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
            Global roles visible
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
              <AlertTitle>Unable to load users</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Platform role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Company roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No users match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {formatName(user.firstName, user.lastName)}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="gap-1 border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                        <Shield size={12} />
                        {user.platformRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActivityBadge active={user.active} />
                    </TableCell>
                    <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {user.companies.length > 0 ? (
                          user.companies.map((company) => (
                            <Badge
                              key={company}
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-slate-700"
                            >
                              {company}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {user.companyRoles.length > 0 ? (
                          user.companyRoles.map((role) => (
                            <Badge
                              key={`${user.userId}-${role}`}
                              variant="outline"
                              className="border-slate-200 bg-white text-slate-700"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
