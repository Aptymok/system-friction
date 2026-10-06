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

const SURFACE_RAIL = [
  {label:'TIMELINE',number:'01',sceneId:'timeline',frameIndex:0},
  {label:'REPOSITORY',number:'02',sceneId:'repository',frameIndex:0},
  {label:'WORLD VECTOR',number:'03',sceneId:'world-vector',frameIndex:0},
  {label:'METHOD LAB',number:'04',sceneId:'method-lab',frameIndex:0},
  {label:'REALITY CHAIN',number:'05',sceneId:'reality-chain',frameIndex:0},
  {label:'OBSERVATORY',number:'06',sceneId:'observatory',frameIndex:0},
  {label:'ROOT',number:'07',sceneId:'root',frameIndex:0},
] as const;

export function PublicEntryGateway(){
  const wheelAccumulator=useRef(0);
  const wheelLock=useRef(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const parallaxRef=useRef<HTMLDivElement|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [frameIndex,setFrameIndex]=useState(0);

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
    const onWheel=(event:WheelEvent)=>{
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
  },[frameIndex,goScene,moveFrame,scene.frames.length,sceneIndex]);

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    const target=event.target as HTMLElement;
    if(target.closest('button,a'))return;
    dragStart.current={x:event.clientX,y:event.clientY};
  }

  function handlePointerMove(event:PointerEvent<HTMLElement>){
    if(event.pointerType==='touch')return;
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
    else goScene(sceneIndex+(dy<0?1:-1));
  }

  return <main
    className="sfiSceneExperience"
    data-active-scene={scene.id}
    style={{'--scene-index':sceneIndex,'--frame-index':frameIndex} as CSSProperties}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerLeave={resetParallax}
    onPointerUp={handlePointerUp}
    onPointerCancel={()=>{dragStart.current=null;resetParallax();}}
  >
    <div className="sfiVisualStage" aria-hidden="true" ref={parallaxRef}>
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
        >
          <div className="sfiSceneContent">
            <div className="sfiSceneCopy">
              <div className="sfiSceneEyebrow"><span>{item.number}</span>{item.eyebrow}</div>
              <h1>{item.title}{item.accent?<span>{item.accent}</span>:null}</h1>
              <p className="sfiSceneLead">{item.lead}</p>

              {item.id==='intro' ? <div className="sfiHeroActions">
                <p className="sfiHeroStatement">The world does not have the same time.</p>
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
          </div>
        </section>;
      })}
    </div>

    <nav className="sfiTopicRail" aria-label="Institutional surfaces">
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
