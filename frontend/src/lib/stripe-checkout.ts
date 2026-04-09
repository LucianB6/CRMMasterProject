import { buildUrl } from "./api";

type StripeActionResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      status?: number;
      infrastructure?: boolean;
      fieldErrors?: Array<{ field: string; message: string }>;
    };

const normalizeEnv = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const STRIPE_CHECKOUT_ENDPOINT = normalizeEnv(
  process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT
);
const STRIPE_PORTAL_ENDPOINT = normalizeEnv(process.env.NEXT_PUBLIC_STRIPE_PORTAL_ENDPOINT);
const STRIPE_SIGNUP_VALIDATE_ENDPOINT = normalizeEnv(
  process.env.NEXT_PUBLIC_STRIPE_SIGNUP_VALIDATE_ENDPOINT
);
const STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT = normalizeEnv(
  process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT
);
const STRIPE_STARTER_LOOKUP_KEY = normalizeEnv(
  process.env.NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY
);
const STRIPE_PRO_LOOKUP_KEY = normalizeEnv(process.env.NEXT_PUBLIC_STRIPE_PRO_LOOKUP_KEY);

type CheckoutPlanCode = "STARTER" | "PRO" | "ENTERPRISE";

const resolveCheckoutLookupKey = (planCode?: CheckoutPlanCode) => {
  if (!planCode || planCode === "STARTER") {
    return STRIPE_STARTER_LOOKUP_KEY;
  }

  if (planCode === "PRO") {
    return STRIPE_PRO_LOOKUP_KEY;
  }

  return undefined;
};

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const isEndpointLike = (value: string) => value.startsWith("/") || /^https?:\/\//i.test(value);

const submitPostForm = (action: string, fields: Record<string, string>) => {
  const resolvedAction = action.startsWith("/") ? buildUrl(action) : action;
  const form = document.createElement("form");
  form.method = "POST";
  form.action = resolvedAction;
  form.style.display = "none";

  Object.entries(fields).forEach(([name, fieldValue]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = fieldValue;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export const startStarterStripeCheckout = (): StripeActionResult => {
  if (!isBrowser()) {
    return { ok: false, message: "Stripe checkout is available only in browser context." };
  }

  if (!STRIPE_CHECKOUT_ENDPOINT) {
    return {
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT and try again."
    };
  }

  if (!isEndpointLike(STRIPE_CHECKOUT_ENDPOINT)) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT must be a URL or path (for example /create-checkout-session)."
    };
  }

  if (!STRIPE_STARTER_LOOKUP_KEY) {
    return {
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY and try again."
    };
  }

  submitPostForm(STRIPE_CHECKOUT_ENDPOINT, { lookup_key: STRIPE_STARTER_LOOKUP_KEY });
  return { ok: true };
};

type StarterSignupCheckoutInput = {
  planCode?: CheckoutPlanCode;
  email: string;
  password: string;
  retypePassword: string;
  firstName: string;
  lastName: string;
  companyName: string;
};

export const validateStarterSignupCheckout = (
  input: StarterSignupCheckoutInput
): Promise<StripeActionResult> => {
  if (!isBrowser()) {
    return Promise.resolve({
      ok: false,
      message: "Checkout validation is available only in browser context.",
      infrastructure: true
    });
  }

  if (!STRIPE_SIGNUP_VALIDATE_ENDPOINT) {
    return Promise.resolve({
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_SIGNUP_VALIDATE_ENDPOINT and try again."
    });
  }

  if (!isEndpointLike(STRIPE_SIGNUP_VALIDATE_ENDPOINT)) {
    return Promise.resolve({
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_SIGNUP_VALIDATE_ENDPOINT must be a URL or path (for example /auth/checkout/validate)."
    });
  }

  const lookupKey = resolveCheckoutLookupKey(input.planCode);
  if (!lookupKey) {
    return Promise.resolve({
      ok: false,
      message:
        "Set NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY (and NEXT_PUBLIC_STRIPE_PRO_LOOKUP_KEY for PRO) and try again."
    });
  }

  const query = new URLSearchParams({
    lookup_key: lookupKey,
    email: input.email,
    password: input.password,
    retype_password: input.retypePassword,
    first_name: input.firstName,
    last_name: input.lastName,
    company_name: input.companyName
  });

  const base = buildUrl(STRIPE_SIGNUP_VALIDATE_ENDPOINT);
  const url = `${base}${base.includes("?") ? "&" : "?"}${query.toString()}`;

  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*"
    }
  })
    .then(async (response) => {
      if (response.ok) {
        return { ok: true } as StripeActionResult;
      }

      const raw = await response.text();
      try {
        const parsed = JSON.parse(raw) as {
          message?: string;
        };
        const fieldErrors = collectFieldErrors(parsed);
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: parsed.message || `Validation failed (${response.status}).`,
          fieldErrors
        } as StripeActionResult;
      } catch {
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: raw || `Validation failed (${response.status}).`
        } as StripeActionResult;
      }
    })
    .catch((error) => ({
      ok: false,
      status: 0,
      infrastructure: true,
      message: error instanceof Error ? error.message : "Could not connect to validation endpoint."
    }));
};

const collectFieldErrors = (
  payload: unknown
): Array<{ field: string; message: string }> => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const normalized: Array<{ field: string; message: string }> = [];

  const maybeArray = record.fieldErrors;
  if (Array.isArray(maybeArray)) {
    maybeArray.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const row = item as Record<string, unknown>;
      const field = typeof row.field === "string" ? row.field : null;
      const message = typeof row.message === "string" ? row.message : null;
      if (field && message) {
        normalized.push({ field, message });
      }
    });
  }

  const fieldsCandidate =
    (record.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>).fields
      : undefined) ??
    record.fields;

  if (fieldsCandidate && typeof fieldsCandidate === "object") {
    Object.entries(fieldsCandidate as Record<string, unknown>).forEach(([field, value]) => {
      if (typeof value === "string") {
        normalized.push({ field, message: value });
      }
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        normalized.push({ field, message: value[0] as string });
      }
    });
  }

  return normalized;
};

export const startStarterSignupStripeCheckout = (
  input: StarterSignupCheckoutInput
): Promise<StripeActionResult> => {
  if (!isBrowser()) {
    return Promise.resolve({
      ok: false,
      message: "Stripe checkout is available only in browser context."
    });
  }

  if (!STRIPE_CHECKOUT_ENDPOINT) {
    return Promise.resolve({
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT and try again."
    });
  }

  if (!isEndpointLike(STRIPE_CHECKOUT_ENDPOINT)) {
    return Promise.resolve({
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT must be a URL or path (for example /create-checkout-session)."
    });
  }

  const lookupKey = resolveCheckoutLookupKey(input.planCode);
  if (!lookupKey) {
    return Promise.resolve({
      ok: false,
      message:
        "Set NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY (and NEXT_PUBLIC_STRIPE_PRO_LOOKUP_KEY for PRO) and try again."
    });
  }

  const payload = new URLSearchParams({
    lookup_key: lookupKey,
    email: input.email,
    password: input.password,
    retype_password: input.retypePassword,
    first_name: input.firstName,
    last_name: input.lastName,
    company_name: input.companyName
  });

  return fetch(buildUrl(STRIPE_CHECKOUT_ENDPOINT), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/plain, */*"
    },
    body: payload.toString(),
    redirect: "manual"
  })
    .then(async (response) => {
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location") || response.headers.get("location");
        if (location) {
          window.location.assign(location);
          return { ok: true } as StripeActionResult;
        }
        return {
          ok: false,
          message: "Checkout redirect URL is missing in backend response."
        } as StripeActionResult;
      }

      if (response.ok) {
        return { ok: true } as StripeActionResult;
      }

      const raw = await response.text();
      try {
        const parsed = JSON.parse(raw) as {
          message?: string;
        };
        const fieldErrors = collectFieldErrors(parsed);
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: parsed.message || `Checkout request failed (${response.status}).`,
          fieldErrors
        } as StripeActionResult;
      } catch {
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: raw || `Checkout request failed (${response.status}).`
        } as StripeActionResult;
      }
    })
    .catch((error) => ({
      ok: false,
      status: 0,
      infrastructure: true,
      message: error instanceof Error ? error.message : "Could not connect to checkout endpoint."
    }));
};

export const startStarterSignupStripeCheckoutLegacyPost = (
  input: StarterSignupCheckoutInput
): StripeActionResult => {
  if (!isBrowser()) {
    return { ok: false, message: "Stripe checkout is available only in browser context." };
  }

  if (!STRIPE_CHECKOUT_ENDPOINT) {
    return {
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT and try again."
    };
  }

  if (!isEndpointLike(STRIPE_CHECKOUT_ENDPOINT)) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_CHECKOUT_ENDPOINT must be a URL or path (for example /create-checkout-session)."
    };
  }

  const lookupKey = resolveCheckoutLookupKey(input.planCode);
  if (!lookupKey) {
    return {
      ok: false,
      message:
        "Set NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY (and NEXT_PUBLIC_STRIPE_PRO_LOOKUP_KEY for PRO) and try again."
    };
  }

  submitPostForm(STRIPE_CHECKOUT_ENDPOINT, {
    lookup_key: lookupKey,
    email: input.email,
    password: input.password,
    retype_password: input.retypePassword,
    first_name: input.firstName,
    last_name: input.lastName,
    company_name: input.companyName
  });

  return { ok: true };
};

export const sendStarterSignupCheckoutPaymentLink = (
  input: StarterSignupCheckoutInput
): Promise<StripeActionResult> => {
  if (!isBrowser()) {
    return Promise.resolve({
      ok: false,
      message: "Checkout email flow is available only in browser context."
    });
  }

  if (!STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT) {
    return Promise.resolve({
      ok: false,
      message: "Set NEXT_PUBLIC_STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT and try again."
    });
  }

  if (!isEndpointLike(STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT)) {
    return Promise.resolve({
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT must be a URL or path."
    });
  }

  const lookupKey = resolveCheckoutLookupKey(input.planCode);
  if (!lookupKey) {
    return Promise.resolve({
      ok: false,
      message:
        "Set NEXT_PUBLIC_STRIPE_STARTER_LOOKUP_KEY (and NEXT_PUBLIC_STRIPE_PRO_LOOKUP_KEY for PRO) and try again."
    });
  }

  const payload = new URLSearchParams({
    lookup_key: lookupKey,
    email: input.email,
    password: input.password,
    retype_password: input.retypePassword,
    first_name: input.firstName,
    last_name: input.lastName,
    company_name: input.companyName
  });

  return fetch(buildUrl(STRIPE_CHECKOUT_EMAIL_LINK_ENDPOINT), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/plain, */*"
    },
    body: payload.toString()
  })
    .then(async (response) => {
      if (response.ok) {
        return { ok: true } as StripeActionResult;
      }

      const raw = await response.text();
      try {
        const parsed = JSON.parse(raw) as { message?: string };
        const fieldErrors = collectFieldErrors(parsed);
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: parsed.message || `Could not send payment link (${response.status}).`,
          fieldErrors
        } as StripeActionResult;
      } catch {
        return {
          ok: false,
          status: response.status,
          infrastructure: response.status >= 500,
          message: raw || `Could not send payment link (${response.status}).`
        } as StripeActionResult;
      }
    })
    .catch((error) => ({
      ok: false,
      status: 0,
      infrastructure: true,
      message: error instanceof Error ? error.message : "Could not send payment link."
    }));
};

export const startStripePortalSession = (sessionId: string): StripeActionResult => {
  if (!isBrowser()) {
    return { ok: false, message: "Stripe portal is available only in browser context." };
  }

  if (!sessionId.trim()) {
    return { ok: false, message: "Missing checkout session id." };
  }

  if (!STRIPE_PORTAL_ENDPOINT) {
    return { ok: false, message: "Set NEXT_PUBLIC_STRIPE_PORTAL_ENDPOINT and try again." };
  }

  if (!isEndpointLike(STRIPE_PORTAL_ENDPOINT)) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_STRIPE_PORTAL_ENDPOINT must be a URL or path (for example /create-portal-session)."
    };
  }

  submitPostForm(STRIPE_PORTAL_ENDPOINT, { session_id: sessionId });
  return { ok: true };
};
