'use client';

import { X } from 'lucide-react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { studioCapabilityMatrix } from '@/lib/studio/capabilities/studioCapabilityInventory';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { statusClass } from './workspaceModel';

export function StudioCapabilityDrawer({ state }: { state: StudioProductionState }) {
  const activeDrawer = useStudioWorkspaceStore((store) => store.activeDrawer);
  const setDrawer = useStudioWorkspaceStore((store) => store.setDrawer);
  if (activeDrawer !== 'capabilities') return null;
  const matrix = studioCapabilityMatrix();
  return (
    <aside className="studio-drawer" aria-label="Capability drawer">
      <header>
        <span>CAPABILITY MATRIX</span>
        <strong>{matrix.summary.total} capabilities</strong>
        <button type="button" onClick={() => setDrawer(null)} aria-label="Close capability drawer"><X size={18} aria-hidden /></button>
      </header>
      <div className="studio-drawer__table">
        {matrix.entries.map((entry) => (
          <article key={entry.id} className={statusClass(entry.state)}>
            <strong>{entry.label}</strong>
            <span>{entry.id}</span>
            <em>{entry.state}</em>
            <small>{entry.implementedBy[0] ?? entry.requiredEngine ?? 'NO_ENGINE'}</small>
            <small>{entry.limitations[0] ?? 'NO_LIMITATION'}</small>
          </article>
        ))}
      </div>
      <footer>{state.activeObject.id ? `Linked object ${state.activeObject.id}` : 'No active object'}</footer>
    </aside>
  );
}
