'use client';

import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioCapabilityDrawer } from './StudioCapabilityDrawer';
import { StudioObjectReport } from './StudioObjectReport';
import { StudioTraceDrawer } from './StudioTraceDrawer';
import './studio-workspace.css';

export function StudioWorkspace({ state }: { state: StudioProductionState }) {
  return (
    <>
      <StudioObjectReport state={state} />
      <StudioCapabilityDrawer state={state} />
      <StudioTraceDrawer state={state} />
    </>
  );
}
