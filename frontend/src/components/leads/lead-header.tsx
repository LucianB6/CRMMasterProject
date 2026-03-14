'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import type {
  LeadStatus,
  ManagerAgent,
  PipelineStage,
} from '../../lib/leads';
import type { LeadDetail } from './lead-detail-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LEAD_STATUS_OPTIONS } from './lead-detail-types';

type LeadHeaderProps = {
  lead: LeadDetail;
  agents: ManagerAgent[];
  userRole: 'manager' | 'agent';
  currentUserId: string | null;
  currentUserEmail: string | null;
  stages: PipelineStage[];
  isUpdatingStatus: boolean;
  isUpdatingAssignee: boolean;
  isUpdatingStage: boolean;
  onChangeStatus: (nextStatus: LeadStatus) => void;
  onChangeAssignee: (nextAssignee: string | null) => void;
  onChangeStage: (nextStage: string | null) => void;
  onOpenAiPanel: () => void;
};

const statusLabels: Record<LeadStatus, string> = {
  new: 'Nou',
  contacted: 'Contactat',
  qualified: 'Calificat',
  lost: 'Pierdut',
};

const resolveLeadName = (lead: LeadDetail) => {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return lead.email || lead.phone || lead.leadId;
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

export function LeadHeader({
  lead,
  agents,
  userRole,
  currentUserId,
  currentUserEmail,
  stages,
  isUpdatingStatus,
  isUpdatingAssignee,
  isUpdatingStage,
  onChangeStatus,
  onChangeAssignee,
  onChangeStage,
  onOpenAiPanel,
}: LeadHeaderProps) {
  const router = useRouter();
  const name = resolveLeadName(lead);
  const currentStatus = LEAD_STATUS_OPTIONS.includes(lead.status as LeadStatus)
    ? (lead.status as LeadStatus)
    : 'new';
  const activeStages = stages.filter((stage) => stage.isActive !== false);
  const assigneeLabel = resolveAssigneeLabel(lead, agents);
  const currentStage = activeStages.find((stage) => stage.stageId === lead.stageId);
  const isManager = userRole === 'manager';
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

  return (
    <header className="sticky top-0 z-40 border-b border-[#38bdf8]/35 bg-white px-6 py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#38bdf8]/25 bg-white text-slate-600 transition-colors hover:bg-[#38bdf8]/10 hover:text-[#0f5b84]"
            aria-label="Înapoi"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#38bdf8] text-lg font-bold text-white">
            {name[0] ?? 'L'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
              <span className="rounded-full border border-[#38bdf8]/35 bg-[#38bdf8]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#38bdf8]">
                Lead
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {lead.email || lead.phone || 'Contact necompletat'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-[#38bdf8]/10 lg:hidden"
            onClick={onOpenAiPanel}
          >
            <Sparkles size={20} className="text-[#38bdf8]" />
          </button>
        </div>
      </div>

      <div className="mt-4 pb-1">
        <div className="flex w-full gap-3">
          <MetaItem label="Sursă" value={formatSource(lead.source)} />
          <MetaItem label="Trimis la" value={formatDateTime(lead.submittedAt)} />
          <MetaItem label="Ultima activitate" value={formatDateTime(lead.lastActivityAt)} />

          <MetaSelectItem label="Status">
            <Select
              value={currentStatus}
              onValueChange={(value) => onChangeStatus(value as LeadStatus)}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="h-10 border-[#38bdf8]/35 bg-white text-sm font-medium text-slate-700">
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
          </MetaSelectItem>

          <MetaSelectItem label="Stage">
            <Select
              value={lead.stageId ?? 'unassigned'}
              onValueChange={(value) => onChangeStage(value === 'unassigned' ? null : value)}
              disabled={isUpdatingStage}
            >
              <SelectTrigger className="h-10 border-[#38bdf8]/35 bg-white text-sm font-medium text-slate-700">
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
          </MetaSelectItem>

          {isManager ? (
            <MetaSelectItem label="Assignee curent">
              <Select
                value={lead.assignedToUserId ?? 'unassigned'}
                onValueChange={(value) => onChangeAssignee(value === 'unassigned' ? null : value)}
                disabled={isUpdatingAssignee}
              >
                <SelectTrigger className="h-10 border-[#38bdf8]/35 bg-white text-sm font-medium text-slate-700">
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
            </MetaSelectItem>
          ) : (
            <MetaItem label="Assignee curent" value={assigneeLabel} />
          )}
        </div>
      </div>
    </header>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#38bdf8]/25 bg-[#38bdf8]/5 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function MetaSelectItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#38bdf8]/25 bg-[#38bdf8]/5 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
