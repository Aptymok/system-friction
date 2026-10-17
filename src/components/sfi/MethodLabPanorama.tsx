'use client';

import { useState } from 'react';
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
      <div><small>SFI / METHOD LAB</small><p className="mlp-operational-instruction">Selecciona un método → incorpora evidencia → ejecuta → contrasta.</p></div>
      <div className="mlp-status"><i data-status={status}/><span>INSTITUTIONAL READ</span><strong>{status}</strong><small>LAST READ · {time(generatedAt)}</small></div>
    </header>
    <div className="mlp-viewport">
      <details className="mlp-library mlp-tile" data-tone="gold" open>
        <summary className="mlp-panel-head"><span>Selecciona un protocolo.</span><small>{protocols.length} REGISTRADOS · ABRIR / CERRAR</small></summary>
        {protocols.length?protocols.map(protocol=><button key={protocol.id} type="button"
          className={selectedProtocol===protocol.id?'mlp-selected':''}
          onClick={()=>{setSelectedProtocol(protocol.id);setFocus('PROTOCOLS')}}>
          <i data-status={protocol.status}/><span>{protocol.name}</span><small>{protocol.status}</small>
        </button>):<p className="mlp-empty">NO REGISTERED PROTOCOLS IN THIS READ</p>}
        <a href="#mlh-instruments" className="mlp-link">OPEN PROTOCOL REGISTRY <span>↗</span></a>
      </details>

      <div className="mlp-process" aria-label="Governed laboratory stages">
        <div className="mlp-process-top"><span>SECUENCIA DE TRABAJO</span><b>REGISTRA → PRUEBA → CONTRASTA</b></div>
        <div className="mlp-process-connection" aria-hidden="true"/>
        <div className="mlp-phases">
          {phaseKeys.map((phase,index)=><details key={phase} className={phase===focus?'mlp-phase-active mlp-tile':'mlp-tile'}
            data-tone={index===0?'gold':index===1?'teal':index===2?'blue':index===3?'red':'gold'}
            data-weight={index<2?'major':'minor'} open={index===0}>
            <summary onClick={()=>setFocus(phase)}>
              <small>0{index+1} · DESPLEGAR</small><span>{phase}</span><strong>{values[phase]}</strong>
              <em>{index===0?'REGISTRO':index===1?'EVIDENCIA':index===2?'EJECUCIONES':index===3?'LECTURA CIEGA':'EVALUACIONES'}</em>
            </summary>
            <div className="mlp-phase-content"><p>{detail[phase]}</p><a href={jump[phase]}>ABRIR ESPACIO ↗</a></div>
          </details>)}
        </div>
        <div className="mlp-inspection">
          <span className="mlp-eyebrow">COMPRUEBA LA ETAPA / {focus}</span>
          {focus==='PROTOCOLS'&&chosenProtocol?<><p className="mlp-inspect-instruction">{chosenProtocol.name}</p><p>{chosenProtocol.purpose}</p>
            <dl><div><dt>STATE</dt><dd>{chosenProtocol.status}</dd></div><div><dt>CLASS</dt><dd>{chosenProtocol.epistemicClass}</dd></div><div><dt>RUNS</dt><dd>{chosenProtocol.runCount}</dd></div><div><dt>VALIDATION</dt><dd>{chosenProtocol.lastValidationLevel??'NOT OBSERVED'}</dd></div></dl></>
            :<><p className="mlp-inspect-instruction">{focus==='PROTOCOLS'?'Selecciona un protocolo.':detail[focus]}</p>
              <div className="mlp-primary-value">{values[focus]} <small>{focus==='EVIDENCE'?'REFERENCES':focus==='RUNS'?'REPORTED EXECUTIONS':focus==='BLIND'?'QUALIFYING SESSION STATES':focus==='CONTRAST'?'EVALUATIONS':'REGISTERED'}</small></div></>}
          <a href={jump[focus]} className="mlp-enter">OPEN WORKSPACE <span>↗</span></a>
        </div>
        <div className="mlp-process-boundary">SIMULATION ≠ OBSERVATION <span>·</span> APPROVAL ≠ AUTHORITY <span>·</span> EXECUTION ≠ RETURN</div>
      </div>

      <details className="mlp-runtime mlp-tile" data-tone="blue">
        <summary className="mlp-panel-head"><span>Comprueba la ejecución y la autoridad.</span><small>{status} · ABRIR / CERRAR</small></summary>
        <dl><div><dt>OPERATIONAL PROTOCOLS</dt><dd>{operational}</dd></div>
          <div><dt>GATED PROTOCOLS</dt><dd>{gated}</dd></div>
          <div><dt>OPEN SESSIONS</dt><dd>{unresolved}</dd></div>
          <div><dt>READY FOR BLIND</dt><dd>{blindReady}</dd></div>
          <div><dt>DT PASS / FAIL / BLOCKED</dt><dd>{decisionTransfer.passCount} / {decisionTransfer.failCount} / {decisionTransfer.blockedCount}</dd></div></dl>
        <div className="mlp-runtime-subtitle">RECENT RECORDED SESSIONS</div>
        {sessions.length?sessions.slice(0,5).map(session=><a key={session.id} href={'#mlh-session-'+session.id} className="mlp-session">
          <span>{session.sessionKey||session.id}</span><b>{session.title}</b><small>{session.status} · {session.eventCount} EVENTS</small></a>):<p className="mlp-empty">NO PERSISTED SESSIONS RETURNED</p>}
        <a href="#mlh-sessions" className="mlp-link">INSPECT SESSION RECORDS <span>↗</span></a>
      </details>
    </div>

  </section>;
}
