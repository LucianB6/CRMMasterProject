'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Layers,
  Loader2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { resetPassword } from '../../lib/auth/password-reset';
import { useToast } from '../../hooks/use-toast';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm the password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordPageContent />
    </React.Suspense>
  );
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const token = searchParams.get('token') ?? searchParams.get('resetToken') ?? '';

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      await resetPassword(token, values.password);
      setIsCompleted(true);
      toast({
        title: 'Parolă actualizată',
        description: 'Te poți autentifica acum cu parola nouă.',
      });
      window.setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (error) {
      toast({
        title: 'Resetare nereușită',
        description: error instanceof Error ? error.message : 'Încearcă din nou.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/20';
  const labelClass =
    'ml-1 mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] p-4 font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center justify-center">
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
              <div className="rounded-lg bg-white p-2 shadow-inner">
                <Layers className="h-6 w-6 text-[#38bdf8]" />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Set a new password
            </h1>
            <p className="mt-2 font-medium text-slate-500">
              Choose a secure password for your selfCRM account.
            </p>
          </div>

          <div className="rounded-[32px] border border-white bg-white p-8 shadow-2xl shadow-blue-200/50 md:p-10">
            {!token ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link invalid</AlertTitle>
                <AlertDescription>
                  Tokenul de resetare lipsește sau nu mai este valid. Solicită un link nou.
                </AlertDescription>
              </Alert>
            ) : isCompleted ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Password updated</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white p-2 shadow-sm">
                        <KeyRound className="h-5 w-5 text-[#38bdf8]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Reset password</p>
                        <p className="text-xs text-slate-500">
                          Your new password must contain at least 8 characters.
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className={labelClass}>New password</FormLabel>
                        <div className="group relative">
                          <Lock
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#38bdf8]"
                            size={18}
                          />
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className={inputClass}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className={labelClass}>Confirm password</FormLabel>
                        <div className="group relative">
                          <Lock
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#38bdf8]"
                            size={18}
                          />
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className={inputClass}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#38bdf8] py-4 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#0ea5e9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        Update password
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </Form>
            )}

            <div className="mt-8 border-t border-slate-50 pt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#38bdf8] transition-colors hover:text-[#0ea5e9]"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
