// src/components/auth/RoleGate.tsx
'use client';

import { useAuthState } from '@/components/auth/AuthProvider';
import { translateRootAccess } from '@/lib/root/rootGovernanceTranslator';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

let cachedRootAccess: boolean | null = null;
let cachedRootUserId: string | null = null;

export function RoleGate({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { session, status, userRole } = useAuthState();
  const router = useRouter();
  const requiresRoot = allowedRoles.includes('root');
  const sessionUserId = session?.user.id ?? null;
  const [serverRoot, setServerRoot] = useState<boolean | null>(
    requiresRoot && cachedRootAccess === true ? true : requiresRoot ? null : false,
  );

  useEffect(() => {
    let active = true;

    async function verifyRoot() {
      if (!requiresRoot) return;
      if (status !== 'authenticated' || !sessionUserId) return;

      if (cachedRootAccess === true && cachedRootUserId === sessionUserId) {
        setServerRoot(true);
        return;
      }

      setServerRoot((current) => (current === true ? true : null));

      const response = await fetch('/api/root/me', {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      const body = response ? await response.json().catch(() => null) : null;
      const isRoot = Boolean(response?.ok && body?.ok && body?.data?.isRoot);

      if (!active) return;
      cachedRootAccess = isRoot;
      cachedRootUserId = sessionUserId;
      setServerRoot(isRoot);
    }

    void verifyRoot();

    return () => {
      active = false;
    };
  }, [requiresRoot, status, sessionUserId]);

  const roleAllowed = Boolean(userRole && allowedRoles.includes(userRole));
  const rootAllowed = requiresRoot && serverRoot === true;
  const resolvingRole = status === 'authenticated' && Boolean(sessionUserId) && (requiresRoot ? serverRoot === null : !userRole);

  useEffect(() => {
    if (status === 'authenticated') {
      if (resolvingRole) return;
      if (!(roleAllowed || rootAllowed)) router.replace('/unauthorized');
    } else if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, resolvingRole, roleAllowed, rootAllowed, router]);

  if (status === 'hydrating' || resolvingRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#060605] p-6 text-[#c8c4b8]">
        <div className="border border-[#1e1c17] bg-[#0e0d0b] p-5">
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Umbral ROOT</div>
          <div className="mt-2 text-sm text-[#c8a951]">Verificando permiso raíz.</div>
          <p className="mt-2 text-xs leading-5 text-[#8a7568]">Sesión conservada. Validación de rol en curso.</p>
        </div>
      </div>
    );
  }
  if (status === 'authenticated' && !(roleAllowed || rootAllowed)) {
    const access = translateRootAccess({ error: 'root_required', isRoot: false });
    return (
      <div className="grid min-h-screen place-items-center bg-[#060605] p-6 text-[#c8c4b8]">
        <div className="border border-[#1e1c17] bg-[#0e0d0b] p-5">
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Umbral ROOT</div>
          <div className="mt-2 text-sm text-[#c87060]">{access.state}</div>
          <p className="mt-2 text-xs leading-5 text-[#8a7568]">{access.reason}</p>
          <p className="mt-1 text-xs leading-5 text-[#8a7568]">Accion siguiente: {access.nextAction}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
