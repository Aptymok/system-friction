import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioProductionShell } from './StudioProductionShell';

export function StudioProductionConsole({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  return <StudioProductionShell state={state} fieldState={fieldState} identity={identity} />;
}
