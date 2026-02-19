'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useCallback, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
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

const createAgentSchema = z
  .object({
    email: z
      .string()
      .email('Please enter a valid email address.')
      .max(255, 'Email must be at most 255 characters.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(255, 'Password must be at most 255 characters.'),
    retypePassword: z
      .string()
      .min(8, 'Password confirmation must be at least 8 characters.')
      .max(255, 'Password confirmation must be at most 255 characters.'),
    firstName: z.string().min(1, 'First name is required.').max(255),
    lastName: z.string().min(1, 'Last name is required.').max(255),
    role: z.enum(['AGENT', 'MANAGER']),
  })
  .refine((data) => data.password === data.retypePassword, {
    message: 'Parolele nu se potrivesc.',
    path: ['retypePassword'],
  });

export default function CreateAgentPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof createAgentSchema>>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      email: '',
      password: '',
      retypePassword: '',
      firstName: '',
      lastName: '',
      role: 'AGENT',
    },
  });

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const onSubmit = useCallback(
    async (values: z.infer<typeof createAgentSchema>) => {
      try {
        setIsSubmitting(true);
        const token = getAuthToken();
        const data = await apiFetch<{ email: string }>('/manager/agents', {
          method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            retypePassword: values.retypePassword,
            firstName: values.firstName,
            lastName: values.lastName,
            role: values.role,
          }),
        });
        toast({
          title: 'Account creat cu succes!',
          description: `Accountul pentru ${data.email} a fost creat.`,
        });
        form.reset();
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to create agent.',
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
        <h1 className="font-headline text-2xl">Create Agent Account</h1>
        <p className="text-muted-foreground">
          Add a new member to your sales team.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Agent Details</CardTitle>
          <CardDescription>
            Fill in the details below to create a new account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex" {...field} />
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
                        <Input placeholder="Popescu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="alex.popescu@exemplu.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a password"
                          {...field}
                          type="password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="retypePassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Re-enter the password"
                          {...field}
                          type="password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AGENT">Agent</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  Create Account
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
