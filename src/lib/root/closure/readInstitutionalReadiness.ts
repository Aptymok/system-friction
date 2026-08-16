import 'server-only';

import { readGovernanceHealth } from '@/lib/governance/readGovernanceHealth';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { readRootReportHealth } from '@/lib/reports/rootReportInbox';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readCognitiveTwinLineageHealth } from '@/core/cognitive-twin/reentry/runtime';
import { readCognitiveTwinMutationState } from '@/core/cognitive-twin/reentry/mutationState';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { resolvedStudioCapabilityMatrix } from '@/lib/studio/capabilities/resolvedStudioCapabilities';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type InstitutionalReadinessState = 'OPERATIONAL' | 'READY' | 'GATED' | 'DEGRADED';
type TableProbe = { table: string; available: boolean; count: number | null; countMode: 'PLANNED'; error: string | null };
type ModuleReadiness = {
  id: string;
  label: string;
  state: InstitutionalReadinessState;
  implemented: boolean;
  observed: boolean;
  evidence: string[];
  blockers: string[];
  externalGates?: string[];
  nextAction: string | null;
};

const PROBE_TIMEOUT_MS = 5000;
const EMPTY_GRAPH_REASONS = new Set(['graph_store_empty_repair_required','graph_edges_empty_repair_required']);

async function probe(table: string): Promise<TableProbe> {
  const db = createServiceSupabaseClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('readiness_probe_timeout')), PROBE_TIMEOUT_MS);
  try {
    const result = await db.from(table)
      .select('*', { count: 'planned', head: true })
      .abortSignal(controller.signal);
    return result.error
      ? { table, available: false, count: null, countMode: 'PLANNED', error: result.error.message }
      : { table, available: true, count: result.count ?? 0, countMode: 'PLANNED', error: null };
  } catch (error) {
    return { table, available: false, count: null, countMode: 'PLANNED', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function stateFrom(implemented: boolean, blockers: string[], observed: boolean): InstitutionalReadinessState {
  if (!implemented) return 'GATED';
  if (blockers.length) return 'DEGRADED';
  return observed ? 'OPERATIONAL' : 'READY';
}
function probeEvidence(item: TableProbe) {
  return `${item.table}:${item.available ? item.count : 'unavailable'}:${item.countMode}`;
}

export async function readInstitutionalReadiness() {
  const fieldTables = ['field_cases','field_case_evidence','field_moph_runs','field_mihm_readings','field_hypotheses','field_interventions','field_returns','field_outcomes'];
  const studioTables = ['studio_sessions','studio_objects','studio_uploads'];
  const evidenceTables = ['root_evidence_entries','epistemic_events','sfi_evidence_ledger'];
  const graphTables = ['graph_nodes','graph_edges'];

  const [governance,agents,reports,lab,twin,mutations,worldspect,graph,kernel,fieldProbes,studioProbes,evidenceProbes,graphProbes] = await Promise.all([
    readGovernanceHealth(),
    readAgentPassports(),
    readRootReportHealth(),
    readMethodLabState(),
    readCognitiveTwinLineageHealth(),
    readCognitiveTwinMutationState(),
    getLatestWorldSpectSnapshot(),
    readCanonicalGraphState('sfi'),
    getLatestKernelCycle(),
    Promise.all(fieldTables.map(probe)),
    Promise.all(studioTables.map(probe)),
    Promise.all(evidenceTables.map(probe)),
    Promise.all(graphTables.map(probe)),
  ]);

  const studioMatrix = resolvedStudioCapabilityMatrix();
  const fieldBlockers = fieldProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`);
  const studioBlockers = [
    ...studioProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`),
    ...studioMatrix.summary.technicallySolvableBlocked.map(id=>`capability:${id}`),
  ];
  const evidenceBlockers = evidenceProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`);
  const graphStorageHealthy = graphProbes.every(item=>item.available);
  const graphProjectionBlocker = graph.degradedReason && !(graphStorageHealthy && EMPTY_GRAPH_REASONS.has(graph.degradedReason))
    ? `projection:${graph.degradedReason}`
    : null;
  const graphBlockers = [
    ...graphProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`),
    ...(graphProjectionBlocker ? [graphProjectionBlocker] : []),
  ];
  const worldBlockers = [
    ...(worldspect ? [] : ['worldspect_snapshot_missing']),
    ...(kernel ? [] : ['kernel_cycle_missing']),
  ];
  const reportBlockers = [
    ...reports.warnings,
    ...reports.lanes.filter(lane=>['NEVER_GENERATED','MISSING_CURRENT_PERIOD','CURRENT_BLOCKED'].includes(lane.state)).map(lane=>`${lane.key}:${lane.state}`),
  ];
  const twinBlockers = [
    ...(twin.genesisPresent ? [] : ['ct_genesis_missing']),
    ...(twin.chainIntegrity === 'PASS' ? [] : [`lineage:${twin.chainIntegrity}`]),
    ...(mutations.available ? [] : [mutations.warning ?? 'ct_mutation_state_unavailable']),
  ];
  const twinExternalGates = twin.limitations.filter(item=>/external timestamp|third-party|independent external/i.test(item));
  const agentBlockers = agents.passports.filter(item=>['DEGRADED','MISSING'].includes(item.lifecycle)).map(item=>`${item.id}:${item.lifecycle}`);
  const labBlockers = lab.protocols.filter(item=>item.status==='DEGRADED').flatMap(item=>item.missingDependencies.map(dep=>`${item.id}:${dep}`));
  const governanceBlockers = [...governance.warnings,...(governance.proposalLifecycle.counts.conflicted?['conflicted_objects_present']:[])];

  const fieldObserved = fieldProbes.some(item=>(item.count??0)>0);
  const studioObserved = studioProbes.some(item=>(item.count??0)>0);
  const evidenceObserved = evidenceProbes.some(item=>(item.count??0)>0);
  const graphObserved = graph.nodes.length > 0 || graph.edges.length > 0;

  const modules: ModuleReadiness[] = [
    {
      id:'governance', label:'ROOT / ACP',
      state:stateFrom(true,governanceBlockers,governance.runtime.status==='active'),
      implemented:true, observed:governance.runtime.sourceState==='observed',
      evidence:[`acp:${governance.runtime.status}`,`promotion_receipts:${governance.receipts.promotions}`],
      blockers:governanceBlockers,
      nextAction:governance.crl.persistenceDecision==='PENDING_ROOT_ACP_DECISION' ? 'Resolver el modelo de persistencia CRL con una decisión atribuible de ROOT/ACP.' : null,
    },
    {
      id:'world', label:'World / Observatory',
      state:stateFrom(true,worldBlockers,Boolean(worldspect)), implemented:true, observed:Boolean(worldspect),
      evidence:[`worldspect:${worldspect?'present':'missing'}`,`kernel:${kernel?'present':'missing'}`],
      blockers:worldBlockers,
      nextAction:worldBlockers.length?'Restaurar la dependencia de observación mundial faltante.':null,
    },
    {
      id:'field', label:'Field',
      state:stateFrom(true,fieldBlockers,fieldObserved), implemented:true, observed:fieldObserved,
      evidence:[...fieldProbes.map(probeEvidence),...(fieldObserved?[]:['EMPTY_READY:no_field_cycles_yet'])],
      blockers:fieldBlockers,
      nextAction:fieldBlockers.length?'Reconciliar la dependencia de esquema Field faltante.':null,
    },
    {
      id:'studio', label:'Studio',
      state:stateFrom(true,studioBlockers,studioObserved), implemented:true, observed:studioObserved,
      evidence:[`capabilities:${studioMatrix.summary.total}`,...studioProbes.map(probeEvidence),...(studioObserved?[]:['EMPTY_READY:no_studio_objects_yet'])],
      blockers:studioBlockers,
      nextAction:studioBlockers.length?'Completar las capacidades Studio realmente bloqueadas por implementación.':null,
    },
    {
      id:'method_lab', label:'Method Lab',
      state:lab.status==='DEGRADED'?'DEGRADED':lab.status==='OPERATIONAL'?'OPERATIONAL':'READY',
      implemented:true, observed:lab.protocols.some(item=>item.runCount>0),
      evidence:lab.protocols.map(item=>`${item.id}:${item.status}:${item.runCount}`), blockers:labBlockers,
      nextAction:labBlockers.length?'Reparar dependencias internas del laboratorio.':null,
    },
    {
      id:'cognitive_twin', label:'Cognitive Twin / CT-A01',
      state:stateFrom(true,twinBlockers,twin.eventCount>0), implemented:true, observed:twin.eventCount>0,
      evidence:[`genesis:${twin.genesisPresent}`,`lineage:${twin.chainIntegrity}`,`epochs:${twin.eventCount}`,`material:${twin.materialEventCount}`,`mutation_proposals:${mutations.unresolved}`],
      blockers:twinBlockers, externalGates:twinExternalGates,
      nextAction:twinBlockers.length
        ? (!twin.genesisPresent?'Crear génesis CT-A01.':twin.chainIntegrity!=='PASS'?'Reparar y sellar la cadena de lineage CT-A01.':'Restaurar estado de mutación gobernada.')
        : twinExternalGates.length?'Anclar checkpoints exportados mediante una autoridad temporal externa independiente.':null,
    },
    {
      id:'agents', label:'Agent Runtime',
      state:stateFrom(true,agentBlockers,agents.counts.operational>0), implemented:true, observed:agents.counts.operational>0,
      evidence:[`total:${agents.counts.total}`,`operational:${agents.counts.operational}`,`gated:${agents.counts.gated}`,`degraded:${agents.counts.degraded}`,`missing:${agents.counts.missing}`],
      blockers:agentBlockers, nextAction:agentBlockers.length?'Resolver dependencias compartidas antes de agregar agentes.':null,
    },
    {
      id:'reports', label:'Institutional Reports',
      state:stateFrom(true,reportBlockers,reports.totalReports>0), implemented:true, observed:reports.totalReports>0,
      evidence:[`reports:${reports.totalReports}`,...reports.lanes.map(lane=>`${lane.key}:${lane.state}`)],
      blockers:reportBlockers, nextAction:reportBlockers.length?'Reparar carriles de reporte del periodo actual.':null,
    },
    {
      id:'evidence', label:'Evidence Ledger',
      state:stateFrom(true,evidenceBlockers,evidenceObserved), implemented:true, observed:evidenceObserved,
      evidence:[...evidenceProbes.map(probeEvidence),...(evidenceObserved?[]:['EMPTY_READY:no_evidence_yet'])],
      blockers:evidenceBlockers, nextAction:evidenceBlockers.length?'Reparar persistencia/procedencia de evidencia.':null,
    },
    {
      id:'graph', label:'Knowledge Graph',
      state:stateFrom(true,graphBlockers,graphObserved), implemented:true, observed:graphObserved,
      evidence:[...graphProbes.map(probeEvidence),`projection_nodes:${graph.nodes.length}`,`projection_edges:${graph.edges.length}`,...(graphObserved?[]:['EMPTY_READY:no_relations_yet'])],
      blockers:graphBlockers, nextAction:graphBlockers.length?'Reparar la proyección relacional sin degradar el ledger de evidencia.':null,
    },
  ];

  const structuralComplete = modules.every(item=>item.implemented);
  const runtimeOperational = modules.every(item=>['OPERATIONAL','READY'].includes(item.state));
  const blockers = modules.flatMap(item=>item.blockers.map(blocker=>`${item.id}:${blocker}`));
  const externalGates = modules.flatMap(item=>(item.externalGates??[]).map(gate=>`${item.id}:${gate}`));

  return {
    generatedAt:new Date().toISOString(),
    mode:'TOTAL_DEVELOPMENT_CLOSURE',
    structuralComplete,
    runtimeOperational,
    modules,
    blockers,
    externalGates,
    definition:{
      structuralComplete:'Todos los órganos institucionales núcleo planeados tienen implementación ejecutable y superficie observable.',
      runtimeOperational:'Ningún órgano núcleo está DEGRADED/GATED por una dependencia interna rota. READY también cubre el estado limpio y vacío posterior a un reinicio.',
      scientificComplete:false,
      scientificBoundary:'El cierre científico requiere experimentos preregistrados, retornos observados, replicación/publicación externa y no puede alcanzarse sólo terminando software.',
      externalGateBoundary:'Publicación independiente, timestamp externo, datos de terceros y replicación se rastrean aparte del cierre interno de software.',
      countBoundary:'Los conteos de readiness son estimaciones PLANNED para salud operativa; ROOT no ejecuta COUNT exacto sobre tablas grandes sólo para pintar el tablero.',
    },
  };
}
export type InstitutionalReadiness = Awaited<ReturnType<typeof readInstitutionalReadiness>>;