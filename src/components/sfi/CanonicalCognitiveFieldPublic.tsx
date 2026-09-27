'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';

type Mode='canonical'|'world'|'friction'|'learning'|'reality';
type NodeKind='WORLD'|'EVIDENCE'|'HYPOTHESIS'|'METHOD'|'AUTHORITY'|'EXECUTION'|'RETURN'|'LEARNING'|'ATTRACTOR';

type FieldNode={
  id:string;
  label:string;
  kind:NodeKind;
  state:'OBSERVED'|'DECLARED'|'NOT_OBSERVED';
  human:string;
  links:string[];
};

const MODES:Record<Mode,{label:string;kicker:string;title:string;summary:string}> = {
  canonical:{
    label:'CANONICAL',
    kicker:'ONE STRUCTURE',
    title:'The same institution, without changing the truth.',
    summary:'The canonical view keeps observation, evidence, inference, authority, execution, RETURN and learning separate so the institution can reconstruct what happened.',
  },
  world:{
    label:'WORLD VECTOR',
    kicker:'WHAT IS OUTSIDE SFI',
    title:'Read the world without pretending context is causality.',
    summary:'World signals can change the context of a decision. They do not become proof that a decision caused an outcome.',
  },
  friction:{
    label:'FRICTION MAP',
    kicker:'WHERE THINGS RESIST',
    title:'Find coordination, information, temporal and resource friction.',
    summary:'Friction is represented as a bounded analytical reading. It is not automatically a problem, a cause or a mandate to intervene.',
  },
  learning:{
    label:'LEARNING',
    kicker:'WHAT CHANGED AFTER RETURN',
    title:'Closed work is not automatically learned.',
    summary:'Learning requires a later outcome, contrast and governed promotion. A closed case can remain only a completed case.',
  },
  reality:{
    label:'REALITY CHAIN',
    kicker:'RECONSTRUCTIBILITY',
    title:'Follow the path from the world to what came back.',
    summary:'A claim becomes useful when SFI can show the observations, evidence, inference, authority, action and later RETURN that surround it.',
  },
};

const NODES:FieldNode[] = [
  {id:'world',label:'World / Observation',kind:'WORLD',state:'OBSERVED',human:'What SFI can actually observe about the world or a bounded system.',links:['evidence','hypothesis']},
  {id:'evidence',label:'Evidence / Provenance',kind:'EVIDENCE',state:'OBSERVED',human:'A traceable record that can support or challenge a claim. A source is not evidence merely because it exists.',links:['hypothesis','authority','return']},
  {id:'hypothesis',label:'Hypothesis',kind:'HYPOTHESIS',state:'DECLARED',human:'A claim that should be able to survive or fail against later observations.',links:['method','authority','return']},
  {id:'method',label:'Method Lab',kind:'METHOD',state:'OBSERVED',human:'The place where methods, experiments and reproducibility contracts are exercised without calling simulation reality.',links:['evidence','hypothesis','learning']},
  {id:'authority',label:'Authority',kind:'AUTHORITY',state:'OBSERVED',human:'The explicit boundary that determines who may authorize a consequential action.',links:['execution']},
  {id:'execution',label:'Execution',kind:'EXECUTION',state:'OBSERVED',human:'What was actually done after authority was granted. Execution is still not truth.',links:['return']},
  {id:'return',label:'RETURN / Contrast',kind:'RETURN',state:'OBSERVED',human:'What came back from the world after an action or passage of time. RETURN can contradict the original expectation.',links:['learning','attractor']},
  {id:'learning',label:'Learning',kind:'LEARNING',state:'DECLARED',human:'A governed change in what SFI should retain after contrast. It is not created by narrative alone.',links:['attractor']},
  {id:'attractor',label:'Institutional Attractor',kind:'ATTRACTOR',state:'DECLARED',human:'The desired convergent condition used to interpret projects, evidence, authority, RETURN and learning.',links:[]},
];

const BASE:Record<string,[number,number]>={
  world:[15,42],evidence:[31,42],hypothesis:[45,26],method:[45,65],authority:[61,34],execution:[72,45],return:[84,45],learning:[76,69],attractor:[57,78],
};
const LAYOUTS:Partial<Record<Mode,Record<string,[number,number]>>> = {
  world:{world:[50,19],evidence:[50,40],hypothesis:[24,30],method:[18,68],authority:[63,43],execution:[73,54],return:[67,76],learning:[82,78],attractor:[47,79]},
  friction:{world:[76,30],evidence:[68,62],hypothesis:[82,54],method:[18,70],authority:[50,62],execution:[50,45],return:[67,76],learning:[38,80],attractor:[50,24]},
  learning:{world:[12,28],evidence:[27,42],hypothesis:[42,28],method:[18,72],authority:[57,42],execution:[68,42],return:[55,70],learning:[72,70],attractor:[88,70]},
  reality:{world:[8,46],evidence:[23,46],hypothesis:[38,30],method:[38,68],authority:[53,46],execution:[68,46],return:[83,46],learning:[83,72],attractor:[63,76]},
};

function pos(mode:Mode,id:string){return LAYOUTS[mode]?.[id]??BASE[id]??[50,50]}
function kindShape(kind:NodeKind){
  if(kind==='HYPOTHESIS')return'diamond';
  if(kind==='AUTHORITY')return'triangle';
  if(kind==='RETURN')return'ring';
  if(kind==='METHOD'||kind==='LEARNING')return'hex';
  if(kind==='ATTRACTOR')return'core';
  if(kind==='EXECUTION')return'square';
  return'circle';
}

export function CanonicalCognitiveFieldPublic(){
  const [mode,setMode]=useState<Mode>('canonical');
  const [selectedId,setSelectedId]=useState('attractor');
  const selected=NODES.find((node)=>node.id===selectedId)??NODES[0];

  const edges=useMemo(()=>NODES.flatMap((node)=>node.links.map((to)=>({from:node.id,to}))),[]);
  const modeCopy=MODES[mode];

  return <section className="ccf" aria-labelledby="ccf-title">
    <header className="ccfTop">
      <div>
        <small>CANONICAL COGNITIVE FIELD · HUMAN READING</small>
        <h1 id="ccf-title">One graph. Many readings.</h1>
        <p>The graph represents structural relations. Changing the reading mode rearranges the same objects; it does not create a second institutional truth.</p>
      </div>
      <nav aria-label="Cognitive field readings">
        {(Object.keys(MODES) as Mode[]).map((key)=><button key={key} type="button" data-active={mode===key?'true':undefined} onClick={()=>setMode(key)}>{MODES[key].label}</button>)}
      </nav>
    </header>

    <div className="ccfHuman">
      <aside className="ccfExplanation">
        <small>{modeCopy.kicker}</small>
        <h2>{modeCopy.title}</h2>
        <p>{modeCopy.summary}</p>
        <div className="ccfSequence">
          <b>THE BASIC HUMAN READING</b>
          <span>OBSERVE</span><i>→</i><span>ADMIT EVIDENCE</span><i>→</i><span>FORM A HYPOTHESIS</span><i>→</i><span>ACT UNDER AUTHORITY</span><i>→</i><span>WAIT FOR RETURN</span><i>→</i><span>CONTRAST</span><i>→</i><span>LEARN</span>
        </div>
        <div className="ccfBoundary"><b>EXECUTION ≠ TRUTH</b><span>Simulation ≠ observation · publication ≠ validation · relation ≠ causality · closure ≠ learning.</span></div>
      </aside>

      <div className="ccfField" role="group" aria-label="Canonical cognitive field graph">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge)=>{
            const a=pos(mode,edge.from),b=pos(mode,edge.to);
            return <line key={edge.from+'-'+edge.to} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}/>;
          })}
        </svg>
        {NODES.map((node)=>{
          const p=pos(mode,node.id);
          return <button key={node.id} type="button" className="ccfNode" data-kind={node.kind} data-shape={kindShape(node.kind)} data-state={node.state} data-active={selected.id===node.id?'true':undefined}
            style={{'--x':p[0]+'%','--y':p[1]+'%'} as CSSProperties}
            onClick={()=>setSelectedId(node.id)} aria-pressed={selected.id===node.id}>
            <span className="ccfGlyph"/>
            <strong>{node.label}</strong>
          </button>;
        })}
      </div>

      <aside className="ccfInspector" aria-live="polite">
        <small>SELECTED OBJECT</small>
        <span className="ccfState">{selected.state}</span>
        <h2>{selected.label}</h2>
        <p>{selected.human}</p>
        <dl>
          <div><dt>TYPE</dt><dd>{selected.kind}</dd></div>
          <div><dt>OUTBOUND RELATIONS</dt><dd>{selected.links.length}</dd></div>
          <div><dt>READING</dt><dd>{MODES[mode].label}</dd></div>
        </dl>
        <div className="ccfBoundary"><b>BOUNDARY</b><span>The graph helps humans reconstruct relations. It does not manufacture evidence, authority or causal claims.</span></div>
      </aside>
    </div>

    <footer className="ccfFooter">
      <div><small>PUBLIC LABORATORY</small><strong>Understand the instrument before entering the workspace.</strong></div>
      <Link href="/login?next=%2Fmethod-lab">SIGN IN TO GOVERNED METHOD LAB →</Link>
    </footer>
  </section>;
}
