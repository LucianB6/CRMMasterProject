export const PLAN_CODES = ["STARTER", "PRO", "ENTERPRISE"] as const;

export type PlanCode = (typeof PLAN_CODES)[number];
export type SignupMethod = "internal" | "google";

export type OnboardingState = {
  selectedPlanCode?: PlanCode;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  signupMethod?: SignupMethod;
};

const ONBOARDING_STATE_KEY = "salesway_onboarding_state";

const isBrowser = () => typeof window !== "undefined";

export const isPlanCode = (value: string | null | undefined): value is PlanCode =>
  !!value && PLAN_CODES.includes(value as PlanCode);

export const readOnboardingState = (): OnboardingState => {
  if (!isBrowser()) return {};

  const raw = localStorage.getItem(ONBOARDING_STATE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    return parsed ?? {};
  } catch {
    return {};
  }
};

export const writeOnboardingState = (next: Partial<OnboardingState>) => {
  if (!isBrowser()) return;

  const prev = readOnboardingState();
  const merged: OnboardingState = {
    ...prev,
    ...next
  };

  localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(merged));
};

export const clearOnboardingState = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(ONBOARDING_STATE_KEY);
};

export const resolveSelectedPlanCode = (
  queryPlanCode: string | null | undefined
): PlanCode | null => {
  if (isPlanCode(queryPlanCode)) {
    writeOnboardingState({ selectedPlanCode: queryPlanCode });
    return queryPlanCode;
  }

  const stored = readOnboardingState().selectedPlanCode;
  return stored && isPlanCode(stored) ? stored : null;
};
