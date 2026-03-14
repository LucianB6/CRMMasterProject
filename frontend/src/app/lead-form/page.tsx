'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { PublicLeadFormPage } from '../../components/lead-capture/public-lead-form-page';

export default function LeadFormRoute() {
  return (
    <Suspense fallback={<LeadFormSlugMissing message="Loading campaign form..." />}>
      <LeadFormRouteContent />
    </Suspense>
  );
}

function LeadFormRouteContent() {
  const searchParams = useSearchParams();
  const publicSlug = searchParams.get('slug')?.trim() || searchParams.get('publicSlug')?.trim() || '';

  if (!publicSlug) {
    return <LeadFormSlugMissing message="Open this page with `?slug=your-public-form-slug` so the campaign can resolve the correct public lead form." />;
  }

  return <PublicLeadFormPage publicSlug={publicSlug} />;
}

function LeadFormSlugMissing({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#d7f1ff,transparent_35%),linear-gradient(180deg,#f7fbfd_0%,#eef5f8_100%)] px-4 py-10">
      <div className="max-w-lg rounded-2xl border bg-white/95 p-6 shadow-xl">
        <h1 className="font-headline text-2xl text-slate-950">Lead form</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
