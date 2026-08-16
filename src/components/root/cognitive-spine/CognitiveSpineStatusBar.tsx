'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = {
  available: boolean;
  consumed: false;
  inspectedAt: string;
  snapshot: null | {
    id: string;
    hash: string;
    sourceCutoff: string;
    projectionProfile: string;
    profileVersion: string;
  };
  state: null | {
    sources: number;
    evidence: number;
    hypotheses: number;
    contradictions: number;
    questions: number;
    freezes: number;
    memory: number;
    decisions: number;
    verificationDebt: number;
  };
  surfaces: Array<{ surface: string; posture: string }>;
  warnings: string[];
};

export function CognitiveSpineStatusBar() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/root/cognitive-spine/status', {
        cache: 'no-store',
        credentials: 'include',
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; status?: Status } | null;
      if (!response.ok || !body?.ok || !body.status) throw new Error('CT_STATE_UNAVAILABLE');
      setStatus(body.status);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const available = Boolean(status?.available && status.snapshot && status.state);
  const shortHash = status?.snapshot?.hash ? status.snapshot.hash.slice(0, 8) : '--------';
  const surfaceCount = status?.surfaces?.length ?? 0;

  return (
    <aside
      aria-label="Cognitive Spine status"
      style={{
        position: 'fixed', top: 10, right: 12, zIndex: 90,
        minWidth: 300, maxWidth: 'min(560px, calc(100vw - 24px))',
        border: '1px solid rgba(191,160,78,.34)', background: 'rgba(8,8,7,.96)',
        color: '#d5c28a', boxShadow: '0 10px 30px rgba(0,0,0,.28)',
        font: '10px ui-monospace,SFMono-Regular,Menlo,monospace', letterSpacing: '.045em',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderBottom: '1px solid rgba(191,160,78,.16)' }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: available ? '#c6ad69' : '#5e5a50', display: 'inline-block' }} />
        <strong style={{ fontSize: 10, letterSpacing: '.12em' }}>CT STATE</strong>
        <span style={{ opacity: .72 }}>{loading ? 'READING' : available ? status?.snapshot?.id : 'UNAVAILABLE'}</span>
        <span style={{ marginLeft: 'auto', opacity: .58 }}>#{shortHash}</span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh Cognitive Spine status"
          style={{ border: 0, background: 'transparent', color: '#c6ad69', cursor: loading ? 'default' : 'pointer', font: 'inherit', padding: 0 }}
        >
          ↻
        </button>
      </div>
      {available ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 1, padding: '7px 10px 8px' }}>
          <Metric label="SOURCES" value={status!.state!.sources} />
          <Metric label="EVIDENCE" value={status!.state!.evidence} />
          <Metric label="HYP" value={status!.state!.hypotheses} />
          <Metric label="CONTRA" value={status!.state!.contradictions} />
          <Metric label="V-DEBT" value={status!.state!.verificationDebt} />
          <Metric label="QUEST" value={status!.state!.questions} />
          <Metric label="FREEZE" value={status!.state!.freezes} />
          <Metric label="MEM" value={status!.state!.memory} />
          <Metric label="DEC" value={status!.state!.decisions} />
          <Metric label="SURFACES" value={surfaceCount} />
        </div>
      ) : (
        <div style={{ padding: '8px 10px', opacity: .66 }}>
          ROOT remains operational. Cognitive Spine status is currently unavailable and is not reconstructed narratively.
        </div>
      )}
      <div style={{ padding: '0 10px 7px', opacity: .48, fontSize: 8 }}>
        STATUS VIEW · CT AVAILABLE ≠ CT CONSUMED · NO CANONICAL WRITE
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div style={{ minWidth: 0 }}><div style={{ opacity: .46, fontSize: 7 }}>{label}</div><div style={{ fontSize: 11 }}>{value}</div></div>;
}
