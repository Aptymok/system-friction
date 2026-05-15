// src/hooks/useModuleAccess.ts
import { useContext } from 'react';
import { ModuleContext } from '@/lib/context/ModuleContext';

export function useModuleAccess() {
  const modules = useContext(ModuleContext);
  return {
    modules: modules || {},
    isModuleActive: (key: string) => modules?.[key] === true,
  };
}
