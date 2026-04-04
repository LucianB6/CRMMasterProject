import type { Metadata } from 'next';

import { BackofficeShell } from '../../components/super-admin/ui';

export const metadata: Metadata = {
  title: 'selfCRM | Super Admin',
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BackofficeShell>{children}</BackofficeShell>;
}
