'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
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
        toast({
          title: 'Invitation created',
          description: `Invite prepared for ${values.email}.`,
        });
        form.reset({ email: values.email });
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to create invitation.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, getAuthToken, toast]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Invite Agent</h1>
        <p className="text-muted-foreground">
          Generate a single-use invitation for a new agent.
        </p>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Invitation Details</CardTitle>
          <CardDescription>
            The invited user must sign in with Google using the same email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="agent@example.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Generating...' : 'Generate Invitation'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {createdInvite && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Invitation Ready</CardTitle>
            <CardDescription>
              Status: {createdInvite.status}. Expires at {formatExpiry(createdInvite.expiresAt)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Invite Link</p>
              <Input value={createdInvite.inviteLink} readOnly />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyToClipboard(createdInvite.inviteLink, 'Invite link')}
                >
                  Copy Link
                </Button>
                <a
                  href={createdInvite.inviteLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
                >
                  Open Link
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Invite Token</p>
              <Input value={createdInvite.inviteToken} readOnly />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyToClipboard(createdInvite.inviteToken, 'Invite token')}
              >
                Copy Token
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
