// src/components/auth/SubscriptionGate.tsx
'use client';
import { useAuthState } from '@/components/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { ModuleContext } from '@/lib/context/ModuleContext';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuthState();
  const [modules, setModules] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/subscription')
        .then(res => res.json())
        .then(data => {
          setModules(data.modules || {});
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [session]);

  if (loading) return <div>Cargando módulos...</div>;
  return <ModuleContext.Provider value={modules}>{children}</ModuleContext.Provider>;
}
