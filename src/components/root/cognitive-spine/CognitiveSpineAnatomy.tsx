'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CognitiveSpinePark, type SfiParkFocus, type SfiParkState, type SfiParkZone } from '@/components/sfi/CognitiveSpinePark';

export type CognitiveSpineFocus = SfiParkFocus;
type Row = Record<string, any>;
type RootJob = 'daily' | 'reports' | 'audit' | 'all';
type Props = { enabled:boolean; canOperate:boolean; focusOptions:CognitiveSpineFocus[]; twinOpenCount:number };
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

function readArray(value:unknown):Row[]{ return Array.isArray(value)?value.filter((item)=>item&&typeof item==='object'):[]; }
function text(value:unknown,fallback='—'){ return typeof value==='string'&&value.trim()?value.trim():fallback; }
function agentState(value:unknown):SfiParkState{
  const state=String(value??'').toLowerCase();
  if(/missing|failed|blocked|critical|degraded|unavailable/.test(state))return'DEGRADED';
  if(/gated|queued|waiting|pending/.test(state))return'GATED';
  if(/operational|observed|accepted|recorded|connected|available|closed|completed/.test(state))return'READY';
  return'UNOBSERVED';
}

export function CognitiveSpineAnatomy({enabled,canOperate,focusOptions,twinOpenCount}:Props){
  const [spine,setSpine]=useState<Row|null>(null);
  const [runtime,setRuntime]=useState<Row|null>(null);
  const [logbook,setLogbook]=useState<Row[]>([]);
  const [focusId,setFocusId]=useState('');
  const [busy,setBusy]=useState<RootJob|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  useEffect(()=>{ if(focusOptions.length&&!focusOptions.some((item)=>item.id===focusId))setFocusId(focusOptions[0].id); },[focusOptions,focusId]);
  const focus=focusOptions.find((item)=>item.id===focusId)??focusOptions[0]??null;

  const pull=useCallback(async()=>{
    if(!enabled)return;
    try{
      const requests:Promise<Response>[]=[fetch('/api/root/cognitive-spine/status',{cache:'no-store'}),fetch('/api/root/cognitive-runtime',{cache:'no-store'})];
      if(canOperate)requests.push(fetch('/api/logbook/visible?role=root',{cache:'no-store'}));
      const responses=await Promise.all(requests); const json=await Promise.all(responses.map((r)=>r.json().catch(()=>null)));
      setSpine(responses[0].ok&&json[0]?.ok?json[0]:null); setRuntime(responses[1].ok&&json[1]?.ok?json[1]:null);
      setLogbook(canOperate&&responses[2]?.ok&&json[2]?.ok?readArray(json[2].entries):[]);
      const failures=responses.map((r,i)=>!r.ok?`${r.status}:${json[i]?.error??'read_failed'}`:null).filter(Boolean); setError(failures.length?failures.join(' · '):null);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
  },[enabled,canOperate]);
  useEffect(()=>{void pull();const timer=window.setInterval(()=>void pull(),30000);return()=>window.clearInterval(timer);},[pull]);

  const rt=runtime?.runtime??null; const agents=readArray(rt?.agents); const layers=readArray(rt?.layers); const events=readArray(rt?.eventGraph?.recentEvents); const status=spine?.status??{};
  const recentIds=useMemo(()=>{const cutoff=Date.now()-ACTIVITY_WINDOW_MS;return new Set(events.filter((e)=>e.eventName==='SFI_AGENT_EXECUTED'&&typeof e.occurredAt==='string'&&new Date(e.occurredAt).getTime()>=cutoff).map((e)=>String(e.sourceId??'')));},[events]);
  const agentsFor=(ids:string[],layerIds:string[]=[])=>agents.filter((a)=>ids.includes(String(a.id))||layerIds.includes(String(a.layer)));
  const zone=(id:string,label:string,detail:string,x:number,y:number,assigned:Row[],fallback:SfiParkState='UNOBSERVED',count?:number):SfiParkZone=>{
    const live=assigned.some((a)=>recentIds.has(String(a.id))); const states=assigned.map((a)=>agentState(a.status));
    const state:SfiParkState=live?'LIVE':states.includes('DEGRADED')?'DEGRADED':states.includes('GATED')?'GATED':states.includes('READY')?'READY':fallback;
    return{id,label,detail,x,y,state,live,count:count??assigned.length};
  };
  const verificationDebt=Number(status?.state?.verificationDebt??0);
  const worldspect=readArray(status?.surfaces).find((item)=>item.surface==='WORLDSPECT');
  const zones:SfiParkZone[]=[
    zone('observer','OBSERVER GATE','Institutional observation and reconstruction. LIVE means persisted agent execution, not registration.',18,19,agentsFor([],['observe','reconstruct'])),
    {...zone('memory','MEMORY BASIN','Sealed Cognitive Spine context: memory, decisions, contradictions and verification debt. Context is not evidence.',22,43,agentsFor(['historical_scout','context_builder','reality_calibration'])),state:!spine?'UNOBSERVED':!status?.available?'DEGRADED':verificationDebt>0?'ATTENTION':'READY',count:verificationDebt},
    zone('affective','AFFECTIVE LOOP','Maps the actual psychological simulator only. No phenomenal consciousness or emotion is claimed.',78,18,agentsFor(['psychological_simulator'])),
    {...zone('signal','SIGNAL MARSH','World/context posture after observation. Prior context never upgrades a new signal to evidence.',80,43,agentsFor(['field_observer','cultural_simulator'])),state:worldspect?.operationalCtConsumed===true?'READY':worldspect?'GATED':'UNOBSERVED'},
    zone('fragment','FRAGMENT DOCK','Governance, risk/opportunity and execution handoffs that still need integration or authority.',80,69,agentsFor([],['decide','act']),twinOpenCount>0?'ATTENTION':'READY',twinOpenCount),
    {...zone('core','COGNITIVE SPINE','Institutional sealed context + observed runtime. It has no truth or canon authority.',50,49,agents,rt?agentState(rt.status):'UNOBSERVED',agents.length),state:rt?agentState(rt.status):'UNOBSERVED'},
    zone('return','EXECUTION / RETURN','Project execution and reality calibration. Execution is not complete until an observed RETURN exists.',51,78,agentsFor([],['act','learn'])),
  ];

  const counts={total:agents.length,operational:agents.filter((a)=>a.status==='operational').length,gated:agents.filter((a)=>a.status==='gated').length,degraded:agents.filter((a)=>a.status==='degraded').length,missing:agents.filter((a)=>a.status==='missing').length};
  const run=async(job:RootJob)=>{if(!canOperate||busy)return;setBusy(job);setNotice(null);try{const r=await fetch(`/api/root/operational/trigger-observation?job=${job}`,{method:'POST'});const j=await r.json().catch(()=>null);if(!r.ok||j?.ok===false)throw new Error(`${r.status}: ${j?.error??'root_operation_failed'}`);setNotice(`${job.toUpperCase()} · RETURNED`);await pull();}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(null);}};

  const inspector=(selected:SfiParkZone)=>{
    const selectedAgents=selected.id==='observer'?agentsFor([],['observe','reconstruct']):selected.id==='memory'?agentsFor(['historical_scout','context_builder','reality_calibration']):selected.id==='affective'?agentsFor(['psychological_simulator']):selected.id==='signal'?agentsFor(['field_observer','cultural_simulator']):selected.id==='fragment'?agentsFor([],['decide','act']):selected.id==='return'?agentsFor([],['act','learn']):agents;
    return <><section><small>OBSERVED AGENTS</small><div className="sfiParkList">{selectedAgents.map((a)=><article key={a.id}><b>{text(a.id)}</b><span>{text(a.status)} · {text(a.layer)} · authority {text(a.authorityLevel)}</span><small>{recentIds.has(String(a.id))?'RECENT SFI_AGENT_EXECUTED':'NO RECENT EXECUTION OBSERVED'}</small></article>)}{!selectedAgents.length&&<p>No observed/registered agents mapped to this organ.</p>}</div></section>{selected.id==='memory'&&<section><small>SPINE</small><dl><div><dt>SNAPSHOT</dt><dd>{text(status?.snapshotId)}</dd></div><div><dt>HASH</dt><dd>{text(status?.snapshotHash)}</dd></div><div><dt>VERIFICATION DEBT</dt><dd>{verificationDebt}</dd></div></dl></section>}{selected.id==='fragment'&&canOperate&&<section><small>ROOT LOGBOOK</small><div className="sfiParkList">{logbook.slice(0,8).map((entry)=><article key={entry.id}><b>{text(entry.title)}</b><span>{text(entry.event_type)} · {text(entry.created_at)}</span><small>{text(entry.summary)}</small></article>)}</div></section>}</>;
  };
  const toolbar=canOperate?<><button disabled={!!busy} onClick={()=>void run('daily')}>OBSERVE + INSTITUTIONAL CYCLE</button><button disabled={!!busy} onClick={()=>void run('reports')}>GENERATE INSTITUTIONAL REPORTS</button><button disabled={!!busy} onClick={()=>void run('audit')}>PERSISTENCE AUDIT</button><button disabled={!!busy} onClick={()=>void run('all')}>FULL INTERNAL CYCLE</button>{notice&&<p className="sfiParkNotice">{notice}</p>}{error&&<p className="sfiParkNotice sfiParkError">DEGRADED · {error}</p>}</>:<p className="sfiParkNotice">OBSERVATIONAL AUTHORITY ONLY · no sovereign operation controls.</p>;

  return <CognitiveSpinePark enabled={enabled} mode="institutional" title="COGNITIVE SPINE / TWIN" subtitle="SFI institutional operating observatory · ROOT canon remains separate" focus={focus} focusOptions={focusOptions} onFocusChange={setFocusId} zones={zones} stats={[{label:'AGENTS',value:rt?`${counts.operational}/${counts.total}`:'UNOBSERVED',state:rt?'READY':'UNOBSERVED'},{label:'GATED',value:counts.gated,state:counts.gated?'ATTENTION':'READY'},{label:'DEGRADED',value:counts.degraded+counts.missing,state:counts.degraded+counts.missing?'DEGRADED':'READY'},{label:'TWIN/CYCLES',value:twinOpenCount,state:twinOpenCount?'ATTENTION':'READY'}]} toolbar={toolbar} inspector={inspector} footer={<>OBSERVE <i>→</i> DIAGNOSE <i>→</i> PROPOSE <i>→</i> ROOT WHEN REQUIRED <i>→</i> EXECUTE <i>→</i> RETURN <i>→</i> CALIBRATE <i>→</i> <b>CANON ONLY BY ROOT</b></>}/>;
}
