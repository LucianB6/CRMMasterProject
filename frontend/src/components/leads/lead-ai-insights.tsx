'use client';

import { type ReactNode, useCallback, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

import type { LeadAiInsightsResponse, LeadInsightFeedbackStatus } from '../../lib/leads';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type LeadAIInsightsProps = {
  insights: LeadAiInsightsResponse | null;
  aiStatus?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiError?: string | null;
  isQueueingScore: boolean;
  queueStatusMessage?: string | null;
  queueErrorMessage?: string | null;
  isRefreshing: boolean;
  isSubmittingFeedback: boolean;
  canRefresh: boolean;
  refreshLabel?: string;
  refreshStatusMessage?: string | null;
  refreshErrorMessage?: string | null;
  onRefresh: () => void;
  onSubmitFeedback: (status: LeadInsightFeedbackStatus) => void;
};

const FALLBACK_TEXT = 'Insuficiente date pentru recomandare detaliata.';

const clampScore = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const formatLocalDateTime = (value: string | null | undefined) => {
  if (!value) return FALLBACK_TEXT;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return FALLBACK_TEXT;
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const sentenceCase = (value: string | null | undefined) => {
  if (!value) return FALLBACK_TEXT;
  return value.replaceAll('_', ' ').toLowerCase();
};

const formatPercent = (value: number | null | undefined) => {
  const safeValue = clampScore(value);
  return safeValue === null ? '—' : `${safeValue}%`;
};

const normalizeAiStatus = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (
    normalized === 'PENDING' ||
    normalized === 'PROCESSING' ||
    normalized === 'COMPLETED' ||
    normalized === 'FAILED'
  ) {
    return normalized;
  }
  return null;
};

const parseStructuredText = (text: string) => {
  const normalized = text.trim();
  if (!normalized) return [] as Array<{ title: string | null; lines: string[] }>;

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Array<{ title: string | null; lines: string[] }> = [];
  let currentSection: { title: string | null; lines: string[] } | null = null;

  lines.forEach((line) => {
    const titleValueMatch = line.match(/^([A-Za-zÀ-ÿ0-9ȘșȚțĂăÎîÂâ \-()]{2,50}):\s*(.*)$/u);

    if (titleValueMatch) {
      const [, title, value] = titleValueMatch;
      currentSection = {
        title: title.trim(),
        lines: value ? [value.trim()] : [],
      };
      sections.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = { title: null, lines: [] };
      sections.push(currentSection);
    }

    currentSection.lines.push(line);
  });

  return sections;
};

export function LeadAIInsights({
  insights,
  aiStatus,
  aiScore,
  aiSummary,
  aiError,
  isQueueingScore,
  queueStatusMessage,
  queueErrorMessage,
  isRefreshing,
  isSubmittingFeedback,
  canRefresh,
  refreshLabel = 'Refresh AI Insights',
  refreshStatusMessage,
  refreshErrorMessage,
  onRefresh,
  onSubmitFeedback,
}: LeadAIInsightsProps) {
  const normalizedAiStatus = normalizeAiStatus(aiStatus);
  const scoringScore = clampScore(aiScore ?? insights?.score ?? insights?.clientScore ?? insights?.scores?.client_score);
  const scoringSummary = aiSummary?.trim() || null;
  const scoringError =
    queueErrorMessage ||
    (normalizedAiStatus === 'FAILED'
      ? aiError?.trim() || 'Lead scoring failed during worker execution.'
      : null);
  const scoringStatusText =
    queueStatusMessage ||
    (normalizedAiStatus === 'PENDING'
      ? 'Lead scoring queued.'
      : normalizedAiStatus === 'PROCESSING'
        ? 'Lead scoring in progress.'
        : normalizedAiStatus === 'COMPLETED'
          ? 'Lead scoring completed.'
          : null);
  const hasCompletedScoring =
    normalizedAiStatus === 'COMPLETED' && (scoringScore !== null || !!scoringSummary);

  if (!insights && !hasCompletedScoring) {
    return (
      <EmptyState
        aiStatus={normalizedAiStatus}
        aiError={scoringError}
        isQueueingScore={isQueueingScore}
        queueStatusMessage={scoringStatusText}
        queueErrorMessage={scoringError}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        refreshStatusMessage={refreshStatusMessage}
        refreshErrorMessage={refreshErrorMessage}
        onRefresh={onRefresh}
      />
    );
  }

  const score = clampScore(insights.score ?? insights.clientScore ?? insights.scores?.client_score);
  const nextCallCloseProbability = clampScore(
    insights.nextCallCloseProbability ?? insights.scores?.next_call_close_probability
  );
  const scoreFactors = Array.isArray(insights.scoreFactors) ? insights.scoreFactors : [];
  const guidanceSource = insights.guidanceSource?.toLowerCase() || null;
  const confidenceLevel = insights.confidenceLevel?.toLowerCase() || null;
  const relationshipRiskLevel = insights.relationshipRiskLevel?.toLowerCase() || null;
  const relationshipSentiment = insights.relationshipSentiment?.toLowerCase() || null;
  const nextBestAction = insights.nextBestAction ?? insights.next_best_action ?? null;
  const previousFeedbackStatus = insights.whatChanged?.previousFeedbackStatus || null;
  const reason = insights.reason ?? nextBestAction?.reason ?? insights.recommendedAction ?? FALLBACK_TEXT;
  const suggestedApproach = insights.suggestedApproach ?? '';
  const explainability = insights.explainability ?? null;
  const psychologicalInsight = insights.psychological_insight ?? null;
  const conversationDirection = insights.recommended_conversation_direction ?? null;
  const objectionStrategy = insights.objection_strategy ?? null;
  const generatedAt = formatLocalDateTime(insights.generatedAt);

  return (
    <div className="w-full min-w-0 self-stretch space-y-6">
      <div className="w-full space-y-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">AI Insights</h3>
              <p className="text-xs text-slate-500">Generat la {generatedAt}</p>
            </div>
          </div>
          {guidanceSource ? (
            <Badge className="border-slate-200 bg-slate-100 text-slate-700" variant="outline">
              {guidanceSource}
            </Badge>
          ) : null}
        </div>

        {hasCompletedScoring || scoringError || scoringStatusText ? (
          <ScoringSection
            score={scoringScore}
            summary={scoringSummary}
            errorMessage={scoringError}
            statusMessage={scoringStatusText}
          />
        ) : null}

        <div className="w-full grid gap-3 border-y border-slate-200/80 py-4">
          <ScoreCard label="Score" value={score} badgeLabel="Lead Score" />
          <ProbabilityMeter
            label="Sansa inchidere apel urmator"
            value={nextCallCloseProbability}
          />
          <div className="divide-y divide-slate-200/80">
            <MetricRow
              label="Sentiment"
              value={sentenceCase(insights.relationshipSentiment)}
              warning={relationshipSentiment === 'at risk' || relationshipSentiment === 'frustrated'}
            />
            <MetricRow
              label="Risk"
              value={sentenceCase(insights.relationshipRiskLevel)}
              warning={relationshipRiskLevel === 'high'}
            />
            <MetricRow label="Trend" value={sentenceCase(insights.relationshipTrend)} />
            <MetricRow
              label="Confidence"
              value={sentenceCase(insights.confidenceLevel)}
              warning={confidenceLevel === 'low'}
            />
            <MetricRow
              label="Blocker"
              value={insights.relationshipKeyBlocker || psychologicalInsight?.primary_blocker || FALLBACK_TEXT}
              multiline
            />
          </div>
        </div>

        <div className="w-full space-y-5">
          <LineSection
            title="Next Best Action"
            subtitle={[
              nextBestAction?.actionType ?? nextBestAction?.type,
              nextBestAction?.priority,
              nextBestAction?.timing,
              nextBestAction?.channel,
            ]
              .filter(Boolean)
              .map((value) => sentenceCase(value))
              .join(' • ')}
          >
            <DetailRow label="Reason" value={reason} />
            <DetailRow label="Why now" value={nextBestAction?.whyNow || FALLBACK_TEXT} />
            <DetailRow label="Deadline hint" value={nextBestAction?.deadlineHint || FALLBACK_TEXT} />
            <DetailRow label="Channel" value={sentenceCase(nextBestAction?.channel)} />
          </LineSection>

          <LineSection title="Recommendation">
            <ExpandableText
              label="Recommended Action"
              text={insights.recommendedAction || reason}
            />
            <StructuredTextSection
              label="Suggested Approach"
              text={suggestedApproach || FALLBACK_TEXT}
            />
          </LineSection>

          {psychologicalInsight ? (
            <LineSection title="Psychological Insight">
              <DetailRow
                label="Dominant motivation"
                value={psychologicalInsight.dominant_motivation || FALLBACK_TEXT}
              />
              <DetailRow
                label="Primary blocker"
                value={psychologicalInsight.primary_blocker || FALLBACK_TEXT}
              />
              <DetailRow
                label="Decision readiness"
                value={sentenceCase(psychologicalInsight.decision_readiness)}
              />
              <DetailRow
                label="Confidence state"
                value={psychologicalInsight.confidence_state || FALLBACK_TEXT}
              />
              <DetailRow
                label="Risk of stalling"
                value={sentenceCase(psychologicalInsight.risk_of_stalling)}
              />
            </LineSection>
          ) : null}

          {conversationDirection ? (
            <LineSection title="Conversation Direction">
              <DetailRow
                label="Primary angle"
                value={conversationDirection.primary_angle || FALLBACK_TEXT}
              />
              <DetailRow
                label="Positioning"
                value={conversationDirection.positioning || FALLBACK_TEXT}
              />
              <DetailRow label="Tone" value={conversationDirection.tone || FALLBACK_TEXT} />
              <ListPreview label="Focus points" items={conversationDirection.focus_points || []} />
            </LineSection>
          ) : null}

          {objectionStrategy ? (
            <LineSection title="Objection Strategy">
              <DetailRow
                label="Main objection"
                value={objectionStrategy.main_objection_to_address || FALLBACK_TEXT}
              />
              <DetailRow label="Reframe" value={objectionStrategy.reframe || FALLBACK_TEXT} />
              <ListPreview
                label="Supporting points"
                items={objectionStrategy.supporting_points || []}
              />
            </LineSection>
          ) : null}

          {(explainability || scoreFactors.length > 0) ? (
            <LineSection title="Why this insight">
              <DetailRow
                label="Why"
                value={explainability?.whyThisInsight || reason}
              />
              <ListPreview label="Signals" items={explainability?.basedOnSignals || []} />
              <ListPreview
                label="Supporting evidence"
                items={explainability?.kbEvidence || []}
                collapsible
              />
            </LineSection>
          ) : null}

          {Array.isArray(insights.whatChanged?.changes) || insights.whatChanged?.previousRecommendation ? (
            <LineSection title="What changed">
              <DetailRow
                label="Previous recommendation"
                value={insights.whatChanged?.previousRecommendation || FALLBACK_TEXT}
              />
              <DetailRow label="Previous feedback" value={previousFeedbackStatus || 'NONE'} />
              <ListPreview label="Changes" items={insights.whatChanged?.changes || []} collapsible />
            </LineSection>
          ) : null}

          {scoreFactors.length > 0 ? (
            <LineSection title="Score factors" icon={<Target size={14} className="text-[#38bdf8]" />}>
              <div className="divide-y divide-[#38bdf8]/15">
                {scoreFactors.map((factor, index) => (
                  <div key={`${factor.label}-${index}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          Factor
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {factor.label || FALLBACK_TEXT}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-black ${
                          factor.type === 'negative'
                            ? 'text-rose-600'
                            : factor.type === 'neutral'
                              ? 'text-slate-600'
                              : 'text-[#38bdf8]'
                        }`}
                      >
                        {factor.value > 0 ? '+' : ''}
                        {factor.value}
                      </span>
                    </div>
                    <div className="mt-3">
                      <ExpandableText text={factor.detail || FALLBACK_TEXT} />
                    </div>
                  </div>
                ))}
              </div>
            </LineSection>
          ) : null}

          {(insights.key_questions_to_ask?.length ?? 0) > 0 ? (
            <LineSection title="Key Questions To Ask">
              <ListPreview
                label="Questions"
                items={insights.key_questions_to_ask || []}
              />
            </LineSection>
          ) : null}

          {(insights.what_to_avoid?.length ?? 0) > 0 ? (
            <LineSection title="What To Avoid">
              <ListPreview label="Avoid" items={insights.what_to_avoid || []} />
            </LineSection>
          ) : null}

          {(insights.missing_information?.length ?? 0) > 0 ? (
            <LineSection title="Missing Information">
              <ListPreview label="Missing info" items={insights.missing_information || []} />
            </LineSection>
          ) : null}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-slate-200 text-slate-700 hover:bg-slate-100"
        onClick={onRefresh}
        disabled={isRefreshing || !canRefresh}
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Refreshing...
          </>
        ) : (
          refreshLabel
        )}
      </Button>

      {refreshStatusMessage ? (
        <p className="text-xs text-slate-500">{refreshStatusMessage}</p>
      ) : null}

      {refreshErrorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {refreshErrorMessage}
        </div>
      ) : null}

      <div className="border-t border-slate-200/80 pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 hover:bg-slate-100"
            onClick={() => onSubmitFeedback('USEFUL')}
            disabled={!insights || isSubmittingFeedback}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Useful
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 hover:bg-slate-100"
            onClick={() => onSubmitFeedback('NOT_USEFUL')}
            disabled={!insights || isSubmittingFeedback}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            Not useful
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 hover:bg-slate-100"
            onClick={() => onSubmitFeedback('COMPLETED')}
            disabled={!insights || isSubmittingFeedback}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Completed
          </Button>
        </div>

        {previousFeedbackStatus === 'COMPLETED' ? (
          <p className="mt-3 text-xs text-slate-500">
            Insight-ul anterior a fost marcat completed. La refresh se poate genera urmatorul pas relevant.
          </p>
        ) : null}
      </div>

      {(guidanceSource === 'fallback' || guidanceSource === 'guardrailed') ? (
        <div className="flex gap-3 border-t border-slate-200/80 pt-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#38bdf8]" />
          <p className="text-xs leading-relaxed text-slate-600">
            Recomandarea foloseste un mod {guidanceSource}. Pastreaza validarea umana inainte de executie.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  aiStatus,
  aiError,
  isQueueingScore,
  queueStatusMessage,
  queueErrorMessage,
  isRefreshing,
  canRefresh,
  refreshStatusMessage,
  refreshErrorMessage,
  onRefresh,
}: {
  aiStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;
  aiError?: string | null;
  isQueueingScore: boolean;
  queueStatusMessage?: string | null;
  queueErrorMessage?: string | null;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshStatusMessage?: string | null;
  refreshErrorMessage?: string | null;
  onRefresh: () => void;
}) {
  const statusMessage =
    queueStatusMessage ||
    (aiStatus === 'PENDING'
      ? 'Lead scoring queued.'
      : aiStatus === 'PROCESSING'
        ? 'Lead scoring in progress.'
        : null);
  const errorMessage = queueErrorMessage || aiError || refreshErrorMessage;

  return (
    <div className="border border-dashed border-slate-200 bg-white/80 p-5">
      <div className="flex min-h-[220px] w-full flex-col items-center justify-center px-6 text-center">
        <div className="rounded-full bg-[#38bdf8] p-3">
          {isQueueingScore || isRefreshing ? (
            <RefreshCw className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Sparkles className="h-6 w-6 text-white" />
          )}
        </div>
        <span className="mt-4 text-base font-semibold text-slate-900">
          AI insights indisponibile momentan
        </span>
        <span className="mt-2 max-w-[240px] text-sm leading-relaxed text-slate-500">
          Reincarca detaliile dupa ce backend-ul termina procesarea sau dupa ce apar date noi pentru lead.
        </span>
        {statusMessage ? (
          <span className="mt-3 text-xs text-slate-500">{statusMessage}</span>
        ) : null}
        {errorMessage ? (
          <span className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </span>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing || !canRefresh}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Refresh details
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScoringSection({
  score,
  summary,
  errorMessage,
  statusMessage,
}: {
  score: number | null;
  summary: string | null;
  errorMessage: string | null;
  statusMessage: string | null;
}) {
  const scoreBadgeLabel = '10 criteria · max 100';
  const showCompletedState = score !== null || !!summary;

  return (
    <section className="space-y-4">
      {statusMessage ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {showCompletedState ? (
        <>
          <ScoreCard label="Lead score" value={score} badgeLabel={scoreBadgeLabel} />
          {summary ? (
            <section className="overflow-hidden rounded-xl border border-[#38bdf8]/20 bg-white/80">
              <div className="border-b border-[#38bdf8]/15 px-4 py-3">
                <h4 className="text-sm font-bold text-slate-800">Scoring breakdown</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Scorul este suma a 10 criterii, fiecare notat intre 0 si 10. Maximum 100.
                </p>
              </div>
              <StructuredTextSection label="Summary" text={summary} />
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function MetricRow({
  label,
  value,
  warning = false,
  multiline = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 px-0 py-3 ${
        multiline ? 'flex-col items-start' : 'items-start justify-between'
      } ${warning ? 'bg-transparent' : 'bg-transparent'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p
        className={`text-sm ${
          warning ? 'font-semibold text-amber-900' : 'font-medium text-slate-700'
        } ${multiline ? 'leading-relaxed' : 'text-right'}`}
      >
        {value}
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  badgeLabel,
}: {
  label: string;
  value: number | null;
  badgeLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[#38bdf8]/15 bg-white/80 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
            {label}
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-black leading-none text-slate-900">
              {value ?? '—'}
            </span>
            <span className="pb-1 text-xs font-semibold uppercase text-slate-400">/100</span>
          </div>
        </div>
        <Badge className="border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#0f5b84]" variant="outline">
          {badgeLabel}
        </Badge>
      </div>
    </div>
  );
}

function ProbabilityMeter({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[#38bdf8]/15 bg-white/80 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </p>
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
          {formatPercent(value)}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-sky-500 to-emerald-500 transition-all"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function LineSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/5">
      <div className="border-b border-[#38bdf8]/15 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        </div>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="divide-y divide-[#38bdf8]/15">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

function ExpandableText({
  label,
  text,
  collapsedLines = 3,
}: {
  label?: string;
  text: string;
  collapsedLines?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldCollapse = text.length > 180 || text.includes('\n');
  const clampClass =
    !isExpanded && shouldCollapse
      ? collapsedLines === 2
        ? 'line-clamp-2'
        : collapsedLines === 6
          ? 'line-clamp-6'
          : 'line-clamp-3'
      : '';

  return (
    <div className={label ? 'px-4 py-3' : ''}>
      {label ? (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          {label}
        </p>
      ) : null}
      <p
        className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 ${clampClass}`}
      >
        {text}
      </p>
      {shouldCollapse ? (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-[#38bdf8]"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}

function StructuredTextSection({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const sections = parseStructuredText(text);

  if (sections.length <= 1) {
    return <ExpandableText label={label} text={text} collapsedLines={6} />;
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <div className="space-y-3">
        {sections.map((section, index) => (
          <div key={`${section.title ?? 'section'}-${index}`} className="rounded-xl bg-white/70 p-3">
            {section.title ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f5b84]">
                {section.title}
              </p>
            ) : null}
            <div className={section.title ? 'mt-2 space-y-2' : 'space-y-2'}>
              {section.lines.map((line, lineIndex) => {
                const isBullet = line.startsWith('- ') || line.startsWith('* ');
                return (
                  <p
                    key={`${line}-${lineIndex}`}
                    className={`text-sm leading-relaxed text-slate-700 ${
                      isBullet ? 'pl-3' : ''
                    }`}
                  >
                    {isBullet ? `• ${line.slice(2).trim()}` : line}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListPreview({
  label,
  items,
  collapsible = false,
}: {
  label: string;
  items: string[];
  collapsible?: boolean;
}) {
  const text = items.length > 0 ? items.join('\n') : FALLBACK_TEXT;
  return <ExpandableText label={label} text={text} collapsedLines={collapsible ? 2 : 3} />;
}

export function useLeadAiInsights() {
  const [insights, setInsights] = useState<LeadAiInsightsResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const setInsightsFromResponse = useCallback((value: LeadAiInsightsResponse | null) => {
    setInsights(value);
  }, []);

  return {
    insights,
    isRefreshing,
    isSubmittingFeedback,
    setIsRefreshing,
    setIsSubmittingFeedback,
    setInsightsFromResponse,
  };
}
