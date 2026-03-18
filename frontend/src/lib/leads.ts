import { apiFetch } from './api';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';
export type LeadSource = 'META' | 'GOOGLE' | 'ORGANIC' | 'OTHER' | 'FORM';
export type LeadSort =
  | 'submittedAt,asc'
  | 'submittedAt,desc'
  | 'lastActivityAt,asc'
  | 'lastActivityAt,desc';

export type LeadNoteCategory =
  | 'TYPE_DISCOVERY'
  | 'TYPE_CONFIRMATION'
  | 'TYPE_OBJECTION'
  | 'TYPE_NEXT_STEP'
  | 'TYPE_INTERNAL';

export type LeadEventType =
  | 'LEAD_CREATED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'CALL_LOGGED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'ASSIGNEE_CHANGED'
  | 'EMAIL_SENT';

export type LeadInsightFeedbackStatus =
  | 'NONE'
  | 'USEFUL'
  | 'NOT_USEFUL'
  | 'COMPLETED';

export type LeadActivityType =
  | 'note'
  | 'call'
  | 'task'
  | 'email'
  | 'status_change';

export type ManagerLead = {
  leadId: string;
  status: string;
  submittedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  assignedToUserId: string | null;
  lastActivityAt: string | null;
  source: LeadSource | string | null;
  isDuplicate: boolean;
  duplicateGroupId: string | null;
};

export type LeadAnswerResponse = {
  questionId: string | null;
  questionLabel: string | null;
  questionType: string | null;
  answer: string | null;
  answeredAt: string | null;
};

export type LeadAnswerUpdateValue = string | number | boolean | string[];

export type LeadAnswerUpdatePayload = {
  answers: Array<{
    questionId: string;
    value: LeadAnswerUpdateValue;
  }>;
};

export type LeadFormQuestion = {
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

export type LeadFormResponse = {
  id: string;
  title: string;
  publicSlug: string;
  isActive: boolean | null;
  questions: LeadFormQuestion[];
};

export type ManagerLeadDetails = {
  leadId: string;
  status: string;
  submittedAt: string;
  lastActivityAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  assignedToUserId: string | null;
  assignedAt: string | null;
  assignedByUserId: string | null;
  source: LeadSource | string | null;
  campaign: string | null;
  adSet: string | null;
  adId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  utmContent: string | null;
  landingPage: string | null;
  referrer: string | null;
  isDuplicate: boolean;
  duplicateGroupId: string | null;
  duplicateOfLeadId: string | null;
  stageId: string | null;
  relatedLeadIds: string[];
  answers: LeadAnswerResponse[];
};

export type LeadEventResponse = {
  eventId: string;
  type: LeadEventType;
  createdAt: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
  summary: string | null;
};

export type LeadActivityResponse = {
  id: string;
  type: LeadActivityType | string;
  title: string;
  description: string;
  actorName: string | null;
  createdAt: string;
};

export type LeadTaskResponse = {
  id: string;
  title: string;
  goal: string | null;
  description: string | null;
  deadline: string | null;
  dueDate: string | null;
  status: string | null;
  leadId: string | null;
  assigneeUserId: string | null;
};

export type LeadAiScoreFactor = {
  label: string;
  value: number;
  type: 'positive' | 'neutral' | 'negative';
  detail: string;
};

export type LeadAiNextBestAction = {
  actionType?: string | null;
  type?: string | null;
  priority: string | null;
  timing?: string | null;
  reason?: string | null;
  whyNow?: string | null;
  deadlineHint?: string | null;
  channel?: string | null;
};

export type LeadAiPsychologicalInsight = {
  dominant_motivation?: string | null;
  primary_blocker?: string | null;
  decision_readiness?: string | null;
  confidence_state?: string | null;
  risk_of_stalling?: string | null;
};

export type LeadAiConversationDirection = {
  primary_angle?: string | null;
  positioning?: string | null;
  tone?: string | null;
  focus_points?: string[];
};

export type LeadAiObjectionStrategy = {
  main_objection_to_address?: string | null;
  reframe?: string | null;
  supporting_points?: string[];
};

export type LeadAiScores = {
  client_score?: number | null;
  next_call_close_probability?: number | null;
  lead_readiness_score?: number | null;
  buying_intent_score?: number | null;
  psychological_resistance_score?: number | null;
};

export type LeadAiWhatChanged = {
  previousRecommendation?: string | null;
  previousFeedbackStatus?: string | null;
  changes?: string[];
};

export type LeadAiExplainability = {
  whyThisInsight?: string | null;
  basedOnSignals?: string[];
  kbEvidence?: string[];
};

export type LeadAiInsightsResponse = {
  insightId?: string;
  generatedAt?: string | null;
  score?: number | null;
  clientScore?: number | null;
  nextCallCloseProbability?: number | null;
  relationshipSentiment?: string | null;
  relationshipRiskLevel?: string | null;
  relationshipTrend?: string | null;
  relationshipKeyBlocker?: string | null;
  confidenceScore?: number | null;
  confidenceLevel?: string | null;
  guidanceSource?: string | null;
  nextBestAction?: LeadAiNextBestAction | null;
  whatChanged?: LeadAiWhatChanged | null;
  explainability?: LeadAiExplainability | null;
  recommendedAction?: string | null;
  suggestedApproach?: string | null;
  scoreFactors?: LeadAiScoreFactor[];
  next_best_action?: LeadAiNextBestAction | null;
  reason?: string | null;
  psychological_insight?: LeadAiPsychologicalInsight | null;
  recommended_conversation_direction?: LeadAiConversationDirection | null;
  key_questions_to_ask?: string[];
  objection_strategy?: LeadAiObjectionStrategy | null;
  what_to_avoid?: string[];
  missing_information?: string[];
  scores?: LeadAiScores | null;
};

export type ManagerAgent = {
  membership_id: string;
  user_id: string;
  email: string;
  status: string;
  team_id: string | null;
  team_name: string | null;
};

export type PipelineStage = {
  stageId: string;
  name: string;
  displayOrder: number | null;
  isActive: boolean | null;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
};

export type LeadsQuery = {
  status?: string;
  page: number;
  size: number;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  assignedTo?: string;
  hasOpenTasks?: boolean;
  source?: string;
  sort?: string;
};

export type LeadStatusUpdatePayload = {
  status: LeadStatus;
};

export type LeadAssigneeUpdatePayload = {
  assignedToUserId: string | null;
};

export type LeadStageUpdatePayload = {
  stageId: string | null;
};

export type LeadNotePayload = {
  text: string;
  category?: LeadNoteCategory;
};

export type LeadCallPayload = {
  title: string;
  description?: string;
  outcome?: string;
  durationSeconds?: number;
  callTime?: string;
};

export type LeadTaskPayload = {
  title: string;
  description?: string;
  dueDate?: string;
  assigneeUserId?: string | null;
};

export type LeadAiInsightFeedbackPayload = {
  status: LeadInsightFeedbackStatus;
  note?: string;
};

const withAuthHeaders = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const fetchManagerLeads = async (
  query: LeadsQuery,
  token: string | null
): Promise<PageResponse<ManagerLead>> => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('size', String(query.size));

  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.createdFrom) params.set('createdFrom', query.createdFrom);
  if (query.createdTo) params.set('createdTo', query.createdTo);
  if (query.assignedTo) params.set('assignedTo', query.assignedTo);
  if (typeof query.hasOpenTasks === 'boolean') {
    params.set('hasOpenTasks', String(query.hasOpenTasks));
  }
  if (query.source) params.set('source', query.source);
  if (query.sort) params.set('sort', query.sort);

  return apiFetch<PageResponse<ManagerLead>>(`/manager/leads?${params.toString()}`, {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchManagerLeadDetails = async (
  leadId: string,
  token: string | null
): Promise<ManagerLeadDetails> => {
  return apiFetch<ManagerLeadDetails>(`/manager/leads/${encodeURIComponent(leadId)}`, {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchManagerLeadAnswers = async (
  leadId: string,
  token: string | null
): Promise<LeadAnswerResponse[]> => {
  return apiFetch<LeadAnswerResponse[]>(
    `/manager/leads/${encodeURIComponent(leadId)}/answers`,
    {
      method: 'GET',
      headers: withAuthHeaders(token),
      cache: 'no-store',
    }
  );
};

export const updateManagerLeadAnswers = async (
  leadId: string,
  payload: LeadAnswerUpdatePayload,
  token: string | null
): Promise<LeadAnswerResponse[]> => {
  return apiFetch<LeadAnswerResponse[]>(
    `/manager/leads/${encodeURIComponent(leadId)}/answers`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(withAuthHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }
  );
};

export const fetchManagerLeadForm = async (
  token: string | null
): Promise<LeadFormResponse> => {
  return apiFetch<LeadFormResponse>('/manager/lead-form', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchManagerLeadFormForLead = async (
  leadId: string,
  token: string | null
): Promise<LeadFormResponse> => {
  return apiFetch<LeadFormResponse>(`/manager/leads/${encodeURIComponent(leadId)}/form`, {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const updateManagerLeadStatus = async (
  leadId: string,
  payload: LeadStatusUpdatePayload,
  token: string | null
) => {
  return apiFetch<null>(`/manager/leads/${encodeURIComponent(leadId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const updateManagerLeadAssignee = async (
  leadId: string,
  payload: LeadAssigneeUpdatePayload,
  token: string | null
) => {
  return apiFetch<null>(`/manager/leads/${encodeURIComponent(leadId)}/assignee`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const updateManagerLeadStage = async (
  leadId: string,
  payload: LeadStageUpdatePayload,
  token: string | null
) => {
  return apiFetch<null>(`/manager/leads/${encodeURIComponent(leadId)}/stage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const fetchManagerLeadEvents = async (
  leadId: string,
  token: string | null,
  options?: { page?: number; size?: number; types?: LeadEventType[] }
): Promise<PageResponse<LeadEventResponse>> => {
  const params = new URLSearchParams();
  params.set('page', String(options?.page ?? 0));
  params.set('size', String(options?.size ?? 50));
  if (options?.types?.length) {
    params.set('types', options.types.join(','));
  }

  return apiFetch<PageResponse<LeadEventResponse>>(
    `/manager/leads/${encodeURIComponent(leadId)}/events?${params.toString()}`,
    {
      method: 'GET',
      headers: withAuthHeaders(token),
      cache: 'no-store',
    }
  );
};

export const createManagerLeadNote = async (
  leadId: string,
  payload: LeadNotePayload,
  token: string | null
) => {
  return apiFetch<null>(`/manager/leads/${encodeURIComponent(leadId)}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const fetchManagerLeadActivities = async (
  leadId: string,
  token: string | null,
  page = 0,
  size = 50
): Promise<PageResponse<LeadActivityResponse>> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));

  return apiFetch<PageResponse<LeadActivityResponse>>(
    `/manager/leads/${encodeURIComponent(leadId)}/activities?${params.toString()}`,
    {
      method: 'GET',
      headers: withAuthHeaders(token),
      cache: 'no-store',
    }
  );
};

export const createManagerLeadCall = async (
  leadId: string,
  payload: LeadCallPayload,
  token: string | null
) => {
  return apiFetch<LeadActivityResponse>(`/manager/leads/${encodeURIComponent(leadId)}/calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const fetchManagerLeadTasks = async (
  leadId: string,
  token: string | null
): Promise<LeadTaskResponse[]> => {
  return apiFetch<LeadTaskResponse[]>(
    `/manager/leads/${encodeURIComponent(leadId)}/tasks`,
    {
      method: 'GET',
      headers: withAuthHeaders(token),
      cache: 'no-store',
    }
  );
};

export const createManagerLeadTask = async (
  leadId: string,
  payload: LeadTaskPayload,
  token: string | null
) => {
  return apiFetch<LeadActivityResponse>(`/manager/leads/${encodeURIComponent(leadId)}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuthHeaders(token) ?? {}),
    },
    body: JSON.stringify(payload),
  });
};

export const fetchManagerLeadAiInsights = async (
  leadId: string,
  token: string | null
): Promise<LeadAiInsightsResponse> => {
  return apiFetch<LeadAiInsightsResponse>(
    `/manager/leads/${encodeURIComponent(leadId)}/ai-insights`,
    {
      method: 'GET',
      headers: withAuthHeaders(token),
      cache: 'no-store',
    }
  );
};

export const regenerateManagerLeadAiInsights = async (
  leadId: string,
  token: string | null
): Promise<LeadAiInsightsResponse> => {
  return apiFetch<LeadAiInsightsResponse>(
    `/manager/leads/${encodeURIComponent(leadId)}/ai-insights/regenerate`,
    {
      method: 'POST',
      headers: withAuthHeaders(token),
    }
  );
};

export const updateManagerLeadAiInsightFeedback = async (
  leadId: string,
  insightId: string,
  payload: LeadAiInsightFeedbackPayload,
  token: string | null
) => {
  return apiFetch<null>(
    `/manager/leads/${encodeURIComponent(leadId)}/ai-insights/${encodeURIComponent(insightId)}/feedback`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(withAuthHeaders(token) ?? {}),
      },
      body: JSON.stringify(payload),
    }
  );
};

export const fetchManagerAgents = async (
  token: string | null
): Promise<ManagerAgent[]> => {
  return apiFetch<ManagerAgent[]>('/manager/overview/agents', {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};

export const fetchPipelineStages = async (
  token: string | null,
  activeOnly = true
): Promise<PipelineStage[]> => {
  const params = new URLSearchParams();
  params.set('activeOnly', String(activeOnly));

  return apiFetch<PipelineStage[]>(`/manager/pipeline-stages?${params.toString()}`, {
    method: 'GET',
    headers: withAuthHeaders(token),
    cache: 'no-store',
  });
};
