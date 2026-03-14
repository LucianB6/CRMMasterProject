'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  fetchPublicLeadForm,
  parseApiErrorDetails,
  parseQuestionOptions,
  submitPublicLeadForm,
  type ParsedApiError,
  type PublicLeadForm,
  type PublicLeadQuestion,
  type PublicLeadTracking,
} from '../../lib/public-lead-form';
import { cn } from '../../lib/utils';

const EMPTY_SELECT = '__salesway_empty__';

type StandardFieldsState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AnswerStateValue = string | boolean | string[];
type FormErrorsState = Record<string, string>;

const DEFAULT_STANDARD_FIELDS: StandardFieldsState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildInitialAnswers = (form: PublicLeadForm) => {
  return Object.fromEntries(
    form.questions.map((question) => {
      if (question.questionType === 'multi_select') {
        return [question.id, [] satisfies string[]];
      }
      if (question.questionType === 'boolean') {
        return [question.id, false];
      }
      return [question.id, ''];
    })
  ) as Record<string, AnswerStateValue>;
};

const buildTrackingFromBrowser = () => {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = params.get(key)?.trim();
      if (value) return value;
    }
    return undefined;
  };

  const tracking: PublicLeadTracking = {
    source: pick('source', 'lead_source', 'utm_source'),
    campaign: pick('campaign', 'campaign_name'),
    adSet: pick('ad_set', 'adset', 'adSet'),
    adId: pick('ad_id', 'adid', 'adId'),
    utmSource: pick('utm_source'),
    utmCampaign: pick('utm_campaign'),
    utmMedium: pick('utm_medium'),
    utmContent: pick('utm_content'),
    landingPage: window.location.href,
    referrer: document.referrer || undefined,
  };

  return Object.values(tracking).some(Boolean) ? tracking : undefined;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export function PublicLeadFormPage({ publicSlug }: { publicSlug: string }) {
  const [form, setForm] = useState<PublicLeadForm | null>(null);
  const [standardFields, setStandardFields] = useState<StandardFieldsState>(DEFAULT_STANDARD_FIELDS);
  const [answers, setAnswers] = useState<Record<string, AnswerStateValue>>({});
  const [fieldErrors, setFieldErrors] = useState<FormErrorsState>({});
  const [loadError, setLoadError] = useState<ParsedApiError | null>(null);
  const [submitError, setSubmitError] = useState<ParsedApiError | null>(null);
  const [tracking, setTracking] = useState<PublicLeadTracking | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ leadId: string; submittedAt: string; status: string } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    const loadForm = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const nextForm = await fetchPublicLeadForm(publicSlug);
        if (!isMounted) return;
        setForm(nextForm);
        setAnswers(buildInitialAnswers(nextForm));
        setTracking(buildTrackingFromBrowser());
      } catch (error) {
        if (!isMounted) return;
        setLoadError(parseApiErrorDetails(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadForm();

    return () => {
      isMounted = false;
    };
  }, [publicSlug]);

  const sortedQuestions = useMemo(() => {
    if (!form) return [] as PublicLeadQuestion[];
    return [...form.questions].sort((left, right) => {
      return (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER);
    });
  }, [form]);

  const updateStandardField = (field: keyof StandardFieldsState, value: string) => {
    setStandardFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateAnswer = (questionId: string, value: AnswerStateValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setFieldErrors((current) => {
      const key = `question:${questionId}`;
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleMultiSelect = (questionId: string, option: string, checked: boolean) => {
    const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : [];
    const next = checked ? [...current, option] : current.filter((item) => item !== option);
    updateAnswer(questionId, next);
  };

  const validateForm = () => {
    const nextErrors: FormErrorsState = {};
    const trimmedStandard = {
      firstName: standardFields.firstName.trim(),
      lastName: standardFields.lastName.trim(),
      email: standardFields.email.trim(),
      phone: standardFields.phone.trim(),
    };

    if (!trimmedStandard.firstName) nextErrors.firstName = 'First name is required.';
    if (!trimmedStandard.lastName) nextErrors.lastName = 'Last name is required.';
    if (!trimmedStandard.email) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(trimmedStandard.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!trimmedStandard.phone) nextErrors.phone = 'Phone is required.';

    sortedQuestions.forEach((question) => {
      const value = answers[question.id];
      if (!question.required) return;

      if (question.questionType === 'multi_select') {
        if (!Array.isArray(value) || value.length === 0) {
          nextErrors[`question:${question.id}`] = 'Please select at least one option.';
        }
        return;
      }

      if (question.questionType === 'boolean') {
        return;
      }

      if (typeof value !== 'string' || !value.trim()) {
        nextErrors[`question:${question.id}`] = 'This field is required.';
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const mapServerErrors = (error: ParsedApiError) => {
    const nextErrors: FormErrorsState = {};

    error.fieldErrors.forEach((fieldError) => {
      const fieldName = fieldError.field;
      if (fieldName.startsWith('standard.')) {
        nextErrors[fieldName.replace('standard.', '')] = fieldError.message;
        return;
      }

      if (fieldName.startsWith('answers[')) {
        const match = fieldName.match(/questionId=([a-f0-9-]+)/i);
        if (match?.[1]) {
          nextErrors[`question:${match[1]}`] = fieldError.message;
        }
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...nextErrors }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!form) return;
    if (sortedQuestions.length === 0) {
      setSubmitError({
        message: 'This campaign form has no configured questions yet.',
        fieldErrors: [],
      });
      return;
    }

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const response = await submitPublicLeadForm(publicSlug, {
        standard: {
          firstName: standardFields.firstName.trim(),
          lastName: standardFields.lastName.trim(),
          email: standardFields.email.trim(),
          phone: standardFields.phone.trim(),
        },
        answers: sortedQuestions.map((question) => ({
          questionId: question.id,
          value: serializeAnswer(question, answers[question.id]),
        })),
        tracking,
      });
      setSuccess(response);
      setFieldErrors({});
    } catch (error) {
      const parsed = parseApiErrorDetails(error);
      setSubmitError(parsed);
      mapServerErrors(parsed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#d7f1ff,transparent_35%),linear-gradient(180deg,#f7fbfd_0%,#eef5f8_100%)] px-6 py-16">
        <div className="flex items-center gap-3 rounded-full border bg-white/80 px-5 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lead form...
        </div>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <Shell>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Form unavailable</CardTitle>
            <CardDescription>
              This campaign page could not be loaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>{loadError?.message || 'Lead form not found.'}</AlertTitle>
              {loadError && loadError.fieldErrors.length > 0 && (
                <AlertDescription>
                  {loadError.fieldErrors.map((fieldError) => `${fieldError.field}: ${fieldError.message}`).join(' | ')}
                </AlertDescription>
              )}
            </Alert>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <Card className="overflow-hidden border-emerald-200 bg-white/95 shadow-xl">
          <CardHeader className="border-b bg-emerald-50/70">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>Submission received</CardTitle>
            <CardDescription>
              Your details were sent successfully. The team can now follow up on this campaign lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Lead ID</p>
                <p className="break-all font-medium">{success.leadId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatTimestamp(success.submittedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{success.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Campaign</p>
                <p className="font-medium">{form.title}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setSuccess(null);
                setStandardFields(DEFAULT_STANDARD_FIELDS);
                setAnswers(buildInitialAnswers(form));
                setSubmitError(null);
                setFieldErrors({});
              }}
            >
              Submit another response
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Campaign Lead Form
          </p>
          <h1 className="font-headline text-4xl tracking-tight text-slate-950 sm:text-5xl">
            {form.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Complete the form below and your information will be captured directly into the lead pipeline for this
            campaign.
          </p>
        </div>

        <Card className="overflow-hidden border-white/70 bg-white/95 shadow-xl">
          <CardHeader className="border-b bg-slate-50/80">
            <CardTitle>Tell us about yourself</CardTitle>
            <CardDescription>
              Standard contact details plus the campaign questions configured by your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {submitError && (
                <Alert variant="destructive">
                  <AlertTitle>{submitError.message}</AlertTitle>
                  {submitError.fieldErrors.length > 0 && (
                    <AlertDescription>
                      {submitError.fieldErrors
                        .map((fieldError) =>
                          fieldError.field ? `${fieldError.field}: ${fieldError.message}` : fieldError.message
                        )
                        .join(' | ')}
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {sortedQuestions.length === 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Form incomplete</AlertTitle>
                  <AlertDescription>
                    This campaign page has no configured questions yet, so leads cannot be submitted.
                  </AlertDescription>
                </Alert>
              )}

              <section className="grid gap-5 md:grid-cols-2">
                <Field
                  label="First name"
                  required
                  error={fieldErrors.firstName}
                  input={
                    <Input
                      value={standardFields.firstName}
                      onChange={(event) => updateStandardField('firstName', event.target.value)}
                      placeholder="John"
                    />
                  }
                />
                <Field
                  label="Last name"
                  required
                  error={fieldErrors.lastName}
                  input={
                    <Input
                      value={standardFields.lastName}
                      onChange={(event) => updateStandardField('lastName', event.target.value)}
                      placeholder="Doe"
                    />
                  }
                />
                <Field
                  label="Email"
                  required
                  error={fieldErrors.email}
                  input={
                    <Input
                      type="email"
                      value={standardFields.email}
                      onChange={(event) => updateStandardField('email', event.target.value)}
                      placeholder="john.doe@example.com"
                    />
                  }
                />
                <Field
                  label="Phone"
                  required
                  error={fieldErrors.phone}
                  input={
                    <Input
                      value={standardFields.phone}
                      onChange={(event) => updateStandardField('phone', event.target.value)}
                      placeholder="+1 555 123 4567"
                    />
                  }
                />
              </section>

              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Campaign questions</h2>
                  <p className="text-sm text-muted-foreground">
                    These fields are configured dynamically from the lead form attached to this campaign.
                  </p>
                </div>

                <div className="space-y-5">
                  {sortedQuestions.map((question) => (
                    <QuestionField
                      key={question.id}
                      question={question}
                      value={answers[question.id]}
                      error={fieldErrors[`question:${question.id}`]}
                      onChange={(value) => updateAnswer(question.id, value)}
                      onToggleMultiSelect={(option, checked) => toggleMultiSelect(question.id, option, checked)}
                    />
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Tracking metadata is attached automatically from the campaign URL when available.
                </p>
                <Button type="submit" disabled={isSubmitting || sortedQuestions.length === 0}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit lead
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f1ff,transparent_35%),linear-gradient(180deg,#f7fbfd_0%,#eef5f8_100%)] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">{children}</div>
    </main>
  );
}

function Field({
  label,
  required,
  error,
  input,
}: {
  label: string;
  required?: boolean;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-800">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {input}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function QuestionField({
  question,
  value,
  error,
  onChange,
  onToggleMultiSelect,
}: {
  question: PublicLeadQuestion;
  value: AnswerStateValue | undefined;
  error?: string;
  onChange: (value: AnswerStateValue) => void;
  onToggleMultiSelect: (option: string, checked: boolean) => void;
}) {
  const options = parseQuestionOptions(question);
  const commonLabel = (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-slate-800">
        {question.label}
        {question.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {question.helpText && <p className="text-sm text-muted-foreground">{question.helpText}</p>}
    </div>
  );

  let input: React.ReactNode;

  switch (question.questionType) {
    case 'long_text':
      input = (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder || undefined}
          rows={5}
        />
      );
      break;
    case 'single_select':
      input = (
        <Select
          value={typeof value === 'string' && value ? value : EMPTY_SELECT}
          onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT ? '' : nextValue)}
        >
          <SelectTrigger>
            <SelectValue placeholder={question.placeholder || 'Select an option'} />
          </SelectTrigger>
          <SelectContent>
            {!question.required && <SelectItem value={EMPTY_SELECT}>No selection</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case 'multi_select':
      input = (
        <div className="grid gap-3 rounded-xl border bg-slate-50/70 p-4">
          {options.map((option) => {
            const checked = Array.isArray(value) && value.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextValue) => onToggleMultiSelect(option, Boolean(nextValue))}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      );
      break;
    case 'number':
      input = (
        <Input
          type="number"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder || undefined}
        />
      );
      break;
    case 'date':
      input = (
        <Input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
      break;
    case 'boolean':
      input = (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-slate-50/70 px-4 py-3 text-sm">
          <Checkbox checked={Boolean(value)} onCheckedChange={(nextValue) => onChange(Boolean(nextValue))} />
          <span>{question.placeholder || 'Yes, this applies to me.'}</span>
        </label>
      );
      break;
    case 'short_text':
    default:
      input = (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder || undefined}
        />
      );
      break;
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border bg-white p-5 shadow-sm',
        error && 'border-destructive/40 bg-destructive/5'
      )}
    >
      {commonLabel}
      {input}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function serializeAnswer(question: PublicLeadQuestion, value: AnswerStateValue | undefined) {
  if (question.questionType === 'multi_select') {
    return Array.isArray(value) ? value : [];
  }

  if (question.questionType === 'boolean') {
    return Boolean(value);
  }

  const normalized = typeof value === 'string' ? value.trim() : '';

  if (question.questionType === 'number') {
    return normalized === '' ? 0 : Number(normalized);
  }

  return normalized;
}
