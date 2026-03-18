"use client";

import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { ApiError, apiFetch } from "../../lib/api";
import { mapInternalAuthError } from "../../lib/auth/google-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import iconita from "../../assets/iconita.svg";

const loginSchema = z.object({
  email: z.string().email({ message: "Introdu o adresă de email validă." }),
  password: z.string().min(1, { message: "Parola este obligatorie." })
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GOOGLE_SCRIPT_ID = "google-identity-service";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageContent />
    </React.Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const googleButtonRef = React.useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGooglePending, setIsGooglePending] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("inviteToken") ?? params.get("token");
    if (!token) return;
    const query = new URLSearchParams({ inviteToken: token });
    router.replace(`/invite/accept?${query.toString()}`);
  }, [router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const resolveLandingRoute = async (token: string) => {
    try {
      await apiFetch("/manager/overview/agents", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });
      return { route: "/dashboard/manager/overview", role: "manager" };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return { route: "/dashboard", role: "agent" };
      }
    }
    return { route: "/dashboard", role: "agent" };
  };

  const finishAuth = async (token: string) => {
    localStorage.setItem("salesway_token", token);
    const { route, role } = await resolveLandingRoute(token);
    localStorage.setItem("userRole", role);
    router.push(route);
  };

  const getGoogleErrorMessage = (error: unknown, fallback: string) =>
    mapInternalAuthError(error, fallback).message;

  const getLoginErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        return "Cerere invalidă. Verifică datele și încearcă din nou.";
      }
      if (error.status === 401) {
        return "Emailul sau parola sunt incorecte.";
      }
      if (error.status === 403) {
        return "Nu ai încă acces. Finalizează configurarea contului de manager sau folosește invitația corectă.";
      }
      return error.body || error.message || fallback;
    }
    return fallback;
  };

  const onGoogleCredential = React.useCallback(
    async (credentialResponse: { credential?: string }) => {
      if (isGooglePending) return;
      const idToken = credentialResponse.credential;
      if (!idToken) {
        toast({
          title: "Autentificarea cu Google a eșuat",
          description: "Google nu a returnat un credential valid.",
          variant: "destructive"
        });
        return;
      }

      setIsGooglePending(true);
      try {
        const payload = await apiFetch<{ token: string }>("/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ idToken })
        });

        toast({ title: "Autentificare reușită", description: "Redirecționare..." });
        await finishAuth(payload.token);
      } catch (error) {
        toast({
          title: "Autentificarea cu Google a eșuat",
          description: getGoogleErrorMessage(error, "Încearcă din nou."),
          variant: "destructive"
        });
      } finally {
        setIsGooglePending(false);
      }
    },
    [isGooglePending, toast]
  );

  React.useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setIsGoogleReady(false);
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onGoogleCredential
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        shape: "pill",
        size: "large",
        text: "continue_with",
        width: 320
      });
      setIsGoogleReady(true);
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript && window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = existingScript ?? document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
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
  }, [onGoogleCredential]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const payload = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      toast({ title: "Autentificare reușită", description: "Redirecționare..." });
      await finishAuth(payload.token);
    } catch (error) {
      toast({
        title: "Autentificarea a eșuat",
        description: getLoginErrorMessage(error, "Emailul sau parola sunt incorecte."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleClick = () => {
    if (!isGoogleReady || !googleButtonRef.current) {
      toast({
        title: "Autentificarea cu Google nu este disponibilă",
        description: "Setează NEXT_PUBLIC_GOOGLE_CLIENT_ID și încearcă din nou.",
        variant: "destructive"
      });
      return;
    }

    const googleButton = googleButtonRef.current.querySelector(
      'div[role="button"], iframe[title*="Google"], div[aria-labelledby]'
    ) as HTMLElement | null;

    if (!googleButton) {
      toast({
        title: "Autentificarea cu Google nu este disponibilă",
        description: "Butonul Google nu a fost inițializat corect. Încearcă din nou.",
        variant: "destructive"
      });
      return;
    }

    googleButton.click();
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/20";
  const labelClass =
    "ml-1 mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500";

  const onGoogleUnavailable = () => {
    toast({
      title: "Autentificarea cu Google nu este disponibilă",
      description: "Setează NEXT_PUBLIC_GOOGLE_CLIENT_ID și încearcă din nou.",
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd] p-4 font-sans">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[480px] items-center justify-center">
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center rounded-2xl border border-blue-100 bg-white px-0 py-2 shadow-sm">
              <div className="rounded-xl bg-white p-0 shadow-inner">
                <Image
                  src={iconita}
                  alt="Iconița SalesWay"
                  className="h-12 w-auto"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Bine ai revenit!</h1>
            <p className="mt-2 font-medium text-slate-500">Autentifică-te în workspace-ul tău selfCRM.</p>
          </div>

          <div className="rounded-[32px] border border-white bg-white p-8 shadow-2xl shadow-blue-200/50 md:p-10">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center">
                <div ref={googleButtonRef} className="sr-only" aria-hidden="true" />
                <button
                  type="button"
                  onClick={isGoogleReady ? onGoogleClick : onGoogleUnavailable}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                >
                  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.7 2.9 29.8 1 24 1 14.8 1 6.9 6.3 3 14l7.6 5.9C12.4 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8h12.7c-.3 2-1.7 5.1-4.9 7.1l7.4 5.7c4.5-4.2 7.3-10.3 7.3-16.7z" />
                    <path fill="#FBBC05" d="M10.6 28.1c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8L3 12.6C1.7 15.1 1 17.9 1 20.8s.7 5.7 2 8.2l7.6-5.9z" />
                    <path fill="#34A853" d="M24 46c6.5 0 12-2.1 16-5.8l-7.4-5.7c-2 1.4-4.8 2.4-8.6 2.4-6.3 0-11.6-4.1-13.4-9.7L3 33.1C6.9 40.8 14.8 46 24 46z" />
                  </svg>
                  Continuă cu Google
                </button>
                {!isGoogleReady && (
                  <p className="mt-2 text-center text-[10px] font-medium italic text-slate-400">
                    Setează `NEXT_PUBLIC_GOOGLE_CLIENT_ID` pentru a activa autentificarea cu Google.
                  </p>
                )}
                {isGooglePending && (
                  <p className="mt-2 text-center text-[10px] font-medium italic text-slate-400">
                    Se finalizează autentificarea cu Google...
                  </p>
                )}
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 font-bold tracking-widest text-slate-400">sau email</span>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className={labelClass}>
                        Adresă de email
                      </FormLabel>
                      <div className="group relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#38bdf8]" size={18} />
                        <FormControl>
                          <Input
                            placeholder="manager@salesway.ro"
                            {...field}
                            type="email"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="mb-1.5 flex items-center justify-between">
                        <FormLabel className={labelClass}>
                          Parolă
                        </FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] hover:text-[#0ea5e9]"
                        >
                          Ai uitat parola?
                        </Link>
                      </div>
                      <div className="group relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#38bdf8]" size={18} />
                        <FormControl>
                          <Input
                            placeholder="••••••••"
                            {...field}
                            type="password"
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
                      Autentificare
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </Form>

            <div className="mt-8 border-t border-slate-50 pt-6 text-center">
              <p className="text-sm font-medium text-slate-500">Nu ai încă un cont de manager?</p>
              <Link
                href="/signup/choose-plan"
                className="mt-3 block w-full rounded-xl border-2 border-[#38bdf8]/10 px-4 py-3 text-sm font-bold text-[#38bdf8] transition-all hover:bg-blue-50"
              >
                Creează cont de manager
              </Link>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Securizat de selfCRM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} />
              <Link
                href="/status"
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
              >
                Centru de suport
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
