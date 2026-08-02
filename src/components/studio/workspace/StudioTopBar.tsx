'use client';

import { Activity, Command, GitBranch, Gauge, Radio, Route, Search } from 'lucide-react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';

export function StudioTopBar({ state }: { state: StudioProductionState }) {
  const setDrawer = useStudioWorkspaceStore((store) => store.setDrawer);
  return (
    <header className="studio-topbar">
      <a className="studio-topbar__brand" href="/studio" aria-label="Studio workspace">
        <Activity size={18} aria-hidden />
        <span>STUDIO</span>
      </a>
      <div className="studio-topbar__object">
        <strong>{state.activeObject.title}</strong>
        <span>{state.activeObject.id ?? 'NO_OBJECT'}</span>
      </div>
      <div className="studio-topbar__status" aria-label="Studio status and trace">
        <span><Gauge size={15} aria-hidden />{state.systemState.toUpperCase()}</span>
        <span><GitBranch size={15} aria-hidden />{state.generatedAt}</span>
        <span><Radio size={15} aria-hidden />{state.activeObject.analysisStatus}</span>
      </div>
      <div className="studio-topbar__actions">
        <button type="button" onClick={() => setDrawer('capabilities')} aria-label="Open capability drawer" title="Capabilities">
          <Route size={17} aria-hidden />
        </button>
        <button type="button" onClick={() => setDrawer('trace')} aria-label="Open trace drawer" title="Trace">
          <Search size={17} aria-hidden />
        </button>
        <button type="button" aria-label="Open command palette" title="Command palette">
          <Command size={17} aria-hidden />
        </button>
      </div>
    </header>
  );
}
