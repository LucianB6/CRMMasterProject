import { ApiError, apiFetch } from '../api';

export class PasswordResetUiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const mapPasswordResetError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return new PasswordResetUiError(
        400,
        'Cererea nu este validă. Verifică datele introduse și încearcă din nou.'
      );
    }
    if (error.status === 404) {
      return new PasswordResetUiError(
        404,
        'Nu am găsit un cont asociat sau tokenul de resetare nu mai este valid.'
      );
    }
    if (error.status === 409) {
      return new PasswordResetUiError(
        409,
        'Cererea de resetare nu mai poate fi folosită. Solicită un link nou.'
      );
    }
    if (error.status === 410) {
      return new PasswordResetUiError(
        410,
        'Link-ul de resetare a expirat. Solicită unul nou.'
      );
    }
    if (error.status === 429) {
      return new PasswordResetUiError(
        429,
        'Au fost făcute prea multe încercări. Încearcă din nou puțin mai târziu.'
      );
    }

    return new PasswordResetUiError(error.status, error.body || error.message || fallback);
  }

  return new PasswordResetUiError(0, fallback);
};

export const requestPasswordReset = async (email: string) => {
  try {
    return await apiFetch<{ message?: string }>('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    throw mapPasswordResetError(
      error,
      'Nu am putut trimite instrucțiunile de resetare. Încearcă din nou.'
    );
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    return await apiFetch<{ message?: string }>('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });
  } catch (error) {
    throw mapPasswordResetError(
      error,
      'Nu am putut actualiza parola. Verifică link-ul și încearcă din nou.'
    );
  }
};

export const mapInternalPasswordResetError = (error: unknown, fallback: string) => {
  return mapPasswordResetError(error, fallback);
};
