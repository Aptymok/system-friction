import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioMasterAnalysisControl } from './StudioMasterAnalysisControl';
import { StudioProductionShell } from './StudioProductionShell';

export function StudioProductionConsole({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  return (
    <>
      <StudioMasterAnalysisControl
        objectId={state.activeObject.id}
        objectTitle={state.activeObject.title}
        objectType={state.activeObject.type}
        analysisStatus={state.activeObject.analysisStatus}
      />
      <StudioProductionShell state={state} fieldState={fieldState} identity={identity} />
    </>
  );
}
