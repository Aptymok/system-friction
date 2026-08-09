import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioWorkspace } from '../workspace/StudioWorkspace';

export function StudioProductionShell({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  return <StudioWorkspace state={state} fieldState={fieldState} identity={identity} />;
}
