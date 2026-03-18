'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  Clock,
} from 'lucide-react';

import { ApiError, apiFetch } from '../../../../lib/api';
import {
  buildCampaignLink,
  CHANNEL_DEFAULTS,
  createCampaignPreset,
  loadCampaignPresets,
  saveCampaignPresets,
  slugify,
  type CampaignChannel,
  type CampaignPreset,
} from '../../../../lib/lead-form-campaigns';
import { useToast } from '../../../../hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Switch } from '../../../../components/ui/switch';
import { Textarea } from '../../../../components/ui/textarea';

type LeadQuestionResponse = {
  id: string;
  questionType: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  required: boolean | null;
  optionsJson: string | null;
  displayOrder: number | null;
  isActive: boolean | null;
};

type LeadFormResponse = {
  id: string;
  title: string;
  publicSlug: string;
  isActive: boolean | null;
  questions: LeadQuestionResponse[];
};

type ParsedApiError = {
  message: string;
  fieldErrors: Record<string, string>;
};

type QuestionEditorState = {
  id: string | null;
  label: string;
  questionType: QuestionType;
  placeholder: string;
  helpText: string;
  required: boolean;
  optionsText: string;
};

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'date'
  | 'boolean';

type CampaignDraft = {
  id: string | null;
  name: string;
  channel: CampaignChannel;
  campaignCode: string;
  utmSource: string;
  utmMedium: string;
  isActive: boolean;
};

type WizardStep = 1 | 2 | 3;

type WizardQuestionDraft = {
  id: string;
  label: string;
  questionType: QuestionType;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  optionsJson: string | null;
  displayOrder: number;
};

type CampaignSourceFilter = 'ALL' | CampaignChannel;

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_select', label: 'Single select' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
];

const CAMPAIGN_SOURCE_OPTIONS: Array<{ value: CampaignChannel; label: string }> = [
  { value: 'META', label: 'Meta' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'OTHER', label: 'Other' },
];

const EMPTY_QUESTION_EDITOR: QuestionEditorState = {
  id: null,
  label: '',
  questionType: 'short_text',
  placeholder: '',
  helpText: '',
  required: false,
  optionsText: '',
};

const parseApiError = (error: unknown): ParsedApiError => {
  if (!(error instanceof ApiError)) {
    return {
      message: error instanceof Error ? error.message : 'Request failed.',
      fieldErrors: {},
    };
  }

  if (!error.body) {
    return { message: error.message, fieldErrors: {} };
  }

  try {
    const parsed = JSON.parse(error.body) as {
      message?: string;
      fieldErrors?: Array<{ field?: string; message?: string }>;
    };

    return {
      message: parsed.message?.trim() || error.message,
      fieldErrors: Array.isArray(parsed.fieldErrors)
        ? Object.fromEntries(
            parsed.fieldErrors
              .filter((fieldError) => fieldError.field && fieldError.message)
              .map((fieldError) => [fieldError.field as string, fieldError.message as string])
          )
        : {},
    };
  } catch {
    return { message: error.body, fieldErrors: {} };
  }
};

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return undefined;
  const token = window.localStorage.getItem('salesway_token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

const parseOptionsJson = (value: string | null) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [] as string[];
  }
};

const formatQuestionType = (questionType: string) => {
  const match = QUESTION_TYPE_OPTIONS.find((option) => option.value === questionType);
  return match?.label ?? questionType;
};

const formatCampaignSource = (channel: CampaignChannel) => {
  const match = CAMPAIGN_SOURCE_OPTIONS.find((option) => option.value === channel);
  if (match) return match.label;
  return channel.charAt(0) + channel.slice(1).toLowerCase();
};

const isSelectType = (questionType: string) =>
  questionType === 'single_select' || questionType === 'multi_select';

const questionToEditorState = (question: LeadQuestionResponse): QuestionEditorState => ({
  id: question.id,
  label: question.label,
  questionType: (question.questionType as QuestionType) || 'short_text',
  placeholder: question.placeholder ?? '',
  helpText: question.helpText ?? '',
  required: Boolean(question.required),
  optionsText: parseOptionsJson(question.optionsJson).join('\n'),
});

const campaignToDraft = (campaign: CampaignPreset): CampaignDraft => ({
  id: campaign.id,
  name: campaign.name,
  channel: campaign.channel,
  campaignCode: campaign.campaignCode,
  utmSource: campaign.utmSource,
  utmMedium: campaign.utmMedium,
  isActive: campaign.isActive,
});

const createCampaignDraft = (channel: CampaignChannel = 'META'): CampaignDraft => {
  const preset = createCampaignPreset(channel);
  return campaignToDraft(preset);
};

const WIZARD_STEPS: Array<{ step: WizardStep; title: string }> = [
  { step: 1, title: 'Campaign Details' },
  { step: 2, title: 'Form Questions' },
  { step: 3, title: 'Review & Generate Link' },
];

const questionToWizardDraft = (
  question: LeadQuestionResponse,
  fallbackOrder: number
): WizardQuestionDraft => ({
  id: question.id,
  label: question.label,
  questionType: (question.questionType as QuestionType) || 'short_text',
  placeholder: question.placeholder ?? null,
  helpText: question.helpText ?? null,
  required: Boolean(question.required),
  optionsJson: question.optionsJson ?? null,
  displayOrder: question.displayOrder ?? fallbackOrder,
});

const createWizardQuestionDraft = (
  editor: QuestionEditorState,
  displayOrder: number
): WizardQuestionDraft => {
  const options = editor.optionsText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id:
      editor.id ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    label: editor.label.trim(),
    questionType: editor.questionType,
    placeholder: editor.placeholder.trim() || null,
    helpText: editor.helpText.trim() || null,
    required: editor.required,
    optionsJson: isSelectType(editor.questionType) ? JSON.stringify(options) : null,
    displayOrder,
  };
};

const wizardDraftToEditorState = (question: WizardQuestionDraft): QuestionEditorState => ({
  id: question.id,
  label: question.label,
  questionType: question.questionType,
  placeholder: question.placeholder ?? '',
  helpText: question.helpText ?? '',
  required: question.required,
  optionsText: parseOptionsJson(question.optionsJson).join('\n'),
});

export default function ManagerLeadFormPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [form, setForm] = useState<LeadFormResponse | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    publicSlug: '',
    isActive: true,
  });
  const [campaignPresets, setCampaignPresets] = useState<CampaignPreset[]>([]);
  const [questionEditor, setQuestionEditor] = useState<QuestionEditorState>(EMPTY_QUESTION_EDITOR);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [loadError, setLoadError] = useState<ParsedApiError | null>(null);
  const [saveError, setSaveError] = useState<ParsedApiError | null>(null);
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false);
  const [isCampaignWizardOpen, setIsCampaignWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(createCampaignDraft());
  const [wizardQuestions, setWizardQuestions] = useState<WizardQuestionDraft[]>([]);
  const [campaignWizardError, setCampaignWizardError] = useState<string | null>(null);
  const [questionEditorMode, setQuestionEditorMode] = useState<'questions' | 'wizard'>('questions');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [campaignSourceFilter, setCampaignSourceFilter] = useState<CampaignSourceFilter>('ALL');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const selectedCampaignId = searchParams.get('campaignId');

  const questions = useMemo(() => {
    return [...(form?.questions ?? [])].sort(
      (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
    );
  }, [form]);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined' || !formState.publicSlug.trim()) {
      return '';
    }
    return `${window.location.origin}/lead-form/?slug=${encodeURIComponent(formState.publicSlug.trim())}`;
  }, [formState.publicSlug]);

  const generatedCampaignLink = useMemo(() => {
    return buildCampaignLink(publicUrl, {
      id: campaignDraft.id ?? 'draft',
      name: campaignDraft.name,
      channel: campaignDraft.channel,
      campaignCode: campaignDraft.campaignCode,
      utmSource: campaignDraft.utmSource,
      utmMedium: campaignDraft.utmMedium,
      isActive: campaignDraft.isActive,
    });
  }, [campaignDraft, publicUrl]);

  const activeCampaigns = useMemo(
    () => campaignPresets.filter((preset) => preset.isActive),
    [campaignPresets]
  );

  const inactiveCampaigns = useMemo(
    () => campaignPresets.filter((preset) => !preset.isActive),
    [campaignPresets]
  );

  const filteredCampaigns = useMemo(() => {
    const query = campaignSearchQuery.trim().toLowerCase();
    return campaignPresets.filter((campaign) => {
      const matchesSource =
        campaignSourceFilter === 'ALL' ? true : campaign.channel === campaignSourceFilter;
      if (!matchesSource) return false;
      if (!query) return true;

      const searchable = [
        campaign.name,
        campaign.channel,
        campaign.campaignCode,
        campaign.utmSource,
        campaign.utmMedium,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [campaignPresets, campaignSearchQuery, campaignSourceFilter]);

  const filteredActiveCampaigns = useMemo(
    () => filteredCampaigns.filter((campaign) => campaign.isActive),
    [filteredCampaigns]
  );

  const filteredInactiveCampaigns = useMemo(
    () => filteredCampaigns.filter((campaign) => !campaign.isActive),
    [filteredCampaigns]
  );

  useEffect(() => {
    if (expandedCampaignId && campaignPresets.some((campaign) => campaign.id === expandedCampaignId)) {
      return;
    }
    setExpandedCampaignId(campaignPresets[0]?.id ?? null);
  }, [campaignPresets, expandedCampaignId]);

  useEffect(() => {
    if (!form?.id) return;
    setCampaignPresets(loadCampaignPresets(form.id));
  }, [form?.id]);

  useEffect(() => {
    if (!form?.id) return;
    saveCampaignPresets(form.id, campaignPresets);
  }, [campaignPresets, form?.id]);

  const loadLeadForm = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await apiFetch<LeadFormResponse>('/manager/lead-form', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      setForm(data);
      setFormState({
        title: data.title ?? '',
        publicSlug: data.publicSlug ?? '',
        isActive: Boolean(data.isActive ?? true),
      });
    } catch (error) {
      setLoadError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeadForm();
  }, [loadLeadForm]);

  useEffect(() => {
    if (!selectedCampaignId || campaignPresets.length === 0) return;
    const selectedCampaign = campaignPresets.find((campaign) => campaign.id === selectedCampaignId);
    if (!selectedCampaign) return;

    setCampaignDraft(campaignToDraft(selectedCampaign));
    setWizardQuestions(
      questions.map((question, index) => questionToWizardDraft(question, index + 1))
    );
    setWizardStep(1);
    setCampaignWizardError(null);
    setQuestionEditor(EMPTY_QUESTION_EDITOR);
    setQuestionEditorMode('wizard');
    setIsCampaignWizardOpen(true);
  }, [campaignPresets, questions, selectedCampaignId]);

  const handleSaveForm = async () => {
    setSaveError(null);

    try {
      setIsSavingForm(true);
      const saved = await apiFetch<LeadFormResponse>('/manager/lead-form', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() ?? {}),
        },
        body: JSON.stringify({
          title: formState.title.trim(),
          publicSlug: formState.publicSlug.trim(),
          isActive: formState.isActive,
        }),
      });

      setForm(saved);
      setFormState({
        title: saved.title ?? '',
        publicSlug: saved.publicSlug ?? '',
        isActive: Boolean(saved.isActive ?? true),
      });

      toast({
        title: 'Lead form saved',
        description: 'Form title, public slug, and form status were updated.',
      });
    } catch (error) {
      const parsed = parseApiError(error);
      setSaveError(parsed);
      toast({
        title: 'Unable to save form',
        description: parsed.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleGenerateSlug = () => {
    setFormState((current) => ({
      ...current,
      publicSlug: slugify(current.title) || current.publicSlug,
    }));
  };

  const handleCopy = async (value: string, title: string) => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    toast({ title, description: value });
  };

  const validateQuestionEditor = () => {
    const nextErrors: Record<string, string> = {};
    if (!questionEditor.label.trim()) {
      nextErrors.label = 'Question label is required.';
    }

    if (isSelectType(questionEditor.questionType)) {
      const options = questionEditor.optionsText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      if (options.length === 0) {
        nextErrors.optionsText = 'At least one option is required for select questions.';
      }
    }

    setQuestionErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildQuestionPayload = () => {
    const options = questionEditor.optionsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const nextOrder =
      questionEditor.id != null
        ? questions.find((question) => question.id === questionEditor.id)?.displayOrder ?? 1
        : questions.length + 1;

    return {
      questionType: questionEditor.questionType,
      label: questionEditor.label.trim(),
      placeholder: questionEditor.placeholder.trim() || null,
      helpText: questionEditor.helpText.trim() || null,
      required: questionEditor.required,
      optionsJson: isSelectType(questionEditor.questionType) ? JSON.stringify(options) : null,
      displayOrder: nextOrder,
    };
  };

  const resetQuestionEditor = () => {
    setQuestionEditor(EMPTY_QUESTION_EDITOR);
    setQuestionErrors({});
  };

  const handleSaveQuestion = async () => {
    if (!validateQuestionEditor()) return;

    if (questionEditorMode === 'wizard') {
      setWizardQuestions((current) => {
        const displayOrder =
          questionEditor.id != null
            ? current.find((question) => question.id === questionEditor.id)?.displayOrder ??
              current.length + 1
            : current.length + 1;
        const nextQuestion = createWizardQuestionDraft(questionEditor, displayOrder);
        const otherQuestions = current.filter((question) => question.id !== nextQuestion.id);
        return [...otherQuestions, nextQuestion].sort(
          (left, right) => left.displayOrder - right.displayOrder
        );
      });

      toast({
        title: questionEditor.id ? 'Question updated' : 'Question added',
      });
      resetQuestionEditor();
      return;
    }

    try {
      setIsSavingQuestion(true);
      const savedQuestion = await apiFetch<LeadQuestionResponse>(
        questionEditor.id
          ? `/manager/lead-form/questions/${questionEditor.id}`
          : '/manager/lead-form/questions',
        {
          method: questionEditor.id ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthHeaders() ?? {}),
          },
          body: JSON.stringify(buildQuestionPayload()),
        }
      );

      setForm((current) => {
        if (!current) return current;
        const otherQuestions = current.questions.filter((question) => question.id !== savedQuestion.id);
        return {
          ...current,
          questions: [...otherQuestions, savedQuestion].sort(
            (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
          ),
        };
      });

      toast({
        title: questionEditor.id ? 'Question updated' : 'Question added',
      });
      resetQuestionEditor();
    } catch (error) {
      const parsed = parseApiError(error);
      toast({
        title: 'Unable to save question',
        description: parsed.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (questionEditorMode === 'wizard') {
      setWizardQuestions((current) =>
        current
          .filter((question) => question.id !== questionId)
          .map((question, index) => ({ ...question, displayOrder: index + 1 }))
      );

      if (questionEditor.id === questionId) {
        resetQuestionEditor();
      }

      toast({ title: 'Question deleted' });
      return;
    }

    try {
      await apiFetch<null>(`/manager/lead-form/questions/${questionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const nextQuestions = questions.filter((question) => question.id !== questionId);
      setForm((current) => (current ? { ...current, questions: nextQuestions } : current));

      if (nextQuestions.length > 0) {
        await apiFetch<null>('/manager/lead-form/questions/reorder', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthHeaders() ?? {}),
          },
          body: JSON.stringify({
            orderedQuestionIds: nextQuestions.map((question) => question.id),
          }),
        });
        await loadLeadForm();
      }

      if (questionEditor.id === questionId) {
        resetQuestionEditor();
      }

      toast({ title: 'Question deleted' });
    } catch (error) {
      const parsed = parseApiError(error);
      toast({
        title: 'Unable to delete question',
        description: parsed.message,
        variant: 'destructive',
      });
    }
  };

  const handleReorderQuestion = async (questionId: string, direction: -1 | 1) => {
    if (questionEditorMode === 'wizard') {
      const currentIndex = wizardQuestions.findIndex((question) => question.id === questionId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= wizardQuestions.length) {
        return;
      }

      const ordered = [...wizardQuestions];
      [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
      setWizardQuestions(
        ordered.map((question, index) => ({
          ...question,
          displayOrder: index + 1,
        }))
      );
      return;
    }

    const currentIndex = questions.findIndex((question) => question.id === questionId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    const orderedQuestionIds = [...questions.map((question) => question.id)];
    [orderedQuestionIds[currentIndex], orderedQuestionIds[targetIndex]] = [
      orderedQuestionIds[targetIndex],
      orderedQuestionIds[currentIndex],
    ];

    try {
      await apiFetch<null>('/manager/lead-form/questions/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders() ?? {}),
        },
        body: JSON.stringify({ orderedQuestionIds }),
      });
      await loadLeadForm();
    } catch (error) {
      const parsed = parseApiError(error);
      toast({
        title: 'Unable to reorder questions',
        description: parsed.message,
        variant: 'destructive',
      });
    }
  };

  const openNewCampaignWizard = () => {
    setCampaignDraft(createCampaignDraft());
    setWizardQuestions([]);
    setWizardStep(1);
    setCampaignWizardError(null);
    setQuestionEditor(EMPTY_QUESTION_EDITOR);
    setQuestionErrors({});
    setQuestionEditorMode('wizard');
    setIsCampaignWizardOpen(true);
  };

  const openEditCampaignWizard = (campaign: CampaignPreset) => {
    setCampaignDraft(campaignToDraft(campaign));
    setWizardQuestions(
      questions.map((question, index) => questionToWizardDraft(question, index + 1))
    );
    setWizardStep(1);
    setCampaignWizardError(null);
    setQuestionEditor(EMPTY_QUESTION_EDITOR);
    setQuestionErrors({});
    setQuestionEditorMode('wizard');
    setIsCampaignWizardOpen(true);
  };

  const handleCampaignDraftChange = (
    patch: Partial<CampaignDraft>,
    syncDefaults = false
  ) => {
    setCampaignDraft((current) => {
      const next = { ...current, ...patch };

      if (patch.name !== undefined) {
        const previousCode = current.campaignCode.trim();
        if (!previousCode || previousCode === slugify(current.name)) {
          next.campaignCode = slugify(patch.name);
        }
      }

      if (syncDefaults && patch.channel) {
        next.utmSource = CHANNEL_DEFAULTS[patch.channel].utmSource;
        next.utmMedium = CHANNEL_DEFAULTS[patch.channel].utmMedium;
      }

      return next;
    });
  };

  const goToWizardStep = (step: WizardStep) => {
    if (step === 2 && !campaignDraft.name.trim()) {
      setCampaignWizardError('Campaign title is required before continuing.');
      return;
    }

    if (step === 3) {
      if (!campaignDraft.name.trim()) {
        setCampaignWizardError('Campaign title is required before generating the campaign.');
        return;
      }
      if (!publicUrl) {
        setCampaignWizardError('Set and save the form public slug from View Questions before generating a campaign link.');
        return;
      }
    }

    setCampaignWizardError(null);
    setWizardStep(step);
  };

  const handleGenerateCampaign = () => {
    if (!publicUrl) {
      setCampaignWizardError('Set and save the form public slug from View Questions before generating a campaign link.');
      return;
    }

    const campaignToSave: CampaignPreset = {
      id: campaignDraft.id ?? createCampaignPreset(campaignDraft.channel).id,
      name: campaignDraft.name.trim(),
      channel: campaignDraft.channel,
      campaignCode: campaignDraft.campaignCode.trim() || slugify(campaignDraft.name),
      utmSource: campaignDraft.utmSource.trim() || CHANNEL_DEFAULTS[campaignDraft.channel].utmSource,
      utmMedium: campaignDraft.utmMedium.trim() || CHANNEL_DEFAULTS[campaignDraft.channel].utmMedium,
      isActive: campaignDraft.isActive,
    };

    const syncWizardQuestions = async () => {
      if (questionEditorMode === 'wizard') {
        const existingQuestions = [...questions];
        if (existingQuestions.length > 0) {
          for (const question of existingQuestions) {
            await apiFetch<null>(`/manager/lead-form/questions/${question.id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });
          }
        }

        for (const question of wizardQuestions) {
          await apiFetch<LeadQuestionResponse>('/manager/lead-form/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(getAuthHeaders() ?? {}),
            },
            body: JSON.stringify({
              questionType: question.questionType,
              label: question.label,
              placeholder: question.placeholder,
              helpText: question.helpText,
              required: question.required,
              optionsJson: question.optionsJson,
              displayOrder: question.displayOrder,
            }),
          });
        }
      }
    };

    void (async () => {
      try {
        await syncWizardQuestions();
        await loadLeadForm();

        setCampaignPresets((current) => {
          const exists = current.some((campaign) => campaign.id === campaignToSave.id);
          if (exists) {
            return current.map((campaign) =>
              campaign.id === campaignToSave.id ? campaignToSave : campaign
            );
          }
          return [campaignToSave, ...current];
        });

        setIsCampaignWizardOpen(false);
        setWizardStep(1);
        setCampaignDraft(createCampaignDraft());
        setWizardQuestions([]);
        setQuestionEditor(EMPTY_QUESTION_EDITOR);
        setQuestionErrors({});
        setCampaignWizardError(null);

        toast({
          title: campaignDraft.id ? 'Campaign updated' : 'Campaign generated',
          description: campaignToSave.name,
        });
      } catch (error) {
        const parsed = parseApiError(error);
        setCampaignWizardError(parsed.message);
        toast({
          title: 'Unable to generate campaign',
          description: parsed.message,
          variant: 'destructive',
        });
      }
    })();
  };

  const toggleCampaignStatus = (campaignId: string, isActive: boolean) => {
    setCampaignPresets((current) =>
      current.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, isActive } : campaign
      )
    );
  };

  const deleteCampaign = (campaignId: string) => {
    setCampaignPresets((current) => current.filter((campaign) => campaign.id !== campaignId));
    toast({ title: 'Campaign deleted' });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-full flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Form Editor</h1>
            <p className="text-sm text-slate-500">
              Organize campaigns and generate links for the shared lead form.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuestionsDialogOpen(true)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Întrebări
            </Button>
            <Button
              type="button"
              onClick={openNewCampaignWizard}
              className="bg-[#38bdf8] text-white hover:bg-[#0ea5e9]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Campanie Nouă
            </Button>
          </div>
        </header>

        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>{loadError.message}</AlertTitle>
          </Alert>
        )}

        {saveError && (
          <Alert variant="destructive">
            <AlertTitle>{saveError.message}</AlertTitle>
            {Object.keys(saveError.fieldErrors).length > 0 && (
              <AlertDescription>
                {Object.entries(saveError.fieldErrors)
                  .map(([field, message]) => `${field}: ${message}`)
                  .join(' | ')}
              </AlertDescription>
            )}
          </Alert>
        )}

        {!publicUrl && (
          <Alert>
            <AlertTitle>Form link not configured yet</AlertTitle>
            <AlertDescription>
              Open View Questions and save a form title plus public slug before generating campaign links.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Campanii Totale"
            value={campaignPresets.length}
            icon={<Globe className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="Campanii Active"
            value={activeCampaigns.length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            label="Dezactivate"
            value={inactiveCampaigns.length}
            icon={<Archive className="h-5 w-5" />}
            tone="slate"
          />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={campaignSearchQuery}
              onChange={(event) => setCampaignSearchQuery(event.target.value)}
              placeholder="Caută după numele campaniei..."
              className="h-10 border-slate-200 bg-slate-50 pl-9 text-sm"
            />
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Select
              value={campaignSourceFilter}
              onValueChange={(value) => setCampaignSourceFilter(value as CampaignSourceFilter)}
            >
              <SelectTrigger className="h-10 min-w-[180px] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toate Sursele</SelectItem>
                {CAMPAIGN_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void loadLeadForm()}
              className="text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <CampaignAccordionSection
            title="Active Campaigns"
            campaigns={filteredActiveCampaigns}
            expandedCampaignId={expandedCampaignId}
            onToggleExpand={(campaignId) =>
              setExpandedCampaignId((current) => (current === campaignId ? null : campaignId))
            }
            publicUrl={publicUrl}
            onCopy={handleCopy}
            onEdit={openEditCampaignWizard}
            onToggleStatus={(campaign) => toggleCampaignStatus(campaign.id, !campaign.isActive)}
            onDelete={deleteCampaign}
          />

          <CampaignAccordionSection
            title="Inactive Campaigns"
            campaigns={filteredInactiveCampaigns}
            expandedCampaignId={expandedCampaignId}
            onToggleExpand={(campaignId) =>
              setExpandedCampaignId((current) => (current === campaignId ? null : campaignId))
            }
            publicUrl={publicUrl}
            onCopy={handleCopy}
            onEdit={openEditCampaignWizard}
            onToggleStatus={(campaign) => toggleCampaignStatus(campaign.id, !campaign.isActive)}
            onDelete={deleteCampaign}
          />
        </div>
      </div>

      <Dialog open={isCampaignWizardOpen} onOpenChange={setIsCampaignWizardOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{campaignDraft.id ? 'Edit Campaign' : 'Add Campaign'}</DialogTitle>
            <DialogDescription>
              Create a campaign link for the shared lead form without mixing campaign management with global form structure.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b pb-4 md:grid-cols-3">
            {WIZARD_STEPS.map((item) => (
              <button
                key={item.step}
                type="button"
                className={`rounded-lg border px-4 py-3 text-left ${
                  wizardStep === item.step ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => goToWizardStep(item.step)}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Step {item.step}
                </p>
                <p className="mt-1 font-medium">{item.title}</p>
              </button>
            ))}
          </div>

          {campaignWizardError && (
            <Alert variant="destructive">
              <AlertTitle>{campaignWizardError}</AlertTitle>
            </Alert>
          )}

          {wizardStep === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Campaign title"
                input={
                  <Input
                    value={campaignDraft.name}
                    onChange={(event) =>
                      handleCampaignDraftChange({ name: event.target.value })
                    }
                    placeholder="Meta Summer Campaign"
                  />
                }
              />
              <Field
                label="Campaign source"
                input={
                  <Select
                    value={campaignDraft.channel}
                    onValueChange={(value) =>
                      handleCampaignDraftChange(
                        { channel: value as CampaignChannel },
                        true
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <Field
                label="Campaign code"
                input={
                  <Input
                    value={campaignDraft.campaignCode}
                    onChange={(event) =>
                      handleCampaignDraftChange({
                        campaignCode: slugify(event.target.value),
                      })
                    }
                    placeholder="meta-summer"
                  />
                }
              />
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="campaign-draft-active">Campaign status</Label>
                    <p className="text-xs text-muted-foreground">
                      Decide whether the campaign lands in the active or inactive list.
                    </p>
                  </div>
                  <Switch
                    id="campaign-draft-active"
                    checked={campaignDraft.isActive}
                    onCheckedChange={(checked) =>
                      handleCampaignDraftChange({ isActive: Boolean(checked) })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Form Questions</h2>
                  <p className="text-sm text-muted-foreground">
                    This campaign starts with an empty question list. Add every question you want from scratch.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuestionEditorMode('wizard');
                    resetQuestionEditor();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              <div className="grid gap-3">
                {wizardQuestions.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No questions added yet. Build this campaign form from zero by adding the first question.
                  </p>
                ) : (
                  wizardQuestions.map((question, index) => (
                    <div key={question.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            #{question.displayOrder ?? index + 1} {question.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatQuestionType(question.questionType)}
                            {question.required ? ' • Required' : ' • Optional'}
                          </p>
                          {isSelectType(question.questionType) && (
                            <p className="text-xs text-muted-foreground">
                              Options: {parseOptionsJson(question.optionsJson).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleReorderQuestion(question.id, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleReorderQuestion(question.id, 1)}
                            disabled={index === wizardQuestions.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setQuestionEditorMode('wizard');
                              setQuestionEditor(wizardDraftToEditorState(question));
                              setQuestionErrors({});
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <QuestionEditorPanel
                title={questionEditor.id ? 'Edit Question' : 'Add Question'}
                description="Any question added here updates the shared form structure globally."
                questionEditor={questionEditor}
                questionErrors={questionErrors}
                isSavingQuestion={isSavingQuestion}
                onQuestionEditorChange={setQuestionEditor}
                onSaveQuestion={() => void handleSaveQuestion()}
                onReset={resetQuestionEditor}
              />
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Campaign name
                  </p>
                  <p className="mt-2 font-medium">{campaignDraft.name || '-'}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Campaign source
                  </p>
                  <p className="mt-2 font-medium">{formatCampaignSource(campaignDraft.channel)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Questions included
                  </p>
                  <p className="mt-2 font-medium">{wizardQuestions.length}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Selected questions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {wizardQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions configured yet.</p>
                  ) : (
                    wizardQuestions.map((question) => (
                      <Badge key={question.id} variant="secondary">
                        {question.label}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Generated campaign link</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {generatedCampaignLink || 'Save the form public slug first to generate a campaign link.'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCampaignWizardOpen(false);
                setWizardStep(1);
                setCampaignWizardError(null);
                resetQuestionEditor();
              }}
            >
              Cancel
            </Button>
            {wizardStep > 1 && (
              <Button type="button" variant="outline" onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}>
                Back
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button type="button" onClick={() => goToWizardStep((wizardStep + 1) as WizardStep)}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={handleGenerateCampaign}>
                <Check className="mr-2 h-4 w-4" />
                {campaignDraft.id ? 'Save Campaign' : 'Generate Campaign'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuestionsDialogOpen} onOpenChange={setIsQuestionsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Questions</DialogTitle>
            <DialogDescription>
              Manage the shared lead form structure separately from campaign creation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Settings</CardTitle>
                  <CardDescription>
                    Global form settings used by every generated campaign link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Form title"
                      input={
                        <Input
                          value={formState.title}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Lead Form Principal"
                        />
                      }
                    />
                    <Field
                      label="Public slug"
                      input={
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={formState.publicSlug}
                              onChange={(event) =>
                                setFormState((current) => ({
                                  ...current,
                                  publicSlug: slugify(event.target.value),
                                }))
                              }
                              placeholder="company-form"
                            />
                            <Button type="button" variant="outline" onClick={handleGenerateSlug}>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                    <div>
                      <Label htmlFor="lead-form-active">Public form active</Label>
                      <p className="text-xs text-muted-foreground">
                        Disable this only when the public form should stop resolving.
                      </p>
                    </div>
                    <Switch
                      id="lead-form-active"
                      checked={formState.isActive}
                      onCheckedChange={(checked) =>
                        setFormState((current) => ({
                          ...current,
                          isActive: Boolean(checked),
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={() => void handleSaveForm()} disabled={isSavingForm}>
                      {isSavingForm ? 'Saving...' : 'Save Form'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopy(publicUrl, 'Public link copied')}
                      disabled={!publicUrl}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {publicUrl || 'Save the public slug to generate the base public form link.'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Form Questions</CardTitle>
                    <CardDescription>
                      Each question below belongs to the shared form structure used by all campaigns.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setQuestionEditorMode('questions');
                      resetQuestionEditor();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No questions yet. Add the first one from the panel on the right.
                    </p>
                  ) : (
                    questions.map((question, index) => (
                      <div key={question.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">
                              #{question.displayOrder ?? index + 1} {question.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatQuestionType(question.questionType)}
                              {question.required ? ' • Required' : ' • Optional'}
                            </p>
                            {isSelectType(question.questionType) && (
                              <p className="text-xs text-muted-foreground">
                                Options: {parseOptionsJson(question.optionsJson).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleReorderQuestion(question.id, -1)}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleReorderQuestion(question.id, 1)}
                              disabled={index === questions.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setQuestionEditorMode('questions');
                                setQuestionEditor(questionToEditorState(question));
                                setQuestionErrors({});
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Question
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Question
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <QuestionEditorPanel
              title={questionEditor.id ? 'Edit Question' : 'Add Question'}
              description="Update text, answer type, and options for multiple choice questions."
              questionEditor={questionEditor}
              questionErrors={questionErrors}
              isSavingQuestion={isSavingQuestion}
              onQuestionEditorChange={setQuestionEditor}
              onSaveQuestion={() => void handleSaveQuestion()}
              onReset={resetQuestionEditor}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function CampaignAccordionSection({
  title,
  campaigns,
  expandedCampaignId,
  onToggleExpand,
  publicUrl,
  onCopy,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  title: string;
  campaigns: CampaignPreset[];
  expandedCampaignId: string | null;
  onToggleExpand: (campaignId: string) => void;
  publicUrl: string;
  onCopy: (value: string, title: string) => Promise<void>;
  onEdit: (campaign: CampaignPreset) => void;
  onToggleStatus: (campaign: CampaignPreset) => void;
  onDelete: (campaignId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <Badge variant="outline" className="border-slate-200 text-slate-500">
          {campaigns.length}
        </Badge>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nu există campanii în această secțiune pentru filtrele curente.
        </p>
      ) : (
        campaigns.map((campaign) => {
          const campaignLink = buildCampaignLink(publicUrl, campaign);
          const isExpanded = expandedCampaignId === campaign.id;

          return (
            <div
              key={campaign.id}
              className={`overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                isExpanded
                  ? 'border-[#38bdf8] ring-2 ring-[#38bdf8]/30 shadow-lg'
                  : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
                onClick={() => onToggleExpand(campaign.id)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      campaign.isActive ? 'bg-blue-50 text-[#38bdf8]' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate font-bold text-slate-900">{campaign.name}</h4>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {formatCampaignSource(campaign.channel)}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] text-slate-400">{campaign.campaignCode || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      campaign.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {campaign.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className={`rounded-lg p-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Public Link Generat
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 break-all rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-600">
                          {campaignLink || 'Salvează slug-ul public din Questions pentru a genera link-ul.'}
                        </div>
                        <Button type="button" variant="outline" size="icon" asChild disabled={!campaignLink}>
                          <a href={campaignLink || '#'} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-row gap-2 md:flex-col md:justify-end">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => onEdit(campaign)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editează
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 justify-center text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                        onClick={() => onToggleStatus(campaign)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {campaign.isActive ? 'Dezactivează' : 'Activează'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onCopy(campaignLink, 'Campaign link copied')}
                      disabled={!campaignLink}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>UTM source: {campaign.utmSource || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'slate';
}) {
  const toneClasses: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase leading-none tracking-wider text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function QuestionEditorPanel({
  title,
  description,
  questionEditor,
  questionErrors,
  isSavingQuestion,
  onQuestionEditorChange,
  onSaveQuestion,
  onReset,
}: {
  title: string;
  description: string;
  questionEditor: QuestionEditorState;
  questionErrors: Record<string, string>;
  isSavingQuestion: boolean;
  onQuestionEditorChange: React.Dispatch<React.SetStateAction<QuestionEditorState>>;
  onSaveQuestion: () => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          label="Question text"
          error={questionErrors.label}
          input={
            <Input
              value={questionEditor.label}
              onChange={(event) =>
                onQuestionEditorChange((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              placeholder="What service are you interested in?"
            />
          }
        />
        <Field
          label="Answer type"
          input={
            <Select
              value={questionEditor.questionType}
              onValueChange={(value) =>
                onQuestionEditorChange((current) => ({
                  ...current,
                  questionType: value as QuestionType,
                  optionsText: isSelectType(value) ? current.optionsText : '',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <Field
          label="Placeholder"
          input={
            <Input
              value={questionEditor.placeholder}
              onChange={(event) =>
                onQuestionEditorChange((current) => ({
                  ...current,
                  placeholder: event.target.value,
                }))
              }
              placeholder="Optional placeholder"
            />
          }
        />
        <Field
          label="Help text"
          input={
            <Textarea
              value={questionEditor.helpText}
              onChange={(event) =>
                onQuestionEditorChange((current) => ({
                  ...current,
                  helpText: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional helper text"
            />
          }
        />
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div>
            <Label htmlFor="question-required">Required question</Label>
            <p className="text-xs text-muted-foreground">
              Required questions must be answered before a lead can submit the form.
            </p>
          </div>
          <Switch
            id="question-required"
            checked={questionEditor.required}
            onCheckedChange={(checked) =>
              onQuestionEditorChange((current) => ({
                ...current,
                required: Boolean(checked),
              }))
            }
          />
        </div>
        {isSelectType(questionEditor.questionType) && (
          <Field
            label="Options"
            error={questionErrors.optionsText}
            input={
              <Textarea
                value={questionEditor.optionsText}
                onChange={(event) =>
                  onQuestionEditorChange((current) => ({
                    ...current,
                    optionsText: event.target.value,
                  }))
                }
                rows={6}
                placeholder={'Option 1\nOption 2\nOption 3'}
              />
            }
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onSaveQuestion} disabled={isSavingQuestion}>
            {isSavingQuestion ? 'Saving...' : questionEditor.id ? 'Update Question' : 'Add Question'}
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            {questionEditor.id ? 'Cancel Edit' : 'Reset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
