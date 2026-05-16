// src/components/dashboard/ModuleGate.tsx
'use client';
import { useModuleAccess } from '@/observatory/hooks/useModuleAccess';

export function ModuleGate({ moduleKey, children }: { moduleKey: string; children: React.ReactNode }) {
  const { isModuleActive } = useModuleAccess();
  if (!isModuleActive(moduleKey)) return null;
  return <>{children}</>;
}
