import type { LeadStatus, ManagerLeadDetails } from '../../lib/leads';

export type LeadDetail = ManagerLeadDetails;

export type TimelineActivityType =
  | 'note'
  | 'call'
  | 'task'
  | 'email'
  | 'status_change';

export type TimelineActivity = {
  id: string;
  type: TimelineActivityType;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
};

export type LeadAiInsights = {
  score: number;
  recommendedAction: string;
  suggestedApproach: string;
  scoreFactors: Array<{
    label: string;
    value: number;
    type: 'positive' | 'neutral' | 'negative';
    detail: string;
  }>;
  generatedAt: string;
};

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'lost',
];
