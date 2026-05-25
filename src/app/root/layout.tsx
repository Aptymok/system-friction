import { RoleGate } from '@/components/auth/RoleGate';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['root']}>
      {children}
    </RoleGate>
  );
}
