import { LeadDetailPage } from '../../../../components/leads/lead-detail-page';

export default async function ManagerLeadByIdPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const resolvedParams = await params;
  return <LeadDetailPage leadId={resolvedParams.leadId} />;
}
