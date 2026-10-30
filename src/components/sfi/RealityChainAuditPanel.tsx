'use client';

/** Tenant-authorized Reality Chain read projections. Never grants evidence, action, or RETURN authority. */
export type RealityChainAuditRead = {
  temporalProvenance?: {
    contract:string; cutoff:string; totalFacts:number; truncated:boolean;
    snapshotObjectCount:number; warning:string;
    events:{objectRef:string;clock:string;value:string;source:string|null;interpretation:string;relationToCutoff:string}[];
  };
  authorityEvidence?: {
    counts:{accepted:number;rejected:number;pending:number;authorityDecisions:number;verifiedExecutions:number};
    snapshotIntegrity:string;truncated:boolean;boundary:string;
    evidence:{evidenceRef:string;state:string;rootSources:string[];assessmentCount:number}[];
    authority:{decisionId:string;proposalId:string;decision:string;authorityRole:string|null;decidedBy:string|null;recordedAt:string;recordIntegrity:string}[];
  };
  trajectoryContrast?: {
    declaredCaseObjective:string|null;attainment:string;contrast:string;readScope:string;truncated:boolean;boundary:string;
    clock:{sourceCutoff:string;t1ObservedAndValidated:boolean};
    counts:{attractors:number;trajectories:number;datedCaseObservations:number;chainAcceptedEvidence:number;caseReturns:number};
    attractors:{ref:string;statedGoal:string|null;status:string}[];
    trajectories:{ref:string;statedDirection:string|null;status:string}[];
    gaps:string[];
  };
  returnLearning?: {
    counts:{recordedReturns:number;verifiedReturns:number;contradictedCandidates:number};
    learningStatus:string;readScope:string;truncated:boolean;boundary:string;nextDiscriminator:string;
    records:{returnRef:string;executionRef:string|null;state:string;canonicalContrast:string;learningCandidate:string}[];
  };
};

type Section='authority'|'trajectory'|'clocks'|'return';
const human=(value:unknown)=>typeof value==='string'&&value.trim()?value:'NO REPRESENTADO';
const label=(s:string)=>s.replaceAll('_',' ');
const rowStyle={display:'grid',gap:'4px',padding:'10px',borderBottom:'1px solid rgba(200,169,81,.2)'} as const;

export function RealityChainAuditPanel({audit,section,cutoff}:{audit:RealityChainAuditRead|null;section:Section;cutoff?:string}) {
  if(!audit)return null;
  if(section==='authority'){
    const x=audit.authorityEvidence;
    return <details className="rcRecordList" data-c15-c16-authority-evidence-ledger="SFI-CASE-AUTHORITY-EVIDENCE-READ-1.0">
      <summary style={{cursor:'pointer',padding:12,color:'#C8A951'}}>C15/C16 · EVIDENCIA Y AUTORIDAD</summary>
      {!x?<p>LECTURA NO DISPONIBLE. La ausencia de lectura no demuestra ausencia de registros.</p>:<>
        {cutoff?<p>Lectura actual del expediente, NO una adjudicación reconstruida en el corte local {cutoff}.</p>:null}
        <p>{x.counts.accepted} aceptadas · {x.counts.rejected} rechazadas · {x.counts.pending} pendientes. {x.counts.authorityDecisions} decisiones y {x.counts.verifiedExecutions} ejecuciones con vínculos comprobados.</p>
        <p>Integridad del registro: {human(x.snapshotIntegrity)}. Los recuentos no crean autoridad ni evidencia nueva.</p>
        {x.evidence.slice(0,30).map((e,i)=><div key={e.evidenceRef+':'+i} style={rowStyle}><strong>PRUEBA · {label(e.state)}</strong><small>{e.evidenceRef}</small><span>{e.rootSources.length} fuentes trazadas · {e.assessmentCount} evaluaciones</span></div>)}
        {x.authority.slice(0,30).map((e,i)=><div key={e.decisionId+':'+i} style={rowStyle}><strong>{label(e.decision)} · {label(e.recordIntegrity)}</strong><small>{e.proposalId} · {human(e.decidedBy)}</small><span>{human(e.authorityRole)} · {e.recordedAt}</span></div>)}
        {x.truncated||x.evidence.length>30||x.authority.length>30?<p>Vista limitada. No equivale al expediente completo.</p>:null}
        <p>{x.boundary}</p>
      </>}
    </details>;
  }
  if(section==='trajectory'){
    const x=audit.trajectoryContrast;
    return <details className="rcRecordList" data-c17-trajectory-contrast="SFI-CASE-TRAJECTORY-CONTRAST-READ-1.0">
      <summary style={{cursor:'pointer',padding:12,color:'#C8A951'}}>C17 · TRAYECTORIA Y ATRACTORES</summary>
      {!x?<p>Proyección no disponible; no implica ausencia de resultados.</p>:<>
        <p>Objetivo declarado: {human(x.declaredCaseObjective)}. Alcance: {human(x.readScope)}.</p>
        <p>Logro: {human(x.attainment)} · Contraste: {human(x.contrast)} · T1 validado: {x.clock.t1ObservedAndValidated?'SÍ':'NO DEMOSTRADO'}.</p>
        <p>{x.counts.attractors} atractores declarados · {x.counts.trajectories} trayectorias · {x.counts.datedCaseObservations} observaciones fechadas · {x.counts.chainAcceptedEvidence} evidencias adjudicadas · {x.counts.caseReturns} RETURN.</p>
        {x.attractors.slice(0,20).map(e=><div key={e.ref} style={rowStyle}><strong>ATRACTOR DECLARADO · NO CONVERGENCIA PROBADA</strong><small>{e.ref}</small><span>{human(e.statedGoal)}</span></div>)}
        {x.trajectories.slice(0,20).map(e=><div key={e.ref} style={rowStyle}><strong>TRAYECTORIA REGISTRADA · NO EFECTO CAUSAL PROBADO</strong><small>{e.ref}</small><span>{human(e.statedDirection)}</span></div>)}
        {x.gaps.map((gap,i)=><p key={gap+':'+i}>PENDIENTE · {label(gap)}</p>)}
        {x.truncated||x.attractors.length>20||x.trajectories.length>20?<p>Índice limitado: no equivale al histórico completo.</p>:null}
        <p>{x.boundary}</p>
      </>}
    </details>;
  }
  if(section==='clocks'){
    const x=audit.temporalProvenance;
    return <details className="rcRecordList" data-c14-temporal-source-clocks="SFI-CASE-TEMPORAL-PROVENANCE-1.0">
      <summary style={{cursor:'pointer',padding:12,color:'#C8A951'}}>C14 · RELOJES DOCUMENTALES / PROVEEDOR / SFI</summary>
      <p>Fecha de documento, fecha publicada por el proveedor, observación e ingreso a SFI son relojes distintos.</p>
      {!x?<p>Índice temporal no disponible. No se infiere ausencia de fuentes.</p>:<>
        <p>{x.totalFacts} fechas de {x.snapshotObjectCount} objetos · Corte registrado: {x.cutoff}.</p>
        {x.events.slice(0,40).map((e,i)=><div key={e.objectRef+':'+e.clock+':'+i} style={rowStyle}><strong>{label(e.clock)} · {e.value}</strong><small>{e.objectRef}</small><span>{human(e.source)} · {label(e.interpretation)} · {label(e.relationToCutoff)}</span></div>)}
        {x.truncated||x.totalFacts>40?<p>Vista limitada; consulte el expediente completo.</p>:null}
        <p>{x.warning}</p>
      </>}
    </details>;
  }
  const x=audit.returnLearning;
  return <details className="rcRecordList" data-c18-return-learning-review="SFI-CASE-RETURN-LEARNING-READ-1.0">
    <summary style={{cursor:'pointer',padding:12,color:'#C8A951'}}>C18 · RETURN / CONTRASTE / APRENDIZAJE CANDIDATO</summary>
    {!x?<p>Índice de contraste no disponible. No se infiere aprendizaje.</p>:<>
      <p>{x.counts.recordedReturns} RETURN registrados · {x.counts.verifiedReturns} vinculados con ejecución · {x.counts.contradictedCandidates} predicciones contradichas para revisión.</p>
      <p>Estado: {human(x.learningStatus)}. Alcance: {human(x.readScope)}.</p>
      {x.records.slice(0,30).map((e,i)=><div key={e.returnRef+':'+i} style={rowStyle}><strong>{label(e.state)}</strong><small>RETURN {e.returnRef} · EJECUCIÓN {human(e.executionRef)}</small><span>Contraste: {human(e.canonicalContrast)}. Aprendizaje candidato: {human(e.learningCandidate)}. Causalidad y promoción institucional NO demostradas.</span></div>)}
      {x.truncated||x.records.length>30?<p>Listado limitado. No equivale al total histórico.</p>:null}
      <p>Próxima prueba: {human(x.nextDiscriminator)}</p>
      <p>{x.boundary}</p>
    </>}
  </details>;
}
