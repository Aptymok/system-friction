import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioCinematicWorkspace } from '../workspace/StudioCinematicWorkspace';
import '../workspace/studio-cinematic-bridge.css';

export function StudioProductionShell({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  return <StudioCinematicWorkspace state={state} fieldState={fieldState} identity={identity} />;
}
