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
  startStarterSignupStripeCheckoutLegacyPost,
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
        writeOnboardingState({
          selectedPlanCode,
          signupMethod: "google"
        });

        const params = new URLSearchParams(window.location.search);
        const from = params.get("from");

        if (from === "checkout") {
          toast({
            title: "Google signup is unavailable for checkout",
            description: "Use email signup to continue with Stripe checkout.",
            variant: "destructive"
          });
        } else {
          router.push(`/signup/google-onboarding-company?plan=${selectedPlanCode}`);
        }
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

        const applyCheckoutErrors = (result: Awaited<ReturnType<typeof validateStarterSignupCheckout>>) => {
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
        if (!validateResult.ok) {
          applyCheckoutErrors(validateResult);
          return;
        }

        const checkoutResult = startStarterSignupStripeCheckoutLegacyPost(payload);
        if (!checkoutResult.ok) {
          toast({
            title: "Checkout unavailable",
            description: checkoutResult.message,
            variant: "destructive"
          });
          return;
        }
      } else {
        router.push(`/signup/google-onboarding-company?plan=${selectedPlanCode}`);
      }
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-6 font-body">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">Create Account</CardTitle>
          <CardDescription>
            Step 2 of 2: create your account using email/password or Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Selected plan: <span className="font-semibold">{selectedPlanCode ?? "-"}</span>
          </p>

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

          <div className="my-4 text-center text-xs uppercase tracking-wide text-muted-foreground">
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
                          className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                          className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                          className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                          className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                          className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : undefined}
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
                className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                disabled={isSubmittingInternal}
              >
                {isSubmittingInternal
                  ? "Continuing..."
                  : isCheckoutFlow
                    ? "Continue to Payment"
                    : "Continue"}
              </Button>
            </form>
          </Form>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/#pricing">Back to Plan Selection</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
