'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useCallback, useMemo, useState } from 'react';
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

const createAgentSchema = z
  .object({
    email: z
      .string()
      .email('Te rugăm să introduci o adresă de email validă.')
      .max(255, 'Email-ul trebuie să aibă maxim 255 de caractere.'),
    password: z
      .string()
      .min(8, 'Parola trebuie să aibă cel puțin 8 caractere.')
      .max(255, 'Parola trebuie să aibă maxim 255 de caractere.'),
    retypePassword: z
      .string()
      .min(8, 'Confirmarea parolei trebuie să aibă cel puțin 8 caractere.')
      .max(255, 'Confirmarea parolei trebuie să aibă maxim 255 de caractere.'),
    firstName: z.string().min(1, 'Prenumele este obligatoriu.').max(255),
    lastName: z.string().min(1, 'Numele este obligatoriu.').max(255),
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

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081',
    []
  );

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
        const response = await fetch(`${apiBaseUrl}/manager/agents`, {
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
        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || `Nu am putut crea agentul (status ${response.status}).`
          );
        }
        const data = (await response.json()) as { email: string };
        toast({
          title: 'Cont creat cu succes!',
          description: `Contul pentru ${data.email} a fost creat.`,
        });
        form.reset();
      } catch (error) {
        toast({
          title: 'Eroare',
          description:
            error instanceof Error
              ? error.message
              : 'Nu am putut crea agentul.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [apiBaseUrl, form, getAuthToken, toast]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Creează Cont Agent</h1>
        <p className="text-muted-foreground">
          Adaugă un nou membru în echipa ta de vânzări.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalii Agent</CardTitle>
          <CardDescription>
            Completează detaliile de mai jos pentru a crea un cont nou.
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
                      <FormLabel>Prenume</FormLabel>
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
                      <FormLabel>Nume</FormLabel>
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
                    <FormLabel>Adresă de Email</FormLabel>
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
                      <FormLabel>Parolă</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Introduceți o parolă"
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
                      <FormLabel>Confirmă parola</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Reintroduceți parola"
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
                          <SelectValue placeholder="Selectează rolul" />
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
                  Creează Cont
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
