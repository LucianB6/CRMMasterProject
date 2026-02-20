"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Logo } from "../../components/logo";
import { ApiError, apiFetch } from "../../lib/api";
import { completeGoogleAuth, mapInternalAuthError } from "../../lib/auth/google-auth";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
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

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." })
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
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGooglePending, setIsGooglePending] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("inviteToken");
    setInviteToken(token);
  }, []);

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
        return "Invalid request. Please verify your details and try again.";
      }
      if (error.status === 401) {
        return "Email or password is incorrect.";
      }
      if (error.status === 403) {
        return "Nu ai acces inca. Completeaza onboarding manager sau foloseste invitatia corecta.";
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
          title: "Google authentication failed",
          description: "Google did not return a valid credential.",
          variant: "destructive"
        });
        return;
      }

      setIsGooglePending(true);
      try {
        const payload = inviteToken
          ? await completeGoogleAuth({ kind: "invite", idToken, inviteToken })
          : await apiFetch<{ token: string }>("/auth/google", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ idToken })
            });

        toast({ title: "Authentication successful", description: "Redirecting..." });
        await finishAuth(payload.token);
      } catch (error) {
        toast({
          title: "Google authentication failed",
          description: getGoogleErrorMessage(error, "Please try again."),
          variant: "destructive"
        });
      } finally {
        setIsGooglePending(false);
      }
    },
    [inviteToken, isGooglePending, toast]
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
        text: inviteToken ? "continue_with" : "signin_with",
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
  }, [inviteToken, onGoogleCredential]);

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

      toast({ title: "Login successful", description: "Redirecting..." });
      await finishAuth(payload.token);
    } catch (error) {
      toast({
        title: "Login failed",
        description: getLoginErrorMessage(error, "Email or password is incorrect."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-6 font-body">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">Welcome Back</CardTitle>
          <CardDescription>
            {inviteToken
              ? "Continue with Google to accept your invitation."
              : "Sign in to your workspace or create a new manager account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col items-center gap-2">
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

          {!inviteToken && (
            <>
              <div className="my-4 text-center text-xs uppercase tracking-wide text-muted-foreground">
                or continue with email
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="manager@example.com" {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {!inviteToken && (
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/signup/choose-plan">Create Manager Account</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
