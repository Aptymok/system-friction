'use client';

import { useEffect, useMemo, useState } from 'react';

type Frame = {
  observedAt: string;
  wsi: number | null;
  nti: number | null;
  confidence: number | null;
  sourceState: string;
  ingestMode: string;
  vectors: Array<{ id: string; label: string; value: number | null; sourceCount: number; trust: number | null }>;
};
type Response = { ok: boolean; horizonDays?: number; generatedAt?: string; frames?: Frame[]; limits?: string[]; error?: string; details?: string };

function value(number: number | null) { return number === null ? 'NO_VALUE' : number.toFixed(3); }
function date(value: string | null | undefined) {
  if (!value) return 'NO_TIME';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return `${parsed.toLocaleString('es-MX', { dateStyle:'medium', timeStyle:'short', timeZone:'UTC' })} UTC`;
}

export function PublicObservatoryTimelineNavigator() {
  const [data, setData] = useState<Response | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/observatory/timeline', { cache:'no-store' });
      const body = await response.json() as Response;
      if (!response.ok || !body.ok) throw new Error(body.details ?? body.error ?? `HTTP ${response.status}`);
      setData(body); setIndex(Math.max(0,(body.frames?.length ?? 1)-1));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'observatory_timeline_failed'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const frames = data?.frames ?? [];
  const safeIndex = Math.min(index, Math.max(0,frames.length-1));
  const frame = frames[safeIndex] ?? null;
  const activeVectors = useMemo(() => frame?.vectors.filter((item) => item.value !== null) ?? [], [frame]);

  return (
    <section className="rn-panel rn-panel--full observatory-history" id="time-movement">
      <div className="observatory-history__head"><div><span>HISTORICAL FRAME / PERSISTED WORLDSPECT</span><h2>Move through observed snapshots.</h2><p>The cursor does not interpolate missing days. Each position resolves one persisted WorldSpect frame and only the public domains calculable at that observed state.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'READING…' : 'REFRESH SERIES'}</button></div>
      {error ? <div className="observatory-history__error">{error}</div> : null}
      {frame ? <>
        <div className="observatory-history__metrics"><div><span>FRAME</span><strong>{date(frame.observedAt)}</strong><small>{frame.sourceState.toUpperCase()}</small></div><div><span>WSV</span><strong>{value(frame.wsi)}</strong><small>aggregate world state</small></div><div><span>NTI</span><strong>{value(frame.nti)}</strong><small>snapshot tension</small></div><div><span>CONFIDENCE</span><strong>{value(frame.confidence)}</strong><small>{frame.ingestMode.toUpperCase()}</small></div></div>
        <div className="observatory-history__scrub"><div><span>{date(frames[0]?.observedAt)}</span><b>{safeIndex+1}/{frames.length} · {data?.horizonDays ?? 90}D</b><span>{date(frames.at(-1)?.observedAt)}</span></div><input aria-label="Move persisted Observatory timeline" type="range" min={0} max={Math.max(0,frames.length-1)} value={safeIndex} onChange={(event) => setIndex(Number(event.target.value))}/></div>
        <div className="observatory-history__vectors">{frame.vectors.map((vector) => <article key={vector.id} data-empty={vector.value === null}><span>{vector.label}</span><strong>{value(vector.value)}</strong><i><b style={{width:`${Math.max(0,Math.min(1,vector.value ?? 0))*100}%`}}/></i><small>{vector.sourceCount} sources · trust {value(vector.trust)}</small></article>)}</div>
        {!activeVectors.length ? <div className="observatory-history__empty">PERSISTED FRAME · NO PUBLIC CALCULABLE DOMAINS · ABSENCE PRESERVED</div> : null}
        <div className="observatory-history__limits">{(data?.limits ?? []).map((limit) => <span key={limit}>· {limit}</span>)}</div>
      </> : !loading ? <div className="observatory-history__empty">NO PERSISTED PUBLIC SNAPSHOTS IN HORIZON</div> : null}
      <style jsx>{`
        .observatory-history{overflow:hidden}.observatory-history__head{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start}.observatory-history__head span,.observatory-history__metrics span,.observatory-history__vectors span{font:7px/1 ui-monospace,monospace;letter-spacing:.12em;color:#69a5a4}.observatory-history__head h2{margin:8px 0 8px}.observatory-history__head p{max-width:760px}.observatory-history__head button{border:1px solid rgba(105,165,164,.3);background:rgba(105,165,164,.05);padding:10px 12px;color:#83b8b6;font:7px/1 ui-monospace,monospace;letter-spacing:.1em}.observatory-history__error,.observatory-history__empty{margin-top:14px;padding:12px;border:1px solid rgba(169,76,59,.3);color:#c98576;font:8px/1.4 ui-monospace,monospace}.observatory-history__metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(232,226,213,.1);border-left:1px solid rgba(232,226,213,.1);margin-top:18px}.observatory-history__metrics div{padding:12px;border-right:1px solid rgba(232,226,213,.1);border-bottom:1px solid rgba(232,226,213,.1);display:grid;gap:5px}.observatory-history__metrics strong{font:400 17px/1.1 Georgia,serif;color:#e2dbce}.observatory-history__metrics small{font:6px/1.2 ui-monospace,monospace;color:#6d685f}.observatory-history__scrub{margin-top:15px;padding:13px;border:1px solid rgba(105,165,164,.12)}.observatory-history__scrub>div{display:flex;justify-content:space-between;gap:12px;font:6px/1 ui-monospace,monospace;color:#6a665f}.observatory-history__scrub b{color:#69a5a4;font-weight:500}.observatory-history__scrub input{width:100%;margin-top:12px;accent-color:#69a5a4}.observatory-history__vectors{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(232,226,213,.08);margin-top:15px}.observatory-history__vectors article{min-width:0;padding:12px;background:#070908;display:grid;gap:7px}.observatory-history__vectors article[data-empty=true]{opacity:.42}.observatory-history__vectors strong{font:400 21px/1 Georgia,serif}.observatory-history__vectors i{height:2px;background:rgba(232,226,213,.08);overflow:hidden}.observatory-history__vectors i b{display:block;height:100%;background:#69a5a4}.observatory-history__vectors small{font:6px/1.3 ui-monospace,monospace;color:#6d685f}.observatory-history__limits{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:12px;color:#656159;font:6px/1.4 ui-monospace,monospace}@media(max-width:900px){.observatory-history__metrics{grid-template-columns:1fr 1fr}.observatory-history__vectors{grid-template-columns:1fr 1fr}.observatory-history__head{grid-template-columns:1fr}}@media(max-width:520px){.observatory-history__vectors{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
