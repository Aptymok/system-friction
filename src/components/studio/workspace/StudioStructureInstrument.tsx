'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StudioFieldViewAttractor, StudioFieldViewNode } from '@/lib/studio/field/studioFieldViewTypes';

export function StudioStructureInstrument({
  sessionId,
  selectedNode,
  activeObjectId,
  attractor,
  nodes,
}: {
  sessionId: string | null;
  selectedNode: StudioFieldViewNode | null;
  activeObjectId: string | null;
  attractor: StudioFieldViewAttractor | null;
  nodes: StudioFieldViewNode[];
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState<'DERIVED_FROM'|'INFLUENCES'|'CONTAINS'|'PROJECTS'>('DERIVED_FROM');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: string, payload: Record<string, unknown>) {
    if (!sessionId || !selectedNode) return;
    setBusy(action); setMessage(null);
    try {
      const response = await fetch('/api/studio/field', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, action, ...payload }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(String(body?.details ?? body?.error ?? `HTTP ${response.status}`));
      setMessage(action === 'archive_node' ? 'NODE ARCHIVED' : action === 'attach_object' ? 'OBJECT ATTACHED' : 'RELATION PERSISTED');
      setTargetId('');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(null); }
  }

  if (!selectedNode) return null;
  const targets = [attractor, ...nodes].filter((item): item is StudioFieldViewAttractor | StudioFieldViewNode => Boolean(item) && item!.id !== selectedNode.id);

  return (
    <section className="studio-structure-instrument">
      <div className="studio-native__section-label">STRUCTURE / RELATION</div>
      <div className="studio-structure-instrument__row">
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          <option value="">TARGET SCOPE</option>
          {targets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select value={relationType} onChange={(event) => setRelationType(event.target.value as typeof relationType)}>
          <option value="DERIVED_FROM">DERIVED FROM</option>
          <option value="INFLUENCES">INFLUENCES</option>
          <option value="CONTAINS">CONTAINS</option>
          <option value="PROJECTS">PROJECTS</option>
        </select>
      </div>
      <div className="studio-structure-instrument__actions">
        <button type="button" disabled={!targetId || Boolean(busy)} onClick={() => void act('link_nodes', { sourceId: selectedNode.id, targetId, relationType })}>LINK</button>
        <button type="button" disabled={!activeObjectId || Boolean(busy)} onClick={() => void act('attach_object', { objectId: activeObjectId, nodeId: selectedNode.id })}>ATTACH OBJECT</button>
        <button type="button" data-danger="true" disabled={Boolean(busy)} onClick={() => void act('archive_node', { nodeId: selectedNode.id })}>ARCHIVE NODE</button>
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
