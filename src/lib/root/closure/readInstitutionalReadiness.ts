import 'server-only';

import { readGovernanceHealth } from '@/lib/governance/readGovernanceHealth';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { readRootReportHealth } from '@/lib/reports/rootReportInbox';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readCognitiveTwinLineageHealth } from '@/lib/cognitive-twin/reentry/runtime';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { studioCapabilityMatrix } from '@/lib/studio/capabilities/studioCapabilityInventory';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type InstitutionalReadinessState = 'OPERATIONAL' | 'READY' | 'GATED' | 'DEGRADED';

type TableProbe = { table: string; available: boolean; count: number | null; error: string | null };
type ModuleReadiness = { id: string; label: string; state: InstitutionalReadinessState; implemented: boolean; observed: boolean; evidence: string[]; blockers: string[]; nextAction: string | null };

async function probe(table: string): Promise<TableProbe> {
  const db = createServiceSupabaseClient();
  const result = await db.from(table).select('*', { count: 'exact', head: true });
  return result.error ? { table, available:false, count:null, error:result.error.message } : { table, available:true, count:result.count??0, error:null };
}

function stateFrom(implemented: boolean, blockers: string[], observed: boolean): InstitutionalReadinessState {
  if (!implemented) return 'GATED';
  if (blockers.length) return 'DEGRADED';
  return observed ? 'OPERATIONAL' : 'READY';
}

export async function readInstitutionalReadiness() {
  const fieldTables=['field_cases','field_case_evidence','field_moph_runs','field_mihm_readings','field_hypotheses','field_interventions','field_returns','field_outcomes'];
  const studioTables=['studio_sessions','studio_objects','studio_uploads'];
  const evidenceTables=['root_evidence_entries','epistemic_events','sfi_graph_nodes','sfi_graph_edges'];
  const [governance,agents,reports,lab,twin,worldspect,graph,kernel,fieldProbes,studioProbes,evidenceProbes] = await Promise.all([
    readGovernanceHealth(), readAgentPassports(), readRootReportHealth(), readMethodLabState(), readCognitiveTwinLineageHealth(), getLatestWorldSpectSnapshot(), readCanonicalGraphState('sfi'), getLatestKernelCycle(), Promise.all(fieldTables.map(probe)), Promise.all(studioTables.map(probe)), Promise.all(evidenceTables.map(probe)),
  ]);
  const studioMatrix=studioCapabilityMatrix();
  const fieldBlockers=fieldProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`);
  const studioBlockers=[...studioProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`),...studioMatrix.summary.technicallySolvableBlocked.map(id=>`capability:${id}`)];
  const evidenceBlockers=evidenceProbes.filter(item=>!item.available).map(item=>`${item.table}:${item.error??'unavailable'}`);
  const worldBlockers=[...(worldspect?[]:['worldspect_snapshot_missing']),...(graph.degradedReason?[`graph:${graph.degradedReason}`]:[]),...(kernel?[]:['kernel_cycle_missing'])];
  const reportBlockers=[...reports.warnings,...reports.lanes.filter(lane=>['NEVER_GENERATED','MISSING_CURRENT_PERIOD','CURRENT_BLOCKED'].includes(lane.state)).map(lane=>`${lane.key}:${lane.state}`)];
  const twinBlockers=[...(twin.genesisPresent?[]:['ct_genesis_missing']),...(twin.chainIntegrity==='PASS'?[]:[`lineage:${twin.chainIntegrity}`]),...twin.limitations.filter(item=>item.toLowerCase().includes('not yet implemented'))];
  const agentBlockers=agents.passports.filter(item=>['DEGRADED','MISSING'].includes(item.lifecycle)).map(item=>`${item.id}:${item.lifecycle}`);
  const labBlockers=lab.protocols.filter(item=>item.status==='DEGRADED').flatMap(item=>item.missingDependencies.map(dep=>`${item.id}:${dep}`));
  const modules:ModuleReadiness[]=[
    {id:'governance',label:'ROOT / ACP',state:stateFrom(true,[...governance.warnings,...(governance.proposalLifecycle.counts.conflicted?['conflicted_objects_present']:[])],governance.runtime.status==='active'),implemented:true,observed:governance.runtime.sourceState==='observed',evidence:[`acp:${governance.runtime.status}`,`promotion_receipts:${governance.receipts.promotions}`],blockers:[...governance.warnings,...(governance.proposalLifecycle.counts.conflicted?['conflicted_objects_present']:[])],nextAction:governance.crl.persistenceDecision==='PENDING_ROOT_ACP_DECISION'?'Create and decide CRL persistence governance proposal.':null},
    {id:'world',label:'World / Observatory',state:stateFrom(true,worldBlockers,Boolean(worldspect)),implemented:true,observed:Boolean(worldspect),evidence:[`worldspect:${worldspect?'present':'missing'}`,`graph_nodes:${graph.nodes.length}`,`graph_edges:${graph.edges.length}`,`kernel:${kernel?'present':'missing'}`],blockers:worldBlockers,nextAction:worldBlockers.length?'Restore missing/degraded world observation dependency.':null},
    {id:'field',label:'Field',state:stateFrom(true,fieldBlockers,fieldProbes.some(item=>(item.count??0)>0)),implemented:true,observed:fieldProbes.some(item=>(item.count??0)>0),evidence:fieldProbes.map(item=>`${item.table}:${item.available?item.count:'unavailable'}`),blockers:fieldBlockers,nextAction:fieldBlockers.length?'Reconcile missing Field schema dependency.':fieldProbes.every(item=>(item.count??0)===0)?'Run one governed end-to-end Field case and return.':null},
    {id:'studio',label:'Studio',state:stateFrom(true,studioBlockers,studioProbes.some(item=>(item.count??0)>0)),implemented:true,observed:studioProbes.some(item=>(item.count??0)>0),evidence:[`capabilities:${studioMatrix.summary.total}`,...studioProbes.map(item=>`${item.table}:${item.available?item.count:'unavailable'}`)],blockers:studioBlockers,nextAction:studioBlockers.length?'Implement remaining technically solvable Studio capability.':null},
    {id:'method_lab',label:'Method Lab',state:lab.status==='DEGRADED'?'DEGRADED':lab.status==='OPERATIONAL'?'OPERATIONAL':'READY',implemented:true,observed:lab.protocols.some(item=>item.runCount>0),evidence:lab.protocols.map(item=>`${item.id}:${item.status}:${item.runCount}`),blockers:labBlockers,nextAction:lab.protocols.some(item=>item.status==='GATED')?'Run the next preregistered/gated protocol under Method Lab.':null},
    {id:'cognitive_twin',label:'Cognitive Twin / CT-A01',state:stateFrom(true,twinBlockers,twin.eventCount>0),implemented:true,observed:twin.eventCount>0,evidence:[`genesis:${twin.genesisPresent}`,`lineage:${twin.chainIntegrity}`,`epochs:${twin.eventCount}`,`material:${twin.materialEventCount}`],blockers:twinBlockers,nextAction:twinBlockers.some(item=>item.includes('timestamp'))?'Add independent external checkpoint anchoring without exposing private state.':null},
    {id:'agents',label:'Agent Runtime',state:stateFrom(true,agentBlockers,agents.counts.operational>0),implemented:true,observed:agents.counts.operational>0,evidence:[`total:${agents.counts.total}`,`operational:${agents.counts.operational}`,`gated:${agents.counts.gated}`,`degraded:${agents.counts.degraded}`,`missing:${agents.counts.missing}`],blockers:agentBlockers,nextAction:agentBlockers.length?'Resolve shared missing dependencies before adding agents.':null},
    {id:'reports',label:'Institutional Reports',state:stateFrom(true,reportBlockers,reports.totalReports>0),implemented:true,observed:reports.totalReports>0,evidence:[`reports:${reports.totalReports}`,...reports.lanes.map(lane=>`${lane.key}:${lane.state}`)],blockers:reportBlockers,nextAction:reportBlockers.length?'Allow scheduled lanes to generate/repair blocked current-period reports.':null},
    {id:'evidence',label:'Evidence / Graph',state:stateFrom(true,evidenceBlockers,evidenceProbes.some(item=>(item.count??0)>0)),implemented:true,observed:evidenceProbes.some(item=>(item.count??0)>0),evidence:evidenceProbes.map(item=>`${item.table}:${item.available?item.count:'unavailable'}`),blockers:evidenceBlockers,nextAction:evidenceBlockers.length?'Repair canonical evidence/graph persistence dependency.':null},
  ];
  const structuralComplete=modules.every(item=>item.implemented);
  const runtimeOperational=modules.every(item=>['OPERATIONAL','READY'].includes(item.state));
  const blockers=modules.flatMap(item=>item.blockers.map(blocker=>`${item.id}:${blocker}`));
  return {generatedAt:new Date().toISOString(),mode:'TOTAL_DEVELOPMENT_CLOSURE',structuralComplete,runtimeOperational,modules,blockers,definition:{structuralComplete:'All planned core institutional organs have executable implementations and observable surfaces.',runtimeOperational:'No core organ is DEGRADED/GATED by a missing dependency; READY is allowed when implementation is sound but no real run exists yet.',scientificComplete:false,scientificBoundary:'Scientific completion requires preregistered experiments, observed returns, external replication/publication and cannot be achieved by software completion alone.'}};
}
export type InstitutionalReadiness = Awaited<ReturnType<typeof readInstitutionalReadiness>>;
