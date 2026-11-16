/** Read-only, owner-scoped Studio attraction view. Reuses persisted studio_objects
 * and existing Reality Passport epistemic stages; never creates authority,
 * execution, RETURN or graph relationships from title similarity.
 */
export type StudioAttractorNode = {
  id:string; label:string; kind:'attractor'|'project'|'node'|'object';
  epistemic:'DECLARED'|'OBSERVED'|'UNKNOWN';
  parentId:string|null; sourceObjectId:string|null;
  source:'STUDIO_OBJECT_METADATA'|'STUDIO_SESSION_GROUPING'|'STUDIO_PERSISTED_OBJECT'|'STUDIO_FIELD_DECLARATION';
  passport:Record<string,unknown>;
};
export type StudioAttractorEdge={from:string;to:string;relation:'DECLARED_GROUPING'|'SESSION_GROUPING'|'CONTAINS'|'DERIVED_FROM'|'INFLUENCES'|'PROJECTS';canonical:false};
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
  hypotheses:['hypotheses','hypothesis'],
  h1:['H1','h1','hypothesis1'],
  h2:['H2','h2','hypothesis2'],
  agent:['agent','agentId','executingAgent','executor'],
  rationale:['rationale','decisionReason','reason','why'],
  contrast:['contrast','contrastResult'],
  authority:['authority','authorization','authorizedBy'],
  action:['action','execution','executedAt'],
  expectedReturn:['expectedReturn','predictedReturn'],
  observedReturn:['observedReturn','return','RETURN'],
  learning:['learning','integratedLearning'],
  appliedChange:['appliedChange','changed','modified','integration'],
  targetFulfilled:['goalMet','fulfilled','metObjective','successObserved'],
  nextObservation:['nextBestObservation','nextObservation','missingEvidence'],
  t1:['t1','T1','followUp'],
  winningHypothesis:['winningHypothesis','winner','selectedHypothesis'],
} as const;
function onlyRepresented(source:Row,fields:readonly string[]):unknown|null{
  for(const field of fields)if(source[field]!==null&&source[field]!==undefined)return source[field];
  return null;
}
export function studioAttractorProjection(objects:Row[], sessions:Row[]=[]):{nodes:StudioAttractorNode[];edges:StudioAttractorEdge[]}{
  const nodes:StudioAttractorNode[]=[];const edges:StudioAttractorEdge[]=[];
  const seen=new Set<string>();
  const fieldNodeBySession=new Map<string,Map<string,string>>();
  function push(n:StudioAttractorNode){if(!seen.has(n.id)){nodes.push(n);seen.add(n.id);}}
  // These are the existing persisted Studio Field nodes and explicit edges,
  // not relationships guessed from asset titles or thematic similarity.
  for(const session of sessions.slice(0,50)){
    const sessionId=s(session.id);
    if(!sessionId)continue;
    const field=rec(rec(session.metadata).field);
    const root=rec(field.attractor);
    const declaredAttractorId=s(root.id);
    const sessionRootId='field-attractor:'+sessionId;
    const localNodes=Array.isArray(field.nodes)?field.nodes.filter((x):x is Row=>x!==null&&typeof x==='object'&&!Array.isArray(x)).slice(0,150):[];
    const localEdges=Array.isArray(field.edges)?field.edges.filter((x):x is Row=>x!==null&&typeof x==='object'&&!Array.isArray(x)).slice(0,300):[];
    const scoped=new Map<string,string>();
    if(declaredAttractorId){
      scoped.set(declaredAttractorId,sessionRootId);
      push({id:sessionRootId,label:s(root.label)??s(session.title)??'Atractor',
        kind:'attractor',epistemic:'DECLARED',parentId:null,sourceObjectId:null,
        source:'STUDIO_FIELD_DECLARATION',
        passport:{status:'PARTIAL_RECONSTRUCTION',declaredAt:s(root.declaredAt),description:s(root.description),
          fieldVersion:s(field.version)??'UNKNOWN'}});
    }
    for(const item of localNodes){
      const raw=s(item.id);if(!raw||scoped.has(raw)||s(item.archivedAt))continue;
      const id='field-node:'+sessionId+':'+raw;
      scoped.set(raw,id);
      const parentRaw=s(item.parentId);
      const parent=parentRaw?scoped.get(parentRaw)??null:null;
      push({id,label:s(item.label)??'Nodo',kind:item.kind==='project'?'project':'node',
        epistemic:'DECLARED',parentId:parent??(declaredAttractorId?sessionRootId:null),
        sourceObjectId:null,source:'STUDIO_FIELD_DECLARATION',
        passport:{status:'PARTIAL_RECONSTRUCTION',
          declaredAt:s(item.createdAt),description:s(item.description),
          observedReturn:null,authority:null}});
    }
    // Resolve parents in a second pass to support unsorted persisted field nodes.
    for(const item of localNodes){
      const id=scoped.get(s(item.id)??'');
      if(!id)continue;
      const node=nodes.find(n=>n.id===id);
      if(node){
        const rawParent=s(item.parentId);
        node.parentId=(rawParent?scoped.get(rawParent):null)??(declaredAttractorId?sessionRootId:null);
        if(node.parentId&&node.parentId!==id){
          edges.push({from:node.parentId,to:id,relation:'CONTAINS',canonical:false});
        }
      }
    }
    const validRelations=new Set(['CONTAINS','DERIVED_FROM','INFLUENCES','PROJECTS']);
    for(const edge of localEdges){
      const from=scoped.get(s(edge.sourceId)??'');
      const to=scoped.get(s(edge.targetId)??'');
      const relation=s(edge.relationType);
      if(from&&to&&from!==to&&relation&&validRelations.has(relation)&&!edges.some(e=>e.from===from&&e.to===to&&e.relation===relation)){
        edges.push({from,to,relation:relation as StudioAttractorEdge['relation'],canonical:false});
      }
    }
    fieldNodeBySession.set(sessionId,scoped);
  }
  for(const object of objects.slice(0,120)){
    const id=s(object.id);if(!id)continue;
    const meta=rec(object.metadata);
    const narrative=rec(meta.narrative);
    const group=rec(meta.project);
    const attractor=one(meta.attractorName,meta.attractor_name,rec(meta.attractor).name,rec(meta.attractor).label,
      narrative.attractor);
    const project=one(meta.projectName,meta.project_name,group.name,narrative.project);
    const sessionId=s(object.session_id);
    const fieldNodeId=s(meta.fieldNodeId);
    const fieldParent=fieldNodeId&&sessionId?fieldNodeBySession.get(sessionId)?.get(fieldNodeId)??null:null;
    let parent:string|null=fieldParent;
    if(!fieldParent && attractor){
      const attractorId='attractor:'+attractor.toLocaleLowerCase();
      push({id:attractorId,label:attractor,kind:'attractor',epistemic:'DECLARED',
        parentId:null,sourceObjectId:null,source:'STUDIO_OBJECT_METADATA',passport:{}});
      parent=attractorId;
    }
    if(!fieldParent && project){
      const projectId='project:'+(attractor??'unassigned').toLocaleLowerCase()+':'+project.toLocaleLowerCase();
      push({id:projectId,label:project,kind:'project',epistemic:'DECLARED',
        parentId:parent,sourceObjectId:null,source:'STUDIO_OBJECT_METADATA',passport:{}});
      if(parent)edges.push({from:parent,to:projectId,relation:'DECLARED_GROUPING',canonical:false});
      parent=projectId;
    } else if(!fieldParent&&!attractor&&sessionId){
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
      completion:'UNKNOWN_PENDING_VERIFIED_CONTRAST',
      t0T1PerturbationWindow:fields.observationWindow??null,
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
