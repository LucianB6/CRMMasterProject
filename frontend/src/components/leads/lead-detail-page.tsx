'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

import { ApiError } from '../../lib/api';
import { apiFetch } from '../../lib/api';
import {
  fetchManagerAgents,
  fetchManagerLeadAiInsights,
  fetchManagerLeadAnswers,
  fetchManagerLeadDetails,
  fetchManagerLeadForm,
  fetchPipelineStages,
  type LeadAnswerResponse,
  type LeadFormQuestion,
  type LeadInsightFeedbackStatus,
  type LeadStatus,
  type ManagerAgent,
  type ManagerLeadDetails,
  type PipelineStage,
  updateManagerLeadAiInsightFeedback,
  updateManagerLeadAssignee,
  updateManagerLeadStage,
  updateManagerLeadStatus,
} from '../../lib/leads';
import { useToast } from '../../hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { LeadAIInsights, useLeadAiInsights } from './lead-ai-insights';
import { LeadHeader } from './lead-header';
import { LeadInfoPanel } from './lead-info-panel';
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
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [hasPendingAiRefresh, setHasPendingAiRefresh] = useState(false);
  const {
    insights,
    isRefreshing,
    isSubmittingFeedback,
    setIsRefreshing,
    setIsSubmittingFeedback,
    setInsightsFromResponse,
  } = useLeadAiInsights();

  const currentStage = useMemo(
    () => stages.find((stage) => stage.stageId === lead?.stageId) ?? null,
    [lead?.stageId, stages]
  );
  const canRefreshAiInsights = hasPendingAiRefresh || !insights?.insightId;

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

  const loadAiInsights = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchManagerLeadAiInsights(leadId, getAuthToken());
      setInsightsFromResponse(data);
      writeCachedAiInsights(leadId, data);
      setHasPendingAiRefresh(false);
    } catch (error) {
      toast({
        title: 'Unable to load AI insights',
        description: parseApiError(error),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [leadId, setInsightsFromResponse, setIsRefreshing, toast]);

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
        fetchManagerLeadForm(token),
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
    <div className="min-h-screen bg-blue-50/40 font-sans text-slate-900">
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
        onChangeStatus={handleStatusChange}
        onChangeAssignee={handleAssigneeChange}
        onChangeStage={handleStageChange}
        onOpenAiPanel={() => setIsAiPanelOpen(true)}
      />

      <div className="flex max-h-[calc(100vh-65px)] overflow-hidden">
        <LeadInfoPanel
          lead={lead}
          answers={answers}
          formQuestions={formQuestions}
          isLoadingAnswers={isLoadingAnswers}
        />
        <LeadTimeline
          leadId={lead.leadId}
          stageName={currentStage?.name}
          assigneeUserId={lead.assignedToUserId}
          onLeadChanged={handleLeadActivityMutation}
        />

        <aside className="hidden w-[360px] overflow-y-auto border-l border-[#38bdf8]/35 bg-white lg:block">
          <div className="p-6">
            <LeadAIInsights
              insights={insights}
              isRefreshing={isRefreshing}
              isSubmittingFeedback={isSubmittingFeedback}
              canRefresh={canRefreshAiInsights}
              onRefresh={() => void loadAiInsights()}
              onSubmitFeedback={(status) => void handleInsightFeedback(status)}
            />
          </div>
        </aside>
      </div>

      {isAiPanelOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsAiPanelOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 w-[320px] overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-bold">Analiză Lead</h2>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(false)}
                className="rounded-full p-1 hover:bg-[#38bdf8]/20"
              >
                <X size={20} />
              </button>
            </div>
            <LeadAIInsights
              insights={insights}
              isRefreshing={isRefreshing}
              isSubmittingFeedback={isSubmittingFeedback}
              canRefresh={canRefreshAiInsights}
              onRefresh={() => void loadAiInsights()}
              onSubmitFeedback={(status) => void handleInsightFeedback(status)}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsAiPanelOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#38bdf8] text-white shadow-xl transition-transform hover:scale-105 active:scale-95 lg:hidden"
      >
        <Sparkles size={24} />
      </button>
    </div>
  );
}
