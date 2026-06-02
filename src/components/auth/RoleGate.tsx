// src/components/auth/RoleGate.tsx
'use client';

import { useAuthState } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function RoleGate({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { session, status, userRole } = useAuthState();
  const router = useRouter();
  const requiresRoot = allowedRoles.includes('root');
  const [serverRoot, setServerRoot] = useState<boolean | null>(requiresRoot ? null : false);

  useEffect(() => {
    let active = true;

    async function verifyRoot() {
      if (!requiresRoot) return;
      if (status !== 'authenticated' || !session) return;

      setServerRoot(null);

      const response = await fetch('/api/root/me', { credentials: 'include' }).catch(() => null);
      const body = response ? await response.json().catch(() => null) : null;

      if (!active) return;
      setServerRoot(Boolean(response?.ok && body?.ok && body?.data?.isRoot));
    }

    void verifyRoot();

    return () => {
      active = false;
    };
  }, [requiresRoot, status, session]);

  const roleAllowed = Boolean(userRole && allowedRoles.includes(userRole));
  const rootAllowed = requiresRoot && serverRoot === true;
  const resolvingRole = status === 'authenticated' && session && (requiresRoot ? serverRoot === null : !userRole);

  useEffect(() => {
    if (status === 'authenticated') {
      if (resolvingRole) return;
      if (!(roleAllowed || rootAllowed)) router.replace('/unauthorized');
    } else if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, resolvingRole, roleAllowed, rootAllowed, router]);

  if (status === 'hydrating' || resolvingRole) return <div>Verificando permisos...</div>;
  if (status === 'authenticated' && !(roleAllowed || rootAllowed)) return <div>Verificando permisos...</div>;

  return <>{children}</>;
}