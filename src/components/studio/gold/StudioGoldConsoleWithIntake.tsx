import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioGoldConsoleWithEvaluation } from './StudioGoldConsoleWithEvaluation';
import { StudioObjectIntakePanel } from './StudioObjectIntakePanel';

export function StudioGoldConsoleWithIntake({ state }: { state: StudioGoldState }) {
  return (
    <>
      <StudioGoldConsoleWithEvaluation state={state} />
      <StudioObjectIntakePanel />
    </>
  );
}
