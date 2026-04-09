"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Check } from "lucide-react";

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
  features: string[];
  popular?: boolean;
}> = [
  {
    code: "STARTER",
    name: "Starter",
    price: "€19",
    description: "Pentru echipe mici care vor să organizeze vânzările și marketingul într-un singur workspace.",
    features: [
      "Până la 3 conturi de tip agent create",
      "AI Assistant pentru zona de vânzări",
      "Calendar, Goals și Task manager",
    ],
  },
  {
    code: "PRO",
    name: "Growth",
    price: "€49",
    description: "Pentru echipe în creștere care au nevoie de automatizări avansate și control operațional mai bun.",
    features: [
      "Tot ce include Starter",
      "Capacitate extinsă pentru AI Assistant",
      "Capacitate extinsă pentru AI Insights",
    ],
    popular: true,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    description: "Pentru organizații mari care au nevoie de limite dedicate, control extins și suport prioritar.",
    features: [
      "Tot ce include Growth",
      "Pachet personalizat pe număr de utilizatori",
      "Suport prioritar și onboarding dedicat",
    ],
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
    setSelectedPlanCode("PRO");
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
      <Card className="w-full max-w-6xl border-sky-200/70 shadow-xl shadow-sky-200/50">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 text-[#67C6EE]" />
          <CardTitle className="text-3xl text-[#67C6EE]">Alege Planul</CardTitle>
          <CardDescription>
            Alege varianta potrivită pentru compania ta înainte de crearea contului.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {planCards.map((plan) => {
              const isSelected = selectedPlanCode === plan.code;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlanCode(plan.code)}
                  className={`relative flex min-h-[420px] flex-col rounded-xl border p-6 text-left transition ${
                    isSelected
                      ? "border-[#67C6EE] bg-sky-50/80 shadow-md shadow-sky-100"
                      : "border-slate-200 bg-white hover:border-[#67C6EE]/60"
                  }`}
                >
                  {plan.popular ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[#38bdf8] px-3 py-1 text-xs font-semibold text-white">
                      Cel mai ales
                    </span>
                  ) : null}
                  <p className="text-2xl font-bold text-sky-800">{plan.name}</p>
                  <p className="mt-1 text-4xl font-extrabold text-[#67C6EE]">
                    {plan.price}
                    {plan.price !== "Custom" ? (
                      <span className="ml-1 text-base font-semibold text-sky-700">/mo</span>
                    ) : null}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>

                  <ul className="mt-5 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-sky-800/90">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#67C6EE]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            {selectedPlanCode === "STARTER" || selectedPlanCode === "PRO" ? (
              <Button
                type="button"
                className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                onClick={() => router.push(`/signup/create-account?plan=${selectedPlanCode}&from=checkout`)}
                disabled={!selectedPlanCode}
              >
                {selectedPlanCode === "STARTER" ? "Continuă cu Starter" : "Continuă cu Growth"}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full bg-[#67C6EE] text-white hover:bg-[#67C6EE]/90"
                onClick={continueToCreateAccount}
                disabled={!selectedPlanCode}
              >
                Continuă cu Enterprise
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
