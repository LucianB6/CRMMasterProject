"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Logo } from "../../../components/logo";
import { mapInternalAuthError } from "../../../lib/auth/google-auth";
import {
  type PlanCode,
  resolveSelectedPlanCode,
  writeOnboardingState
} from "../../../lib/onboarding-state";
import {
  sendStarterSignupCheckoutPaymentLink,
  validateStarterSignupCheckout
} from "../../../lib/stripe-checkout";
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

const parseGoogleIdTokenProfile = (idToken: string) => {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const json = JSON.parse(atob(payload)) as {
      given_name?: string;
      family_name?: string;
      email?: string;
      name?: string;
    };
    const given = json.given_name?.trim() ?? "";
    const family = json.family_name?.trim() ?? "";
    const fullName = json.name?.trim() ?? "";
    const [firstFromName, ...rest] = fullName ? fullName.split(/\s+/) : [];
    const firstName = given || firstFromName || "";
    const lastName = family || rest.join(" ") || "";
    const email = json.email?.trim() ?? "";
    return { firstName, lastName, email };
  } catch {
    return null;
  }
};

const internalSignupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    email: z.string().email("Please enter a valid email address."),
    companyName: z.string().optional(),
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
  const [isCheckoutFlow, setIsCheckoutFlow] = React.useState(false);
  const [isGooglePending, setIsGooglePending] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);
  const [isSubmittingInternal, setIsSubmittingInternal] = React.useState(false);
  const [paymentEmailSentTo, setPaymentEmailSentTo] = React.useState<string | null>(null);

  const form = useForm<InternalSignupValues>({
    resolver: zodResolver(internalSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      password: "",
      confirmPassword: ""
    }
  });

  const selectedPlanMeta =
    selectedPlanCode === "STARTER"
      ? { label: "Starter", accent: "€19/mo" }
      : selectedPlanCode === "PRO"
        ? { label: "Growth", accent: "€49/mo" }
        : selectedPlanCode === "ENTERPRISE"
          ? { label: "Enterprise", accent: "Custom" }
          : { label: "-", accent: "" };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextInviteToken = params.get("inviteToken") ?? params.get("token");
    if (nextInviteToken) {
      const query = new URLSearchParams({ inviteToken: nextInviteToken });
      router.replace(`/invite/accept?${query.toString()}`);
      return;
    }

    const resolvedPlan = resolveSelectedPlanCode(params.get("plan"));
    const from = params.get("from");
    if (!resolvedPlan) {
      router.replace("/signup/choose-plan");
      return;
    }

    setSelectedPlanCode(resolvedPlan);
    setIsCheckoutFlow(from === "checkout");
    writeOnboardingState({ selectedPlanCode: resolvedPlan });
  }, [router]);

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
        if (!selectedPlanCode) {
          router.replace("/signup/choose-plan");
          return;
        }

        sessionStorage.setItem(GOOGLE_ID_TOKEN_KEY, idToken);

        const profile = parseGoogleIdTokenProfile(idToken);
        writeOnboardingState({
          selectedPlanCode,
          signupMethod: "google",
          firstName: profile?.firstName || undefined,
          lastName: profile?.lastName || undefined
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
    [isGooglePending, router, selectedPlanCode, toast]
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
        text: "signup_with",
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

      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");

      if (from === "checkout") {
        form.clearErrors();

        const companyName = (values.companyName ?? "").trim();
        if (!companyName) {
          form.setError("companyName", { message: "Company name is required for checkout." });
          return;
        }

        const payload = {
          planCode: selectedPlanCode,
          email: values.email.trim(),
          password: values.password,
          retypePassword: values.confirmPassword,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          companyName
        };

        type CheckoutErrorResult = Extract<
          Awaited<ReturnType<typeof validateStarterSignupCheckout>>,
          { ok: false }
        >;
        type CheckoutActionResult = Awaited<ReturnType<typeof validateStarterSignupCheckout>>;
        const isCheckoutErrorResult = (
          result: CheckoutActionResult
        ): result is CheckoutErrorResult => result.ok === false;

        const applyCheckoutErrors = (result: CheckoutErrorResult) => {
          let mappedFieldErrors = 0;

          result.fieldErrors?.forEach((fieldError) => {
            if (fieldError.field === "email") {
              form.setError("email", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "password") {
              form.setError("password", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "retype_password") {
              form.setError("confirmPassword", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "confirmPassword") {
              form.setError("confirmPassword", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "first_name") {
              form.setError("firstName", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "last_name") {
              form.setError("lastName", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "company_name") {
              form.setError("companyName", { message: fieldError.message });
              mappedFieldErrors += 1;
            }
          });

          if (mappedFieldErrors === 0 && result.message.toLowerCase().includes("email")) {
            form.setError("email", { message: result.message });
            mappedFieldErrors += 1;
          }

          if (mappedFieldErrors === 0) {
            form.setError("root.server", { message: result.message });
          }
        };

        const validateResult = await validateStarterSignupCheckout(payload);
        if (isCheckoutErrorResult(validateResult)) {
          applyCheckoutErrors(validateResult);
          return;
        }

        const emailLinkResult = await sendStarterSignupCheckoutPaymentLink(payload);
        if (isCheckoutErrorResult(emailLinkResult)) {
          let mappedFieldErrors = 0;
          emailLinkResult.fieldErrors?.forEach((fieldError) => {
            if (fieldError.field === "email") {
              form.setError("email", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "company_name") {
              form.setError("companyName", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "password") {
              form.setError("password", { message: fieldError.message });
              mappedFieldErrors += 1;
              return;
            }
            if (fieldError.field === "retype_password") {
              form.setError("confirmPassword", { message: fieldError.message });
              mappedFieldErrors += 1;
            }
          });

          if (mappedFieldErrors === 0) {
            form.setError("root.server", {
              message: emailLinkResult.message || "Checkout email could not be sent."
            });
          }
          return;
        }

        setPaymentEmailSentTo(values.email.trim());
        return;
      } else {
        router.push(`/signup/google-onboarding-company?plan=${selectedPlanCode}`);
      }
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-3 font-body sm:px-6">
      <Card className="w-full max-w-3xl border-sky-200/70 shadow-2xl shadow-sky-300/50">
        <CardHeader className="items-center pb-2 text-center sm:pb-3">
          <Logo className="mb-2 text-[#67C6EE]" />
          <CardTitle className="text-2xl font-extrabold text-[#67C6EE] sm:text-3xl">
            Create Account
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">
            Step 2 of 2: create your account using email/password or Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5 sm:px-7">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-2 text-center">
            <p className="text-xs text-slate-600 sm:text-sm">Selected plan</p>
            <p className="mt-0.5 text-lg font-bold text-sky-800 sm:text-xl">{selectedPlanMeta.label}</p>
            {selectedPlanMeta.accent ? (
              <p className="text-xs font-semibold text-[#67C6EE] sm:text-sm">{selectedPlanMeta.accent}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
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

          {paymentEmailSentTo ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
              <p className="text-base font-semibold text-emerald-800">Email trimis cu succes</p>
              <p className="mt-2 text-sm text-emerald-700">
                Am trimis linkul de plată către <span className="font-semibold">{paymentEmailSentTo}</span>.
                Deschide email-ul și finalizează plata pentru activarea contului.
              </p>
              <p className="mt-2 text-xs text-emerald-700/90">
                După plata Stripe, contul va fi validat automat.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                or continue with email
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitInternal)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              className={
                                fieldState.error
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "border-slate-300/80"
                              }
                            />
                          </FormControl>
                          <FormMessage aria-live="polite" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              className={
                                fieldState.error
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "border-slate-300/80"
                              }
                            />
                          </FormControl>
                          <FormMessage aria-live="polite" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="john.doe@example.com"
                            {...field}
                            type="email"
                            className={
                              fieldState.error
                                ? "border-destructive focus-visible:ring-destructive"
                                : "border-slate-300/80"
                            }
                          />
                        </FormControl>
                        <FormMessage aria-live="polite" />
                      </FormItem>
                    )}
                  />
                  {isCheckoutFlow && (
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Solutions"
                              {...field}
                              className={
                                fieldState.error
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "border-slate-300/80"
                              }
                            />
                          </FormControl>
                          <FormMessage aria-live="polite" />
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="••••••••"
                              {...field}
                              type="password"
                              className={
                                fieldState.error
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "border-slate-300/80"
                              }
                            />
                          </FormControl>
                          <FormMessage aria-live="polite" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="••••••••"
                              {...field}
                              type="password"
                              className={
                                fieldState.error
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : "border-slate-300/80"
                              }
                            />
                          </FormControl>
                          <FormMessage aria-live="polite" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.formState.errors.root?.server?.message ? (
                    <p className="text-sm font-medium text-destructive" aria-live="polite">
                      {form.formState.errors.root.server.message}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-11 w-full bg-[#67C6EE] text-base font-semibold text-white hover:bg-[#67C6EE]/90"
                    disabled={isSubmittingInternal}
                  >
                    {isSubmittingInternal
                      ? "Continuing..."
                      : isCheckoutFlow
                        ? "Send payment link by email"
                        : "Continue"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          <Button asChild variant="outline" className="h-11 w-full border-slate-300 text-base">
            <Link href="/#pricing">Back to Plan Selection</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
