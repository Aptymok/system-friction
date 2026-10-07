'use client';

import {
  useCallback,
  useEffect,
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

const EVENT_PAGE_URL='https://www.gomry.com/event/After-AI-Governance-Evidence-Authority-and-RETURN-in-Real-Institutions-AIWeekNY-q9HX2ZNYElJdAvG8MXIA';
const EVENT_EMBED_URL='https://www.gomry.com/embed/event/After-AI-Governance-Evidence-Authority-and-RETURN-in-Real-Institutions-AIWeekNY-q9HX2ZNYElJdAvG8MXIA';

const SURFACE_RAIL = [
  {label:'ROOT',number:'01',sceneId:'root',frameIndex:0},
  {label:'OBSERVATORY',number:'02',sceneId:'observatory',frameIndex:0},
  {label:'REALITY CHAIN',number:'03',sceneId:'reality-chain',frameIndex:0},
  {label:'METHOD LAB',number:'04',sceneId:'method-lab',frameIndex:0},
  {label:'WORLD VECTOR',number:'05',sceneId:'world-vector',frameIndex:0},
  {label:'REPOSITORY',number:'06',sceneId:'repository',frameIndex:0},
  {label:'TIMELINE',number:'07',sceneId:'timeline',frameIndex:0},
] as const;

export function PublicEntryGateway(){
  const wheelAccumulator=useRef(0);
  const wheelLock=useRef(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const parallaxRef=useRef<HTMLElement|null>(null);
  const eventTriggerRef=useRef<HTMLButtonElement|null>(null);
  const eventDialogRef=useRef<HTMLElement|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [frameIndex,setFrameIndex]=useState(0);
  const [eventOpen,setEventOpen]=useState(false);

  const scene=SCENES[sceneIndex];
  const sceneBackground=scene.background;
  const sceneAssets=scene.assets;

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

  const goSceneFrame=useCallback((id:string,nextFrame:number)=>{
    const index=SCENES.findIndex(item=>item.id===id);
    if(index<0)return;
    setSceneIndex(index);
    setFrameIndex(clamp(nextFrame,0,SCENES[index].frames.length-1));
    if(typeof window!=='undefined'){
      window.history.replaceState(null,'',`#${id}`);
      window.dispatchEvent(new CustomEvent('sfi:subjectchange',{detail:{subject:id}}));
    }
  },[]);

  const moveFrame=useCallback((direction:-1|1)=>{
    setFrameIndex(current=>clamp(current+direction,0,SCENES[sceneIndex].frames.length-1));
  },[sceneIndex]);

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
    if(!eventOpen)return;
    const dialog=eventDialogRef.current;
    const previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const focusableSelector='button:not([disabled]),a[href],iframe,[tabindex]:not([tabindex="-1"])';
    const focusables=()=>Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector)??[]).filter(element=>!element.hasAttribute('hidden'));
    window.requestAnimationFrame(()=>{(focusables()[0]??dialog)?.focus();});
    const onDialogKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();
        setEventOpen(false);
        return;
      }
      if(event.key!=='Tab')return;
      const nodes=focusables();
      if(nodes.length===0){event.preventDefault();dialog?.focus();return;}
      const first=nodes[0];
      const last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onDialogKey);
    return()=>{
      document.removeEventListener('keydown',onDialogKey);
      const target=eventTriggerRef.current??previouslyFocused;
      window.requestAnimationFrame(()=>target?.focus());
    };
  },[eventOpen]);

  useEffect(()=>{
    if(scene.id!=='intro'&&eventOpen)setEventOpen(false);
  },[eventOpen,scene.id]);

  useEffect(()=>{
    const onWheel=(event:WheelEvent)=>{
      if(eventOpen)return;
      if(window.matchMedia('(max-width: 900px)').matches)return;
      if(wheelLock.current)return;
      const horizontal=event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)*1.15;
      if(horizontal&&scene.frames.length>1){
        const delta=Math.abs(event.deltaX)>1?event.deltaX:event.deltaY;
        const canMove=delta>0?frameIndex<scene.frames.length-1:frameIndex>0;
        if(!canMove)return;
        event.preventDefault();
        wheelAccumulator.current+=delta;
        if(Math.abs(wheelAccumulator.current)>48){
          moveFrame(wheelAccumulator.current>0?1:-1);
          wheelAccumulator.current=0;
          wheelLock.current=true;
          window.setTimeout(()=>{wheelLock.current=false;},360);
        }
        return;
      }

      const direction=event.deltaY>0?1:-1;
      const canMove=direction>0?sceneIndex<SCENES.length-1:sceneIndex>0;
      if(!canMove)return;
      event.preventDefault();
      wheelAccumulator.current+=event.deltaY;
      if(Math.abs(wheelAccumulator.current)>72){
        goScene(sceneIndex+direction);
        wheelAccumulator.current=0;
        wheelLock.current=true;
        window.setTimeout(()=>{wheelLock.current=false;},520);
      }
    };

    const onKey=(event:KeyboardEvent)=>{
      if(eventOpen)return;
      if(event.key==='ArrowDown'||event.key==='PageDown'){
        if(sceneIndex<SCENES.length-1){event.preventDefault();goScene(sceneIndex+1);}
      }else if(event.key==='ArrowUp'||event.key==='PageUp'){
        if(sceneIndex>0){event.preventDefault();goScene(sceneIndex-1);}
      }else if(event.key==='ArrowRight'){
        event.preventDefault();moveFrame(1);
      }else if(event.key==='ArrowLeft'){
        event.preventDefault();moveFrame(-1);
      }else if(event.key==='Home'){
        event.preventDefault();goScene(0);
      }else if(event.key==='End'){
        event.preventDefault();goScene(SCENES.length-1);
      }
    };

    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('wheel',onWheel);window.removeEventListener('keydown',onKey);};
  },[eventOpen,frameIndex,goScene,moveFrame,scene.frames.length,sceneIndex]);

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    const target=event.target as HTMLElement;
    if(target.closest('button,a,iframe,[data-sfi-interactive="true"]'))return;
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
      const x=nx*depth*4.2;
      const y=ny*depth*2.8;
      layer.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
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
    if(Math.abs(dx)<36&&Math.abs(dy)<36)return;
    if(Math.abs(dx)>Math.abs(dy)*1.05)moveFrame(dx<0?1:-1);
    else if(!window.matchMedia('(max-width: 900px)').matches)goScene(sceneIndex+(dy<0?1:-1));
  }

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

    <div className="sfiSceneDeck" aria-live="polite" inert={eventOpen} aria-hidden={eventOpen||undefined}>
      {SCENES.map((item,index)=>{
        const offset=index-sceneIndex;
        const state=offset===0?'active':offset<0?'past':'future';
        const localFrameIndex=index===sceneIndex?frameIndex:0;
        const frame=item.frames[localFrameIndex]??item.frames[0];
        const frameProgress=item.frames.length>1?localFrameIndex/(item.frames.length-1):0;

        return <section
          key={item.id}
          className={`sfiScene sfiScene--${item.id}`}
          data-state={state}
          data-scene={item.id}
          style={{
            '--scene-offset':offset,
            '--active-frame':localFrameIndex,
            '--frame-progress':frameProgress,
          } as CSSProperties}
          aria-hidden={index===sceneIndex?undefined:true}
          inert={index!==sceneIndex}
        >
          {item.id==='reality-chain'?<ol className="sfiRealityTrajectory" aria-label="Reality Chain temporal trajectory">
            {item.frames.map((stage,stageIndex)=><li key={stage.label} style={{'--stage-index':stageIndex} as CSSProperties}>
              <button type="button" data-active={localFrameIndex===stageIndex?'true':undefined} onClick={()=>setFrameIndex(stageIndex)} aria-label={`Read ${stage.label}`}><i aria-hidden="true"/>{stage.label}</button>
            </li>)}
          </ol>:null}
          <div className="sfiSceneContent">
            <div className="sfiSceneCopy">
              <div className="sfiSceneEyebrow"><span>{item.number}</span>{item.eyebrow}</div>
              <h1>{item.title}{item.accent?<span>{item.accent}</span>:null}</h1>
              <p className="sfiSceneLead">{item.lead}</p>

              {item.id==='intro' ? <div className="sfiHeroActions">
                <p className="sfiHeroStatement">The world does not have the same time.</p>
                <button
                  ref={eventTriggerRef}
                  type="button"
                  className="sfiAiWeekRibbon"
                  onClick={()=>setEventOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={eventOpen}
                >
                  <span className="sfiAiWeekRibbonMeta">AI WEEK NY 2026 · OCTOBER 8 · 7:00 PM ET</span>
                  <strong>After AI Governance</strong>
                  <span className="sfiAiWeekRibbonTitle">Evidence, Authority &amp; RETURN in Real Institutions</span>
                  <b>REGISTER / JOIN <i aria-hidden="true">↗</i></b>
                </button>
                {item.actions?.map((action)=><a
                  key={action.label}
                  className="sfiHeroCta"
                  href={action.href}
                ><span aria-hidden="true">→</span><b>{action.label}</b></a>)}
              </div> : <>
                <div key={`${item.id}-${frame.label}`} className="sfiFieldState">
                  <small>{frame.label}</small>
                  <strong>{frame.title}</strong>
                  <p>{frame.text}</p>
                </div>
                {item.actions?.length?<div className="sfiSurfaceActions">
                  {item.actions.map((action)=><a
                    key={action.label}
                    className={`sfiSurfaceCta sfiSurfaceCta--${action.kind??'secondary'}`}
                    href={action.href}
                  ><span aria-hidden="true">→</span><b>{action.label}</b></a>)}
                </div>:null}
              </>}

              <div className="sfiGestureLegend" aria-hidden="true">
                <span>VERTICAL</span><b>CHANGE SURFACE</b>
                <span>HORIZONTAL</span><b>CHANGE READING</b>
              </div>
            </div>
            {item.id==='root'?<nav className="sfiRootForeground" aria-label="ROOT institutional access">
              {item.tiles?.map((tile,tileIndex)=><a key={tile.label} href={tile.href} className="sfiRootAccess" data-motion="pointer-parallax" data-depth={5+tileIndex*.3}>
                <img src={tile.image} alt="" draggable={false}/><span>{tile.label}</span>
              </a>)}
            </nav>:null}
          </div>
        </section>;
      })}
    </div>

    {eventOpen&&scene.id==='intro'?<div className="sfiAiWeekOverlay" data-sfi-interactive="true" role="presentation">
      <button type="button" className="sfiAiWeekBackdrop" onClick={()=>setEventOpen(false)} aria-label="Close AI Week registration"/>
      <section ref={eventDialogRef} tabIndex={-1} className="sfiAiWeekDialog" role="dialog" aria-modal="true" aria-labelledby="sfi-aiweek-title">
        <header>
          <div>
            <span>AI WEEK NY 2026 · OCTOBER 8 · 7:00 PM ET</span>
            <h2 id="sfi-aiweek-title">After AI Governance</h2>
            <p>Evidence, Authority &amp; RETURN in Real Institutions</p>
          </div>
          <button type="button" className="sfiAiWeekClose" onClick={()=>setEventOpen(false)} aria-label="Close registration">CLOSE ×</button>
        </header>
        <div className="sfiAiWeekEmbed">
          <iframe
            src={EVENT_EMBED_URL}
            width="700"
            height="450"
            frameBorder="0"
            allow="fullscreen; payment"
            aria-hidden={false}
            tabIndex={0}
            title="Register for After AI Governance at AI Week NY 2026"
          />
        </div>
        <footer>
          <p>Register without leaving System Friction Institute.</p>
          <a href={EVENT_PAGE_URL} target="_blank" rel="noreferrer">OPEN EVENT PAGE ↗</a>
        </footer>
      </section>
    </div>:null}

    <nav className="sfiTopicRail" aria-label="Institutional surfaces" inert={eventOpen} aria-hidden={eventOpen||undefined}>
      {SURFACE_RAIL.map((item)=><button
        key={item.label}
        type="button"
        data-active={scene.id===item.sceneId?'true':undefined}
        onClick={()=>goSceneFrame(item.sceneId,item.frameIndex)}
        aria-label={`Open ${item.label.toLowerCase()} surface`}
      ><span>{item.label}</span><i/><em>{item.number}</em></button>)}
    </nav>

    {scene.id!=='intro'&&scene.frames.length>1?<div className="sfiExplanationRail" aria-label="Readings">
      <span>{String(frameIndex+1).padStart(2,'0')}</span>
      <div>
        {scene.frames.map((frame,index)=><button
          key={frame.label}
          type="button"
          data-active={index===frameIndex?'true':undefined}
          onClick={()=>setFrameIndex(index)}
          aria-label={`Reading ${index+1}: ${frame.label}`}
        />)}
      </div>
      <span>{String(scene.frames.length).padStart(2,'0')}</span>
    </div>:null}
  </main>;
}
