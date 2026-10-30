import {
  SFI_REPORT_CONTRACT,
  type SfiReportClaimV1,
  type SfiRenderedReportClaimV1,
  type SfiReportClaimLineageV1,
  type SfiReportDeliveryFormat,
  type SfiReportV1,
  type SfiCaseV1,
} from '../contracts/sfi';
import { createHash } from 'node:crypto';
import type { SfiCanonicalRef, SfiReportReconstructionV1 } from '../contracts/sfi';
import { validateSfiCaseV1 } from './caseEngine';

export type AssembleSfiReportV1Input = {
  id: string;
  version?: string;
  caseRecord: SfiCaseV1;
  generatedAt: string;
  claims?: SfiReportClaimV1[];
  deliveryFormats?: SfiReportDeliveryFormat[];
  limitations?: string[];
  reconstruction?: SfiReportReconstructionV1;
};

function normalizeLineage(claim: SfiReportClaimV1): SfiReportClaimLineageV1 {
  if (claim.lineage) return claim.lineage;
  return {
    executionRef: null,
    outputRelation: 'NOT_EXECUTED',
    support: claim.determinability === 'UNDETERMINED' ? 'INSUFFICIENT' : 'UNSUPPORTED',
    contradictionRefs: [],
    refutationConditions: [],
  };
}

function renderClaim(claim: SfiReportClaimV1): SfiRenderedReportClaimV1 {
  const lineage = normalizeLineage(claim);
  return {
    ...claim,
    lineage: {
      ...lineage,
      evidenceRefs: claim.evidenceRefs,
      confidence: claim.confidence,
    },
  };
}

export function assembleSfiReportV1(input: AssembleSfiReportV1Input): SfiReportV1 {
  const caseViolations = validateSfiCaseV1(input.caseRecord);
  if (caseViolations.length) {
    throw new Error(`SFI_REPORT_INVALID_CASE:${caseViolations.join(',')}`);
  }

  const deliveryFormats = input.deliveryFormats ?? ['JSON'];
  if (deliveryFormats.length === 0) throw new Error('SFI_REPORT_DELIVERY_REQUIRED');

  const sourceClaims = input.claims ?? [];
  const claims = sourceClaims.map(renderClaim);
  const missingExecutionLineage = sourceClaims.some((claim) => !claim.lineage);
  const limitations = [
    ...(input.limitations ?? []),
    ...(missingExecutionLineage
      ? ['Claims without observed execution lineage are rendered UNSUPPORTED or INSUFFICIENT; evidence references alone do not establish execution provenance.']
      : []),
  ];

  return {
    contract: SFI_REPORT_CONTRACT,
    id: input.id,
    version: input.version ?? '1.0',
    caseId: input.caseRecord.id,
    generatedAt: input.generatedAt,
    systemBoundaryRef: input.caseRecord.systemBoundaryRef,
    observationRefs: input.caseRecord.observationRefs,
    systemModelRefs: input.caseRecord.systemModelRefs,
    frictionRefs: input.caseRecord.frictionRefs,
    trajectoryRefs: input.caseRecord.trajectoryRefs,
    hypothesisRefs: input.caseRecord.hypothesisRefs,
    contradictionRefs: input.caseRecord.uncertainty.contradictionRefs,
    recommendationRefs: input.caseRecord.recommendationRefs,
    interventionRefs: input.caseRecord.interventionRefs,
    returnRefs: input.caseRecord.returnRefs,
    claims,
    limitations,
    deliveryFormats,
    ...(input.reconstruction ? { reconstruction: input.reconstruction } : {}),
    executionAuthority: false,
    governanceDecisionRefs: input.caseRecord.governance.governanceDecisionRefs,
  };
}

// A Case-scoped projection of the existing owners. It neither imports the global
// institutional graph into a tenant nor treats declared payload flags as authority.
export type SfiChainObject = {
  id: string; caseId: string; tenantId: string; kind: string; epistemicRole: string;
  canonicalRef: SfiCanonicalRef; sourceRefs: SfiCanonicalRef[]; recordRefs: SfiCanonicalRef[];
  evidenceRefs: SfiCanonicalRef[]; payload: Record<string, unknown>;
  observedAt: string | null; createdAt: string;
};
export type SfiChainAction = {
  id: string; caseId: string; status: string; action: Record<string, unknown>;
  interventionRef: SfiCanonicalRef | null; returnRef: SfiCanonicalRef | null;
  createdAt?: string;
};
export type SfiChainDecision = {
  id: string; caseId: string; proposalId: string; decision: string;
  authorityRole: string; decidedBy: string; createdAt: string;
};
export type SfiCaseClosureMode = 'ADMINISTRATIVE' | 'INCONCLUSIVE' | 'CERTIFIED';
export type SfiChainInput = {
  caseRecord: SfiCaseV1; objects: SfiChainObject[]; reports?: SfiReportV1[];
  actions?: SfiChainAction[]; decisions?: SfiChainDecision[];
  t0?: string | null; t1?: string | null; readComplete?: boolean; atomicClosureReady?:boolean;knownReportCount?:number;
  closureRequest?: { mode: SfiCaseClosureMode; reason: string } | null;
};
const chainText = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const chainRow = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const chainDate = (v: unknown) => chainText(v) && Number.isFinite(Date.parse(chainText(v))) ? new Date(chainText(v)).toISOString() : null;
const chainKey = (r: SfiCanonicalRef) => JSON.stringify([r.id, r.version ?? null, r.hash ?? null]);
function chainStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(chainStable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,chainStable(v)]));
  return value;
}
export function sfiRealityChainHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(chainStable(value))).digest('hex');
}

export function explainSfiRealityChainGap(gap: string) {
  const key=gap.split(':')[0];
  const meanings: Record<string,string> = {
    ATOMIC_CLOSURE_UNAVAILABLE:'La protección de cierre simultáneo todavía no está instalada en esta base de datos.',
    READ_INCOMPLETE:'La lectura no cubre todo el expediente; no se puede certificar una muestra como si fuera el total.',
    FOREIGN_OBJECT_EXCLUDED:'Se excluyó un objeto ajeno al caso o a su organización.',
    OBJECT_TIME_INVALID:'Un registro carece de una fecha válida de incorporación u observación.',
    OBSERVATION_AFTER_T1:'Una observación está fechada después del corte final seleccionado.',
    UNRESOLVED_REFERENCE:'Un vínculo no encuentra su fuente o registro con la identidad, versión y huella indicadas.',
    PROVENANCE_CYCLE:'La procedencia contiene un círculo: unos registros se justifican entre sí sin resolver el origen.',
    EVIDENCE_SOURCE_MISSING:'Una prueba no puede rastrearse hasta su fuente original.',
    EVIDENCE_MISSING:'No hay pruebas admitidas registradas para este caso.',
    EVIDENCE_ASSESSMENT_MISSING:'Falta la evaluación vinculada de una o más pruebas.',
    T0_T1_BASELINE_MISSING:'Falta una base inicial fechada que permita comparar T0 con T1.',
    EXECUTION_AUTHORITY_UNVERIFIED:'Una ejecución no tiene autorización y responsable comprobables en el registro de decisiones.',
    EXECUTION_MISSING:'No se encontró una ejecución vinculada al caso.',
    RETURN_UNVERIFIED:'Un resultado carece de evidencia, fecha o vínculo válido con su ejecución autorizada.',
    RETURN_CONTRAST_MISSING:'Falta una expectativa medible registrada antes de actuar, o el resultado no puede compararse con ella.',
    RETURN_MISSING:'No se encontró un resultado observado vinculado al caso.',
    UNRESOLVED_QUESTIONS:'Quedan preguntas documentadas sin resolver.',
    UNRESOLVED_CONTRADICTIONS:'Quedan contradicciones documentadas sin resolver.',
    REPORT_MISSING:'No existe un informe guardado y vinculado con su contenido íntegro.',
    REPORT_STALE_OR_UNBOUND:'El informe no corresponde al contenido actual o no conserva una reconstrucción verificable.',
    SUPPORTED_REPORT_CLAIMS_MISSING:'El informe todavía no tiene conclusiones respaldadas por pruebas y ejecución comprobables.',
    REPORT_CLAIMS_NOT_FULLY_SUPPORTED:'Una o más conclusiones del informe carecen del respaldo completo requerido.',
  };
  return meanings[key] ?? 'Hay una comprobación documental pendiente; consultar el detalle de auditoría.';
}

export function isSfiEvidenceAssessmentAccepted(payload:Record<string,unknown>, refs:SfiCanonicalRef[], expected:SfiCanonicalRef[], cutoff:string) {
  return payload.classification==='EVIDENCE' && payload.determinability==='DETERMINED'
    && Boolean(chainText(payload.assessedBy) && chainText(payload.rationale) && chainDate(payload.assessedAt) && chainDate(payload.assessedAt)!<=cutoff)
    && !['REJECTED','PENDING','INVALIDATED'].includes(chainText(payload.decision))
    && (!Array.isArray(payload.invalidationRefs) || payload.invalidationRefs.length===0)
    && (!Array.isArray(payload.contradictionRefs) || payload.contradictionRefs.length===0)
    && expected.length>0 && expected.every(e=>refs.some(r=>r.id===e.id && (!e.version || r.version===e.version) && (!e.hash || r.hash===e.hash)));
}

export function buildSfiRealityChain(input: SfiChainInput) {
  const c = input.caseRecord;
  const t0 = chainDate(input.t0 ?? c.temporalWindow.start);
  // Event window and reconstruction time are different clocks. Recovering a
  // historical document today does not mean it was registered at the event cutoff.
  const lastRegistration = input.objects.filter(o=>o.caseId===c.id && o.tenantId===c.tenantId && o.kind!=='REPORT').map(o=>chainDate(o.createdAt)).filter((v):v is string=>Boolean(v)).sort().at(-1);
  const t1 = chainDate(input.t1 ?? lastRegistration ?? c.createdAt ?? c.temporalWindow.cutoff);
  if ((input.t0 && !t0) || (input.t1 && !t1) || !t1 || (t0 && t0 > t1)) throw new Error('SFI_CASE_TEMPORAL_WINDOW_INVALID');
  const gaps = new Set<string>();
  if (input.readComplete !== true) gaps.add('READ_INCOMPLETE');
  if(input.atomicClosureReady===false)gaps.add('ATOMIC_CLOSURE_UNAVAILABLE');
  const owned = input.objects.filter(o=>o.caseId===c.id && o.tenantId===c.tenantId);
  if (owned.length !== input.objects.length) gaps.add('FOREIGN_OBJECT_EXCLUDED');
  const objects = owned.filter(o=>o.kind!=='REPORT' && chainDate(o.createdAt) !== null && chainDate(o.createdAt)! <= t1)
    .sort((a,b)=>chainKey(a.canonicalRef).localeCompare(chainKey(b.canonicalRef)));
  if (owned.some(o=>!chainDate(o.createdAt) || (o.observedAt!==null && !chainDate(o.observedAt)))) gaps.add('OBJECT_TIME_INVALID');
  const actions = (input.actions ?? []).filter(a=>a.caseId===c.id);
  const decisions = (input.decisions ?? []).filter(d=>d.caseId===c.id && chainDate(d.createdAt)!==null && chainDate(d.createdAt)!<=t1);
  const inputHash = sfiRealityChainHash({
    caseId:c.id,tenantId:c.tenantId,scope:c.scope,subject:c.subject,systemBoundaryRef:c.systemBoundaryRef,
    serviceProfileId:c.serviceProfileId,temporalWindow:c.temporalWindow,uncertainty:c.uncertainty,
    // REPORT refs and lifecycle updates are deliberately excluded: issuing a report
    // and closing do not change its underlying evidence. New objects do.
    objects,actions:[...actions].sort((a,b)=>a.id.localeCompare(b.id)),decisions:[...decisions].sort((a,b)=>a.id.localeCompare(b.id)),t0,t1,
  });
  const byId = new Map<string,SfiChainObject[]>();
  for (const o of objects) byId.set(o.canonicalRef.id,[...(byId.get(o.canonicalRef.id) ?? []),o]);
  const resolve = (r: SfiCanonicalRef, kind?: string) => {
    const matches=(byId.get(r.id) ?? []).filter(o=>(!r.version || o.canonicalRef.version===r.version) && (!r.hash || o.canonicalRef.hash===r.hash) && (!kind || o.kind===kind));
    return matches.length===1 ? matches[0] : null;
  };
  const edges: { from: SfiCanonicalRef; to: SfiCanonicalRef; relation: string; resolved: boolean }[]=[];
  for (const o of objects) {
    for (const [relation,refs,kind] of [['SOURCE',o.sourceRefs,'SOURCE'],['RECORD',o.recordRefs,null],['EVIDENCE',o.evidenceRefs,'EVIDENCE']] as const) {
      for (const r of refs) {
        const target=resolve(r,kind ?? undefined);
        const valid=Boolean(target && (relation!=='RECORD' || target.epistemicRole==='RECORD') && (relation!=='EVIDENCE' || target.epistemicRole==='EVIDENCE'));
        edges.push({from:o.canonicalRef,to:r,relation,resolved:valid});
        if (!valid) gaps.add(`UNRESOLVED_REFERENCE:${o.canonicalRef.id}:${r.id}`);
      }
    }
  }
  // Iterative DFS avoids stack exhaustion on long but legitimate provenance chains.
  const adjacency=new Map<string,string[]>();
  for (const edge of edges.filter(e=>e.resolved)) {
    const from=chainKey(edge.from), target=resolve(edge.to);
    if (target) adjacency.set(from,[...(adjacency.get(from) ?? []),chainKey(target.canonicalRef)]);
  }
  const color=new Map<string,number>();
  for (const root of objects) {
    const rootKey=chainKey(root.canonicalRef);if(color.has(rootKey))continue;
    const stack: {key:string;exit:boolean}[]=[{key:rootKey,exit:false}];
    while(stack.length){const frame=stack.pop()!;
      if(frame.exit){color.set(frame.key,2);continue;}
      if(color.get(frame.key)===1){gaps.add('PROVENANCE_CYCLE');continue;}
      if(color.get(frame.key)===2)continue;
      color.set(frame.key,1);stack.push({key:frame.key,exit:true});
      for(const key of adjacency.get(frame.key) ?? [])stack.push({key,exit:false});
    }
  }
  const sourcesFor = (start:SfiChainObject) => {
    const sources=new Set<string>(), seen=new Set<string>(), pending=[start];
    while(pending.length){const o=pending.pop()!, key=chainKey(o.canonicalRef);if(seen.has(key))continue;seen.add(key);
      if(o.kind==='SOURCE')sources.add(key);
      for(const r of [...o.sourceRefs,...o.recordRefs,...o.evidenceRefs]){const target=resolve(r);if(target)pending.push(target);}
    }return [...sources];
  };
  if(objects.some(o=>chainDate(o.observedAt) && chainDate(o.observedAt)!>t1))gaps.add('OBSERVATION_AFTER_T1');
  const evidence=objects.filter(o=>o.kind==='EVIDENCE' && o.epistemicRole==='EVIDENCE');
  for (const o of evidence) if(!sourcesFor(o).length)gaps.add(`EVIDENCE_SOURCE_MISSING:${o.canonicalRef.id}`);
  if(!evidence.length)gaps.add('EVIDENCE_MISSING');
  const adjudications=evidence.map(e=>{
    const assessments=objects.filter(o=>o.kind==='EPISTEMIC_ASSESSMENT' && o.epistemicRole==='EPISTEMIC_ASSESSMENT' && o.evidenceRefs.some(r=>resolve(r)===e));
    const accepted=assessments.filter(o=>isSfiEvidenceAssessmentAccepted(o.payload,o.evidenceRefs,[e.canonicalRef],t1));
    const rejected=assessments.some(o=>['REJECTED','INVALIDATED'].includes(chainText(o.payload.decision)) || (Array.isArray(o.payload.invalidationRefs)&&o.payload.invalidationRefs.length>0));
    const state=rejected ? 'REJECTED' : accepted.length ? 'ACCEPTED' : 'PENDING';
    if(state!=='ACCEPTED')gaps.add('EVIDENCE_ASSESSMENT_MISSING');
    return {evidenceRef:e.canonicalRef,sourceRoots:sourcesFor(e),assessmentRefs:assessments.map(o=>o.canonicalRef),state,
      assessments:assessments.map(o=>({ref:o.canonicalRef,assessedBy:chainText(o.payload.assessedBy)||null,assessedAt:chainDate(o.payload.assessedAt),rationale:chainText(o.payload.rationale)||null,determinability:chainText(o.payload.determinability)||'UNDETERMINED',decision:chainText(o.payload.decision)||null}))};
  });
  const snapshot=(cutoff:string|null)=>({cutoff,objectRefs:cutoff ? objects.filter(o=>chainDate(o.createdAt)!<=cutoff && (!o.observedAt || chainDate(o.observedAt)!<=cutoff)).map(o=>o.canonicalRef) : []});
  const before=snapshot(t0), after=snapshot(t1);
  const initial=new Set(before.objectRefs.map(chainKey));
  const added=after.objectRefs.filter(r=>!initial.has(chainKey(r))), persisted=after.objectRefs.filter(r=>initial.has(chainKey(r)));
  const comparable=Boolean(t0 && t0<t1 && before.objectRefs.length && after.objectRefs.length);
  if(!comparable)gaps.add('T0_T1_BASELINE_MISSING');
  const timeline=objects.map(o=>({ref:o.canonicalRef,kind:o.kind,epistemicRole:o.epistemicRole,
    eventAt:chainDate(o.payload.eventAt ?? o.payload.occurredAt ?? o.payload.effectiveAt ?? o.payload.committerDate ?? o.payload.authorDate),
    eventTimeBasis:(o.payload.committerDate || o.payload.authorDate) ? 'DECLARED_SOURCE_METADATA' : 'RECORDED_EVENT_TIME',
    observedAt:chainDate(o.observedAt),recordedAt:chainDate(o.createdAt),
    description:chainText(o.payload.statement ?? o.payload.description ?? o.payload.outcome ?? o.payload.subjectLine ?? o.payload.label ?? o.payload.title) || 'Registro sin descripción humana.',
    sourceRefs:o.sourceRefs,recordRefs:o.recordRefs,evidenceRefs:o.evidenceRefs,
  })).sort((a,b)=>(a.eventAt ?? a.observedAt ?? a.recordedAt ?? '').localeCompare(b.eventAt ?? b.observedAt ?? b.recordedAt ?? '') || chainKey(a.ref).localeCompare(chainKey(b.ref)));
  const executions=objects.filter(o=>o.kind==='INTERVENTION').map(o=>{
    const action=actions.find(a=>a.id===o.payload.proposalId && a.interventionRef && resolve(a.interventionRef,'INTERVENTION')===o);
    const decision=action ? decisions.find(d=>d.proposalId===action.id && d.decision==='APPROVE' && ['OWNER','ADMIN'].includes(d.authorityRole) && d.decidedBy && chainDate(d.createdAt)!<=chainDate(o.observedAt)!) : null;
    const valid=Boolean(action && ['EXECUTED','RETURN_RECORDED'].includes(action.status) && decision && o.epistemicRole==='RECORD' && chainDate(o.observedAt));
    if(!valid)gaps.add(`EXECUTION_AUTHORITY_UNVERIFIED:${o.canonicalRef.id}`);
    return {ref:o.canonicalRef,proposalId:action?.id ?? null,decisionId:decision?.id ?? null,decidedBy:decision?.decidedBy ?? null,authorityRole:decision?.authorityRole ?? null,observedAt:o.observedAt,verified:valid};
  });
  if(!executions.length)gaps.add('EXECUTION_MISSING');
  const returns=objects.filter(o=>o.kind==='RETURN').map(o=>{
    const action=actions.find(a=>a.returnRef && resolve(a.returnRef,'RETURN')===o && a.id===o.payload.proposalId);
    const execution=action?.interventionRef ? executions.find(e=>chainKey(e.ref)===chainKey(resolve(action.interventionRef!,'INTERVENTION')?.canonicalRef ?? {id:''})) : null;
    const linked=Boolean(execution?.verified && o.recordRefs.some(r=>resolve(r,'INTERVENTION')?.canonicalRef.id===execution.ref.id));
    const valid=Boolean(linked && o.epistemicRole==='RECORD' && chainDate(o.observedAt) && chainDate(execution?.observedAt)!<=chainDate(o.observedAt)! && o.evidenceRefs.some(r=>resolve(r,'EVIDENCE')?.epistemicRole==='EVIDENCE') && chainText(o.payload.outcome));
    const expected=chainRow(chainRow(action?.action.details).expectedReturn);
    const metric=chainText(expected.metric), predicted=expected.expected, tolerance=expected.tolerance ?? 0;
    const observed=chainRow(o.payload.measurements)[metric];
    const numeric=typeof predicted==='number' && Number.isFinite(predicted) && typeof tolerance==='number' && Number.isFinite(tolerance) && tolerance>=0;
    // Expectations must have been registered before intervention, not invented
    // after observing the outcome. Legacy actions lacking time remain unverified.
    const preregistered=Boolean(action && chainDate(action.createdAt) && chainDate(action.createdAt)!<=chainDate(execution?.observedAt)!);
    const contrast=!Object.keys(expected).length ? 'PREDICTION_MISSING' : !valid || !numeric || !preregistered || typeof observed!=='number' || !Number.isFinite(observed) ? 'NOT_COMPARABLE' : Math.abs(observed-predicted)<=tolerance ? 'SUPPORTED' : 'CONTRADICTED';
    if(!valid)gaps.add(`RETURN_UNVERIFIED:${o.canonicalRef.id}`);
    if(contrast==='PREDICTION_MISSING' || contrast==='NOT_COMPARABLE')gaps.add(`RETURN_CONTRAST_MISSING:${o.canonicalRef.id}`);
    return {ref:o.canonicalRef,executionRef:execution?.ref ?? null,evidenceRefs:o.evidenceRefs,outcome:chainText(o.payload.outcome),expected,observed:observed ?? null,contrast,verified:valid,causalEffectEstablished:false as const};
  });
  if(!returns.length)gaps.add('RETURN_MISSING');
  if(objects.some(o=>o.kind==='UNRESOLVED_QUESTION'))gaps.add('UNRESOLVED_QUESTIONS');
  if(objects.some(o=>o.kind==='CONTRADICTION'))gaps.add('UNRESOLVED_CONTRADICTIONS');
  // A REPORT case-object is a pointer, not a report. Only the existing report table
  // plus exact payload hash and current input binding can establish delivery.
  const linkedReports=(input.reports ?? []).filter(r=>r.caseId===c.id && r.contract==='SFI-REPORT-1.0' && chainDate(r.generatedAt) && owned.some(o=>o.kind==='REPORT' && o.canonicalRef.id===r.id && o.canonicalRef.version===r.version && o.canonicalRef.hash===sfiRealityChainHash(r)));
  const currentReport=linkedReports.filter(r=>r.reconstruction?.contract==='SFI-CASE-RECONSTRUCTION-1.0' && r.reconstruction.inputHash===inputHash).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
  if(!linkedReports.length && !input.knownReportCount)gaps.add('REPORT_MISSING');else if(!currentReport)gaps.add('REPORT_STALE_OR_UNBOUND');
  const claims=currentReport?.claims ?? [];
  const supportedClaims=claims.filter(claim=>claim.lineage?.support==='SUPPORTED' && claim.lineage.executionRef && claim.lineage.outputRelation!=='NOT_EXECUTED' && claim.evidenceRefs.length && claim.sourceRefs.length && resolve(claim.assessmentRef,'EPISTEMIC_ASSESSMENT') && isSfiEvidenceAssessmentAccepted(resolve(claim.assessmentRef,'EPISTEMIC_ASSESSMENT')!.payload,resolve(claim.assessmentRef,'EPISTEMIC_ASSESSMENT')!.evidenceRefs,claim.evidenceRefs,t1) && claim.evidenceRefs.every(r=>{
    const e=resolve(r,'EVIDENCE');return e?.epistemicRole==='EVIDENCE' && claim.sourceRefs.every(s=>{const src=resolve(s,'SOURCE');return src && sourcesFor(e).includes(chainKey(src.canonicalRef));});
  }));
  if(!supportedClaims.length)gaps.add('SUPPORTED_REPORT_CLAIMS_MISSING');
  if(supportedClaims.length!==claims.length)gaps.add('REPORT_CLAIMS_NOT_FULLY_SUPPORTED');
  const certified=gaps.size===0;
  const documented=Boolean(currentReport?.reconstruction?.narrative.length && currentReport.reconstruction.gaps.length && currentReport.reconstruction.nextObservation.trim());
  const disposition:SfiCaseClosureMode|'OPEN'=c.status==='CLOSED' ? input.closureRequest?.mode==='CERTIFIED' && certified ? 'CERTIFIED' : input.closureRequest?.mode==='INCONCLUSIVE' && documented ? 'INCONCLUSIVE' : 'ADMINISTRATIVE' : 'OPEN';
  const narrative=[
    c.status==='CLOSED' && disposition==='ADMINISTRATIVE' ? 'El expediente está cerrado administrativamente. Ese estado no certifica sus conclusiones.' : disposition==='INCONCLUSIVE' ? 'La investigación concluyó de forma inconclusa y dejó documentados sus límites.' : certified ? 'La cadena documental cumple las comprobaciones de integridad para este alcance.' : 'La cadena sigue sin certificación: faltan comprobaciones documentales.',
    `Se reconstruyeron ${objects.length} registros del expediente. T0: ${t0 ?? 'sin fecha inicial'}; T1: ${t1}.`,
    comparable ? `Entre ambos cortes se incorporaron ${added.length} registros y persistieron ${persisted.length}. Esto describe conocimiento registrado, no demuestra por sí solo cambios en el mundo.` : 'No hay una base inicial suficiente para comparar T0 y T1. Los registros tardíos no se atribuyen al conocimiento anterior.',
    returns.length ? `Hay ${returns.length} resultados registrados; ${returns.filter(r=>r.contrast==='CONTRADICTED').length} contradicen la expectativa medible registrada. Una contradicción documentada también es un resultado útil.` : 'No se encontró un resultado observado vinculado. No se inventa un RETURN para completar la cadena.',
    'La explicación es una traducción determinista de los registros. No acredita que Jr haya ejecutado un ciclo ni establece causalidad, reconocimiento externo o verdad institucional.',
  ];
  const nextObservation=!before.objectRefs.length ? 'Recuperar una fuente fechada que permita establecer el estado inicial, conservando su fecha original y la fecha de incorporación.' : !returns.length ? 'Vincular el resultado observado, su evidencia y la expectativa registrada antes de la ejecución.' : !currentReport ? 'Emitir o actualizar el informe del expediente con los registros actuales y sus limitaciones.' : 'Resolver las lagunas señaladas y contrastar nuevamente sin sustituir hechos ausentes por inferencias.';
  const readiness=[true,comparable,timeline.length>0,edges.every(e=>e.resolved)&&!gaps.has('PROVENANCE_CYCLE'),adjudications.length>0&&adjudications.every(a=>a.state==='ACCEPTED'),executions.length>0&&executions.every(e=>e.verified),executions.length>0&&executions.every(e=>e.verified),comparable,returns.length>0&&returns.every(r=>['SUPPORTED','CONTRADICTED'].includes(r.contrast)),true,Boolean(currentReport),certified];
  return {
    contract:'SFI-REALITY-CHAIN-CASE-PASSPORT-1.0' as const,inputHash,caseId:c.id,subject:c.subject,scope:c.scope,
    caseStatus:c.status,temporal:{t0:before,t1:after,added,persisted,comparison:comparable ? added.length ? 'CHANGED' : 'UNCHANGED' : 'INSUFFICIENT_TEMPORAL_EVIDENCE',basis:'REGISTERED_KNOWLEDGE_NOT_WORLD_STATE'},
    timeline,provenance:{edges,adjudications,independence:'UNKNOWN',boundary:'HASH_DIVERSITY_DOES_NOT_PROVE_INDEPENDENCE'},
    authority:decisions,executions,returns,reportRef:currentReport ? {id:currentReport.id,version:currentReport.version,hash:sfiRealityChainHash(currentReport)} : null,
    gaps:[...gaps].sort(),gapExplanations:[...gaps].sort().map(explainSfiRealityChainGap),nextObservation,narrative,
    interpreter:{mode:'DETERMINISTIC_TRANSLATION',jrExecutionObserved:false},
    components:['Case Intake','T0 Baseline','Temporal Reconstruction','Provenance Graph','Evidence Adjudicator','Authority Ledger','Execution Trace','T1 Comparator','RETURN & Contradiction','Narrative Interpreter','Report Composer','Passport & Closure'].map((name,i)=>({name,state:readiness[i]?'REPRESENTED':'NOT_VERIFIED'})),
    closure:{disposition,certified,documentedInconclusive:documented,requestedMode:input.closureRequest?.mode ?? null,reason:input.closureRequest?.reason ?? null},
    executionAuthority:false as const,canonicalPromotion:false as const,
  };
}
export type SfiRealityChain = ReturnType<typeof buildSfiRealityChain>;

export function assertSfiCaseClosure(chain:SfiRealityChain, mode:SfiCaseClosureMode='CERTIFIED', reason='') {
  if(!['ADMINISTRATIVE','INCONCLUSIVE','CERTIFIED'].includes(mode))throw new Error('SFI_CASE_CLOSURE_MODE_INVALID');
  if(mode!=='CERTIFIED' && !reason.trim())throw new Error('SFI_CASE_CLOSURE_REASON_REQUIRED');
  if(mode==='CERTIFIED' && !chain.closure.certified)throw new Error(`SFI_CASE_CLOSURE_BLOCKED:${chain.gaps.join(',')}`);
  if(mode==='INCONCLUSIVE' && !chain.closure.documentedInconclusive)throw new Error('SFI_CASE_CLOSURE_REPORT_REQUIRED:Current report with gaps, explanation and next observation required');
  return {mode,reason:reason.trim(),inputHash:chain.inputHash,reportRef:chain.reportRef};
}

export function renderSfiRealityPassportHtml(chain:SfiRealityChain, readConsistency?:{humanWarning:string;warning:string;crossProviderParity:string}) {
  const esc=(v:unknown)=>String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  // Human-readable HTML must disclose provider freshness even when the
  // documentary closure in the case's own snapshot appears certified.
  const consistencyMessage=readConsistency?.humanWarning
    || 'Estado de las bases no verificado. Este expediente no prueba integridad entre proveedores.';
  const consistencyCode=readConsistency?.warning || 'DATA_PLANE_STATE_UNAVAILABLE';
  const paragraphs=chain.narrative.map(p=>`<p>${esc(p)}</p>`).join('');
  const rows=chain.timeline.map(e=>`<tr><td>${esc(e.eventAt ?? 'Desconocida')}</td><td>${esc(e.observedAt ?? 'Sin observación fechada')}</td><td>${esc(e.recordedAt)}</td><td>${esc(e.kind)}<br>${esc(e.description)}</td><td>${esc(e.ref.id)}<br>${esc([...e.sourceRefs,...e.recordRefs,...e.evidenceRefs].map(r=>r.id).join(', ') || 'Sin vínculos')}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Reality Chain · Expediente</title><style>@page{size:A4;margin:18mm}body{font:15px/1.6 Georgia,serif;color:#292720;background:#f7f4ea;max-width:1000px;margin:auto;padding:30px}h1,h2{font-weight:400}header{border-bottom:2px solid #aa8c43}table{border-collapse:collapse;width:100%;table-layout:fixed;overflow-wrap:anywhere}th,td{font:10px/1.5 sans-serif;text-align:left;vertical-align:top;padding:7px;border-bottom:1px solid #bbb}thead{display:table-header-group}tr{break-inside:avoid}li,code{overflow-wrap:anywhere}.state{border-left:3px solid #aa8c43;padding:12px}@media print{body{padding:0;background:white}}</style><header><small>SYSTEM FRICTION INSTITUTE · EXPEDIENTE PRIVADO</small><h1>Reality Chain · Passport</h1><h2>${esc(chain.subject)}</h2><p>${esc(chain.scope)}</p></header><section class="state" data-c19-read-consistency="UNVERIFIED_CROSS_PROVIDER_PARITY"><strong>ESTADO DE FUENTE Y CONSISTENCIA</strong><p>${esc(consistencyMessage)}</p><small>${esc(consistencyCode)} · CROSS_PROVIDER_PARITY_NOT_VERIFIED</small></section><p class="state">${chain.closure.certified?'Integridad documental comprobada para este alcance':'Sin certificación'} · ${esc(chain.closure.disposition)}</p>${paragraphs}<h2>Comparación T0–T1</h2><p>T0: ${esc(chain.temporal.t0.cutoff ?? 'No establecido')} · T1: ${esc(chain.temporal.t1.cutoff)}</p><p>${chain.temporal.added.length} registros incorporados; ${chain.temporal.persisted.length} registros persistentes. Es una comparación documental del conocimiento registrado.</p><h2>Qué falta y qué sigue</h2><ul>${chain.gapExplanations.map(g=>`<li>${esc(g)}</li>`).join('') || '<li>No se detectaron lagunas en las comprobaciones implementadas.</li>'}</ul><p>${esc(chain.nextObservation)}</p><h2>Reconstrucción temporal y procedencia</h2><table><thead><tr><th>Fecha del hecho</th><th>Fecha de observación</th><th>Incorporación</th><th>Registro</th><th>Referencia y vínculos</th></tr></thead><tbody>${rows}</tbody></table><h2>Autoridad, ejecución y resultado</h2>${chain.executions.map(e=>`<p>${esc(e.ref.id)}: ${e.verified?'Autorización vinculada':'Autorización no comprobada'}; responsable: ${esc(e.decidedBy ?? 'Desconocido')}.</p>`).join('')}${chain.returns.map(r=>`<p>${esc(r.outcome)} · Contraste: ${esc(r.contrast)}. No establece causalidad.</p>`).join('')}<footer><p>La explicación no concede permisos, no publica el caso y no promueve evidencia o aprendizaje a verdad institucional. La ausencia documental no demuestra ausencia en el mundo.</p><small>Expediente: ${esc(chain.caseId)} · Contenido: ${esc(chain.inputHash)}</small></footer></html>`;
}
