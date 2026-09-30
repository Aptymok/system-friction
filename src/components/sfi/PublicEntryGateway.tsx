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

export function PublicEntryGateway(){
  const rootRef=useRef<HTMLElement>(null);
  const wheelAccumulator=useRef(0);
  const wheelLock=useRef(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const rafRef=useRef<number|null>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [frameIndex,setFrameIndex]=useState(0);

  const scene=SCENES[sceneIndex];

  const goScene=useCallback((next:number)=>{
    setSceneIndex(clamp(next,0,SCENES.length-1));
    setFrameIndex(0);
  },[]);

  const moveFrame=useCallback((direction:-1|1)=>{
    setFrameIndex(current=>clamp(current+direction,0,SCENES[sceneIndex].frames.length-1));
  },[sceneIndex]);

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
        if(Math.abs(wheelAccumulator.current)>38){
          moveFrame(wheelAccumulator.current>0?1:-1);
          wheelAccumulator.current=0;
          wheelLock.current=true;
          window.setTimeout(()=>{wheelLock.current=false;},320);
        }
        return;
      }

      const direction=event.deltaY>0?1:-1;
      const canMove=direction>0?sceneIndex<SCENES.length-1:sceneIndex>0;
      if(!canMove)return;
      event.preventDefault();
      wheelAccumulator.current+=event.deltaY;
      if(Math.abs(wheelAccumulator.current)>62){
        goScene(sceneIndex+direction);
        wheelAccumulator.current=0;
        wheelLock.current=true;
        window.setTimeout(()=>{wheelLock.current=false;},560);
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

  function handlePointerMove(event:PointerEvent<HTMLElement>){
    const node=rootRef.current;
    if(!node)return;
    const rect=node.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width-.5)*2;
    const y=((event.clientY-rect.top)/rect.height-.5)*2;
    if(rafRef.current)cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(()=>{
      node.style.setProperty('--pointer-x',x.toFixed(4));
      node.style.setProperty('--pointer-y',y.toFixed(4));
    });
  }

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    const target=event.target as HTMLElement;
    if(target.closest('button,a'))return;
    dragStart.current={x:event.clientX,y:event.clientY};
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

  function resetPointer(){
    const node=rootRef.current;
    if(!node)return;
    node.style.setProperty('--pointer-x','0');
    node.style.setProperty('--pointer-y','0');
  }

  return <main
    ref={rootRef}
    className="sfiSceneExperience"
    data-active-scene={scene.id}
    style={{'--scene-index':sceneIndex,'--frame-index':frameIndex} as CSSProperties}
    onPointerMove={handlePointerMove}
    onPointerDown={handlePointerDown}
    onPointerUp={handlePointerUp}
    onPointerCancel={()=>{dragStart.current=null;}}
    onPointerLeave={resetPointer}
  >
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
          <div className="sfiSceneBackground" style={{backgroundImage:`url('${item.background}')`}} aria-hidden="true"/>
          <div className="sfiSceneLayers" aria-hidden="true">
            {item.assets.map((asset,layerIndex)=><img
              key={asset.src}
              src={asset.src}
              alt=""
              className={`sfiSceneLayer sfiSceneLayer--${layerIndex+1}`}
              data-role={asset.role}
              data-motion={asset.motion}
              data-alpha={asset.alpha?'true':undefined}
              style={{
                '--asset-depth':asset.depth,
                '--parallax-x':`${asset.depth*7}px`,
                '--parallax-y':`${asset.depth*3.5}px`,
                '--parallax-z':`${asset.depth*40}px`,
              } as CSSProperties}
            />)}
          </div>

          <div className="sfiSceneVeil" aria-hidden="true"/>
          <div className="sfiSceneContent">
            <div className="sfiSceneCopy">
              <div className="sfiSceneEyebrow"><span>{item.number}</span>{item.eyebrow}</div>
              <h1>{item.title}<span>{item.accent}</span></h1>
              <p className="sfiSceneLead">{item.lead}</p>
              <div key={`${item.id}-${frame.label}`} className="sfiFieldState">
                <small>{frame.label}</small>
                <strong>{frame.title}</strong>
                <p>{frame.text}</p>
              </div>
              <div className="sfiGestureLegend" aria-hidden="true">
                <span>VERTICAL</span><b>CHANGE SUBJECT</b>
                <span>HORIZONTAL</span><b>CHANGE EXPLANATION</b>
              </div>
            </div>
          </div>
        </section>;
      })}
    </div>

    <nav className="sfiTopicRail" aria-label="Landing subjects">
      {SCENES.map((item,index)=><button
        key={item.id}
        type="button"
        data-active={index===sceneIndex?'true':undefined}
        onClick={()=>goScene(index)}
        aria-label={`Open subject ${item.number}: ${item.eyebrow}`}
      ><span>{item.number}</span><i/></button>)}
    </nav>

    <div className="sfiExplanationRail" aria-label="Explanations">
      <span>{String(frameIndex+1).padStart(2,'0')}</span>
      <div>
        {scene.frames.map((frame,index)=><button
          key={frame.label}
          type="button"
          data-active={index===frameIndex?'true':undefined}
          onClick={()=>setFrameIndex(index)}
          aria-label={`Explanation ${index+1}: ${frame.label}`}
        />)}
      </div>
      <span>{String(scene.frames.length).padStart(2,'0')}</span>
    </div>
  </main>;
}
