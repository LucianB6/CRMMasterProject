"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Logo } from "../../../components/logo";
import { ApiError, apiFetch } from "../../../lib/api";
import { completeGoogleAuth, mapInternalAuthError } from "../../../lib/auth/google-auth";
import {
  type PlanCode,
  resolveSelectedPlanCode,
  writeOnboardingState
} from "../../../lib/onboarding-state";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../hooks/use-toast";

const GOOGLE_SCRIPT_ID = "google-identity-service";
const INTERNAL_SIGNUP_DRAFT_KEY = "salesway_internal_signup_draft";
const GOOGLE_ID_TOKEN_KEY = "salesway_google_id_token";

const internalSignupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm your password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

type InternalSignupValues = z.infer<typeof internalSignupSchema>;

export default function CreateAccountPage() {
  return (
    <React.Suspense fallback={null}>
      <CreateAccountContent />
    </React.Suspense>
  );
}

function CreateAccountContent() {
  const router = useRouter();
  const { toast } = useToast();

  const googleButtonRef = React.useRef<HTMLDivElement>(null);
  const [selectedPlanCode, setSelectedPlanCode] = React.useState<PlanCode | null>(null);
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);
  const [isSubmittingInternal, setIsSubmittingInternal] = React.useState(false);

  const form = useForm<InternalSignupValues>({
    resolver: zodResolver(internalSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextInviteToken = params.get("inviteToken");
    if (nextInviteToken) {
      setInviteToken(nextInviteToken);
      return;
    }

    const resolvedPlan = resolveSelectedPlanCode(params.get("plan"));
    if (!resolvedPlan) {
      router.replace("/signup/choose-plan");
      return;
    }

    setSelectedPlanCode(resolvedPlan);
    writeOnboardingState({ selectedPlanCode: resolvedPlan });
  }, [router]);

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
        if (inviteToken) {
          const payload = await completeGoogleAuth({
            kind: "invite",
            idToken,
            inviteToken
          });
          toast({ title: "Invitation accepted", description: "Redirecting..." });
          await finishAuth(payload.token);
          return;
        }

        if (!selectedPlanCode) {
          router.replace("/signup/choose-plan");
          return;
        }

        sessionStorage.setItem(GOOGLE_ID_TOKEN_KEY, idToken);
        writeOnboardingState({
          selectedPlanCode,
          signupMethod: "google"
        });
        router.push(`/signup/google-onboarding-company?plan=${selectedPlanCode}`);
      } catch (error) {
        const mapped = mapInternalAuthError(error, "Google authentication failed.");
        toast({
          title: "Google authentication failed",
          description: mapped.message,
          variant: "destructive"
        });
      } finally {
        setIsGooglePending(false);
      }
    },
    [inviteToken, isGooglePending, router, selectedPlanCode, toast]
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
        text: inviteToken ? "continue_with" : "signup_with",
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

  const onSubmitInternal = async (values: InternalSignupValues) => {
    if (!selectedPlanCode) {
      router.replace("/signup/choose-plan");
      return;
    }

    setIsSubmittingInternal(true);
    try {
      sessionStorage.setItem(
        INTERNAL_SIGNUP_DRAFT_KEY,
        JSON.stringify({
          ...values,
          planCode: selectedPlanCode
        })
      );
      writeOnboardingState({
        selectedPlanCode,
        signupMethod: "internal"
      });
      router.push(`/signup/google-onboarding-company?plan=${selectedPlanCode}`);
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const showManagerOnboarding = !inviteToken;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-6 font-body">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">
            {inviteToken ? "Accept Invitation" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {inviteToken
              ? "Use Google to join the company from your invitation."
              : "Step 2 of 2: create your account using email/password or Google."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showManagerOnboarding && (
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Selected plan: <span className="font-semibold">{selectedPlanCode ?? "-"}</span>
            </p>
          )}

          <div className="mb-4 flex flex-col items-center gap-2">
            <div ref={googleButtonRef} className="min-h-10" />
            {!isGoogleReady && (
              <p className="text-center text-xs text-muted-foreground">
                Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google authentication.
              </p>
            )}
            {isGooglePending && (
              <p className="text-center text-xs text-muted-foreground">
                Processing Google authentication...
              </p>
            )}
          </div>

          {showManagerOnboarding && (
            <>
              <div className="my-4 text-center text-xs uppercase tracking-wide text-muted-foreground">
                or continue with email
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitInternal)} className="space-y-4">
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
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" {...field} type="email" />
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
                            <Input placeholder="••••••••" {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                    disabled={isSubmittingInternal}
                  >
                    {isSubmittingInternal ? "Continuing..." : "Continue"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={inviteToken ? "/login" : "/signup/choose-plan"}>
              {inviteToken ? "Back to Login" : "Back to Plan Selection"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
