"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Logo } from "../../../components/logo";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/card";
import {
  PLAN_CODES,
  type PlanCode,
  resolveSelectedPlanCode,
  writeOnboardingState
} from "../../../lib/onboarding-state";

const planCards: Array<{
  code: PlanCode;
  name: string;
  price: string;
  description: string;
}> = [
  {
    code: "STARTER",
    name: "Starter",
    price: "$29/mo",
    description: "For small teams starting with structured reporting."
  },
  {
    code: "PRO",
    name: "Pro",
    price: "$79/mo",
    description: "For growing teams that need analytics and AI support."
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with advanced governance needs."
  }
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const [selectedPlanCode, setSelectedPlanCode] = React.useState<PlanCode | null>(
    null
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const queryPlan = new URLSearchParams(window.location.search).get("plan");
    const resolved = resolveSelectedPlanCode(queryPlan);
    if (resolved) {
      setSelectedPlanCode(resolved);
      return;
    }
    setSelectedPlanCode(PLAN_CODES[0]);
  }, []);

  const continueToCreateAccount = () => {
    if (!selectedPlanCode) return;
    writeOnboardingState({
      selectedPlanCode,
      signupMethod: undefined,
      companyName: undefined
    });
    router.push(`/signup/create-account?plan=${selectedPlanCode}`);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#67C6EE] px-4 py-6 font-body">
      <Card className="w-full max-w-4xl">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-2xl text-[#67C6EE]">Choose Your Plan</CardTitle>
          <CardDescription>
            Step 1 of 2: pick a plan before creating your manager account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {planCards.map((plan) => {
              const isSelected = selectedPlanCode === plan.code;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlanCode(plan.code)}
                  className={`rounded-lg border p-5 text-left transition ${
                    isSelected
                      ? "border-[#67C6EE] bg-[#67C6EE]/10"
                      : "border-border hover:border-[#67C6EE]/50"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#67C6EE]">{plan.price}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
              onClick={continueToCreateAccount}
              disabled={!selectedPlanCode}
            >
              Continue
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
