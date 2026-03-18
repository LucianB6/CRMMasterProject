'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, PanelLeft } from 'lucide-react';

import type { ManagerAgent, PipelineStage } from '../../lib/leads';
import type { LeadDetail } from './lead-detail-types';

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
  onChangeAssignee: (nextAssignee: string | null) => void;
  onChangeStage: (nextStage: string | null) => void;
  onOpenInfoPanel: () => void;
};

const resolveLeadName = (lead: LeadDetail) => {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return lead.email || lead.phone || lead.leadId;
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
  onChangeAssignee,
  onChangeStage,
  onOpenInfoPanel,
}: LeadHeaderProps) {
  const router = useRouter();
  const name = resolveLeadName(lead);
  void agents;
  void userRole;
  void currentUserId;
  void currentUserEmail;
  void stages;
  void isUpdatingStatus;
  void isUpdatingAssignee;
  void isUpdatingStage;
  void onChangeAssignee;
  void onChangeStage;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f8fafc]/90 pr-4 py-4 pl-0 backdrop-blur sm:pr-6 sm:pl-0 lg:pr-8 lg:pl-0">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-sky-50 hover:text-[#38bdf8]"
                aria-label="Înapoi"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#38bdf8] text-lg font-semibold text-white">
                {name[0] ?? 'L'}
              </div>
              <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      {name}
                    </h1>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      Lead
                    </span>
                
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
