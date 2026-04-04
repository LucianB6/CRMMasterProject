'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Link2, Mail, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '../../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import { useToast } from '../../../../hooks/use-toast';
import { apiFetch } from '../../../../lib/api';
import { getBillingEntitlements, type BillingEntitlementsResponse } from '../../../../lib/billing';

const createInviteSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address.')
    .max(255, 'Email must be at most 255 characters.'),
});

type CreateInviteValues = z.infer<typeof createInviteSchema>;

type ManagerInvitationResponse = {
  invitationId: string;
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
  status: string;
};

const formatExpiry = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function CreateAgentPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<ManagerInvitationResponse | null>(null);
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null);
  const [isLoadingEntitlements, setIsLoadingEntitlements] = useState(true);

  const form = useForm<CreateInviteValues>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: '',
    },
  });

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const refreshEntitlements = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoadingEntitlements(false);
      return;
    }
    try {
      const data = await getBillingEntitlements(token);
      setEntitlements(data);
    } catch {
      setEntitlements(null);
    } finally {
      setIsLoadingEntitlements(false);
    }
  }, [getAuthToken]);

  const canInviteUsers = entitlements?.canInviteUsers !== false;
  const canCreateAgents = entitlements?.canCreateAgents !== false;
  const seatsLimitReached = !canInviteUsers || !canCreateAgents;

  const seatInfo = {
    included: entitlements?.includedSeats ?? 0,
    active: entitlements?.activeSeats ?? 0,
    pending: entitlements?.pendingInvites ?? 0,
    available: entitlements?.availableSeats ?? 0,
  };

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard.`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: `Unable to copy ${label.toLowerCase()}.`,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const onSubmit = useCallback(
    async (values: CreateInviteValues) => {
      if (seatsLimitReached) {
        toast({
          title: 'Plan seat limit reached',
          description: 'Nu poți crea invitații noi până nu eliberezi locuri sau faci upgrade.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setIsSubmitting(true);
        const token = getAuthToken();
        const data = await apiFetch<ManagerInvitationResponse>('/manager/invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: values.email,
          }),
        });

        setCreatedInvite(data);
        await refreshEntitlements();
        toast({
          title: 'Invitation created',
          description: `Invite prepared for ${values.email}.`,
        });
        form.reset({ email: values.email });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to create invitation.';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        if (message.toLowerCase().includes('plan seat limit reached')) {
          setEntitlements((current) => ({
            ...(current ?? {}),
            canInviteUsers: false,
            canCreateAgents: false,
            availableSeats: 0,
          }));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, getAuthToken, refreshEntitlements, seatsLimitReached, toast]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6 bg-slate-50">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-slate-500">
            Generează o invitație unică pentru un nou agent, în același stil de onboarding ca în
            restul aplicației.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Invitație securizată
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<UserPlus className="h-5 w-5 text-sky-600" />}
          label="Flow"
          value="Single-use invite"
          description="Fiecare link poate fi folosit o singură dată pentru activarea contului."
        />
        <SummaryCard
          icon={<Mail className="h-5 w-5 text-indigo-600" />}
          label="Sign-in"
          value="Google match"
          description="Agentul trebuie să intre cu același email pe care îl inviți aici."
        />
        <SummaryCard
          icon={<Sparkles className="h-5 w-5 text-amber-600" />}
          label="Delivery"
          value={createdInvite ? 'Ready to send' : 'Waiting'}
          description="După generare, poți copia imediat linkul sau tokenul de invitație."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Invitation Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Introdu email-ul agentului și generează linkul de activare.
            </p>
          </div>

          <div className="p-6">
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Seats: {seatInfo.active} active + {seatInfo.pending} pending / {seatInfo.included}{' '}
              incluse. Disponibile: {seatInfo.available}
            </div>
            {seatsLimitReached ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Plan seat limit reached. Nu poți crea invitații noi până nu eliberezi locuri sau
                faci upgrade.
              </div>
            ) : null}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Agent Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="agent@example.com"
                          {...field}
                          type="email"
                          disabled={isLoadingEntitlements || seatsLimitReached}
                          className="border-slate-200"
                        />
                      </FormControl>
                      <p className="text-sm text-slate-500">
                        Folosește adresa exactă cu care utilizatorul se va autentifica.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoadingEntitlements || seatsLimitReached}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Generating...' : 'Generate Invitation'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Invitation Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Vezi aici rezultatul generării și copiază rapid datele necesare.
            </p>
          </div>

          {createdInvite ? (
            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">Invitation Ready</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Status {createdInvite.status}. Expiră la {formatExpiry(createdInvite.expiresAt)}.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Invite Link</p>
                <Input value={createdInvite.inviteLink} readOnly className="border-slate-200" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(createdInvite.inviteLink, 'Invite link')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <a
                    href={createdInvite.inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Open Link
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Invite Token</p>
                <Input value={createdInvite.inviteToken} readOnly className="border-slate-200" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyToClipboard(createdInvite.inviteToken, 'Invite token')}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Token
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="rounded-full bg-blue-50 p-4">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">No invitation generated yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                După ce creezi invitația, linkul și tokenul vor apărea aici pentru copiere rapidă.
              </p>
            </div>
          )}
        </section>
      </div>
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
