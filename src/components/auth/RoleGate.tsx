// src/components/auth/RoleGate.tsx
'use client';
import { useAuthState } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RoleGate({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { status, userRole } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.replace('/unauthorized');
      }
    } else if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, userRole, allowedRoles, router]);

  if (status === 'hydrating') return <div>Verificando permisos...</div>;
  return <>{children}</>;
}
