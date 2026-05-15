// src/app/(root)/layout.tsx
import { AuthProvider } from '@/components/providers/AuthProvider';
import { RoleGate } from '@/components/auth/RoleGate';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RoleGate allowedRoles={['root']}>
        {children}
      </RoleGate>
    </AuthProvider>
  );
}
