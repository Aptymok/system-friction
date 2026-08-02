import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioWorkspace } from '../workspace/StudioWorkspace';

export function StudioProductionShell({ state }: { state: StudioProductionState }) {
  return <StudioWorkspace state={state} />;
}
