// src/components/auth/RoleGate.tsx
'use client';
import { useAuthState } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RoleGate({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { session, status, userRole } = useAuthState();
  const router = useRouter();

  const roleAllowed = Boolean(userRole && allowedRoles.includes(userRole));
  const resolvingRole = status === 'authenticated' && session && !userRole;

  useEffect(() => {
    if (status === 'authenticated') {
      if (resolvingRole) return;
      if (!roleAllowed) router.replace('/unauthorized');
    } else if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, resolvingRole, roleAllowed, router]);

  if (status === 'hydrating' || resolvingRole) return <div>Verificando permisos...</div>;
  if (status === 'authenticated' && !roleAllowed) return <div>Verificando permisos...</div>;
  return <>{children}</>;
}
