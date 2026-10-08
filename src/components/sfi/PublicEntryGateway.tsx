'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import './PublicEntryGateway.css';
import { SCENES } from './publicSceneManifest';

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

const SURFACE_RAIL = [
  {label:'ROOT',number:'01',sceneId:'root'},
  {label:'OBSERVATORY',number:'02',sceneId:'observatory'},
  {label:'REALITY CHAIN',number:'03',sceneId:'reality-chain'},
  {label:'METHOD LAB',number:'04',sceneId:'method-lab'},
  {label:'WORLD VECTOR',number:'05',sceneId:'world-vector'},
  {label:'REPOSITORY',number:'06',sceneId:'repository'},
  {label:'TIMELINE',number:'07',sceneId:'timeline'},
  {label:'ACCESS',number:'08',sceneId:'access'},
] as const;

const HUMAN_RESULTS:Record<string,{title:string;lines:string[];cta:string;href:string}>={
  root:{title:'CURRENT FIELD',lines:['Dense canonical field','Authority remains explicit','JR history remains longitudinal','Learning remains governed'],cta:'ENTER ROOT',href:'/root'},
  observatory:{title:'CURRENT OBSERVATION',lines:['Sources remain identifiable','Signals remain distinct from observations','Hypotheses remain provisional','Degraded coverage remains visible'],cta:'OPEN OBSERVATORY',href:'/observatory'},
  'reality-chain':{title:'RECONSTRUCTION RESULT',lines:['What existed','What was observed','Who could decide','What reality returned'],cta:'RECONSTRUCT A CASE',href:'/root?reading=REALITY_CHAIN'},
  'method-lab':{title:'RUN RESULT',lines:['Method and protocol preserved','Provider and parameters inspectable','Simulation remains non-observed','RETURN may still be pending'],cta:'ENTER METHOD LAB',href:'/method-lab'},
  'world-vector':{title:'FIELD RESULT',lines:['Current state is dated','Tensions remain relational','Trajectories remain longitudinal','Projection remains non-observed'],cta:'OPEN WORLD VIEW',href:'/observatory#trajectory'},
  repository:{title:'OBJECT RESULT',lines:['Source remains distinct from claim','Provenance remains addressable','Versions and hashes remain available','Lineage remains reconstructible'],cta:'OPEN REPOSITORY',href:'/publications?view=registry'},
  timeline:{title:'TEMPORAL RESULT',lines:['Institution and world keep separate clocks','Deployments are events, not outcomes','Case and project histories remain reconstructible','RETURN remains a later observation'],cta:'OPEN TIMELINE',href:'/observatory#timeline'},
  access:{title:'ACCESS RESULT',lines:['Identity ≠ authority','Role ≠ permission','Permission ≠ execution','Every access change remains traceable'],cta:'INSTITUTIONAL ACCESS',href:'/login'},
};

const ROOT_FIELD_NODES=Array.from({length:84},(_,index)=>{
  const angle=index*.77;
  const radius=10+(index%13)*2.85;
  return {
    id:index,
    x:50+Math.cos(angle)*radius+(index%5-2)*1.3,
    y:49+Math.sin(angle)*radius*.74+((index*7)%9-4)*1.15,
    tone:index%11===0?'critical':index%7===0?'signal':index%5===0?'learning':index%3===0?'authority':'neutral',
    size:2+(index%4)*.72,
  };
});

export function PublicEntryGateway(){
  const wheelAccumulator=useRef(0);
  const wheelLock=useRef(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const parallaxRef=useRef<HTMLElement|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [frameIndex,setFrameIndex]=useState(0);

  const scene=SCENES[sceneIndex];
  const sceneBackground=scene.background;
  const sceneAssets=scene.assets;
  const frame=scene.frames[frameIndex]??scene.frames[0];
  const result=HUMAN_RESULTS[scene.id];

  const goScene=useCallback((next:number)=>{
    const bounded=clamp(next,0,SCENES.length-1);
    setSceneIndex(bounded);
    setFrameIndex(0);
    if(typeof window!=='undefined'){
      const id=SCENES[bounded]?.id;
      if(id)window.history.replaceState(null,'',`#${id}`);
      window.dispatchEvent(new CustomEvent('sfi:subjectchange',{detail:{subject:id}}));
    }
  },[]);

  const goSceneById=useCallback((id:string)=>{
    const index=SCENES.findIndex(item=>item.id===id);
    if(index>=0)goScene(index);
  },[goScene]);

  useEffect(()=>{
    const syncHash=()=>{
      const id=window.location.hash.replace(/^#/,'');
      if(!id)return;
      const index=SCENES.findIndex(item=>item.id===id);
      if(index>=0){setSceneIndex(index);setFrameIndex(0);}
    };
    syncHash();
    window.addEventListener('hashchange',syncHash);
    const onNavigate=(event:Event)=>{
      const custom=event as CustomEvent<{subject?:string}>;
      if(custom.detail?.subject)goSceneById(custom.detail.subject);
    };
    window.addEventListener('sfi:navigate',onNavigate);
    return()=>{window.removeEventListener('hashchange',syncHash);window.removeEventListener('sfi:navigate',onNavigate);};
  },[goSceneById]);

  useEffect(()=>{
    const onWheel=(event:WheelEvent)=>{
      if(window.matchMedia('(max-width: 900px)').matches)return;
      if(wheelLock.current)return;
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      if(Math.abs(delta)<4)return;
      const direction=delta>0?1:-1;
      const canMove=direction>0?sceneIndex<SCENES.length-1:sceneIndex>0;
      if(!canMove)return;
      event.preventDefault();
      wheelAccumulator.current+=delta;
      if(Math.abs(wheelAccumulator.current)>72){
        goScene(sceneIndex+direction);
        wheelAccumulator.current=0;
        wheelLock.current=true;
        window.setTimeout(()=>{wheelLock.current=false;},460);
      }
    };

    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='ArrowRight'||event.key==='PageDown'){
        if(sceneIndex<SCENES.length-1){event.preventDefault();goScene(sceneIndex+1);}
      }else if(event.key==='ArrowLeft'||event.key==='PageUp'){
        if(sceneIndex>0){event.preventDefault();goScene(sceneIndex-1);}
      }else if(event.key==='Home'){
        event.preventDefault();goScene(0);
      }else if(event.key==='End'){
        event.preventDefault();goScene(SCENES.length-1);
      }
    };

    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('wheel',onWheel);window.removeEventListener('keydown',onKey);};
  },[goScene,sceneIndex]);

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    const target=event.target as HTMLElement;
    if(target.closest('button,a,input,select'))return;
    dragStart.current={x:event.clientX,y:event.clientY};
  }

  function handlePointerMove(event:PointerEvent<HTMLElement>){
    if(event.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const host=parallaxRef.current;
    if(!host)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const nx=((event.clientX-rect.left)/Math.max(rect.width,1)-.5)*2;
    const ny=((event.clientY-rect.top)/Math.max(rect.height,1)-.5)*2;
    host.querySelectorAll<HTMLElement>('[data-motion="pointer-parallax"]').forEach((layer)=>{
      const depth=Number(layer.dataset.depth||1);
      layer.style.transform=`translate3d(${(nx*depth*3.2).toFixed(2)}px,${(ny*depth*1.9).toFixed(2)}px,0)`;
    });
  }

  function resetParallax(){
    const host=parallaxRef.current;
    if(!host)return;
    host.querySelectorAll<HTMLElement>('[data-motion="pointer-parallax"]').forEach((layer)=>{
      layer.style.transform='translate3d(0,0,0)';
    });
  }

  function handlePointerUp(event:PointerEvent<HTMLElement>){
    const start=dragStart.current;
    dragStart.current=null;
    if(!start)return;
    const dx=event.clientX-start.x;
    const dy=event.clientY-start.y;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy))return;
    goScene(sceneIndex+(dx<0?1:-1));
  }

  const visibleFrames=useMemo(()=>scene.frames,[scene.frames]);

  return <main
    className="sfiSceneExperience"
    ref={parallaxRef}
    data-active-scene={scene.id}
    style={{'--scene-index':sceneIndex,'--frame-index':frameIndex} as CSSProperties}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerLeave={resetParallax}
    onPointerUp={handlePointerUp}
    onPointerCancel={()=>{dragStart.current=null;resetParallax();}}
  >
    <div className="sfiVisualStage" aria-hidden="true">
      <div className="sfiSharedBackground" style={{backgroundImage:`url('${sceneBackground}')`}}/>
      <div className="sfiSharedLayers">
        {sceneAssets.map((asset,layerIndex)=><div
          key={`${scene.id}:${asset.src}`}
          className="sfiSceneParallaxLayer"
          data-depth={asset.depth}
          data-motion={asset.motion}
        ><img
          src={asset.src}
          alt=""
          decoding="async"
          draggable={false}
          className={`sfiSceneLayer sfiSceneLayer--${layerIndex+1}`}
          data-role={asset.role}
          data-alpha={asset.alpha?'true':undefined}
        /></div>)}
      </div>
      <div className="sfiSharedVeil"/>
    </div>

    <div className="sfiSceneDeck" aria-live="polite">
      {SCENES.map((item,index)=>{
        const offset=index-sceneIndex;
        const state=offset===0?'active':offset<0?'past':'future';
        const localFrameIndex=index===sceneIndex?frameIndex:0;
        const selectedFrame=item.frames[localFrameIndex]??item.frames[0];
        const itemResult=HUMAN_RESULTS[item.id];

        return <section
          key={item.id}
          className={`sfiScene sfiScene--${item.id}`}
          data-state={state}
          data-scene={item.id}
          style={{'--scene-offset':offset,'--active-frame':localFrameIndex} as CSSProperties}
          aria-hidden={index===sceneIndex?undefined:true}
          inert={index!==sceneIndex}
        >
          {item.id==='intro'?<div className="sfiIndexHero">
            <div className="sfiIndexStatement">
              <span>SFI | SYSTEM FRICTION INSTITUTE</span>
              <h1>NOTHING ACTS ALONE.<br/><b>REALITY ANSWERS BACK.</b></h1>
              <p>SFI observes, reconstructs, tests and preserves how systems interact — from signal to authority, execution and RETURN.</p>
              <button type="button" onClick={()=>goScene(1)}>ENTER SFI <i>→</i></button>
            </div>
            <nav className="sfiIndexSurfaceRail" aria-label="SFI instruments">
              {SURFACE_RAIL.map((surface)=><button key={surface.sceneId} type="button" onClick={()=>goSceneById(surface.sceneId)}>
                <small>{surface.number}</small><strong>{surface.label}</strong><span>→</span>
              </button>)}
            </nav>
          </div>:<div className="sfiOperationalPanorama">
            <aside className="sfiSurfaceIdentity">
              <span>{item.number}</span>
              <h1>{item.title}{item.accent?<b>{item.accent}</b>:null}</h1>
              <p>{item.lead}</p>
              <em>NOTHING ACTS ALONE.<br/>REALITY ANSWERS BACK.</em>
              <a href={item.actions?.[0]?.href??'/'}>{item.actions?.[0]?.label??'OPEN'} <i>→</i></a>
            </aside>

            <section className="sfiInstrumentField" aria-label={`${item.title} operational field`}>
              <header className="sfiInstrumentTabs">
                {visibleFrames.map((mode,modeIndex)=><button
                  type="button"
                  key={mode.label}
                  data-active={modeIndex===localFrameIndex?'true':undefined}
                  onClick={()=>setFrameIndex(modeIndex)}
                >{mode.label}</button>)}
              </header>

              {item.id==='root'?<div className="sfiRootFieldPreview" aria-hidden="true">
                <div className="sfiRootFieldHalo"/>
                {ROOT_FIELD_NODES.map((node)=><i key={node.id} className={`sfiFieldNode sfiFieldNode--${node.tone}`} style={{left:`${node.x}%`,top:`${node.y}%`,width:`${node.size}px`,height:`${node.size}px`}}/>)}
                <div className="sfiRootFieldCore"><span>SYSTEM</span></div>
                <div className="sfiRootCluster sfiRootCluster--governance">GOVERNANCE</div>
                <div className="sfiRootCluster sfiRootCluster--cases">CASES & PROJECTS</div>
                <div className="sfiRootCluster sfiRootCluster--external">EXTERNAL REALITY</div>
                <div className="sfiRootCluster sfiRootCluster--authority">AUTHORITY BOUNDARY</div>
              </div>:null}

              {item.id==='reality-chain'?<ol className="sfiRealityOperationalChain" aria-label="Reality Chain">
                {item.frames.map((stage,stageIndex)=><li key={stage.label} data-active={localFrameIndex===stageIndex?'true':undefined}>
                  <button type="button" onClick={()=>setFrameIndex(stageIndex)}><small>{String(stageIndex+1).padStart(2,'0')}</small><strong>{stage.label}</strong></button>
                </li>)}
              </ol>:null}

              <div className="sfiOperationalModules" data-count={item.frames.length}>
                {item.frames.map((module,moduleIndex)=><button
                  type="button"
                  key={module.label}
                  className="sfiOperationalModule"
                  data-active={moduleIndex===localFrameIndex?'true':undefined}
                  onClick={()=>setFrameIndex(moduleIndex)}
                >
                  <small>{String(moduleIndex+1).padStart(2,'0')}</small>
                  <strong>{module.label}</strong>
                  <p>{module.title}</p>
                  <span>OPEN READING →</span>
                </button>)}
              </div>
            </section>

            <aside className="sfiResultDock" aria-label="Selected operational result">
              <header><small>{itemResult?.title??'CURRENT READING'}</small><strong>{selectedFrame.label}</strong></header>
              <h2>{selectedFrame.title}</h2>
              <p>{selectedFrame.text}</p>
              {itemResult?<ul>{itemResult.lines.map(line=><li key={line}>{line}</li>)}</ul>:null}
              <a href={itemResult?.href??item.actions?.[0]?.href??'/'}>{itemResult?.cta??'OPEN'} <span>→</span></a>
            </aside>
          </div>}
        </section>;
      })}
    </div>

    <nav className="sfiHorizontalProgress" aria-label="Horizontal SFI journey">
      <button type="button" onClick={()=>goScene(sceneIndex-1)} disabled={sceneIndex===0} aria-label="Previous surface">←</button>
      <div>{SCENES.map((item,index)=><button key={item.id} type="button" data-active={index===sceneIndex?'true':undefined} onClick={()=>goScene(index)} aria-label={item.id}/>)}</div>
      <button type="button" onClick={()=>goScene(sceneIndex+1)} disabled={sceneIndex===SCENES.length-1} aria-label="Next surface">→</button>
    </nav>

    <div className="sfiHorizontalHint" aria-hidden="true"><span>SCROLL</span><i>←</i><b>HORIZONTAL</b><i>→</i></div>
  </main>;
}
