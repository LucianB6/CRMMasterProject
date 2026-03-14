'use client';

import { useEffect, useMemo, useState } from 'react';

import type { LeadAnswerResponse, LeadFormQuestion } from '../../lib/leads';
import type { LeadDetail } from './lead-detail-types';
import { Textarea } from '../ui/textarea';

type LeadInfoPanelProps = {
  lead: LeadDetail;
  answers: LeadAnswerResponse[];
  formQuestions: LeadFormQuestion[];
  isLoadingAnswers: boolean;
};

type EditableAnswerItem = {
  id: string;
  questionId: string | null;
  questionLabel: string;
  questionType: string;
  placeholder: string | null;
  helpText: string | null;
  answer: string;
  answeredAt: string | null;
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

const buildEditableAnswerItems = (
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
  answers,
  formQuestions,
  isLoadingAnswers,
}: LeadInfoPanelProps) {
  const detailRows = [
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

  const editableAnswerItems = useMemo(
    () => buildEditableAnswerItems(formQuestions, answers),
    [formQuestions, answers]
  );
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftAnswers(
      Object.fromEntries(editableAnswerItems.map((item) => [item.id, item.answer]))
    );
  }, [editableAnswerItems]);

  return (
    <aside className="hidden w-80 overflow-y-auto border-r border-[#38bdf8]/35 bg-white xl:block">
      <div className="space-y-8 p-6">
        <section>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Overview
          </h3>
          <div className="space-y-4">
            <InfoBlock
              label="Nume"
              value={`${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || '-'}
            />
            {detailRows.map((row) => (
              <InfoBlock key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </section>

        <section className="border-t border-[#38bdf8]/35 pt-6">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Form Answers
          </h3>

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
            <div className="space-y-3">
              {editableAnswerItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/10 p-3"
                >
                  <label className="mb-1 block text-[10px] font-bold uppercase text-[#38bdf8]">
                    {item.questionLabel}
                  </label>
                  {item.helpText ? (
                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                      {item.helpText}
                    </p>
                  ) : null}
                  <Textarea
                    value={draftAnswers[item.id] ?? ''}
                    onChange={(event) =>
                      setDraftAnswers((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="min-h-[84px] resize-y border-[#38bdf8]/25 bg-white text-sm focus-visible:ring-[#38bdf8]"
                    placeholder={item.placeholder || 'Adaugă sau editează răspunsul...'}
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    {item.questionType || 'field'} • {formatDateTime(item.answeredAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function AnswerSkeleton() {
  return <div className="h-28 rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/5" />;
}
