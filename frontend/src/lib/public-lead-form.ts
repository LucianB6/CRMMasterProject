import { apiFetch } from './api';

export type LeadQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'date'
  | 'boolean';

export type PublicLeadQuestion = {
  id: string;
  questionType: LeadQuestionType | string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  required: boolean | null;
  optionsJson: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
};

export type PublicLeadForm = {
  id: string;
  title: string;
  publicSlug: string;
  isActive: boolean | null;
  questions: PublicLeadQuestion[];
};

export type PublicLeadTracking = {
  source?: string;
  campaign?: string;
  adSet?: string;
  adId?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  landingPage?: string;
  referrer?: string;
};

export type PublicLeadSubmitPayload = {
  standard: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  answers: Array<{
    questionId: string;
    value: string | number | boolean | string[];
  }>;
  tracking?: PublicLeadTracking;
};

export type PublicLeadSubmitResponse = {
  leadId: string;
  submittedAt: string;
  status: string;
};

export type ParsedApiError = {
  message: string;
  fieldErrors: Array<{ field: string; message: string }>;
};

export const fetchPublicLeadForm = async (publicSlug: string) => {
  return apiFetch<PublicLeadForm>(`/public/lead-form/${encodeURIComponent(publicSlug)}`, {
    method: 'GET',
    cache: 'no-store',
  });
};

export const submitPublicLeadForm = async (
  publicSlug: string,
  payload: PublicLeadSubmitPayload
) => {
  return apiFetch<PublicLeadSubmitResponse>(
    `/public/lead-form/${encodeURIComponent(publicSlug)}/submit`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
};

export const parseQuestionOptions = (question: PublicLeadQuestion) => {
  if (!question.optionsJson) return [] as string[];

  try {
    const parsed = JSON.parse(question.optionsJson) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [] as string[];
  }
};

export const parseApiErrorDetails = (error: unknown): ParsedApiError => {
  if (!(error instanceof Error) || !('body' in error)) {
    return {
      message: error instanceof Error ? error.message : 'Request failed.',
      fieldErrors: [],
    };
  }

  const apiError = error as Error & { body?: string };
  const fallback = apiError.message || 'Request failed.';

  if (!apiError.body) {
    return { message: fallback, fieldErrors: [] };
  }

  try {
    const parsed = JSON.parse(apiError.body) as {
      message?: string;
      fieldErrors?: Array<{ field?: string; message?: string }>;
    };

    return {
      message: parsed.message?.trim() || fallback,
      fieldErrors: Array.isArray(parsed.fieldErrors)
        ? parsed.fieldErrors
            .map((fieldError) => ({
              field: fieldError.field?.trim() || '',
              message: fieldError.message?.trim() || 'Invalid value.',
            }))
            .filter((fieldError) => fieldError.field || fieldError.message)
        : [],
    };
  } catch {
    return {
      message: apiError.body || fallback,
      fieldErrors: [],
    };
  }
};
