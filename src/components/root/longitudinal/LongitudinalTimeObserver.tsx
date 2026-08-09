'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type LanePoint = Row & { date?: string | null };

function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function text(value: unknown, fallback = 'MISSING') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function num(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
function fmt(value: unknown, digits = 3) { const parsed = num(value); return parsed === null ? 'MISSING' : parsed.toFixed(digits); }
function pct(value: unknown) { const parsed = num(value); return parsed === null ? 'MISSING' : `${Math.round(Math.max(0, Math.min(1, parsed)) * 1000) / 10}%`; }
function when(value: unknown) { if (typeof value !== 'string') return 'SIN FECHA'; const date = new Date(value); return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(date) : value; }

export function LongitudinalTimeObserver() {
  const [data, setData] = useState<Row | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(date?: string | null) {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/root/longitudinal${date ? `?date=${encodeURIComponent(date)}` : ''}`, { credentials:'include', cache:'no-store' });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.error, `HTTP ${response.status}`));
      setData(body);
      setSelectedDate(text(body.selectedDate, '') || null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible leer la trayectoria.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const lanes = rec(data?.lanes);
  const sfi = rows(lanes.sfi) as LanePoint[];
  const world = rows(lanes.world) as LanePoint[];
  const dates = Array.isArray(data?.availableDates) ? data.availableDates.filter((item): item is string => typeof item === 'string') : [];
  const detail = rec(data?.detail);
  const sfiByDate = useMemo(() => new Map(sfi.map((point) => [point.date, point])), [sfi]);
  const worldByDate = useMemo(() => new Map(world.map((point) => [point.date, point])), [world]);

  return <main className="lto-root">
    <header className="lto-head"><div><span>SFI · ROOT · MEMORY</span><h1>LONGITUDINAL TIME OBSERVER</h1><p>Recrea el estado de SFI y WorldSpect/World Vector por fecha. No rellena días sin snapshot y no trata reconstrucción como observación nueva.</p></div><div><Link href="/root">VOLVER A ROOT</Link><button type="button" onClick={() => void load(selectedDate)}>{loading ? 'LEYENDO…' : 'ACTUALIZAR'}</button></div></header>
    {error ? <div className="lto-error">{error}</div> : null}

    <section className="lto-timeline">
      <div className="lto-axis" style={{gridTemplateColumns:`repeat(${Math.max(1,dates.length)},minmax(86px,1fr))`}}>{dates.map((date) => <button key={date} type="button" className={selectedDate===date?'active':''} onClick={() => void load(date)}>{date}</button>)}</div>
      <div className="lto-lane"><label>SFI</label><div className="lto-track" style={{gridTemplateColumns:`repeat(${Math.max(1,dates.length)},minmax(86px,1fr))`}}>{dates.map((date) => { const point=sfiByDate.get(date); return <button key={date} type="button" className={point?'has-point':'missing'} onClick={() => void load(date)} title={point?`ΦSFI ${fmt(point.phi)} · ${text(point.regime)}`:'Sin snapshot SFI'}>{point?<><i/><strong>{fmt(point.phi)}</strong><small>{text(point.regime)}</small></>:<span>—</span>}</button>; })}</div></div>
      <div className="lto-lane world"><label>WORLD</label><div className="lto-track" style={{gridTemplateColumns:`repeat(${Math.max(1,dates.length)},minmax(86px,1fr))`}}>{dates.map((date) => { const point=worldByDate.get(date); return <button key={date} type="button" className={point?'has-point':'missing'} onClick={() => void load(date)} title={point?`WSI ${fmt(point.wsi)} · NTI ${fmt(point.nti)}`:'Sin snapshot WorldSpect'}>{point?<><i/><strong>{fmt(point.wsi)}</strong><small>NTI {fmt(point.nti)}</small></>:<span>—</span>}</button>; })}</div></div>
    </section>

    {selectedDate ? <section className="lto-detail"><header><span>RECONSTRUCCIÓN DEL CORTE</span><h2>{selectedDate}</h2></header>
      <div className="lto-columns">
        <article><h3>SFI · ESTADO INSTITUCIONAL</h3>{rows(detail.sfi).length?rows(detail.sfi).map((point)=><div className="lto-card" key={text(point.id)}><div><span>ΦSFI</span><strong>{fmt(point.phi)}</strong></div><dl><Row label="IHG" value={fmt(point.ihg)}/><Row label="NTI" value={fmt(point.nti)}/><Row label="LDI" value={fmt(point.ldi)}/><Row label="F_S" value={fmt(point.fs)}/><Row label="RÉGIMEN" value={text(point.regime)}/><Row label="FUENTE" value={text(point.sourceStatus)}/><Row label="CAPTURA" value={when(point.at)}/></dl><small>{text(point.formulaBoundary)}</small></div>):<p className="lto-empty">MISSING · no existe snapshot institucional para este día.</p>}</article>
        <article><h3>WORLD SPECT / VECTOR</h3>{rows(detail.world).length?rows(detail.world).map((point)=><div className="lto-card world" key={text(point.id)}><div><span>WSI</span><strong>{fmt(point.wsi)}</strong></div><dl><Row label="NTI" value={fmt(point.nti)}/><Row label="CONFIANZA" value={pct(point.confidence)}/><Row label="SOURCE STATE" value={text(point.sourceState)}/><Row label="ADAPTER" value={text(point.adapterStatus)}/><Row label="CAPTURA" value={when(point.at)}/></dl><details><summary>FIELD STATE SIGNAL</summary><pre>{JSON.stringify(point.fieldStateSignal??{},null,2)}</pre></details></div>):<p className="lto-empty">MISSING · no existe snapshot WorldSpect para este día.</p>}</article>
      </div>

      <div className="lto-events">
        <EventGroup title="HIPÓTESIS GENERADAS" items={rows(detail.predictions)} render={(item)=><><b>{text(item.prediction)}</b><span>{pct(item.confidence)} · {text(item.status)} · {when(item.created_at)}</span><small>{text(item.interpretation,'Sin interpretación persistida.')}</small></>}/>
        <EventGroup title="OUTCOMES" items={rows(detail.outcomes)} render={(item)=><><b>{text(item.evaluation_state)}</b><span>{text(item.actual_value)} · {when(item.observed_at)}</span><small>{text(item.source_type)} · {text(item.source_quality)}</small></>}/>
        <EventGroup title="EVENTOS EPISTÉMICOS" items={rows(detail.epistemicEvents)} render={(item)=><><b>{text(item.event_name)}</b><span>{text(item.epistemic_class)} · {when(item.occurred_at)}</span><small>{text(rec(item.source).sourceId,text(rec(item.source).sourceType))}</small></>}/>
        <EventGroup title="EVIDENCIA INGRESADA" items={rows(detail.evidence)} render={(item)=><><b>{text(item.title)}</b><span>{text(item.evidence_type)} · {when(item.created_at)}</span><small>{text(item.content)}</small></>}/>
      </div>
    </section> : null}

    <style jsx>{`
      .lto-root{min-height:100vh;background:#050504;color:#c9c1b0;padding:26px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.lto-head{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid rgba(200,169,81,.16);padding-bottom:20px}.lto-head span,.lto-detail>header span{font-size:8px;letter-spacing:.17em;color:#8e7a4d}.lto-head h1{margin:6px 0 7px;color:#e1cf9f;font:400 30px Georgia,serif}.lto-head p{max-width:900px;margin:0;color:#81796c;font:13px/1.65 Georgia,serif}.lto-head>div:last-child{display:flex;gap:8px;align-items:flex-start}.lto-head a,.lto-head button{border:1px solid rgba(200,169,81,.22);background:transparent;color:#b9a260;text-decoration:none;padding:8px 10px;font:8px inherit}.lto-error{margin-top:12px;border-left:2px solid #a95f4c;padding:8px 10px;color:#c18c77;font-size:9px}.lto-timeline{margin-top:22px;border:1px solid rgba(200,169,81,.1);overflow:auto;background:#080807;min-height:240px}.lto-axis{display:grid;margin-left:74px;min-width:max-content;border-bottom:1px solid rgba(200,169,81,.07)}.lto-axis button{border:0;border-left:1px solid rgba(200,169,81,.05);background:transparent;color:#514d45;padding:8px 4px;font:7px inherit}.lto-axis button.active{color:#d1b86f;background:rgba(200,169,81,.04)}.lto-lane{display:grid;grid-template-columns:74px 1fr;min-width:max-content;border-bottom:1px solid rgba(255,255,255,.04)}.lto-lane>label{display:flex;align-items:center;padding:12px;color:#8e7a4d;font-size:9px;letter-spacing:.12em;border-right:1px solid rgba(200,169,81,.08)}.lto-lane.world>label{color:#688b70}.lto-track{display:grid}.lto-track button{position:relative;min-height:82px;border:0;border-left:1px solid rgba(200,169,81,.05);background:transparent;color:#6e685e;font:8px inherit;display:grid;place-content:center;gap:5px}.lto-track button.has-point:hover{background:rgba(200,169,81,.04)}.lto-track button i{display:block;width:9px;height:9px;border:2px solid #b99c50;background:#473b21;margin:auto;transform:rotate(45deg)}.lto-lane.world .lto-track button i{border-color:#71a179;background:#263d2a}.lto-track button strong{color:#d1ba76;font-size:12px}.lto-lane.world .lto-track button strong{color:#8fbd96}.lto-track button small{color:#5f594e;font-size:7px}.lto-track button.missing{opacity:.32}.lto-detail{margin-top:20px}.lto-detail>header{border-bottom:1px solid rgba(200,169,81,.1);padding-bottom:12px}.lto-detail h2{margin:5px 0 0;color:#d9c38a;font:400 24px Georgia,serif}.lto-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.lto-columns>article{border:1px solid rgba(200,169,81,.1);padding:14px;background:#080807}.lto-columns h3,.lto-events h3{margin:0 0 10px;color:#8e7a4d;font-size:9px;letter-spacing:.12em}.lto-card>div:first-child{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid rgba(200,169,81,.08);padding-bottom:10px}.lto-card>div:first-child span{font-size:8px;color:#746344}.lto-card>div:first-child strong{font-size:25px;color:#d5bc76}.lto-card.world>div:first-child strong{color:#85b18d}.lto-card dl{display:grid;gap:0;margin:9px 0}.lto-card small{color:#5f594e;font-size:7px;line-height:1.5}.lto-card details{margin-top:9px}.lto-card summary{font-size:7px;color:#6a7e6e;cursor:pointer}.lto-card pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#68645b;font-size:7px}.lto-empty{color:#625d54;font:italic 11px Georgia,serif}.lto-events{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}.lto-group{border:1px solid rgba(200,169,81,.08);padding:13px;background:#070706}.lto-group article{display:grid;gap:4px;border-top:1px solid rgba(255,255,255,.04);padding:9px 0}.lto-group article b{color:#b8a77d;font:11px/1.45 Georgia,serif}.lto-group article span{color:#756e62;font-size:8px}.lto-group article small{color:#57534b;font-size:8px;line-height:1.45}@media(max-width:850px){.lto-root{padding:15px}.lto-head{display:grid}.lto-columns,.lto-events{grid-template-columns:1fr}}
    `}</style>
  </main>;
}

function Row({label,value}:{label:string;value:string}){return <div style={{display:'grid',gridTemplateColumns:'130px 1fr',gap:10,borderBottom:'1px solid rgba(255,255,255,.035)',padding:'6px 0'}}><dt style={{color:'#5d584e',fontSize:7}}>{label}</dt><dd style={{margin:0,color:'#9f9581',fontSize:8}}>{value}</dd></div>}
function EventGroup({title,items,render}:{title:string;items:Row[];render:(item:Row)=>React.ReactNode}){return <section className="lto-group"><h3>{title} · {items.length}</h3>{items.length?items.map((item,index)=><article key={text(item.id,String(index))}>{render(item)}</article>):<p className="lto-empty">Sin registros para este corte.</p>}</section>}
