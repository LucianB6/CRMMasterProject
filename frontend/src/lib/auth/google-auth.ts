import { ApiError, apiFetch } from "../api";
import type { PlanCode } from "../onboarding-state";

export class AuthUiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ManagerContext = {
  kind: "manager";
  idToken: string;
  planCode: PlanCode;
  companyName: string;
};

type InviteContext = {
  kind: "invite";
  idToken: string;
  inviteToken: string;
};

export type GoogleAuthContext = ManagerContext | InviteContext;

const mapAuthError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return new AuthUiError(400, "Invalid request. Please verify your details and try again.");
    }
    if (error.status === 401) {
      return new AuthUiError(401, "Google session expired. Please authenticate with Google again.");
    }
    if (error.status === 403) {
      return new AuthUiError(
        403,
        "Nu ai acces inca. Completeaza onboarding manager sau foloseste invitatia corecta."
      );
    }
    if (error.status === 409) {
      return new AuthUiError(
        409,
        "This Google account/email is already linked to another profile. Contact support."
      );
    }

    return new AuthUiError(error.status, error.body || error.message || fallback);
  }

  return new AuthUiError(0, fallback);
};

export const completeGoogleAuth = async (
  context: GoogleAuthContext
): Promise<{ token: string }> => {
  try {
    if (context.kind === "invite") {
      return await apiFetch<{ token: string }>("/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken: context.idToken,
          inviteToken: context.inviteToken
        })
      });
    }

    return await apiFetch<{ token: string }>("/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idToken: context.idToken,
        signupIntent: "MANAGER",
        planCode: context.planCode,
        companyName: context.companyName
      })
    });
  } catch (error) {
    throw mapAuthError(error, "Google authentication failed. Please try again.");
  }
};

export const mapInternalAuthError = (error: unknown, fallback: string) => {
  return mapAuthError(error, fallback);
};
