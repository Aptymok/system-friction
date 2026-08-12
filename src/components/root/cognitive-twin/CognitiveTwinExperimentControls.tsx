'use client';

import { useState } from 'react';

type SnapshotOption = { snapshotHash: string | null; capturedAt: string | null; sealedEpochs: number | null };

export function CognitiveTwinExperimentControls({ snapshots }: { snapshots: SnapshotOption[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createSnapshot() {
    setBusy('snapshot'); setMessage(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/snapshot', { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setMessage(`Snapshot ${body.result.snapshotHash} ${body.result.created ? 'created' : 'already existed'}. Reload to display it.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Snapshot failed.'); }
    finally { setBusy(null); }
  }

  async function createCheckpoint() {
    setBusy('checkpoint'); setMessage(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/checkpoint', { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setMessage(`Checkpoint ${body.checkpointHash} prepared. External timestamp authority remains PENDING until a third-party receipt is attached.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkpoint failed.'); }
    finally { setBusy(null); }
  }

  async function registerFork(snapshotHash: string) {
    setBusy(snapshotHash); setMessage(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/fork', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshotHash }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setMessage(`Fork ${body.result.forkManifest.childSubjectId} registered as NOT RUNNING. Reload to display it.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Fork registration failed.'); }
    finally { setBusy(null); }
  }

  const buttonStyle = { border:'1px solid rgba(191,160,78,.45)',background:'#0b0b09',color:'#d0bb7a',padding:'9px 12px',cursor:busy?'wait':'pointer' } as const;
  return <section style={{ marginTop: 24, border: '1px solid rgba(191,160,78,.24)', padding: 18 }}>
    <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#8d7b4d' }}>GOVERNED EXPERIMENT ACTIONS</div>
    <p style={{ color: '#9e9682', lineHeight: 1.55, maxWidth: 900 }}>Snapshot seals the current lineage head. Checkpoint exports a hash-linked package for independent anchoring. Fork only registers a child experimental lineage; it does not start an agent or grant authority.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={() => void createSnapshot()} disabled={Boolean(busy)} style={buttonStyle}>{busy === 'snapshot' ? 'SEALING…' : 'SEAL CURRENT SNAPSHOT'}</button><button type="button" onClick={() => void createCheckpoint()} disabled={Boolean(busy)} style={buttonStyle}>{busy === 'checkpoint' ? 'CHECKPOINTING…' : 'CREATE LINEAGE CHECKPOINT'}</button></div>
    {snapshots.filter((item): item is SnapshotOption & { snapshotHash: string } => Boolean(item.snapshotHash)).slice(0, 8).map((item) => <div key={item.snapshotHash} style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: 10 }}><code style={{ color: '#9e9682', overflowWrap: 'anywhere' }}>{item.snapshotHash}</code><span style={{ color: '#716a5b' }}>{item.capturedAt} · {item.sealedEpochs ?? '—'} epochs</span><button type="button" onClick={() => void registerFork(item.snapshotHash)} disabled={Boolean(busy)} style={{ border: '1px solid rgba(191,160,78,.3)', background: 'transparent', color: '#bda563', padding: '6px 8px', cursor: busy ? 'wait' : 'pointer' }}>{busy === item.snapshotHash ? 'REGISTERING…' : 'REGISTER FORK'}</button></div>)}
    {message ? <p aria-live="polite" style={{ marginTop: 14, color: '#c6ad69', fontSize: 11 }}>{message}</p> : null}
  </section>;
}
