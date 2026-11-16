/**
 * SFI Studio · project-continuity campaign planner.
 *
 * Reuses the existing, owner-scoped Studio Field read model. It does not write
 * a second project registry, infer relationships from track names, fabricate
 * worldwide audience data, or authorize publication.
 *
 * Numerical values are explicit planning constraints; no calibrated optimum
 * or observed campaign effectiveness is asserted.
 */
import type { StudioAttractorNode, StudioAttractorEdge } from './studioAttractorProjection';

export type CampaignPhase = 'PRE_RELEASE'|'RELEASE'|'POST_RELEASE'|'REACTIVATION'|'TRANSITION';
export type CampaignChannel = 'instagram'|'tiktok'|'youtube'|'website'|'newsletter';
export type CampaignEvidenceInput = {
  sourceUrl:string;
  sourceTitle:string;
  observedAt:string;
  relevance:'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN';
  relevanceRationale:string;
  observationKind:'PAST_SIGNAL'|'DATED_FUTURE_EVENT';
  eventDate?:string|null;
};
export type CampaignConstraints = {
  anchorId:string;
  phase:CampaignPhase;
  startDate:string;
  weeks:number;
  channels:CampaignChannel[];
  assetFormats:('PHOTOGRAPH'|'VIDEO'|'TEXT'|'AUDIO')[];
  releaseCandidates?:string[];
  externalObservations?:CampaignEvidenceInput[];
};
export type CampaignOutput = {
  contract:'SFI-STUDIO-CONTINUITY-CAMPAIGN-1.0';
  anchor:{id:string;title:string;kind:string};
  ancestry:Array<{id:string;title:string;kind:string}>;
  descendants:Array<{id:string;title:string;kind:string}>;
  continuity:{
    relationProvenance:'EXPLICIT_STUDIO_FIELD_EDGES';
    unsupportedInterpretations:string[];
    preservedNarrative:string[];
    relationCount:number;
    sourceObjects:string[];
  };
  phase:CampaignPhase;
  hypotheses:{
    h1:'NARRATIVE_IDENTITY';
    h2:'LISTENING_EXPERIENCE';
    metric:'save_rate';
    protocol:'A_B_POSTS_IN_SIMILAR_24_HOUR_READ_WINDOW';
    preregisteredAt:null;
    causalIdentification:'NOT_ESTABLISHED';
    baseline:'NOT_OBSERVED';
    decisionThreshold:'NO_CALIBRATED_THRESHOLD';
  };
  timeWindow:{start:string;end:string;weeks:number};
  schedule:Array<{
    date:string;
    channel:CampaignChannel;
    format:'PHOTOGRAPH'|'VIDEO'|'TEXT'|'AUDIO';
    assignment:string;
    why:string;
    state:'PROPOSED_NOT_EXECUTED';
    t0:string;
    t1:string;
    expectedObservation:string;
    executionReceipt:null;
    observedReturn:null;
  }>;
  releaseWindows:Array<{date:string;conflicts:string[];evidence:string[];state:'CANDIDATE_NOT_OPTIMIZED'}>;
  evidence:{
    admissibleEvents:number;
    retrospectiveSignals:number;
    observations:CampaignEvidenceInput[];
    algorithm:'DATE_CONFLICT_SCREEN_ONLY';
    causalCalibration:'NOT_PERFORMED';
  };
  authority:{publication:'NOT_AUTHORIZED';spending:'NOT_AUTHORIZED';assetGeneration:'REQUIRES_PROVIDER_GATE'};
  proof:{campaignExecuted:false;socialPerformanceObserved:false;winningHypothesis:null;method:'PROPOSAL_ONLY'};
};

const pad=(x:number)=>String(x).padStart(2,'0');
const isoDay=(timestamp:number)=>{const date=new Date(timestamp);return date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1)+'-'+pad(date.getUTCDate());};
const DAY=86_400_000;
function day(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('DATE_MUST_BE_ISO_DAY');
  const n=Date.parse(value+'T12:00:00Z');
  if(!Number.isFinite(n)||isoDay(n)!==value)throw new Error('INVALID_DATE');
  return n;
}
function inWindow(at:number,start:number,end:number){return at>=start&&at<=end;}
function unique<T>(values:T[]):T[]{return [...new Set(values)];}
function nodeRef(node:StudioAttractorNode){return {id:node.id,title:node.label,kind:node.kind};}
function evidenceValid(obs:CampaignEvidenceInput) {
  if(!obs.sourceUrl.startsWith('https://')||!obs.sourceTitle.trim()||
    !Number.isFinite(Date.parse(obs.observedAt)))return false;
  if(obs.observationKind==='DATED_FUTURE_EVENT'&&!obs.eventDate)return false;
  if(obs.eventDate){try{day(obs.eventDate);}catch{return false;}}
  return true;
}
function neighbors(graph:{nodes:StudioAttractorNode[];edges:StudioAttractorEdge[]},anchorId:string) {
  const byId=new Map(graph.nodes.map(node=>[node.id,node]));
  const parents:StudioAttractorNode[]=[];
  const children:StudioAttractorNode[]=[];
  const visited=new Set<string>([anchorId]);
  let current=byId.get(anchorId);
  for(let depth=0;depth<16&&current?.parentId;depth++){
    const parent=byId.get(current.parentId);if(!parent||visited.has(parent.id))break;
    parents.unshift(parent);visited.add(parent.id);current=parent;
  }
  const queue=[anchorId];
  while(queue.length&&children.length<80){
    const id=queue.shift()!;
    // Containment and explicitly persisted grouping, not influence or assumed causation.
    for(const child of graph.nodes){
      if(child.parentId===id&&!visited.has(child.id)){
        visited.add(child.id);children.push(child);queue.push(child.id);
      }
    }
  }
  return {parents,children};
}
function stageAssignment(phase:CampaignPhase,week:number,weeks:number) {
  if(phase==='PRE_RELEASE')return week===weeks-1?
    'Presentar pieza final de anticipación sin afirmar publicación ejecutada':
    'Desarrollar una pieza fotográfica narrativa y contrastar atención inicial';
  if(phase==='RELEASE')return week===0?'Preparar publicación de estreno autorizable':
    'Preparar una extensión editorial del lanzamiento';
  if(phase==='POST_RELEASE')return week===weeks-1?'Preparar transición narrativa hacia el siguiente nodo registrado':
    'Recontextualizar el single con una pieza independiente y nueva observación';
  if(phase==='REACTIVATION')return 'Redescubrir la obra y comparar respuesta antes de invertir en promoción';
  return 'Construir puente narrativo hacia el siguiente release declarado';
}
function expected(phase:CampaignPhase):string{
  return phase==='PRE_RELEASE'?'Impresiones, visitas al perfil y guardados reales por publicación':
    phase==='RELEASE'?'Reproducciones, clics al enlace y guardados reales':
    'Alcance, retención, guardados y clics reales por pieza';
}
export function planStudioContinuityCampaign(
  graph:{nodes:StudioAttractorNode[];edges:StudioAttractorEdge[]},
  constraints:CampaignConstraints,
):CampaignOutput {
  const anchor=graph.nodes.find(node=>node.id===constraints.anchorId);
  if(!anchor)throw new Error('ATTRACTOR_NODE_NOT_FOUND');
  const weeks=constraints.weeks;
  if(!Number.isSafeInteger(weeks)||weeks<1||weeks>12)throw new Error('CAMPAIGN_WEEKS_OUT_OF_RANGE');
  const start=day(constraints.startDate);
  const end=start+(weeks*7-1)*DAY;
  const channels=unique(constraints.channels);
  const formats=unique(constraints.assetFormats);
  if(!channels.length||channels.length>5||!formats.length||formats.length>4)throw new Error('CAMPAIGN_OUTPUTS_REQUIRED');
  const permittedChannels=new Set(['instagram','tiktok','youtube','website','newsletter']);
  const permittedFormats=new Set(['PHOTOGRAPH','VIDEO','TEXT','AUDIO']);
  if(channels.some(x=>!permittedChannels.has(x))||formats.some(x=>!permittedFormats.has(x)))throw new Error('UNKNOWN_CAMPAIGN_OUTPUT_TYPE');
  const {parents,children}=neighbors(graph,anchor.id);
  const relatives=new Set([anchor.id,...parents.map(n=>n.id),...children.map(n=>n.id)]);
  const relationCount=graph.edges.filter(edge=>relatives.has(edge.from)&&relatives.has(edge.to)).length;
  const observations=(constraints.externalObservations??[]).slice(0,50).filter(evidenceValid);
  const candidates=unique((constraints.releaseCandidates??[]).slice(0,16));
  const futureEvents=observations.filter(s=>s.observationKind==='DATED_FUTURE_EVENT'&&s.eventDate);
  const releaseWindows=candidates.map(date=>{
    const candidate=day(date);
    const collisions=futureEvents.filter(obs=>Math.abs(day(obs.eventDate!)-candidate)<=2*DAY);
    return {
      date,
      conflicts:collisions.map(obs=>obs.sourceTitle),
      evidence:collisions.map(obs=>obs.sourceUrl),
      state:'CANDIDATE_NOT_OPTIMIZED' as const,
    };
  });
  const schedule:CampaignOutput['schedule']=[];
  // One distinct, stage-specific editorial assignment per selected channel per week.
  // Proposed publication never silently becomes an observed action.
  for(let week=0;week<weeks;week++){
    for(const [index,channel] of channels.entries()){
      const date=isoDay(start+(week*7+Math.min(index,6))*DAY);
      schedule.push({
        date,channel,format:formats[(week+index)%formats.length],
        assignment:stageAssignment(constraints.phase,week,weeks),
        why:'Declared '+constraints.phase+' phase · week '+(week+1)+' · preserved context '+anchor.label,
        state:'PROPOSED_NOT_EXECUTED',
        t0:date,
        t1:isoDay(day(date)+7*DAY),
        expectedObservation:expected(constraints.phase),
        executionReceipt:null,observedReturn:null,
      });
    }
  }
  const sourceObjects=children.filter(node=>node.sourceObjectId).map(node=>node.sourceObjectId!);
  const descriptions=[anchor,...parents,...children]
    .map(node=>node.passport.description)
    .filter((value):value is string=>typeof value==='string'&&value.trim().length>0)
    .slice(0,24);
  return {
    contract:'SFI-STUDIO-CONTINUITY-CAMPAIGN-1.0',
    anchor:nodeRef(anchor),ancestry:parents.map(nodeRef),descendants:children.map(nodeRef),
    continuity:{
      relationProvenance:'EXPLICIT_STUDIO_FIELD_EDGES',
      unsupportedInterpretations:descriptions.length?[]:['No explicit narrative motif description is registered.'],
      preservedNarrative:unique(descriptions),
      relationCount,
      sourceObjects:unique(sourceObjects),
    },
    phase:constraints.phase,
    hypotheses:{
      h1:'NARRATIVE_IDENTITY',h2:'LISTENING_EXPERIENCE',
      metric:'save_rate',
      protocol:'A_B_POSTS_IN_SIMILAR_24_HOUR_READ_WINDOW',
      preregisteredAt:null,
      causalIdentification:'NOT_ESTABLISHED',
      baseline:'NOT_OBSERVED',
      decisionThreshold:'NO_CALIBRATED_THRESHOLD',
    },
    timeWindow:{start:constraints.startDate,end:isoDay(end),weeks},
    schedule,releaseWindows,
    evidence:{
      admissibleEvents:futureEvents.length,
      retrospectiveSignals:observations.filter(o=>o.observationKind==='PAST_SIGNAL').length,
      observations,
      algorithm:'DATE_CONFLICT_SCREEN_ONLY',
      causalCalibration:'NOT_PERFORMED',
    },
    authority:{publication:'NOT_AUTHORIZED',spending:'NOT_AUTHORIZED',assetGeneration:'REQUIRES_PROVIDER_GATE'},
    proof:{campaignExecuted:false,socialPerformanceObserved:false,winningHypothesis:null,method:'PROPOSAL_ONLY'},
  };
}
