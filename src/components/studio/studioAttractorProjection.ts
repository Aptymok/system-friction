/** Read-only, owner-scoped Studio attraction view. Reuses persisted studio_objects
 * and existing Reality Passport epistemic stages; never creates authority,
 * execution, RETURN or graph relationships from title similarity.
 */
export type StudioAttractorNode = {
  id:string; label:string; kind:'attractor'|'project'|'object';
  epistemic:'DECLARED'|'OBSERVED'|'UNKNOWN';
  parentId:string|null; sourceObjectId:string|null;
  source:'STUDIO_OBJECT_METADATA'|'STUDIO_SESSION_GROUPING'|'STUDIO_PERSISTED_OBJECT';
  passport:Record<string,unknown>;
};
export type StudioAttractorEdge={from:string;to:string;relation:'DECLARED_GROUPING'|'SESSION_GROUPING';canonical:false};
type Row=Record<string,unknown>;
const rec=(x:unknown):Row => x && typeof x==='object'&&!Array.isArray(x)?x as Row:{};
const s=(x:unknown)=>typeof x==='string'&&x.trim()?x.trim():null;
const one=(...values:unknown[])=>values.map(s).find(Boolean)??null;
const passportKeys={
  world:['wsv','worldspect','worldVector','worldObservation','culturalVector'],
  scoreFriction:['scoreFriction','score_friction'],
  mihm:['mihm','MIHM'],
  fad:['fad','FAD'],
  t0:['t0','T0','baseline'],
  invariants:['invariants','minimumInvariants','minimum_invariants'],
  observationWindow:['observationWindow','verificationWindow','timeWindow'],
  hypotheses:['hypotheses','hypothesis','H1','H2'],
  contrast:['contrast','contrastResult'],
  authority:['authority','authorization','authorizedBy'],
  action:['action','execution','executedAt'],
  expectedReturn:['expectedReturn','predictedReturn'],
  observedReturn:['observedReturn','return','RETURN'],
  learning:['learning','integratedLearning'],
  t1:['t1','T1','followUp'],
  winningHypothesis:['winningHypothesis','winner','selectedHypothesis'],
} as const;
function onlyRepresented(source:Row,fields:readonly string[]):unknown|null{
  for(const field of fields)if(source[field]!==null&&source[field]!==undefined)return source[field];
  return null;
}
export function studioAttractorProjection(objects:Row[]):{nodes:StudioAttractorNode[];edges:StudioAttractorEdge[]}{
  const nodes:StudioAttractorNode[]=[];const edges:StudioAttractorEdge[]=[];
  const seen=new Set<string>();
  function push(n:StudioAttractorNode){if(!seen.has(n.id)){nodes.push(n);seen.add(n.id);}}
  for(const object of objects.slice(0,120)){
    const id=s(object.id);if(!id)continue;
    const meta=rec(object.metadata);
    const narrative=rec(meta.narrative);
    const group=rec(meta.project);
    const attractor=one(meta.attractorName,meta.attractor_name,rec(meta.attractor).name,rec(meta.attractor).label,
      narrative.attractor);
    const project=one(meta.projectName,meta.project_name,group.name,narrative.project);
    const sessionId=s(object.session_id);
    let parent:string|null=null;
    if(attractor){
      const attractorId='attractor:'+attractor.toLocaleLowerCase();
      push({id:attractorId,label:attractor,kind:'attractor',epistemic:'DECLARED',
        parentId:null,sourceObjectId:null,source:'STUDIO_OBJECT_METADATA',passport:{}});
      parent=attractorId;
    }
    if(project){
      const projectId='project:'+(attractor??'unassigned').toLocaleLowerCase()+':'+project.toLocaleLowerCase();
      push({id:projectId,label:project,kind:'project',epistemic:'DECLARED',
        parentId:parent,sourceObjectId:null,source:'STUDIO_OBJECT_METADATA',passport:{}});
      if(parent)edges.push({from:parent,to:projectId,relation:'DECLARED_GROUPING',canonical:false});
      parent=projectId;
    } else if(!attractor&&sessionId){
      const sessionNode='session:'+sessionId;
      push({id:sessionNode,label:'Sesión '+sessionId.slice(0,8),kind:'project',
        epistemic:'OBSERVED',parentId:null,sourceObjectId:null,
        source:'STUDIO_SESSION_GROUPING',passport:{}});
      parent=sessionNode;
    }
    const fields:Record<string,unknown>={};
    for(const [name,aliases] of Object.entries(passportKeys)){
      fields[name]=onlyRepresented(meta,aliases)??onlyRepresented(rec(meta.passport),aliases)
        ??onlyRepresented(rec(meta.realityPassport),aliases);
    }
    const passport={
      status:'PARTIAL_RECONSTRUCTION',
      title:s(object.title)??'Objeto sin título',
      objectType:one(object.object_type,object.type),
      createdAt:s(object.created_at),
      updatedAt:s(object.updated_at),
      persistence:{objectId:id,source:'STUDIO_OBJECT_READ',represented:true},
      epistemicBoundary:'METADATA_DECLARED_NOT_VERIFIED_HISTORY',
      stageEvidence:fields,
      gaps:Object.entries(fields).filter(([,value])=>value===null).map(([name])=>name),
      outcomeVerified:false,
    };
    const nodeId='object:'+id;
    push({id:nodeId,label:s(object.title)??'Objeto '+id.slice(0,8),kind:'object',
      epistemic:'OBSERVED',parentId:parent,sourceObjectId:id,
      source:'STUDIO_PERSISTED_OBJECT',passport});
    if(parent)edges.push({from:parent,to:nodeId,
      relation:parent.startsWith('session:')?'SESSION_GROUPING':'DECLARED_GROUPING',canonical:false});
  }
  return {nodes,edges};
}
