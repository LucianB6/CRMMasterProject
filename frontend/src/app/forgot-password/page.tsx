'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { requestPasswordReset } from '../../lib/auth/password-reset';
import { useToast } from '../../hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setIsSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setHasSubmitted(true);
      toast({
        title: 'Email trimis',
        description: 'Dacă adresa există în sistem, vei primi instrucțiunile de resetare.',
      });
    } catch (error) {
      toast({
        title: 'Resetare indisponibilă',
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
              Forgot your password?
            </h1>
            <p className="mt-2 font-medium text-slate-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div className="rounded-[32px] border border-white bg-white p-8 shadow-2xl shadow-blue-200/50 md:p-10">
            {hasSubmitted ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Check your inbox</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Dacă adresa introdusă există în platformă, am trimis instrucțiunile pentru resetarea parolei.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#38bdf8] py-4 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#0ea5e9]"
                >
                  Back to login
                  <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className={labelClass}>Email Address</FormLabel>
                        <div className="group relative">
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#38bdf8]"
                            size={18}
                          />
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="manager@salesway.ro"
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
                        Send reset link
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
