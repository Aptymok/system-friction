import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';
import { executionContractForAgent } from './executionContracts';
import type { SfiExecutionTargetKind } from './executionContracts';

/**
 * C06 — Mission catalog over the EXISTING 21-agent execution registry.
 * A mission is a reusable typed assignment template, not a queued job,
 * execution record, new agent identity, authorization grant or paid invocation.
 * C07 owns durable dispatch and C08 owns server-side scheduling.
 */
export const SFI_COGNITIVE_MISSION_CONTRACT = 'SFI-COGNITIVE-MISSION-1.0' as const;

type MissionSpec = {
  title: string;
  objective: string;
  trigger: string;
  preferredTargets: SfiExecutionTargetKind[];
  prerequisite: string;
  deliverable: string;
  nextSurface: 'ROOT' | 'REALITY_CHAIN' | 'TIMELINE' | 'METHOD_LAB' | 'OBSERVATORY';
  forbiddenPromotion: string;
};

/** Each key is the existing canonical agent ID, not a newly created agent. */
const missionSpecs: Record<string, MissionSpec> = {
  meta_orchestrator: {
    title: 'Orchestrate the minimum governed case task graph',
    objective: 'Given an authorized case or project question, select only necessary agents, dependencies, blockers and next receipts without making execution claims.',
    trigger: 'SFI_TASK_REQUESTED', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'An authorized question, one existing bounded work object and permitted agent capabilities.',
    deliverable: 'Dependency graph proposal with agent IDs, evidence gaps, stop conditions and owner of next transition.',
    nextSurface: 'ROOT', forbiddenPromotion: 'Task graph proposal is neither dispatch nor authority.',
  },
  temporal_resolver: {
    title: 'Reconstruct T0, T1 and each factual clock',
    objective: 'Separate observed event time, first record time, actor knowledge, authority and RETURN windows without backdating claims.',
    trigger: 'SFI_TASK_CREATED', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'Dated source or case records; otherwise explicitly retain unknown T0/T1.',
    deliverable: 'Source-bounded temporal reconstruction for Timeline and Reality Chain.',
    nextSurface: 'TIMELINE', forbiddenPromotion: 'Missing event dates remain UNKNOWN.',
  },
  evidence_hunter: {
    title: 'Find missing sources for case claims',
    objective: 'Identify unsupported claims, candidate primary sources and conflicting evidence for the next adjudication.',
    trigger: 'SFI_TASK_CREATED', preferredTargets: ['CASE','PROJECT','EVIDENCE'],
    prerequisite: 'A declared claim or question, scope, inclusion/exclusion criteria and case authorization.',
    deliverable: 'Candidate-source list with provenance, missingness and verification actions.',
    nextSurface: 'REALITY_CHAIN', forbiddenPromotion: 'Discovered source is not admitted evidence.',
  },
  historical_scout: {
    title: 'Trace historical origins of KXTXR and other cases',
    objective: 'Reconstruct the chronology from original Studio, repository and declared external source records using only retrieved material.',
    trigger: 'SFI_TASK_CREATED', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'Legitimate historical sources and an explicit review window; sources must be obtained before claims.',
    deliverable: 'Dated source ledger, contradictions and unresolved historical gaps.',
    nextSurface: 'REALITY_CHAIN', forbiddenPromotion: 'An empty current Studio table cannot negate its past existence.',
  },
  phenotype_resolver: {
    title: 'Compare repeatable system configurations',
    objective: 'Find structural precedents for a case or project while separating matched configuration from a causal analogy.',
    trigger: 'SFI_HISTORICAL_SOURCE_SET_DECLARED', preferredTargets: ['CASE','PROJECT','NODE'],
    prerequisite: 'Documented comparable source cases or field configurations.',
    deliverable: 'Configuration-match assessment with comparable and non-comparable variables.',
    nextSurface: 'ROOT', forbiddenPromotion: 'Structural resemblance does not establish identical outcome.',
  },
  context_builder: {
    title: 'Build the bounded cognitive field context',
    objective: 'Link authorized case actors, constraints, evidence, attractor declarations, temporal anchors and known missingness.',
    trigger: 'SFI_TEMPORAL_COORDINATE_RESOLVED', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'At least one resolved source or temporal coordinate and authorized work-object scope.',
    deliverable: 'Context map of source, declared claims, uncertainty and reviewable object references.',
    nextSurface: 'ROOT', forbiddenPromotion: 'Context must never be relabeled admitted evidence.',
  },
  social_field_simulator: {
    title: 'Model bounded aggregate sociotechnical scenarios',
    objective: 'Simulate population-level interaction under explicitly governed, aggregated inputs.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'Admissible cohort definitions and social variables; privacy and group impacts reviewed.',
    deliverable: 'Scenario comparison, caveats and variables missing for an observed outcome.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'No individual scoring or observed-social-state claim from simulation.',
  },
  economic_field_simulator: {
    title: 'Simulate verified economic resource constraints',
    objective: 'Estimate capital, labor, resource and market sensitivity for the selected project or case.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Economic inputs with provenance, currency, horizon and known missing values.',
    deliverable: 'Economic scenario bounds and falsifiable assumptions, not actual financial results.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'Simulated revenue or cost is not measured ROI or expenditure.',
  },
  policy_simulator: {
    title: 'Test governed policy alternatives',
    objective: 'Explore consequences of candidate institutional decisions without granting any decision authority.',
    trigger: 'SFI_GOVERNANCE_REVIEW_REQUESTED', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Explicit jurisdiction, constraints, decision consequences and affected parties.',
    deliverable: 'Alternative-policy simulation with risk, assumptions and required authorizer.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'Policy simulation is neither legal advice nor adopted policy.',
  },
  cultural_simulator: {
    title: 'Test cultural signal transmission',
    objective: 'Compare scenarios for documented cultural signals, narratives and audience observations.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Provenanced cultural/world observations; do not treat platform reach as recognition.',
    deliverable: 'Cultural transmission hypothesis and measurable external-return criteria.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'A simulation is not an actual post, audience reaction or music release.',
  },
  psychological_simulator: {
    title: 'Model bounded system-level cognitive friction',
    objective: 'Explore explicit, consented or de-identified behavioral assumptions for a case without profiling a person.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'Governance review for identifiable people, permission to use data and a legitimate declared basis.',
    deliverable: 'Clearly hypothetical stress-test with missing inputs and privacy limitations.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'No individual diagnosis, inferred desire, psychometric score or sensitive attribution.',
  },
  trajectory_agent: {
    title: 'Compare project trajectory against declared attractor',
    objective: 'Track known T0, successive project states, measured drift and plausible trajectories.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'A declared attractor, dated baseline and at least one identifiable observation when claiming drift.',
    deliverable: 'Trajectory scenarios and observation requests for Timeline.',
    nextSurface: 'TIMELINE', forbiddenPromotion: 'Projected attainment cannot be presented as achieved target state.',
  },
  reality_calibration: {
    title: 'Contrast predictions with observed RETURN',
    objective: 'Compare a sealed or timestamped prediction to a genuinely observed, comparable post-execution outcome.',
    trigger: 'prediction.outcome.recorded', preferredTargets: ['CASE','CYCLE'],
    prerequisite: 'Prediction identity, frozen baseline, admissible observed RETURN and comparison window.',
    deliverable: 'Contrast residual, contradiction and proposed calibration, if RETURN is sufficient.',
    nextSurface: 'REALITY_CHAIN', forbiddenPromotion: 'Without external RETURN: WAITING_RETURN, never learning or CANON.',
  },
  risk_agent: {
    title: 'Assess blockers before governed case or project action',
    objective: 'Quantify only source-supported technical, legal, resource and epistemic downside and human approvals.',
    trigger: 'SFI_TRAJECTORY_ASSESSED', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Documented proposal, scope, affected parties and known failure modes.',
    deliverable: 'Risk ledger with mitigations and stop recommendation when warranted.',
    nextSurface: 'ROOT', forbiddenPromotion: 'Risk inference is not a decision or permission to act.',
  },
  opportunity_agent: {
    title: 'Identify opportunities with falsifiable selection criteria',
    objective: 'Propose viable windows only after comparing risk, constraints and real-world signals.',
    trigger: 'SFI_RISK_DECLARED', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Source-supported opportunity, risk assessment and bounded cost horizon.',
    deliverable: 'Ranked conditional options and evidence needed to choose.',
    nextSurface: 'ROOT', forbiddenPromotion: 'An opportunity proposal is not revenue, adoption or external recognition.',
  },
  multi_stakeholder_bootstrap: {
    title: 'Model divergence among authorized stakeholders',
    objective: 'Compare operator, institution, client and affected-group scenarios before intervention.',
    trigger: 'SFI_RISK_DECLARED', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Stakeholder definitions, consequences and required human authorization.',
    deliverable: 'Aggregate divergence model and governed alternatives.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'Stakeholder simulation never supplies consent or human approval.',
  },
  project_execution_manager: {
    title: 'Check dependencies and handoff for project actions',
    objective: 'For one project/case, identify accountable operator, prerequisite evidence, required authority and missing execution receipts.',
    trigger: 'SFI_TASK_CREATED', preferredTargets: ['PROJECT','CASE'],
    prerequisite: 'Existing project/case and governed proposal with known dependencies.',
    deliverable: 'Handoff checklist with WAITING_AUTHORITY / WAITING_EVIDENCE / READY_TO_PROPOSE, no invented execution.',
    nextSurface: 'ROOT', forbiddenPromotion: 'A ready-to-propose state is not an authorized or performed action.',
  },
  field_observer: {
    title: 'Observe source-bounded case and world changes',
    objective: 'Read canonical case/project evidence already available and identify genuinely new observed state changes.',
    trigger: 'root.evidence.recorded', preferredTargets: ['CASE','PROJECT','EVIDENCE'],
    prerequisite: 'Accessible persisted observations with time, provenance and declared read plane.',
    deliverable: 'Dated observation summary plus missing/contradictory source flags.',
    nextSurface: 'OBSERVATORY', forbiddenPromotion: 'No new real-world observation may be fabricated from absence or model narration.',
  },
  friction_field_simulator: {
    title: 'Estimate information, coordination and resource friction',
    objective: 'Bound possible friction for a case/project using measured delays, constraints and recorded coordination dependencies.',
    trigger: 'SFI_FIELD_STATE_OBSERVED', preferredTargets: ['CASE','PROJECT'],
    prerequisite: 'Documented constraints and baseline; unknown information retains uncertainty.',
    deliverable: 'Simulated friction profile and observable indicators needed to test it.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'Modeled friction is not externally observed loss.',
  },
  cross_impact: {
    title: 'Analyze coupling between two documented variables',
    objective: 'Assess cross-impact of at least two real object references without assuming causal direction.',
    trigger: 'SFI_CONTEXT_COORDINATE_BUILT', preferredTargets: ['NODE','EVIDENCE'],
    prerequisite: 'Two or more authorized NODE/EVIDENCE references and defined comparison variables.',
    deliverable: 'Interaction hypothesis, direction/range and falsification requirements.',
    nextSurface: 'METHOD_LAB', forbiddenPromotion: 'Association and model coupling are not proof of causality.',
  },
  entropy_redistribution: {
    title: 'Prioritize contradiction and unresolved uncertainty',
    objective: 'Locate concentrated missingness across hypotheses, sources and recorded decisions for a bounded case.',
    trigger: 'SFI_CROSS_IMPACT_ANALYZED', preferredTargets: ['CASE','PROJECT','NODE'],
    prerequisite: 'Explicit hypothesis/contradiction inventory or documented uncertainty.',
    deliverable: 'Missingness ranking and next evidence-acquisition proposals.',
    nextSurface: 'REALITY_CHAIN', forbiddenPromotion: 'Entropy estimates do not imply an observed physical phenomenon or case resolution.',
  },
};

export type SfiCognitiveMission = {
  contract: typeof SFI_COGNITIVE_MISSION_CONTRACT;
  missionId: string;
  agentId: string;
  agentName: string;
  title: string;
  objective: string;
  trigger: string;
  triggerRegistered: true;
  inputKinds: SfiExecutionTargetKind[];
  minimumTargets: number;
  maximumTargets: number;
  executionContractVersion: string;
  executorBound: boolean;
  prerequisite: string;
  deliverable: string;
  nextSurface: MissionSpec['nextSurface'];
  forbiddenPromotion: string;
  authorityLevel: string;
  humanApprovalRequired: boolean;
  simulationAllowed: boolean;
  sourceTables: string[];
  emits: string[];
  assignmentState: 'TEMPLATE_DEFINED_NOT_QUEUED';
  executionObservation: 'NOT_EXECUTED_BY_MISSION_CATALOG';
  dispatchState: 'NOT_CONNECTED_UNTIL_C07';
  scheduleState: 'NOT_CONNECTED_UNTIL_C08';
  targetBindingState: 'REQUIRES_AUTHORIZED_EXISTING_OBJECT';
  costState: 'NOT_REQUESTED_NOT_SPENT';
  permissionDelta: 0;
};

/**
 * Fail closed on registry drift. Never silently invent/remove an agent,
 * widen targets beyond its existing execution contract, or select a trigger
 * the actual agent passport does not subscribe to.
 */
export function listBoundedCognitiveMissions(): SfiCognitiveMission[] {
  const registered=SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY;
  const registeredIds=new Set(registered.map(agent=>agent.id));
  if(registeredIds.size!==registered.length)throw new Error('SFI_C06_DUPLICATE_CANONICAL_AGENT');
  if(Object.keys(missionSpecs).length!==registered.length||
      Object.keys(missionSpecs).some(id=>!registeredIds.has(id)))
    throw new Error('SFI_C06_MISSION_REGISTRY_DRIFT');
  return registered.map(agent=>{
    const spec=missionSpecs[agent.id];
    const contract=executionContractForAgent(agent.id);
    if(!spec||!contract)throw new Error('SFI_C06_MISSION_CONTRACT_MISSING:'+agent.id);
    if(!agent.listensTo.includes(spec.trigger))throw new Error('SFI_C06_TRIGGER_NOT_REGISTERED:'+agent.id);
    if(spec.preferredTargets.some(kind=>!contract.allowedTargetKinds.includes(kind)))
      throw new Error('SFI_C06_TARGET_NOT_ALLOWED:'+agent.id);
    if(contract.minTargets>contract.maxTargets||contract.minTargets<1)
      throw new Error('SFI_C06_TARGET_COUNT_CONTRACT_INVALID:'+agent.id);
    const executorBound=typeof SFI_AGENT_EXECUTION_MAP[agent.id]==='function';
    if(!executorBound)throw new Error('SFI_C06_EXISTING_EXECUTOR_MISSING:'+agent.id);
    return {
      contract:SFI_COGNITIVE_MISSION_CONTRACT,
      missionId:'SFI-C06:'+agent.id,
      agentId:agent.id,agentName:agent.name,
      title:spec.title,objective:spec.objective,
      trigger:spec.trigger,triggerRegistered:true as const,
      inputKinds:spec.preferredTargets.slice(),
      minimumTargets:contract.minTargets,maximumTargets:contract.maxTargets,
      executionContractVersion:contract.version,executorBound,
      prerequisite:spec.prerequisite,deliverable:spec.deliverable,
      nextSurface:spec.nextSurface,forbiddenPromotion:spec.forbiddenPromotion,
      authorityLevel:agent.authorityLevel,
      humanApprovalRequired:agent.humanApprovalRequired,
      simulationAllowed:agent.simulationAllowed,
      sourceTables:[...agent.sourceTables],emits:[...agent.emits],
      assignmentState:'TEMPLATE_DEFINED_NOT_QUEUED' as const,
      executionObservation:'NOT_EXECUTED_BY_MISSION_CATALOG' as const,
      dispatchState:'NOT_CONNECTED_UNTIL_C07' as const,
      scheduleState:'NOT_CONNECTED_UNTIL_C08' as const,
      targetBindingState:'REQUIRES_AUTHORIZED_EXISTING_OBJECT' as const,
      costState:'NOT_REQUESTED_NOT_SPENT' as const,
      permissionDelta:0 as const,
    };
  });
}
