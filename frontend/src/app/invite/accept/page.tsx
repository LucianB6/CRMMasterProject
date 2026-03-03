'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Logo } from '../../../components/logo';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../hooks/use-toast';
import { ApiError, apiFetch } from '../../../lib/api';
import { completeGoogleAuth, mapInternalAuthError } from '../../../lib/auth/google-auth';

const GOOGLE_SCRIPT_ID = 'google-identity-service';

const acceptInviteSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(255, 'First name must be at most 255 characters.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.')
    .max(255, 'Last name must be at most 255 characters.'),
});

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

type InvitationPreviewResponse = {
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | string;
  invitedEmail: string;
  companyName: string;
  expiresAt: string;
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

const getPreviewError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'This invitation link is invalid or no longer available.';
    }

    return error.body || error.message || 'Unable to validate invitation.';
  }

  return 'Unable to validate invitation.';
};

const getStatusText = (status: string) => {
  if (status === 'ACCEPTED') return 'This invitation was already used.';
  if (status === 'EXPIRED') return 'This invitation has expired.';
  if (status === 'REVOKED') return 'This invitation is no longer active.';
  return `Invitation status: ${status}.`;
};

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitationPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  const form = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const canAccept = invitePreview?.status === 'PENDING';

  const resolveLandingRoute = async (token: string) => {
    try {
      await apiFetch('/manager/overview/agents', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      return { route: '/dashboard/manager/overview', role: 'manager' };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return { route: '/dashboard', role: 'agent' };
      }
    }
    return { route: '/dashboard', role: 'agent' };
  };

  const finishAuth = async (token: string) => {
    localStorage.setItem('salesway_token', token);
    const { route, role } = await resolveLandingRoute(token);
    localStorage.setItem('userRole', role);
    router.push(route);
  };

  useEffect(() => {
    const token = searchParams.get('inviteToken') ?? searchParams.get('token');
    if (!token) {
      setInviteToken(null);
      setInvitePreview(null);
      setPreviewError('Invitation token is missing from this link.');
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setInviteToken(token);
    setPreviewError(null);
    setIsLoadingPreview(true);

    (async () => {
      try {
        const data = await apiFetch<InvitationPreviewResponse>(
          `/invitations/preview?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        if (cancelled) return;
        setInvitePreview(data);
      } catch (error) {
        if (cancelled) return;
        setInvitePreview(null);
        setPreviewError(getPreviewError(error));
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const onGoogleCredential = useCallback(
    async (credentialResponse: { credential?: string }) => {
      if (isGooglePending || !inviteToken || !canAccept) return;

      const idToken = credentialResponse.credential;
      if (!idToken) {
        toast({
          title: 'Google authentication failed',
          description: 'Google did not return a valid credential.',
          variant: 'destructive',
        });
        return;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const values = form.getValues();
      setIsGooglePending(true);

      try {
        const payload = await completeGoogleAuth({
          kind: 'invite',
          idToken,
          inviteToken,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        });

        toast({ title: 'Invitation accepted', description: 'Redirecting...' });
        await finishAuth(payload.token);
      } catch (error) {
        const mapped = mapInternalAuthError(error, 'Google authentication failed.');
        toast({
          title: 'Unable to accept invitation',
          description: mapped.message,
          variant: 'destructive',
        });
      } finally {
        setIsGooglePending(false);
      }
    },
    [canAccept, form, inviteToken, isGooglePending, toast]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !canAccept) {
      setIsGoogleReady(false);
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onGoogleCredential,
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        shape: 'pill',
        size: 'large',
        text: 'continue_with',
        width: 320,
      });
      setIsGoogleReady(true);
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript && window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = existingScript ?? document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setIsGoogleReady(false);

    if (!existingScript) {
      document.head.appendChild(script);
    }

    return () => {
      script.onload = null;
    };
  }, [canAccept, onGoogleCredential]);

  const statusText = useMemo(() => {
    if (!invitePreview) return null;
    return getStatusText(invitePreview.status);
  }, [invitePreview]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-6 font-body">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">Accept Invitation</CardTitle>
          <CardDescription>
            Join your manager&apos;s company by confirming your profile and using Google sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingPreview && (
            <p className="text-center text-sm text-muted-foreground">Validating invitation...</p>
          )}

          {!isLoadingPreview && previewError && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{previewError}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          )}

          {!isLoadingPreview && !previewError && invitePreview && (
            <>
              <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                <p>
                  <span className="font-semibold">Company:</span> {invitePreview.companyName}
                </p>
                <p>
                  <span className="font-semibold">Invited email:</span> {invitePreview.invitedEmail}
                </p>
                <p>
                  <span className="font-semibold">Expires:</span> {formatExpiry(invitePreview.expiresAt)}
                </p>
                <p>
                  <span className="font-semibold">Status:</span> {invitePreview.status}
                </p>
              </div>

              {canAccept ? (
                <>
                  <Form {...form}>
                    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>

                  <div className="flex flex-col items-center gap-2">
                    <div ref={googleButtonRef} className="min-h-10" />
                    {!isGoogleReady && (
                      <p className="text-center text-xs text-muted-foreground">
                        Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google authentication.
                      </p>
                    )}
                    {isGooglePending && (
                      <p className="text-center text-xs text-muted-foreground">
                        Completing Google authentication...
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">{statusText}</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Back to Login</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
