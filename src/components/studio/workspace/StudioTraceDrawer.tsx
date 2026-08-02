'use client';

import { X } from 'lucide-react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';

export function StudioTraceDrawer({ state }: { state: StudioProductionState }) {
  const activeDrawer = useStudioWorkspaceStore((store) => store.activeDrawer);
  const setDrawer = useStudioWorkspaceStore((store) => store.setDrawer);
  if (activeDrawer !== 'trace') return null;
  return (
    <aside className="studio-drawer" aria-label="Trace drawer">
      <header>
        <span>TRACE</span>
        <strong>{state.session.id ?? state.activeObject.id ?? 'NO_TRACE'}</strong>
        <button type="button" onClick={() => setDrawer(null)} aria-label="Close trace drawer"><X size={18} aria-hidden /></button>
      </header>
      <section>
        <h2>Based on</h2>
        {state.provenance.basedOn.map((item) => <p key={item}>{item}</p>)}
      </section>
      <section>
        <h2>Derived from</h2>
        {state.provenance.derivedFrom.map((item) => <p key={item}>{item}</p>)}
      </section>
      <section>
        <h2>Limits</h2>
        {state.provenance.limits.map((item) => <p key={item}>{item}</p>)}
        {state.degradedSources.map((item) => <p key={item}>{item}</p>)}
      </section>
    </aside>
  );
}
