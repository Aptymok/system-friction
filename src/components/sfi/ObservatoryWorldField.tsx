'use client';

import type { CSSProperties } from 'react';

type Position={x:number;y:number;geo:boolean};
type Row=Record<string,any>;

export type ObservatoryFieldNode={
  id:string;
  title:string;
  confidence:number|null;
  sourceFamily:string;
  position:Position;
};

export type ObservatoryFieldHypothesis={
  id:string;
  statement?:string;
  status?:string;
  current_confidence?:number;
  initial_confidence?:number;
};

export type ObservatoryFieldVector={
  id:string;
  label:string;
  value:number|null;
  sourceCount:number;
  trust:number|null;
};

export type ObservatoryTerritory={
  id:string;
  label:string;
  position:Position;
  observationCount:number;
  sourceCount:number;
  confidence:number|null;
  systemicFriction:number|null;
  activityDelta:number|null;
  affectedSystems:string[];
};

type Props={
  lens:'field'|'sources'|'territories'|'hypotheses'|'trajectory'|'world-vector';
  nodes:readonly ObservatoryFieldNode[];
  selectedNodeId:string|null;
  selectedHypothesis:ObservatoryFieldHypothesis|null;
  selectedEvidenceIds:ReadonlySet<string>;
  selectedAffectedIds:ReadonlySet<string>;
  selectedGraphEdges:readonly Row[];
  graphNodes:readonly Row[];
  vectors:readonly ObservatoryFieldVector[];
  ghostVectors:readonly ObservatoryFieldVector[];
  territories:readonly ObservatoryTerritory[];
  onSelectNode:(id:string)=>void;
  onSelectHypothesis:(id:string)=>void;
};

const cx=800;
const cy=470;

function hash(value:string){
  let h=2166136261;
  for(let index=0;index<value.length;index+=1){
    h^=value.charCodeAt(index);
    h=Math.imul(h,16777619);
  }
  return Math.abs(h>>>0);
}

function orbital(id:string,kind:string):Position{
  const seed=hash(id);
  const angle=((seed%360)*Math.PI)/180;
  const inner=kind==='HYPOTHESIS';
  const rx=inner?230:455;
  const ry=inner?145:278;
  return {x:cx+Math.cos(angle)*rx,y:cy+Math.sin(angle)*ry,geo:false};
}

function asText(value:unknown){
  return typeof value==='string'?value:'';
}

function edgeClass(edge:Row){
  const epistemic=asText(edge.epistemicClass).toUpperCase();
  if(epistemic==='LINEAGE') return 'fieldEdge fieldEdgeLineage';
  if(epistemic==='INFERRED') return 'fieldEdge fieldEdgeInferred';
  return 'fieldEdge fieldEdgeDerived';
}

export function ObservatoryWorldField({
  lens,nodes,selectedNodeId,selectedHypothesis,selectedEvidenceIds,selectedAffectedIds,
  selectedGraphEdges,graphNodes,vectors,ghostVectors,territories,onSelectNode,onSelectHypothesis,
}:Props){
  const positionMap=new Map<string,Position>(nodes.map((node)=>[node.id,node.position]));
  const graphById=new Map(graphNodes.map((node)=>[asText(node.id),node]));

  for(const graphNode of graphNodes){
    const id=asText(graphNode.id);
    if(!id||positionMap.has(id)) continue;
    const kind=asText(graphNode.kind).toUpperCase();
    if(kind==='SYSTEM'||kind==='HYPOTHESIS') positionMap.set(id,orbital(id,kind));
  }

  const selectedHypothesisGraphId=selectedHypothesis?'hypothesis:'+selectedHypothesis.id:null;
  const selectedHypothesisPosition=selectedHypothesisGraphId?positionMap.get(selectedHypothesisGraphId):null;

  const visibleEdges=selectedHypothesis
    ? selectedGraphEdges.filter((edge)=>{
        const from=asText(edge.from);
        const to=asText(edge.to);
        return positionMap.has(from)&&positionMap.has(to);
      }).slice(0,120)
    : [];

  const visibleSystems=new Set<string>();
  for(const edge of visibleEdges){
    const from=asText(edge.from);
    const to=asText(edge.to);
    if(from.startsWith('system:')) visibleSystems.add(from);
    if(to.startsWith('system:')) visibleSystems.add(to);
  }
  const territorialRelations:{from:ObservatoryTerritory;to:ObservatoryTerritory;shared:number}[]=[];
  for(let left=0;left<territories.length;left+=1){
    for(let right=left+1;right<territories.length;right+=1){
      const from=territories[left];
      const to=territories[right];
      const shared=from.affectedSystems.filter((system)=>to.affectedSystems.includes(system)).length;
      if(shared>0) territorialRelations.push({from,to,shared});
    }
  }
  territorialRelations.sort((a,b)=>b.shared-a.shared||((b.from.systemicFriction??0)+(b.to.systemicFriction??0))-((a.from.systemicFriction??0)+(a.to.systemicFriction??0)));
  const visibleTerritorialRelations=territorialRelations.slice(0,10);


  return <svg className="earthOverlay worldField" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-label="SFI World Field">
    <defs>
      <filter id="fieldGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>

    <g className="fieldGrid" aria-hidden="true">
      {[170,260,350,440].map((radius)=><ellipse key={radius} cx={cx} cy={cy} rx={radius} ry={radius*.61}/>)}
      {[0,45,90,135].map((angle)=><line key={angle} x1={cx-520} y1={cy} x2={cx+520} y2={cy} transform={'rotate('+angle+' '+cx+' '+cy+')'}/>)}
    </g>

    {(lens==='trajectory'||lens==='world-vector')&&ghostVectors.length?<g className="worldSpectrumGhost" aria-label="WorldSpect T0 ghost">
      {ghostVectors.map((vector,index)=>{
        if(vector.value==null) return null;
        const angle=(-90+(index*(360/Math.max(1,ghostVectors.length))))*Math.PI/180;
        const base=345;
        const length=40+(Math.max(0,Math.min(1,vector.value))*90);
        const x1=cx+Math.cos(angle)*base;
        const y1=cy+Math.sin(angle)*(base*.61);
        const x2=cx+Math.cos(angle)*(base+length);
        const y2=cy+Math.sin(angle)*((base+length)*.61);
        return <g key={'ghost:'+vector.id} className="worldVectorGhost">
          <line x1={x1} y1={y1} x2={x2} y2={y2}/>
          <circle cx={x2} cy={y2} r={3+vector.value*4}/>
        </g>;
      })}
    </g>:null}

    {(lens==='field'||lens==='trajectory'||lens==='world-vector')?<g className="worldSpectrumCorona" aria-label="WorldSpect vectors">
      {vectors.map((vector,index)=>{
        if(vector.value==null) return null;
        const angle=(-90+(index*(360/Math.max(1,vectors.length))))*Math.PI/180;
        const base=345;
        const length=40+(Math.max(0,Math.min(1,vector.value))*90);
        const x1=cx+Math.cos(angle)*base;
        const y1=cy+Math.sin(angle)*(base*.61);
        const x2=cx+Math.cos(angle)*(base+length);
        const y2=cy+Math.sin(angle)*((base+length)*.61);
        const trust=vector.trust==null?0.35:Math.max(.18,Math.min(1,vector.trust));
        const anchor=Math.cos(angle)<-.2?'end':Math.cos(angle)>.2?'start':'middle';
        return <g key={vector.id} className="worldVector" style={{'--vector-trust':trust} as CSSProperties}>
          <line x1={x1} y1={y1} x2={x2} y2={y2}/>
          <circle cx={x2} cy={y2} r={4+vector.value*5}/>
          <text x={x2+(Math.cos(angle)*13)} y={y2+(Math.sin(angle)*8)} textAnchor={anchor}>
            {vector.label.toUpperCase()} · {Math.round(vector.value*100)}
          </text>
        </g>;
      })}
    </g>:null}

    {visibleEdges.length?<g className="fieldEdges" aria-label="Selected hypothesis graph relations">
      {visibleEdges.map((edge)=>{
        const from=positionMap.get(asText(edge.from));
        const to=positionMap.get(asText(edge.to));
        if(!from||!to) return null;
        const key=asText(edge.id)||(asText(edge.from)+'-'+asText(edge.to));
        return <line key={key} className={edgeClass(edge)} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;
      })}
    </g>:null}

    {(lens==='field'||lens==='territories'||lens==='world-vector')&&territories.length?<g className="territorialTensionLayer" aria-label="Derived territorial tensions">
      {visibleTerritorialRelations.map(({from,to,shared})=><line key={from.id+'>'+to.id} className="territoryRelation" x1={from.position.x} y1={from.position.y} x2={to.position.x} y2={to.position.y} data-shared-systems={shared}/>)}
      {territories.map((territory)=>{
        const p=territory.position;
        const friction=territory.systemicFriction==null?0.18:Math.max(0,Math.min(1,territory.systemicFriction));
        const confidence=territory.confidence==null?.35:Math.max(.18,Math.min(1,territory.confidence));
        const radius=18+(friction*28);
        const delta=territory.activityDelta;
        return <g key={territory.id} className="territoryTension" style={{'--territory-confidence':confidence,'--territory-friction':friction} as CSSProperties}>
          <circle cx={p.x} cy={p.y} r={radius+10} className="territoryHalo"/>
          <circle cx={p.x} cy={p.y} r={radius} className="territoryRing"/>
          <circle cx={p.x} cy={p.y} r={5+friction*5} className="territoryCore"/>
          <text x={p.x+radius+12} y={p.y-radius*.35}>
            <tspan className="territoryLabel">{territory.label}</tspan>
            <tspan x={p.x+radius+12} dy="15">{territory.observationCount} OBS · {territory.sourceCount} SRC</tspan>
            <tspan x={p.x+radius+12} dy="14">Fₛ {territory.systemicFriction==null?'—':territory.systemicFriction.toFixed(3)} · Δ ACT {delta==null?'—':(delta>=0?'+':'')+Math.round(delta*100)+'%'}</tspan>
          </text>
        </g>;
      })}
    </g>:null}

    {(lens==='field'||lens==='sources'||lens==='territories'||lens==='hypotheses')?<g className="fieldObservationLayer" aria-label="Observed source records">
      {nodes.map((node)=>{
        const p=node.position;
        const selected=node.id===selectedNodeId;
        const evidence=selectedEvidenceIds.has(node.id);
        const affected=selectedAffectedIds.has(node.id);
        const confidence=node.confidence==null?.45:Math.max(.2,Math.min(1,node.confidence));
        return <g key={node.id}
          className={'geoNode observed fieldObservation '+(selected?'nodeSelected ':'')+(evidence||affected?'nodeNeighbor':'')}
          data-source-family={node.sourceFamily}
          style={{'--node-confidence':confidence} as CSSProperties}
          onClick={()=>onSelectNode(node.id)}
          onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectNode(node.id)}}}
          role="button" tabIndex={0} aria-label={'Observation: '+node.title}
        >
          <circle cx={p.x} cy={p.y} r={selected?18:evidence?14:affected?12:7} className="geoHalo"/>
          <circle cx={p.x} cy={p.y} r={selected?6:evidence?5:3.5} className="geoCore"/>
          {(selected||evidence)&&<text x={p.x+14} y={p.y-10}>{node.title.slice(0,30)}</text>}
        </g>;
      })}
    </g>:null}

    {(lens==='hypotheses'||(lens==='field'&&selectedHypothesis))&&selectedHypothesis&&selectedHypothesisPosition?<g
      className="fieldHypothesisNode"
      onClick={()=>onSelectHypothesis(String(selectedHypothesis.id))}
      onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectHypothesis(String(selectedHypothesis.id))}}}
      role="button" tabIndex={0}
      aria-label={'Hypothesis: '+(selectedHypothesis.statement??selectedHypothesis.id)}
    >
      <circle cx={selectedHypothesisPosition.x} cy={selectedHypothesisPosition.y} r="29" className="hypothesisOrbit"/>
      <path d={'M '+selectedHypothesisPosition.x+' '+(selectedHypothesisPosition.y-10)+' L '+(selectedHypothesisPosition.x+10)+' '+selectedHypothesisPosition.y+' L '+selectedHypothesisPosition.x+' '+(selectedHypothesisPosition.y+10)+' L '+(selectedHypothesisPosition.x-10)+' '+selectedHypothesisPosition.y+' Z'} className="hypothesisCore"/>
      <text x={selectedHypothesisPosition.x+18} y={selectedHypothesisPosition.y-15}>{asText(selectedHypothesis.status)||'HYPOTHESIS'}</text>
    </g>:null}

    {visibleSystems.size?<g className="fieldSystemLayer" aria-label="Systems referenced by the selected hypothesis">
      {[...visibleSystems].map((id)=>{
        const p=positionMap.get(id);
        const graphNode=graphById.get(id);
        if(!p) return null;
        return <g key={id} className="fieldSystemNode">
          <rect x={p.x-6} y={p.y-6} width="12" height="12" rx="2"/>
          <text x={p.x+12} y={p.y-9}>{asText(graphNode?.label)||id.replace(/^system:/,'')}</text>
        </g>;
      })}
    </g>:null}

    <g className="fieldBoundary" aria-hidden="true">
      <text x="800" y="855" textAnchor="middle">WORLD FIELD · GEO-BOUND OBSERVATIONS + DERIVED TERRITORIAL BUCKETS · DENSITY ≠ IMPORTANCE · TENSION ≠ CAUSALITY</text>
    </g>
  </svg>;
}
