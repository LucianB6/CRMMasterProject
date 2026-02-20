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
  clearOnboardingState,
  readOnboardingState,
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

const INTERNAL_SIGNUP_DRAFT_KEY = "salesway_internal_signup_draft";
const GOOGLE_ID_TOKEN_KEY = "salesway_google_id_token";

const formSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().min(1, "Company name is required."),
  planCode: z.string().min(1, "Plan code is required.")
});

type FormValues = z.infer<typeof formSchema>;

type InternalDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  planCode: PlanCode;
};

export default function GoogleOnboardingCompanyPage() {
  return (
    <React.Suspense fallback={null}>
      <GoogleOnboardingCompanyContent />
    </React.Suspense>
  );
}

function GoogleOnboardingCompanyContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedPlanCode, setSelectedPlanCode] = React.useState<PlanCode | null>(null);
  const [signupMethod, setSignupMethod] = React.useState<"internal" | "google" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      planCode: ""
    }
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const resolvedPlan = resolveSelectedPlanCode(params.get("plan"));
    const onboarding = readOnboardingState();

    if (!resolvedPlan) {
      router.replace("/signup/choose-plan");
      return;
    }

    if (!onboarding.signupMethod) {
      router.replace("/signup/choose-plan");
      return;
    }

    if (onboarding.signupMethod === "google") {
      const googleToken = sessionStorage.getItem(GOOGLE_ID_TOKEN_KEY);
      if (!googleToken) {
        router.replace("/signup/choose-plan");
        return;
      }
    }

    if (onboarding.signupMethod === "internal") {
      const internalDraft = sessionStorage.getItem(INTERNAL_SIGNUP_DRAFT_KEY);
      if (!internalDraft) {
        router.replace("/signup/choose-plan");
        return;
      }
    }

    setSelectedPlanCode(resolvedPlan);
    setSignupMethod(onboarding.signupMethod);
    form.setValue("planCode", resolvedPlan);
    form.setValue("firstName", onboarding.firstName ?? "");
    form.setValue("lastName", onboarding.lastName ?? "");
    form.setValue("companyName", onboarding.companyName ?? "");
  }, [form, router]);

  React.useEffect(() => {
    const subscription = form.watch((values) => {
      writeOnboardingState({
        firstName: typeof values.firstName === "string" ? values.firstName : undefined,
        lastName: typeof values.lastName === "string" ? values.lastName : undefined,
        companyName: typeof values.companyName === "string" ? values.companyName : undefined
      });
    });

    return () => subscription.unsubscribe();
  }, [form]);

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
    clearOnboardingState();
    sessionStorage.removeItem(INTERNAL_SIGNUP_DRAFT_KEY);
    sessionStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
    router.push(route);
  };

  const onSubmit = async (values: FormValues) => {
    if (!selectedPlanCode || !signupMethod) {
      router.replace("/signup/choose-plan");
      return;
    }

    setIsSubmitting(true);
    writeOnboardingState({
      selectedPlanCode,
      companyName: values.companyName,
      signupMethod
    });

    try {
      if (signupMethod === "google") {
        const firstName = (values.firstName ?? "").trim();
        const lastName = (values.lastName ?? "").trim();
        if (!firstName) {
          form.setError("firstName", { message: "First name is required." });
          setIsSubmitting(false);
          return;
        }
        if (!lastName) {
          form.setError("lastName", { message: "Last name is required." });
          setIsSubmitting(false);
          return;
        }

        const idToken = sessionStorage.getItem(GOOGLE_ID_TOKEN_KEY);
        if (!idToken) {
          router.replace("/signup/choose-plan");
          return;
        }

        const payload = await completeGoogleAuth({
          kind: "manager",
          idToken,
          planCode: selectedPlanCode,
          companyName: values.companyName.trim()
        });

        try {
          await apiFetch("/auth/me", {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${payload.token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              firstName,
              lastName
            })
          });
        } catch {
          // Profile enrichment is best-effort after successful auth.
        }

        toast({ title: "Account created", description: "Redirecting to dashboard..." });
        await finishAuth(payload.token);
        return;
      }

      const rawDraft = sessionStorage.getItem(INTERNAL_SIGNUP_DRAFT_KEY);
      if (!rawDraft) {
        router.replace("/signup/choose-plan");
        return;
      }

      const draft = JSON.parse(rawDraft) as InternalDraft;
      const payload = await apiFetch<{ token?: string }>("/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: (values.firstName ?? draft.firstName).trim(),
          lastName: (values.lastName ?? draft.lastName).trim(),
          email: draft.email,
          password: draft.password,
          retypePassword: draft.confirmPassword,
          signupIntent: "MANAGER",
          planCode: selectedPlanCode,
          companyName: values.companyName.trim()
        })
      });

      if (!payload?.token) {
        toast({
          title: "Account created",
          description: "Please sign in with your credentials."
        });
        clearOnboardingState();
        sessionStorage.removeItem(INTERNAL_SIGNUP_DRAFT_KEY);
        router.push("/login");
        return;
      }

      toast({ title: "Account created", description: "Redirecting to dashboard..." });
      await finishAuth(payload.token);
    } catch (error) {
      const mapped = mapInternalAuthError(
        error,
        "Company onboarding failed. Please verify your data and try again."
      );
      toast({
        title: "Onboarding failed",
        description: mapped.message,
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
          <CardTitle className="text-2xl text-[#67C6EE]">Company Onboarding</CardTitle>
          <CardDescription>
            Final step: add company details to complete manager onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {signupMethod === "google" && (
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
              )}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Solutions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selected Plan</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
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
                {isSubmitting ? "Finalizing..." : "Complete Onboarding"}
              </Button>
            </form>
          </Form>

          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={selectedPlanCode ? `/signup/create-account?plan=${selectedPlanCode}` : "/signup/choose-plan"}>
              Back
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
