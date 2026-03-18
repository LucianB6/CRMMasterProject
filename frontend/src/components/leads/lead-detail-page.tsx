'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Sparkles } from 'lucide-react';

import { ApiError } from '../../lib/api';
import { apiFetch } from '../../lib/api';
import {
  fetchManagerAgents,
  fetchManagerLeadAiInsights,
  fetchManagerLeadAnswers,
  fetchManagerLeadDetails,
  fetchManagerLeadFormForLead,
  fetchPipelineStages,
  regenerateManagerLeadAiInsights,
  type LeadAnswerUpdatePayload,
  type LeadAnswerResponse,
  type LeadFormQuestion,
  type LeadInsightFeedbackStatus,
  type LeadStatus,
  type ManagerAgent,
  type ManagerLeadDetails,
  type PipelineStage,
  updateManagerLeadAnswers,
  updateManagerLeadAiInsightFeedback,
  updateManagerLeadAssignee,
  updateManagerLeadStage,
  updateManagerLeadStatus,
} from '../../lib/leads';
import { useToast } from '../../hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { LeadAIInsights, useLeadAiInsights } from './lead-ai-insights';
import { LeadHeader } from './lead-header';
import { buildEditableAnswerItems, LeadInfoPanel } from './lead-info-panel';
import { LeadTimeline } from './lead-timeline';

const AI_INSIGHTS_STORAGE_KEY_PREFIX = 'lead-ai-insights:';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('salesway_token');
};

const getAiInsightsStorageKey = (leadId: string) => `${AI_INSIGHTS_STORAGE_KEY_PREFIX}${leadId}`;

const readCachedAiInsights = (leadId: string) => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(getAiInsightsStorageKey(leadId));
    if (!raw) return null;
    return JSON.parse(raw) as ReturnType<typeof JSON.parse>;
  } catch {
    return null;
  }
};

const writeCachedAiInsights = (leadId: string, insights: unknown) => {
  if (typeof window === 'undefined') return;

  try {
    if (!insights) {
      window.sessionStorage.removeItem(getAiInsightsStorageKey(leadId));
      return;
    }
    window.sessionStorage.setItem(getAiInsightsStorageKey(leadId), JSON.stringify(insights));
  } catch {
    // Ignore storage failures and keep UI functional.
  }
};

const parseApiError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Unable to load lead.';
  }

  if (!error.body) return error.message;

  try {
    const parsed = JSON.parse(error.body) as { message?: string };
    return parsed.message?.trim() || error.message;
  } catch {
    return error.body || error.message;
  }
};

export function LeadDetailPage({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<'manager' | 'agent'>('agent');
  const [currentUser, setCurrentUser] = useState<{
    userId: string | null;
    email: string | null;
  }>({ userId: null, email: null });
  const [lead, setLead] = useState<ManagerLeadDetails | null>(null);
  const [answers, setAnswers] = useState<LeadAnswerResponse[]>([]);
  const [formQuestions, setFormQuestions] = useState<LeadFormQuestion[]>([]);
  const [agents, setAgents] = useState<ManagerAgent[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCompactSection, setActiveCompactSection] = useState<'timeline' | 'details' | 'ai'>(
    'details'
  );
  const [hasPendingAiRefresh, setHasPendingAiRefresh] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [answerSaveState, setAnswerSaveState] = useState<
    'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  >('idle');
  const [answerSaveError, setAnswerSaveError] = useState<string | null>(null);
  const [aiRefreshState, setAiRefreshState] = useState<'idle' | 'refreshing' | 'success' | 'error'>(
    'idle'
  );
  const [aiRefreshError, setAiRefreshError] = useState<string | null>(null);
  const [lastAiRefreshAt, setLastAiRefreshAt] = useState<string | null>(null);
  const {
    insights,
    isRefreshing,
    isSubmittingFeedback,
    setIsRefreshing,
    setIsSubmittingFeedback,
    setInsightsFromResponse,
  } = useLeadAiInsights();
  const inFlightAnswerSaveRef = useRef<Promise<LeadAnswerResponse[]> | null>(null);
  const serverDraftAnswersRef = useRef<Record<string, string>>({});

  const currentStage = useMemo(
    () => stages.find((stage) => stage.stageId === lead?.stageId) ?? null,
    [lead?.stageId, stages]
  );
  const activeFormQuestionIds = useMemo(
    () => new Set(formQuestions.filter((question) => question.isActive !== false).map((question) => question.id)),
    [formQuestions]
  );
  const editableAnswerItems = useMemo(
    () => buildEditableAnswerItems(formQuestions, answers),
    [formQuestions, answers]
  );
  const savableAnswerItems = useMemo(
    () =>
      editableAnswerItems.filter(
        (item) => !!item.questionId && activeFormQuestionIds.has(item.questionId)
      ),
    [activeFormQuestionIds, editableAnswerItems]
  );
  const savableAnswerIds = useMemo(
    () => new Set(savableAnswerItems.map((item) => item.id)),
    [savableAnswerItems]
  );

  useEffect(() => {
    const nextServerDrafts = Object.fromEntries(
      editableAnswerItems.map((item) => [item.id, item.answer])
    );

    setDraftAnswers((current) => {
      const nextDrafts: Record<string, string> = {};

      editableAnswerItems.forEach((item) => {
        const previousServerValue = serverDraftAnswersRef.current[item.id];
        const currentValue = current[item.id];

        if (typeof currentValue === 'undefined' || currentValue === previousServerValue) {
          nextDrafts[item.id] = item.answer;
          return;
        }

        nextDrafts[item.id] = currentValue;
      });

      return nextDrafts;
    });

    serverDraftAnswersRef.current = nextServerDrafts;
  }, [editableAnswerItems]);

  const hasUnsavedAnswerChanges = useMemo(
    () =>
      savableAnswerItems.some(
        (item) => (draftAnswers[item.id] ?? '') !== (serverDraftAnswersRef.current[item.id] ?? '')
      ),
    [draftAnswers, savableAnswerItems]
  );
  const canRefreshAiInsights = true;
  const answerSaveStateMessage =
    answerSaveState === 'saving'
      ? 'Saving latest form answers...'
      : answerSaveState === 'dirty'
        ? 'Ai modificari nesalvate. Apasa Update pe raspunsul modificat.'
        : answerSaveState === 'saved'
          ? 'Latest form answers saved.'
          : null;
  const aiRefreshStatusMessage =
    aiRefreshState === 'refreshing'
      ? answerSaveState === 'saving'
        ? 'Waiting for the latest form save before regenerating insights...'
        : 'Regenerating AI insights from the latest saved lead data...'
      : aiRefreshState === 'success'
        ? `AI insights refreshed${lastAiRefreshAt ? ` at ${lastAiRefreshAt}` : ''}.`
        : hasUnsavedAnswerChanges
          ? 'Salveaza modificarile inainte de regenerate ca insight-ul sa foloseasca datele noi.'
          : null;

  const buildLeadAnswersPayload = useCallback((): LeadAnswerUpdatePayload => {
    return {
      answers: savableAnswerItems.map((item) => ({
        questionId: item.questionId as string,
        value: draftAnswers[item.id] ?? '',
      })),
    };
  }, [draftAnswers, savableAnswerItems]);

  const loadLead = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchManagerLeadDetails(leadId, getAuthToken());
      setLead(data);
    } catch (error) {
      setErrorMessage(parseApiError(error));
      setLead(null);
    }
  }, [leadId]);

  const persistLeadAnswers = useCallback(async () => {
    if (!lead || savableAnswerItems.length === 0 || !hasUnsavedAnswerChanges) {
      return answers;
    }

    if (inFlightAnswerSaveRef.current) {
      return inFlightAnswerSaveRef.current;
    }

    setAnswerSaveState('saving');
    setAnswerSaveError(null);

    const request = updateManagerLeadAnswers(
      lead.leadId,
      buildLeadAnswersPayload(),
      getAuthToken()
    );

    inFlightAnswerSaveRef.current = request;

    try {
      const savedAnswers = await request;
      setAnswers(savedAnswers);
      setHasPendingAiRefresh(true);
      setAnswerSaveState('saved');
      return savedAnswers;
    } catch (error) {
      const message = parseApiError(error);
      setAnswerSaveState('error');
      setAnswerSaveError(message);
      throw error;
    } finally {
      if (inFlightAnswerSaveRef.current === request) {
        inFlightAnswerSaveRef.current = null;
      }
    }
  }, [answers, buildLeadAnswersPayload, hasUnsavedAnswerChanges, lead, savableAnswerItems.length]);

  const flushPendingAnswerSave = useCallback(async () => {
    if (hasUnsavedAnswerChanges) {
      await persistLeadAnswers();
      return;
    }

    if (inFlightAnswerSaveRef.current) {
      await inFlightAnswerSaveRef.current;
    }
  }, [hasUnsavedAnswerChanges, persistLeadAnswers]);

  const loadPageData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsLoadingAnswers(true);
      const token = getAuthToken();
      setErrorMessage(null);
      const [leadResult, answersResult, agentsResult, stagesResult, formResult] =
        await Promise.allSettled([
        fetchManagerLeadDetails(leadId, token),
        fetchManagerLeadAnswers(leadId, token),
        fetchManagerAgents(token),
        fetchPipelineStages(token),
        fetchManagerLeadFormForLead(leadId, token),
      ]);

      if (leadResult.status === 'rejected') {
        throw leadResult.reason;
      }

      setLead(leadResult.value);

      if (answersResult.status === 'fulfilled') {
        setAnswers(answersResult.value);
      } else {
        setAnswers([]);
        toast({
          title: 'Nu am putut incarca raspunsurile',
          description: parseApiError(answersResult.reason),
          variant: 'destructive',
        });
      }

      if (agentsResult.status === 'fulfilled') {
        setAgents(agentsResult.value);
      } else {
        setAgents([]);
      }

      if (stagesResult.status === 'fulfilled') {
        setStages(stagesResult.value);
      } else {
        setStages([]);
      }

      if (formResult.status === 'fulfilled') {
        setFormQuestions(
          [...(formResult.value.questions ?? [])].sort(
            (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
          )
        );
      } else {
        setFormQuestions([]);
      }
    } catch (error) {
      setErrorMessage(parseApiError(error));
      setLead(null);
    } finally {
      setIsLoading(false);
      setIsLoadingAnswers(false);
      setIsRefreshing(false);
    }
  }, [leadId, setInsightsFromResponse, setIsRefreshing, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = window.localStorage.getItem('userRole');
    setUserRole(role === 'manager' ? 'manager' : 'agent');
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const data = await apiFetch<{
          user_id?: string | null;
          userId?: string | null;
          email?: string | null;
        }>('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setCurrentUser({
          userId: data.user_id ?? data.userId ?? null,
          email: data.email ?? null,
        });
      } catch {
        setCurrentUser({ userId: null, email: null });
      }
    };

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    setInsightsFromResponse(readCachedAiInsights(leadId));
    setHasPendingAiRefresh(false);
    setAiRefreshState('idle');
    setAiRefreshError(null);
    setLastAiRefreshAt(null);
  }, [leadId, setInsightsFromResponse]);

  const handleStatusChange = async (nextStatus: LeadStatus) => {
    if (!lead || lead.status === nextStatus) return;

    const previousStatus = lead.status;
    setLead((current) => (current ? { ...current, status: nextStatus } : current));

    try {
      setIsUpdatingStatus(true);
      await updateManagerLeadStatus(lead.leadId, { status: nextStatus }, getAuthToken());
      toast({
        title: 'Status updated',
        description: `${previousStatus} → ${nextStatus}`,
      });
      await loadLead();
      setHasPendingAiRefresh(true);
    } catch (error) {
      setLead((current) => (current ? { ...current, status: previousStatus } : current));
      toast({
        title: 'Unable to update status',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (nextAssignee: string | null) => {
    if (!lead || lead.assignedToUserId === nextAssignee) return;

    const previousAssignee = lead.assignedToUserId;
    setLead((current) =>
      current ? { ...current, assignedToUserId: nextAssignee } : current
    );

    try {
      setIsUpdatingAssignee(true);
      await updateManagerLeadAssignee(
        lead.leadId,
        { assignedToUserId: nextAssignee },
        getAuthToken()
      );
      toast({ title: 'Assignee updated' });
      await loadLead();
      setHasPendingAiRefresh(true);
    } catch (error) {
      setLead((current) =>
        current ? { ...current, assignedToUserId: previousAssignee } : current
      );
      toast({
        title: 'Unable to update assignee',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  const handleStageChange = async (nextStage: string | null) => {
    if (!lead || lead.stageId === nextStage) return;

    const previousStage = lead.stageId;
    setLead((current) => (current ? { ...current, stageId: nextStage } : current));

    try {
      setIsUpdatingStage(true);
      await updateManagerLeadStage(
        lead.leadId,
        { stageId: nextStage },
        getAuthToken()
      );
      toast({ title: 'Stage updated' });
      await loadLead();
      setHasPendingAiRefresh(true);
    } catch (error) {
      setLead((current) => (current ? { ...current, stageId: previousStage } : current));
      toast({
        title: 'Unable to update stage',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleInsightFeedback = async (status: LeadInsightFeedbackStatus) => {
    if (!lead || !insights?.insightId) return;

    try {
      setIsSubmittingFeedback(true);
      await updateManagerLeadAiInsightFeedback(
        lead.leadId,
        insights.insightId,
        { status },
        getAuthToken()
      );
      toast({ title: 'Feedback saved' });
      setInsightsFromResponse({
        ...insights,
        whatChanged: {
          previousRecommendation: insights.whatChanged?.previousRecommendation ?? null,
          previousFeedbackStatus: status,
          changes: insights.whatChanged?.changes ?? [],
        },
      });
    } catch (error) {
      toast({
        title: 'Unable to save feedback',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLeadActivityMutation = useCallback(async () => {
    await loadLead();
    setHasPendingAiRefresh(true);
  }, [loadLead]);

  const handleAnswerChange = useCallback((answerId: string, value: string) => {
    setDraftAnswers((current) => ({
      ...current,
      [answerId]: value,
    }));
    setAnswerSaveState('dirty');
    setAnswerSaveError(null);
    setAiRefreshError(null);
  }, []);

  const handleSaveAnswers = useCallback(async () => {
    try {
      await persistLeadAnswers();
      toast({
        title: 'Answers updated',
      });
    } catch (error) {
      toast({
        title: 'Unable to update answers',
        description: parseApiError(error),
        variant: 'destructive',
      });
    }
  }, [persistLeadAnswers, toast]);

  const handleRegenerateAiInsights = useCallback(async () => {
    if (!lead) return;

    try {
      setIsRefreshing(true);
      setAiRefreshState('refreshing');
      setAiRefreshError(null);
      await flushPendingAnswerSave();
      const regeneratedInsights = await regenerateManagerLeadAiInsights(
        lead.leadId,
        getAuthToken()
      );
      const nextInsights = await fetchManagerLeadAiInsights(lead.leadId, getAuthToken()).catch(
        () => regeneratedInsights
      );

      setInsightsFromResponse(nextInsights);
      writeCachedAiInsights(lead.leadId, nextInsights);
      setHasPendingAiRefresh(false);
      setAiRefreshState('success');
      const refreshedAt = new Intl.DateTimeFormat('ro-RO', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date());
      setLastAiRefreshAt(refreshedAt);
      toast({
        title: 'AI insights refreshed',
        description: `Ultimul refresh: ${refreshedAt}`,
      });
    } catch (error) {
      const message = parseApiError(error);
      setAiRefreshState('error');
      setAiRefreshError(message);
      toast({
        title: 'Unable to regenerate AI insights',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [flushPendingAnswerSave, lead, setInsightsFromResponse, setIsRefreshing, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-blue-50/40 text-slate-900">
        <Skeleton className="h-16 w-full" />
        <div className="flex flex-1">
          <Skeleton className="hidden h-full w-80 xl:block" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="hidden h-full w-[360px] lg:block" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load lead</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (!lead) {
    return (
      <Alert>
        <AlertTitle>Lead not found</AlertTitle>
        <AlertDescription>No lead data was returned for `{leadId}`.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-900">
      <LeadHeader
        lead={lead}
        agents={agents}
        userRole={userRole}
        currentUserId={currentUser.userId}
        currentUserEmail={currentUser.email}
        stages={stages}
        isUpdatingStatus={isUpdatingStatus}
        isUpdatingAssignee={isUpdatingAssignee}
        isUpdatingStage={isUpdatingStage}
        onChangeAssignee={handleAssigneeChange}
        onChangeStage={handleStageChange}
        onOpenInfoPanel={() => setActiveCompactSection('details')}
      />

      <div className="flex-1">
        <div className="mr-0 ml-0 flex min-h-[calc(100vh-88px)] w-full max-w-none flex-col pr-4 pb-8 pt-4 pl-0 sm:pr-6 sm:pl-0 lg:pr-8 lg:pl-0">
          <div className="xl:hidden">
            <Tabs
              value={activeCompactSection}
              onValueChange={(value) =>
                setActiveCompactSection(value as 'timeline' | 'details' | 'ai')
              }
              className="space-y-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-white p-1 ring-1 ring-slate-200/80">
                <TabsTrigger
                  value="timeline"
                  className="rounded-[18px] py-3 text-xs font-bold data-[state=active]:bg-[#e0f2fe] data-[state=active]:text-[#0369a1]"
                >
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="rounded-[18px] py-3 text-xs font-bold data-[state=active]:bg-[#e0f2fe] data-[state=active]:text-[#0369a1]"
                >
                  Detalii
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="rounded-[18px] py-3 text-xs font-bold data-[state=active]:bg-[#e0f2fe] data-[state=active]:text-[#0369a1]"
                >
                  AI
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-6 hidden min-h-[calc(100vh-180px)] xl:grid xl:grid-cols-[420px_minmax(0,1fr)_320px] xl:items-start xl:gap-0">
            <div className="self-start overflow-hidden rounded-r-2xl bg-transparent">
              <div className="h-[calc(100vh-140px)] overflow-x-hidden overflow-y-auto">
                <LeadInfoPanel
                  lead={lead}
                  agents={agents}
                  userRole={userRole}
                  currentUserId={currentUser.userId}
                  currentUserEmail={currentUser.email}
                  stages={stages}
                  answers={answers}
                  formQuestions={formQuestions}
                  isLoadingAnswers={isLoadingAnswers}
                  isUpdatingStatus={isUpdatingStatus}
                  isUpdatingAssignee={isUpdatingAssignee}
                  isUpdatingStage={isUpdatingStage}
                  draftAnswers={draftAnswers}
                  isSavingAnswers={answerSaveState === 'saving'}
                  hasUnsavedChanges={hasUnsavedAnswerChanges}
                  saveStateMessage={answerSaveStateMessage}
                  saveErrorMessage={answerSaveError}
                  savableAnswerIds={savableAnswerIds}
                  onChangeStatus={handleStatusChange}
                  onChangeAssignee={handleAssigneeChange}
                  onChangeStage={handleStageChange}
                  onAnswerChange={handleAnswerChange}
                  onSaveAnswers={() => void handleSaveAnswers()}
                />
              </div>
            </div>

            <div className="self-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="h-[calc(100vh-140px)] overflow-hidden">
                <LeadTimeline
                  leadId={lead.leadId}
                  stageName={currentStage?.name}
                  assigneeUserId={lead.assignedToUserId}
                  onLeadChanged={handleLeadActivityMutation}
                />
              </div>
            </div>

            <aside className="self-start overflow-hidden bg-transparent">
              <div className="h-[calc(100vh-140px)] overflow-x-hidden overflow-y-auto pl-6 pr-0">
                <div className="flex min-h-full w-full flex-col">
                  <LeadAIInsights
                    insights={insights}
                    isRefreshing={isRefreshing || aiRefreshState === 'refreshing'}
                    isSubmittingFeedback={isSubmittingFeedback}
                    canRefresh={canRefreshAiInsights}
                    refreshLabel="Regenerate AI Insights"
                    refreshStatusMessage={aiRefreshStatusMessage}
                    refreshErrorMessage={aiRefreshError}
                    onRefresh={() => void handleRegenerateAiInsights()}
                    onSubmitFeedback={(status) => void handleInsightFeedback(status)}
                  />
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-4 space-y-4 xl:hidden">
            {activeCompactSection === 'timeline' ? (
              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                <LeadTimeline
                  leadId={lead.leadId}
                  stageName={currentStage?.name}
                  assigneeUserId={lead.assignedToUserId}
                  onLeadChanged={handleLeadActivityMutation}
                />
              </div>
            ) : null}

            {activeCompactSection === 'details' ? (
              <div className="overflow-hidden rounded-2xl bg-transparent">
                <div className="flex items-center gap-2 border-b border-slate-200/80 px-5 py-4">
                  <ClipboardList size={16} className="text-[#38bdf8]" />
                  <h2 className="text-sm font-bold text-slate-800">Detalii si formular lead</h2>
                </div>
                <LeadInfoPanel
                  lead={lead}
                  agents={agents}
                  userRole={userRole}
                  currentUserId={currentUser.userId}
                  currentUserEmail={currentUser.email}
                  stages={stages}
                  answers={answers}
                  formQuestions={formQuestions}
                  isLoadingAnswers={isLoadingAnswers}
                  isUpdatingStatus={isUpdatingStatus}
                  isUpdatingAssignee={isUpdatingAssignee}
                  isUpdatingStage={isUpdatingStage}
                  draftAnswers={draftAnswers}
                  isSavingAnswers={answerSaveState === 'saving'}
                  hasUnsavedChanges={hasUnsavedAnswerChanges}
                  saveStateMessage={answerSaveStateMessage}
                  saveErrorMessage={answerSaveError}
                  savableAnswerIds={savableAnswerIds}
                  onChangeStatus={handleStatusChange}
                  onChangeAssignee={handleAssigneeChange}
                  onChangeStage={handleStageChange}
                  onAnswerChange={handleAnswerChange}
                  onSaveAnswers={() => void handleSaveAnswers()}
                  variant="drawer"
                />
              </div>
            ) : null}

            {activeCompactSection === 'ai' ? (
              <div className="overflow-hidden rounded-2xl bg-transparent p-5 sm:p-6">
                <LeadAIInsights
                  insights={insights}
                  isRefreshing={isRefreshing || aiRefreshState === 'refreshing'}
                  isSubmittingFeedback={isSubmittingFeedback}
                  canRefresh={canRefreshAiInsights}
                  refreshLabel="Regenerate AI Insights"
                  refreshStatusMessage={aiRefreshStatusMessage}
                  refreshErrorMessage={aiRefreshError}
                  onRefresh={() => void handleRegenerateAiInsights()}
                  onSubmitFeedback={(status) => void handleInsightFeedback(status)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
