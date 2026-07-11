import { RoleGate } from '@/components/auth/RoleGate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['root']}>
      {children}
    </RoleGate>
  );
}
