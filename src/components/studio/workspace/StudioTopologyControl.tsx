'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';

export function StudioTopologyControl({ fieldState, activeObjectId }: { fieldState: StudioFieldViewState; activeObjectId: string | null }) {
  const router = useRouter();
  const [nodeId, setNodeId] = useState(fieldState.field.nodes[0]?.id ?? '');
  const [targetId, setTargetId] = useState('');
  const [edgeId, setEdgeId] = useState('');
  const [relationType, setRelationType] = useState<'DERIVED_FROM'|'INFLUENCES'|'CONTAINS'|'PROJECTS'>('DERIVED_FROM');
  const selected = fieldState.field.nodes.find((item) => item.id === nodeId) ?? null;
  const [x, setX] = useState(selected?.x ?? 0);
  const [y, setY] = useState(selected?.y ?? 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const targets = useMemo(() => [
    ...(fieldState.field.attractor ? [{ id: fieldState.field.attractor.id, label: fieldState.field.attractor.label }] : []),
    ...fieldState.field.nodes.filter((item) => item.id !== nodeId).map((item) => ({ id: item.id, label: item.label })),
  ], [fieldState, nodeId]);
  const edges = fieldState.field.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId);

  function chooseNode(next: string) {
    setNodeId(next);
    const node = fieldState.field.nodes.find((item) => item.id === next) ?? null;
    setX(node?.x ?? 0); setY(node?.y ?? 0); setTargetId(''); setEdgeId(''); setMessage(null);
  }

  async function act(action: string, payload: Record<string, unknown>) {
    if (!fieldState.session?.id) return;
    setBusy(action); setMessage(null);
    try {
      const response = await fetch('/api/studio/field', {
        method:'POST', credentials:'include', headers:{'content-type':'application/json'},
        body:JSON.stringify({ sessionId:fieldState.session.id, action, ...payload }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(String(body?.details ?? body?.error ?? `HTTP ${response.status}`));
      setMessage(action === 'update_node' ? 'POSITION PERSISTED' : action === 'link_nodes' ? 'RELATION PERSISTED' : action === 'unlink_nodes' ? 'RELATION REMOVED' : action === 'archive_node' ? 'NODE ARCHIVED' : 'OBJECT ATTACHED');
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(null); }
  }

  return (
    <section className="studio-secondary-instruments__instrument">
      <span>TOPOLOGY / GOVERNED STRUCTURE</span>
      <h2>Persisted field geometry</h2>
      <p>Reposition, relate, detach a persisted edge, archive a node, or attach the active object. These operations mutate only the owner-scoped Studio field contract.</p>
      {fieldState.field.nodes.length ? <>
        <div className="studio-topology-control__grid">
          <label><span>NODE</span><select value={nodeId} onChange={(event) => chooseNode(event.target.value)}>{fieldState.field.nodes.map((item) => <option key={item.id} value={item.id}>{item.kind.toUpperCase()} · {item.label}</option>)}</select></label>
          <label><span>X {x.toFixed(2)}</span><input type="range" min="-1" max="1" step="0.01" value={x} onChange={(event) => setX(Number(event.target.value))}/></label>
          <label><span>Y {y.toFixed(2)}</span><input type="range" min="-1" max="1" step="0.01" value={y} onChange={(event) => setY(Number(event.target.value))}/></label>
        </div>
        <div className="studio-topology-control__actions"><button type="button" disabled={!selected || Boolean(busy)} onClick={() => void act('update_node',{nodeId,x,y})}>SAVE POSITION</button><button type="button" disabled={!selected || !activeObjectId || Boolean(busy)} onClick={() => void act('attach_object',{objectId:activeObjectId,nodeId})}>ATTACH ACTIVE OBJECT</button><button type="button" data-danger="true" disabled={!selected || Boolean(busy)} onClick={() => void act('archive_node',{nodeId})}>ARCHIVE NODE</button></div>
        <div className="studio-topology-control__relation"><select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">TARGET SCOPE</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select value={relationType} onChange={(event) => setRelationType(event.target.value as typeof relationType)}><option value="DERIVED_FROM">DERIVED FROM</option><option value="INFLUENCES">INFLUENCES</option><option value="CONTAINS">CONTAINS</option><option value="PROJECTS">PROJECTS</option></select><button type="button" disabled={!selected || !targetId || Boolean(busy)} onClick={() => void act('link_nodes',{sourceId:nodeId,targetId,relationType})}>LINK</button></div>
        <div className="studio-topology-control__relation"><select value={edgeId} onChange={(event) => setEdgeId(event.target.value)}><option value="">PERSISTED EDGE</option>{edges.map((edge) => <option key={edge.id} value={edge.id}>{edge.relationType} · {edge.sourceId.slice(0,6)}→{edge.targetId.slice(0,6)}</option>)}</select><button type="button" disabled={!edgeId || Boolean(busy)} onClick={() => void act('unlink_nodes',{edgeId})}>UNLINK</button></div>
        {message ? <div className="studio-secondary-instruments__result"><strong>{message}</strong></div> : null}
      </> : <div className="studio-secondary-instruments__result"><strong>NO PERSISTED NODES</strong><p>Create PROJECT/NODE from the primary Studio field first.</p></div>}
    </section>
  );
}
