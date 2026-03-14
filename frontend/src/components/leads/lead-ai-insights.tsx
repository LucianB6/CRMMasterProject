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

import type {
  LeadAiInsightsResponse,
  LeadInsightFeedbackStatus,
} from '../../lib/leads';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type LeadAIInsightsProps = {
  insights: LeadAiInsightsResponse | null;
  isRefreshing: boolean;
  isSubmittingFeedback: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
  onSubmitFeedback: (status: LeadInsightFeedbackStatus) => void;
};

const FALLBACK_TEXT = 'Insuficiente date pentru recomandare detaliată.';

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

export function LeadAIInsights({
  insights,
  isRefreshing,
  isSubmittingFeedback,
  canRefresh,
  onRefresh,
  onSubmitFeedback,
}: LeadAIInsightsProps) {
  if (!insights) {
    return (
      <div className="rounded-2xl border border-[#38bdf8]/35 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || !canRefresh}
          className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#38bdf8]/35 bg-[#38bdf8]/5 px-6 text-center transition-colors hover:bg-[#38bdf8]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="rounded-full bg-[#38bdf8] p-3 shadow-lg shadow-[#38bdf8]/20">
            {isRefreshing ? (
              <RefreshCw className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Sparkles className="h-6 w-6 text-white" />
            )}
          </div>
          <span className="mt-4 text-base font-semibold text-slate-900">
            See the best approaches for your client
          </span>
          <span className="mt-2 max-w-[240px] text-sm leading-relaxed text-slate-500">
            Generate AI insights when you are ready to review the current client context.
          </span>
        </button>
      </div>
    );
  }

  const safeScore = clampScore(insights?.score);
  const generatedAt = formatLocalDateTime(insights?.generatedAt);
  const scoreFactors = Array.isArray(insights?.scoreFactors) ? insights.scoreFactors : [];
  const guidanceSource = insights?.guidanceSource?.toLowerCase() || null;
  const confidenceLevel = insights?.confidenceLevel?.toLowerCase() || null;
  const relationshipRiskLevel = insights?.relationshipRiskLevel?.toLowerCase() || null;
  const relationshipSentiment = insights?.relationshipSentiment?.toLowerCase() || null;
  const previousFeedbackStatus = insights?.whatChanged?.previousFeedbackStatus || null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#38bdf8]/35 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#38bdf8] p-1.5 shadow-lg shadow-[#38bdf8]/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">AI Insights</h3>
              <p className="text-xs text-slate-500">Generat la {generatedAt}</p>
            </div>
          </div>
          {guidanceSource ? (
            <Badge className="border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#0f5b84]" variant="outline">
              {guidanceSource}
            </Badge>
          ) : null}
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/5">
          <div className="flex items-end justify-between gap-3 border-b border-[#38bdf8]/15 px-4 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Score
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-black leading-none text-slate-900">
                  {safeScore ?? '-'}
                </span>
                <span className="pb-1 text-xs font-semibold uppercase text-slate-400">/100</span>
              </div>
            </div>
            <Badge className="border-[#38bdf8]/25 bg-white text-[#0f5b84]" variant="outline">
              Lead health
            </Badge>
          </div>

          <div className="divide-y divide-[#38bdf8]/15">
            <MetricRow
              label="Sentiment"
              value={sentenceCase(insights?.relationshipSentiment)}
              warning={relationshipSentiment === 'at risk'}
            />
            <MetricRow
              label="Risk"
              value={sentenceCase(insights?.relationshipRiskLevel)}
              warning={relationshipRiskLevel === 'high'}
            />
            <MetricRow label="Trend" value={sentenceCase(insights?.relationshipTrend)} />
            <MetricRow
              label="Confidence"
              value={sentenceCase(insights?.confidenceLevel)}
              warning={confidenceLevel === 'low'}
            />
            <MetricRow
              label="Blocker"
              value={insights?.relationshipKeyBlocker || FALLBACK_TEXT}
              multiline
            />
          </div>
        </div>

        {confidenceLevel === 'low' ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Confidence scăzută. Tratează recomandarea ca sugestie, nu ca verdict final.
          </div>
        ) : null}

        <div className="space-y-3">
          <LineSection
            title="Next Best Action"
            subtitle={[
              insights?.nextBestAction?.actionType,
              insights?.nextBestAction?.priority,
            ]
              .filter(Boolean)
              .join(' • ')}
          >
            <DetailRow label="Reason" value={insights?.nextBestAction?.reason || FALLBACK_TEXT} />
            <DetailRow label="Why now" value={insights?.nextBestAction?.whyNow || FALLBACK_TEXT} />
            <DetailRow
              label="Deadline hint"
              value={insights?.nextBestAction?.deadlineHint || FALLBACK_TEXT}
            />
          </LineSection>

          <LineSection title="Recommendation">
            <ExpandableText
              label="Recommended Action"
              text={insights?.recommendedAction || FALLBACK_TEXT}
            />
            <ExpandableText
              label="Suggested Approach"
              text={insights?.suggestedApproach || FALLBACK_TEXT}
            />
          </LineSection>

          <LineSection title="Why this insight">
            <DetailRow
              label="Why"
              value={insights?.explainability?.whyThisInsight || FALLBACK_TEXT}
            />
            <ListPreview label="Signals" items={insights?.explainability?.basedOnSignals || []} />
            <ListPreview
              label="KB evidence"
              items={insights?.explainability?.kbEvidence || []}
              collapsible
            />
          </LineSection>

          <LineSection title="What changed">
            <DetailRow
              label="Previous recommendation"
              value={insights?.whatChanged?.previousRecommendation || FALLBACK_TEXT}
            />
            <DetailRow label="Previous feedback" value={previousFeedbackStatus || 'NONE'} />
            <ListPreview
              label="Changes"
              items={insights?.whatChanged?.changes || []}
              collapsible
            />
          </LineSection>

          <LineSection title="Score factors" icon={<Target size={14} className="text-[#38bdf8]" />}>
            {scoreFactors.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-600">{FALLBACK_TEXT}</p>
            ) : (
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
            )}
          </LineSection>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-[#38bdf8]/35 text-slate-700 hover:bg-[#38bdf8]/10"
        onClick={onRefresh}
        disabled={isRefreshing || !canRefresh}
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Refreshing...
          </>
        ) : (
          'Refresh AI Insights'
        )}
      </Button>

      {!canRefresh ? (
        <p className="text-xs text-slate-500">
          Refresh devine disponibil după ce se modifică date relevante ale lead-ului.
        </p>
      ) : null}

      <div className="rounded-2xl border border-[#38bdf8]/35 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#38bdf8]/35 hover:bg-[#38bdf8]/10"
            onClick={() => onSubmitFeedback('USEFUL')}
            disabled={!insights || isSubmittingFeedback}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Useful
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#38bdf8]/35 hover:bg-[#38bdf8]/10"
            onClick={() => onSubmitFeedback('NOT_USEFUL')}
            disabled={!insights || isSubmittingFeedback}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            Not useful
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#38bdf8]/35 hover:bg-[#38bdf8]/10"
            onClick={() => onSubmitFeedback('COMPLETED')}
            disabled={!insights || isSubmittingFeedback}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Completed
          </Button>
        </div>

        {previousFeedbackStatus === 'COMPLETED' ? (
          <p className="mt-3 text-xs text-slate-500">
            Insight-ul anterior a fost marcat completed. La refresh se poate genera următorul pas relevant.
          </p>
        ) : null}
      </div>

      {(guidanceSource === 'fallback' || guidanceSource === 'guardrailed') ? (
        <div className="flex gap-3 rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/10 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#38bdf8]" />
          <p className="text-xs leading-relaxed text-sky-900">
            Recomandarea folosește un mod {guidanceSource}. Păstrează validarea umană înainte de
            execuție.
          </p>
        </div>
      ) : null}
    </div>
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
      className={`flex gap-3 px-4 py-3 ${
        multiline ? 'flex-col items-start' : 'items-start justify-between'
      } ${warning ? 'bg-amber-50/80' : 'bg-transparent'}`}
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
