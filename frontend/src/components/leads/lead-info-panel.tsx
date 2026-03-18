'use client';

import type {
  LeadAnswerResponse,
  LeadFormQuestion,
  LeadStatus,
  ManagerAgent,
  PipelineStage,
} from '../../lib/leads';
import type { LeadDetail } from './lead-detail-types';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { LEAD_STATUS_OPTIONS } from './lead-detail-types';

type LeadInfoPanelProps = {
  lead: LeadDetail;
  agents: ManagerAgent[];
  userRole: 'manager' | 'agent';
  currentUserId: string | null;
  currentUserEmail: string | null;
  stages: PipelineStage[];
  answers: LeadAnswerResponse[];
  formQuestions: LeadFormQuestion[];
  isLoadingAnswers: boolean;
  isUpdatingStatus: boolean;
  isUpdatingAssignee: boolean;
  isUpdatingStage: boolean;
  draftAnswers: Record<string, string>;
  isSavingAnswers: boolean;
  hasUnsavedChanges: boolean;
  saveStateMessage: string | null;
  saveErrorMessage: string | null;
  savableAnswerIds: Set<string>;
  onChangeStatus: (nextStatus: LeadStatus) => void;
  onChangeAssignee: (nextAssignee: string | null) => void;
  onChangeStage: (nextStage: string | null) => void;
  onAnswerChange: (answerId: string, value: string) => void;
  onSaveAnswers: () => void;
  variant?: 'sidebar' | 'drawer';
};

export type EditableAnswerItem = {
  id: string;
  questionId: string | null;
  questionLabel: string;
  questionType: string;
  placeholder: string | null;
  helpText: string | null;
  answer: string;
  answeredAt: string | null;
};

const statusLabels: Record<LeadStatus, string> = {
  new: 'Nou',
  contacted: 'Contactat',
  qualified: 'Calificat',
  lost: 'Pierdut',
};

const formatValue = (value: string | null | undefined) => {
  if (!value) return '-';
  return value;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const formatSource = (source: string | null | undefined) => {
  if (!source) return '-';
  return source.replaceAll('_', ' ');
};

const resolveAssigneeLabel = (lead: LeadDetail, agents: ManagerAgent[]) => {
  if (!lead.assignedToUserId) return 'Neasignat';
  return (
    agents.find((agent) => agent.user_id === lead.assignedToUserId)?.email ||
    lead.assignedToUserId
  );
};

export const buildEditableAnswerItems = (
  formQuestions: LeadFormQuestion[],
  answers: LeadAnswerResponse[]
): EditableAnswerItem[] => {
  const answerByQuestionId = new Map(
    answers
      .filter((item) => item.questionId)
      .map((item) => [item.questionId as string, item])
  );
  const usedAnswerIndexes = new Set<number>();

  const itemsFromQuestions = formQuestions.map((question) => {
    const matchedAnswer = answerByQuestionId.get(question.id) ??
      answers.find((item, index) => {
        if (usedAnswerIndexes.has(index)) return false;
        return item.questionLabel?.trim() === question.label.trim();
      }) ??
      null;

    const matchedIndex = answers.findIndex((item) => item === matchedAnswer);
    if (matchedIndex >= 0) {
      usedAnswerIndexes.add(matchedIndex);
    }

    return {
      id: question.id,
      questionId: question.id,
      questionLabel: question.label,
      questionType: question.questionType || matchedAnswer?.questionType || 'short_text',
      placeholder: question.placeholder,
      helpText: question.helpText,
      answer: matchedAnswer?.answer ?? '',
      answeredAt: matchedAnswer?.answeredAt ?? null,
    };
  });

  const orphanAnswers = answers
    .filter((_, index) => !usedAnswerIndexes.has(index))
    .map((item, index) => ({
      id: item.questionId ?? `orphan-${index}`,
      questionId: item.questionId,
      questionLabel: item.questionLabel || 'Întrebare',
      questionType: item.questionType || 'field',
      placeholder: null,
      helpText: null,
      answer: item.answer ?? '',
      answeredAt: item.answeredAt,
    }));

  return [...itemsFromQuestions, ...orphanAnswers];
};

export function LeadInfoPanel({
  lead,
  agents,
  userRole,
  currentUserId,
  currentUserEmail,
  stages,
  answers,
  formQuestions,
  isLoadingAnswers,
  isUpdatingStatus,
  isUpdatingAssignee,
  isUpdatingStage,
  draftAnswers,
  isSavingAnswers,
  hasUnsavedChanges,
  saveStateMessage,
  saveErrorMessage,
  savableAnswerIds,
  onChangeStatus,
  onChangeAssignee,
  onChangeStage,
  onAnswerChange,
  onSaveAnswers,
  variant = 'sidebar',
}: LeadInfoPanelProps) {
  const currentStatus = LEAD_STATUS_OPTIONS.includes(lead.status as LeadStatus)
    ? (lead.status as LeadStatus)
    : 'new';
  const activeStages = stages.filter((stage) => stage.isActive !== false);
  const currentStage = activeStages.find((stage) => stage.stageId === lead.stageId);
  const isManager = userRole === 'manager';
  const assigneeLabel = resolveAssigneeLabel(lead, agents);
  const agentAssigneeValue =
    lead.assignedToUserId && lead.assignedToUserId === currentUserId
      ? currentUserId
      : 'unassigned';
  const assigneeOptions = isManager
    ? [
        ...(currentUserId &&
        !agents.some((agent) => agent.user_id === currentUserId)
          ? [
              {
                user_id: currentUserId,
                email: currentUserEmail || 'My account',
              },
            ]
          : []),
        ...agents,
      ]
    : [];
  const detailRows = [
    { label: 'Sursă', value: formatSource(lead.source) },
    { label: 'Trimis la', value: formatDateTime(lead.submittedAt) },
    { label: 'Ultima activitate', value: formatDateTime(lead.lastActivityAt) },
    { label: 'Email', value: formatValue(lead.email) },
    { label: 'Telefon', value: formatValue(lead.phone) },
    { label: 'Campanie', value: formatValue(lead.campaign) },
    { label: 'Ad set', value: formatValue(lead.adSet) },
    { label: 'Ad ID', value: formatValue(lead.adId) },
    { label: 'UTM Source', value: formatValue(lead.utmSource) },
    { label: 'UTM Campaign', value: formatValue(lead.utmCampaign) },
    { label: 'UTM Medium', value: formatValue(lead.utmMedium) },
    { label: 'UTM Content', value: formatValue(lead.utmContent) },
    { label: 'Landing Page', value: formatValue(lead.landingPage) },
    { label: 'Referrer', value: formatValue(lead.referrer) },
    { label: 'Assigned At', value: formatDateTime(lead.assignedAt) },
    {
      label: 'Duplicate',
      value: lead.isDuplicate ? `Da (${lead.duplicateGroupId || 'grup necunoscut'})` : 'Nu',
    },
  ].filter((item) => item.value !== '-');

  const editableAnswerItems = buildEditableAnswerItems(formQuestions, answers);

  const content = (
    <div className="flex min-h-full flex-col space-y-10 px-2 py-6 sm:px-4">
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Form details
          </h3>
          {variant === 'drawer' ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Lead context
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <SelectCard label="Status">
            <Select
              value={currentStatus}
              onValueChange={(value) => onChangeStatus(value as LeadStatus)}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="h-11 rounded-2xl border-sky-100 bg-white text-sm font-medium text-slate-700 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectCard>

          <SelectCard label="Stage">
            <Select
              value={lead.stageId ?? 'unassigned'}
              onValueChange={(value) => onChangeStage(value === 'unassigned' ? null : value)}
              disabled={isUpdatingStage}
            >
              <SelectTrigger className="h-11 rounded-2xl border-sky-100 bg-white text-sm font-medium text-slate-700 shadow-none">
                <SelectValue placeholder={currentStage?.name || 'Fără stage'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Fără stage</SelectItem>
                {activeStages.map((stage) => (
                  <SelectItem key={stage.stageId} value={stage.stageId}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SelectCard>

          <SelectCard label="Assignee curent">
            {isManager ? (
              <Select
                value={lead.assignedToUserId ?? 'unassigned'}
                onValueChange={(value) => onChangeAssignee(value === 'unassigned' ? null : value)}
                disabled={isUpdatingAssignee}
              >
                <SelectTrigger className="h-11 rounded-2xl border-sky-100 bg-white text-sm font-medium text-slate-700 shadow-none">
                  <SelectValue placeholder={assigneeLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Neasignat</SelectItem>
                  {assigneeOptions.map((agent) => (
                    <SelectItem key={agent.user_id} value={agent.user_id}>
                      {agent.user_id === currentUserId ? `${agent.email} (You)` : agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={agentAssigneeValue}
                onValueChange={(value) =>
                  onChangeAssignee(value === 'unassigned' ? null : currentUserId)
                }
                disabled={isUpdatingAssignee || !currentUserId}
              >
                <SelectTrigger className="h-11 rounded-2xl border-sky-100 bg-white text-sm font-medium text-slate-700 shadow-none">
                  <SelectValue placeholder={assigneeLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Neasignat</SelectItem>
                  {currentUserId ? (
                    <SelectItem value={currentUserId}>
                      {currentUserEmail ? `${currentUserEmail} (Eu)` : 'Către mine'}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            )}
          </SelectCard>
        </div>
      </section>

      <section className="border-t border-slate-200/80 pt-8">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Contact si context
        </h3>
        <div className="grid gap-2">
          <InfoBlock
            label="Nume"
            value={`${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || '-'}
          />
          {detailRows.map((row) => (
            <InfoBlock key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200/80 pt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Form Answers
          </h3>
          {hasUnsavedChanges ? (
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#38bdf8] text-white hover:bg-sky-500"
              disabled={isSavingAnswers}
              onClick={onSaveAnswers}
            >
              {isSavingAnswers ? 'Saving...' : 'Save changes'}
            </Button>
          ) : null}
        </div>

        {saveStateMessage ? (
          <p className="mb-3 text-xs text-slate-500">{saveStateMessage}</p>
        ) : null}

        {saveErrorMessage ? (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {saveErrorMessage}
          </p>
        ) : null}

        {isLoadingAnswers ? (
          <div className="space-y-3">
            <AnswerSkeleton />
            <AnswerSkeleton />
            <AnswerSkeleton />
          </div>
        ) : editableAnswerItems.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nu există întrebări configurate în formularul curent.
          </p>
        ) : (
          <div className="space-y-5">
            {editableAnswerItems.map((item) => {
              const canSave = savableAnswerIds.has(item.id);
              const isChanged = (draftAnswers[item.id] ?? '') !== item.answer;

              return (
                <div
                  key={item.id}
                  className="space-y-3 border-b border-slate-200/80 pb-5"
                >
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {item.questionLabel}
                  </label>
                  {item.helpText ? (
                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                      {item.helpText}
                    </p>
                  ) : null}
                  <Textarea
                    value={draftAnswers[item.id] ?? ''}
                    onChange={(event) => onAnswerChange(item.id, event.target.value)}
                    disabled={isSavingAnswers}
                    className="min-h-[104px] resize-y rounded-xl border-slate-200 bg-white text-sm shadow-none focus-visible:ring-slate-300"
                    placeholder={
                      item.placeholder ||
                      (canSave
                        ? 'Adaugă sau editează răspunsul...'
                        : 'Poți edita local, dar răspunsul nu poate fi sincronizat automat.')
                    }
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    {item.questionType || 'field'} • {formatDateTime(item.answeredAt)}
                  </p>
                  {canSave && isChanged ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl bg-[#38bdf8] text-white hover:bg-sky-500"
                        disabled={isSavingAnswers}
                        onClick={onSaveAnswers}
                      >
                        {isSavingAnswers ? 'Updating...' : 'Update'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {!isLoadingAnswers && hasUnsavedChanges ? (
          <p className="mt-3 text-xs text-slate-500">
            Modificarile raman locale pana cand apesi Update.
          </p>
        ) : null}
      </section>
    </div>
  );

  return <div className="min-h-full bg-white">{content}</div>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-2">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </label>
      <p className="break-words text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SelectCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-200/80 py-3">
      <p className="mb-2 break-words text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function AnswerSkeleton() {
  return <div className="h-28 rounded-xl bg-slate-100" />;
}
