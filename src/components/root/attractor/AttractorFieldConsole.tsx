'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Row = Record<string, unknown>;
type State = { attractor: Row | null; latestTrajectory: Row | null; phenomenonTrajectory: Row[]; warnings: string[] };

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; }
function num(value: unknown) { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? n : null; }
function hashSeed(value: string) { let h = 2166136261; for (let i=0;i<value.length;i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h >>> 0); }

export function AttractorFieldConsole({ state, experiment, canEdit }: { state: State; experiment: Row | null; canEdit: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const vector = record(state.attractor?.vector);
  const trajectory = record(state.latestTrajectory);
  const dimensions = record(trajectory.dimension_state);
  const coverage = num(trajectory.evidence_coverage);
  const label = String(state.attractor?.label ?? 'SIN ATRACTOR DECLARADO');
  const desiredState = String(vector.desiredState ?? 'No existe una dirección institucional declarada en runtime.');
  const mode = String(experiment?.operating_mode ?? 'MISSING');
  const experimentStatus = String(experiment?.status ?? 'MISSING');

  const orbit = useMemo(() => Object.entries(dimensions).map(([key, raw], index) => {
    const item = record(raw); const status = String(item.status ?? 'MISSING_EVIDENCE');
    return { key, status, observed: num(item.observedCount) ?? 0, contradictions: num(item.contradictionCount) ?? 0, refs: strings(item.evidenceRefs), index };
  }), [dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let frame = 0; let raf = 0;
    const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); const r = canvas.getBoundingClientRect(); canvas.width = Math.floor(r.width*dpr); canvas.height = Math.floor(r.height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      frame += .012;
      const w = canvas.clientWidth, h = canvas.clientHeight, cx=w/2, cy=h/2, base=Math.min(w,h), coreR=base*.31;
      ctx.fillStyle='#030303'; ctx.fillRect(0,0,w,h);
      ctx.lineWidth=.45;
      const grid=42;
      for(let x=-grid;x<w+grid;x+=grid){ ctx.beginPath(); for(let y=0;y<=h;y+=12){ const dx=x-cx,dy=y-cy,d=Math.max(1,Math.hypot(dx,dy)); const outside=Math.max(0,(d-coreR)/Math.max(1,base*.5)); const wave=Math.sin(d*.024-frame*2.1+x*.004)*10*outside; const xx=x+(dx/d)*wave; const yy=y+(dy/d)*wave; y===0?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);} ctx.strokeStyle='rgba(212,175,125,.055)'; ctx.stroke(); }
      for(let y=-grid;y<h+grid;y+=grid){ ctx.beginPath(); for(let x=0;x<=w;x+=12){ const dx=x-cx,dy=y-cy,d=Math.max(1,Math.hypot(dx,dy)); const outside=Math.max(0,(d-coreR)/Math.max(1,base*.5)); const wave=Math.sin(d*.022-frame*1.8+y*.004)*10*outside; const xx=x+(dx/d)*wave; const yy=y+(dy/d)*wave; x===0?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);} ctx.strokeStyle='rgba(212,175,125,.045)'; ctx.stroke(); }

      for(let i=0;i<160;i++){ const seed=hashSeed(`field-${i}`); const a=(seed%6283)/1000+frame*((seed%7)+1)*.001; const r=18+((seed>>>3)%1000)/1000*(coreR-24); const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; ctx.fillStyle=`rgba(212,175,125,${.08+((seed%100)/100)*.22})`; ctx.beginPath(); ctx.arc(x,y,.35+(seed%11)/10,0,Math.PI*2); ctx.fill(); }

      ctx.strokeStyle='rgba(212,175,125,.09)'; [coreR*.33,coreR*.66,coreR].forEach(r=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();});
      orbit.forEach((node,i)=>{
        const seed=hashSeed(node.key); const angle=(Math.PI*2*i/Math.max(1,orbit.length))+frame*(.15+(seed%10)/100); const r=coreR+48+(seed%95); const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
        const missing=node.status==='MISSING_EVIDENCE', contradicted=node.status==='CONTRADICTED'||node.status==='CONFLICTED';
        ctx.strokeStyle=missing?'rgba(120,110,90,.22)':contradicted?'rgba(255,157,92,.75)':'rgba(255,225,170,.72)'; ctx.fillStyle=missing?'rgba(80,75,65,.12)':contradicted?'rgba(255,157,92,.18)':'rgba(212,175,125,.16)'; ctx.lineWidth=node.key===selected?1.6:.7;
        ctx.beginPath(); const sides=6, size=node.key===selected?9:6; for(let s=0;s<sides;s++){const aa=Math.PI*2*s/sides; const px=x+Math.cos(aa)*size,py=y+Math.sin(aa)*size; s?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='rgba(220,203,166,.55)';ctx.font='8px ui-monospace';ctx.fillText(node.key,x+10,y+3);
      });
      state.phenomenonTrajectory.slice(0,18).forEach((p,i)=>{ const key=String(p.phenomenon_key??`p-${i}`); const seed=hashSeed(key); const a=(seed%6283)/1000-frame*(.018+(seed%8)/1000); const r=coreR+150+(seed%150); const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r; ctx.fillStyle='rgba(212,175,125,.25)';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill(); });
      const pulse=18+Math.sin(frame*5)*2; const g=ctx.createRadialGradient(cx,cy,1,cx,cy,pulse*2.4);g.addColorStop(0,'rgba(255,245,220,1)');g.addColorStop(.25,'rgba(215,160,100,.35)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,pulse*2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0cc';ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fill();
      raf=requestAnimationFrame(draw);
    };
    draw(); return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};
  }, [orbit, selected, state.phenomenonTrajectory]);

  const selectedDimension = selected ? record(dimensions[selected]) : null;

  async function patch(body: Row) {
    setSaving(true); setMessage(null);
    try { const res=await fetch('/api/root/attractor',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const data=await res.json(); if(!res.ok||!data.ok) throw new Error(data.error||`HTTP ${res.status}`); setMessage('Guardado. Recarga para leer el estado persistido.'); }
    catch(e){setMessage(e instanceof Error?e.message:'No fue posible guardar.');} finally{setSaving(false);}
  }

  return <main className="af-root">
    <section className="af-field">
      <canvas ref={canvasRef} className="af-canvas" />
      <div className="af-axis top">OBSERVATORIO<br/>LONGITUDINAL<br/>SISTÉMICO</div><div className="af-axis bottom">W SPECT<br/>//<br/>ESPECTRO DE POSIBILIDADES</div><div className="af-axis left">ATLAS<br/>//<br/>CARTOGRAFÍA DEL CAMPO</div><div className="af-axis right">MIHM<br/>//<br/>MEMORIA INMATERIAL</div>
      <button className="af-core-hit" aria-label="Abrir atractor central" onClick={()=>setSelected('__core__')} />
      {orbit.map((n,i)=><button key={n.key} className="af-orbit-hit" style={{'--i':i,'--n':Math.max(1,orbit.length)} as React.CSSProperties} onClick={()=>setSelected(n.key)} aria-label={`Abrir ${n.key}`} />)}
      <div className="af-status"><span>SFI ATTRACTOR</span><strong>{label}</strong><em>{state.attractor?'DECLARED':'MISSING'}</em></div>
      <div className="af-mode"><span>30D MODE</span><strong>{mode}</strong><em>{experimentStatus}</em></div>

      {selected==='__core__' ? <aside className="af-hud core"><div className="af-hud-title">NÚCLEO ATRACTOR // INSTITUCIONAL</div><p>{desiredState}</p><dl><div><dt>COBERTURA DE EVIDENCIA</dt><dd>{coverage===null?'MISSING':`${Math.round(coverage*100)}%`}</dd></div><div><dt>DIMENSIONES</dt><dd>{orbit.length||'MISSING'}</dd></div><div><dt>FENÓMENOS</dt><dd>{state.phenomenonTrajectory.length}</dd></div><div><dt>CLASE</dt><dd>DECLARED</dd></div></dl>{canEdit?<button onClick={()=>setEditing(true)}>EDITAR DECLARACIÓN</button>:<small>READ ONLY · OBSERVER</small>}</aside>:null}
      {selectedDimension && selected!=='__core__' ? <aside className="af-hud evidence"><div className="af-hud-title">DIMENSIÓN // {selected}</div><dl><div><dt>ESTADO</dt><dd>{String(selectedDimension.status??'MISSING')}</dd></div><div><dt>SOPORTE</dt><dd>{String(selectedDimension.observedCount??0)}</dd></div><div><dt>CONTRADICCIONES</dt><dd>{String(selectedDimension.contradictionCount??0)}</dd></div><div><dt>EVIDENCE REFS</dt><dd>{strings(selectedDimension.evidenceRefs).length}</dd></div><div><dt>ATTAINMENT</dt><dd>{String(selectedDimension.attainment??'UNRESOLVED')}</dd></div></dl><p>{String(selectedDimension.explanation??'')}</p></aside>:null}
    </section>

    <section className="af-control">
      <div><span>EXPERIMENTO</span><strong>{String(experiment?.label??'MISSING · aplica la migración del experimento')}</strong><p>{String(experiment?.founder_escalation_policy??'No existe política persistida.')}</p></div>
      <div className="af-actions">{canEdit?<><button disabled={saving||!experiment} onClick={()=>patch({action:'set_experiment_mode',status:'ACTIVE'})}>ACTIVAR MODO SIN FUNDADOR</button><button disabled={saving||!experiment} onClick={()=>patch({action:'set_experiment_mode',status:'PAUSED'})}>PAUSAR</button><button disabled={saving||!experiment} onClick={()=>patch({action:'set_experiment_mode',status:'COMPLETED'})}>CERRAR 30D</button></>:<span>OBSERVER · SIN AUTORIDAD DE ACTIVACIÓN</span>}</div>
      {message?<p className="af-message">{message}</p>:null}
    </section>

    {editing && canEdit ? <div className="af-modal"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void patch({action:'update_attractor',label:f.get('label'),desiredState:f.get('desiredState'),mechanism:f.get('mechanism'),normativePosition:f.get('normativePosition'),claimBoundary:f.get('claimBoundary')});setEditing(false);}}><span>DECLARED · FOUNDER AUTHORITY</span><h2>Editar atractor institucional</h2><label>Etiqueta<input name="label" defaultValue={label}/></label><label>Estado deseado<textarea name="desiredState" defaultValue={desiredState} required/></label><label>Mecanismo<textarea name="mechanism" defaultValue={String(vector.mechanism??'')}/></label><label>Posición normativa<textarea name="normativePosition" defaultValue={String(vector.normativePosition??'')}/></label><label>Límite de afirmación<textarea name="claimBoundary" defaultValue={String(vector.claimBoundary??'')}/></label><div><button type="button" onClick={()=>setEditing(false)}>CANCELAR</button><button disabled={saving}>GUARDAR DECLARACIÓN</button></div></form></div>:null}

    <style jsx>{`
      .af-root{min-height:100vh;background:#030303;color:#d8c7a1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.af-field{position:relative;height:min(78vh,880px);min-height:620px;overflow:hidden;border-bottom:1px solid rgba(212,175,125,.24)}.af-canvas{width:100%;height:100%;display:block}.af-axis{position:absolute;color:rgba(212,175,125,.28);font-size:9px;letter-spacing:.18em;line-height:1.5;pointer-events:none}.top{top:24px;left:50%;transform:translateX(-50%);text-align:center}.bottom{bottom:22px;left:50%;transform:translateX(-50%);text-align:center}.left{left:22px;top:50%;transform:translateY(-50%)}.right{right:22px;top:50%;transform:translateY(-50%);text-align:right}.af-status,.af-mode{position:absolute;top:18px;border:1px solid rgba(212,175,125,.22);background:rgba(0,0,0,.78);padding:10px 12px;display:grid;gap:3px;font-size:8px;letter-spacing:.12em}.af-status{left:18px}.af-mode{right:18px;text-align:right}.af-status strong,.af-mode strong{font-size:10px;color:#f4e6c4}.af-status em,.af-mode em{color:#a68d56;font-style:normal}.af-core-hit{position:absolute;width:64px;height:64px;border:0;background:transparent;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%);cursor:pointer}.af-orbit-hit{display:none}.af-hud{position:absolute;width:min(360px,calc(100vw - 36px));background:rgba(0,0,0,.94);border:1px solid rgba(212,175,125,.4);padding:14px;font-size:10px;line-height:1.6;box-shadow:0 0 24px #000}.af-hud.core{bottom:6%;left:4%}.af-hud.evidence{bottom:6%;right:4%}.af-hud-title{color:#fff;border-bottom:1px dashed rgba(212,175,125,.3);padding-bottom:7px;margin-bottom:8px;letter-spacing:.12em}.af-hud dl{display:grid;gap:4px}.af-hud dl div{display:flex;justify-content:space-between;gap:14px}.af-hud dt{color:#8e7a50}.af-hud dd{margin:0;color:#f4dfb3;text-align:right}.af-hud p{color:#958a75}.af-hud button,.af-actions button,.af-modal button{border:1px solid rgba(212,175,125,.45);background:transparent;color:#f5e6c5;padding:8px 11px;font:inherit;cursor:pointer}.af-control{display:grid;grid-template-columns:1fr auto;gap:24px;padding:22px 28px;background:#080807;border-bottom:1px solid #272116}.af-control span{font-size:8px;letter-spacing:.15em;color:#9d8654}.af-control strong{display:block;margin:6px 0;color:#ead8ae}.af-control p{max-width:900px;color:#8f8778;font-size:10px;line-height:1.6}.af-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.af-actions button:disabled{opacity:.35;cursor:not-allowed}.af-message{grid-column:1/-1;color:#d0b36f!important}.af-modal{position:fixed;inset:0;z-index:1000;background:#000;overflow:auto;padding:6vh 10vw}.af-modal form{max-width:860px;margin:auto}.af-modal span{font-size:9px;color:#9c8451;letter-spacing:.16em}.af-modal h2{font:400 28px Georgia,serif;color:#f5e6c5}.af-modal label{display:grid;gap:7px;margin:18px 0;font-size:9px;letter-spacing:.12em}.af-modal input,.af-modal textarea{background:#080807;color:#e9ddc1;border:1px solid #3b3221;padding:12px;font:12px/1.6 ui-monospace;min-height:42px}.af-modal textarea{min-height:105px}.af-modal form>div{display:flex;gap:8px;justify-content:flex-end}@media(max-width:800px){.af-field{min-height:700px}.af-control{grid-template-columns:1fr}.af-hud.core,.af-hud.evidence{left:18px;right:18px;bottom:18px;width:auto}.left,.right{display:none}}
    `}</style>
  </main>;
}
