'use client';

import { useMemo, useState } from 'react';
import './MethodLabPanorama.css';

type ProtocolView={
  id:string; name:string; purpose:string; status:string; epistemicClass:string;
  runCount:number; lastRunAt:string|null; lastValidationLevel:string|null;
};
type SessionView={
  id:string; sessionKey:string; title:string; status:string;
  condition:string; startedAt:string|null; endedAt:string|null; eventCount:number; analysisCount:number;
};
type DecisionTransferView={
  status:string; totalEvaluations:number; passCount:number; failCount:number; blockedCount:number;
};
type PhaseKey='PROTOCOLS'|'EVIDENCE'|'RUNS'|'BLIND'|'CONTRAST';
const phaseKeys:PhaseKey[]=['PROTOCOLS','EVIDENCE','RUNS','BLIND','CONTRAST'];
const jump:Record<PhaseKey,string>={
  PROTOCOLS:'#mlh-instruments', EVIDENCE:'#mlh-simulation',
  RUNS:'#mlh-simulation', BLIND:'#mlh-sessions', CONTRAST:'#mlh-sessions',
};
function time(value:string|null){
  if(!value)return 'NOT RECORDED';
  const date=new Date(value);
  return Number.isFinite(date.valueOf())?new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric'}).format(date):'UNREADABLE DATE';
}

export function MethodLabPanorama({
  protocols,sessions,evidenceCount,decisionTransfer,status,generatedAt,
}:{
  protocols:readonly ProtocolView[];
  sessions:readonly SessionView[];
  evidenceCount:number;
  decisionTransfer:DecisionTransferView;
  status:string;
  generatedAt:string;
}){
  const [focus,setFocus]=useState<PhaseKey>('PROTOCOLS');
  const [selectedProtocol,setSelectedProtocol]=useState<string|null>(null);
  const totalRuns=protocols.reduce((total,protocol)=>total+Math.max(0,protocol.runCount),0);
  const operational=protocols.filter(protocol=>protocol.status==='OPERATIONAL').length;
  const gated=protocols.filter(protocol=>protocol.status==='GATED').length;
  const unresolved=sessions.filter(session=>!['CLOSED','REJECTED'].includes(session.status)).length;
  const blindReady=sessions.filter(session=>session.status==='READY_FOR_BLIND').length;
  const blindComplete=sessions.filter(session=>['BLIND_COMPLETE','CONTRAST_PENDING'].includes(session.status)).length;
  const temporal=useMemo(()=>sessions.filter(session=>session.startedAt&&Number.isFinite(Date.parse(session.startedAt))).slice().sort((a,b)=>Date.parse(a.startedAt!)-Date.parse(b.startedAt!)).slice(-8),[sessions]);
  const chosenProtocol=protocols.find(protocol=>protocol.id===selectedProtocol)??protocols[0]??null;
  const values:Record<PhaseKey,string>={
    PROTOCOLS:String(protocols.length), EVIDENCE:String(evidenceCount),
    RUNS:String(totalRuns), BLIND:String(blindComplete), CONTRAST:String(decisionTransfer.totalEvaluations),
  };
  const detail:Record<PhaseKey,string>={
    PROTOCOLS:'Registered methods, with availability and scope preserved',
    EVIDENCE:'Identifiable persisted evidence references available to the current reader',
    RUNS:'Sum of run counts declared by the registered protocols',
    BLIND:'Sessions currently recorded at BLIND_COMPLETE or CONTRAST_PENDING',
    CONTRAST:'Recorded decision-transfer evaluations; not a real-world RETURN',
  };

  return <section className="mlp-shell" aria-label="Operational Method Lab panoramic instrument" data-sfi-instrument="METHOD-LAB-LIVE-1.0">
    <div className="mlp-atmosphere" aria-hidden="true"/>
    <header className="mlp-heading">
      <div><small>SFI / OPERATIVE INSTRUMENT</small><h1>METHOD LAB</h1><p>SCIENCE <span>×</span> FORESIGHT <span>×</span> INTELLIGENCE</p></div>
      <div className="mlp-status"><i data-status={status}/><span>INSTITUTIONAL READ</span><strong>{status}</strong><small>LAST READ · {time(generatedAt)}</small></div>
    </header>
    <div className="mlp-viewport">
      <aside className="mlp-library">
        <div className="mlp-panel-head"><span>METHOD FAMILIES</span><small>{protocols.length} REGISTERED</small></div>
        {protocols.length?protocols.map(protocol=><button key={protocol.id} type="button"
          className={selectedProtocol===protocol.id?'mlp-selected':''}
          onClick={()=>{setSelectedProtocol(protocol.id);setFocus('PROTOCOLS')}}>
          <i data-status={protocol.status}/><span>{protocol.name}</span><small>{protocol.status}</small>
        </button>):<p className="mlp-empty">NO REGISTERED PROTOCOLS IN THIS READ</p>}
        <a href="#mlh-instruments" className="mlp-link">OPEN PROTOCOL REGISTRY <span>↗</span></a>
      </aside>

      <div className="mlp-process" aria-label="Governed laboratory stages">
        <div className="mlp-process-top"><span>ACTIVE ORCHESTRATION</span><b>REGISTER → TEST → CONTRAST</b></div>
        <div className="mlp-process-connection" aria-hidden="true"/>
        <div className="mlp-phases">
          {phaseKeys.map((phase,index)=><button key={phase} type="button" className={phase===focus?'mlp-phase-active':''}
            onClick={()=>setFocus(phase)} aria-pressed={phase===focus}>
            <small>0{index+1}</small><span>{phase}</span><strong>{values[phase]}</strong><em>{index===0?'REGISTRY':index===1?'PERSISTED REFERENCES':index===2?'REPORTED RUNS':index===3?'SESSION STATE':'EVALUATIONS'}</em>
          </button>)}
        </div>
        <div className="mlp-inspection">
          <span className="mlp-eyebrow">CURRENT INSPECTION / {focus}</span>
          {focus==='PROTOCOLS'&&chosenProtocol?<><h2>{chosenProtocol.name}</h2><p>{chosenProtocol.purpose}</p>
            <dl><div><dt>STATE</dt><dd>{chosenProtocol.status}</dd></div><div><dt>CLASS</dt><dd>{chosenProtocol.epistemicClass}</dd></div><div><dt>RUNS</dt><dd>{chosenProtocol.runCount}</dd></div><div><dt>VALIDATION</dt><dd>{chosenProtocol.lastValidationLevel??'NOT OBSERVED'}</dd></div></dl></>
            :<><h2>{focus==='PROTOCOLS'?'NO REGISTERED PROTOCOL':focus}</h2><p>{detail[focus]}</p>
              <div className="mlp-primary-value">{values[focus]} <small>{focus==='EVIDENCE'?'REFERENCES':focus==='RUNS'?'REPORTED EXECUTIONS':focus==='BLIND'?'QUALIFYING SESSION STATES':focus==='CONTRAST'?'EVALUATIONS':'REGISTERED'}</small></div></>}
          <a href={jump[focus]} className="mlp-enter">OPEN WORKSPACE <span>↗</span></a>
        </div>
        <div className="mlp-process-boundary">SIMULATION ≠ OBSERVATION <span>·</span> APPROVAL ≠ AUTHORITY <span>·</span> EXECUTION ≠ RETURN</div>
      </div>

      <aside className="mlp-runtime">
        <div className="mlp-panel-head"><span>RUN / GOVERNANCE</span><small>{status}</small></div>
        <dl><div><dt>OPERATIONAL PROTOCOLS</dt><dd>{operational}</dd></div>
          <div><dt>GATED PROTOCOLS</dt><dd>{gated}</dd></div>
          <div><dt>OPEN SESSIONS</dt><dd>{unresolved}</dd></div>
          <div><dt>READY FOR BLIND</dt><dd>{blindReady}</dd></div>
          <div><dt>DT PASS / FAIL / BLOCKED</dt><dd>{decisionTransfer.passCount} / {decisionTransfer.failCount} / {decisionTransfer.blockedCount}</dd></div></dl>
        <div className="mlp-runtime-subtitle">RECENT RECORDED SESSIONS</div>
        {sessions.length?sessions.slice(0,5).map(session=><a key={session.id} href={'#mlh-session-'+session.id} className="mlp-session">
          <span>{session.sessionKey||session.id}</span><b>{session.title}</b><small>{session.status} · {session.eventCount} EVENTS</small></a>):<p className="mlp-empty">NO PERSISTED SESSIONS RETURNED</p>}
        <a href="#mlh-sessions" className="mlp-link">INSPECT SESSION RECORDS <span>↗</span></a>
      </aside>
    </div>
    <footer className="mlp-timeline" aria-label="Recorded session timeline">
      <div><span>RUN HISTORY</span><strong>{sessions.length} RECORDED SESSIONS</strong></div>
      <div className="mlp-timeline-track">
        <div className="mlp-timeline-line"/>
        {temporal.map((session,index)=><a key={session.id} href={'#mlh-session-'+session.id}
          style={{left:(4+(index*92/Math.max(1,temporal.length-1)))+'%'}} title={session.title}>
          <i/><span>{time(session.startedAt)}</span><small>{session.sessionKey}</small></a>)}
        {!temporal.length?<span className="mlp-timeline-empty">NO DATED SESSION HISTORY — NOTHING SYNTHESIZED</span>:null}
      </div>
      <div className="mlp-timeline-asof"><span>TIME BASIS</span><strong>RECORDED</strong></div>
    </footer>
  </section>;
}
