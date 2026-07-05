import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioProductionShell } from './StudioProductionShell';

export function StudioProductionConsole({ state }: { state: StudioProductionState }) {
  return <StudioProductionShell state={state} />;
}
