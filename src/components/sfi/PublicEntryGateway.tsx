'use client';

import Link from 'next/link';
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
  const rootRef = useRef<HTMLElement>(null);
  const wheelAccumulator = useRef(0);
  const wheelLock = useRef(false);
  const dragStart = useRef<{x:number;y:number}|null>(null);
  const rafRef = useRef<number|null>(null);

  const [sceneIndex,setSceneIndex] = useState(0);
  const [frameIndex,setFrameIndex] = useState(0);

  const scene = SCENES[sceneIndex];
  const activeFrame = scene.frames[frameIndex] ?? scene.frames[0];

  const goScene = useCallback((next:number)=>{
    const bounded = clamp(next,0,SCENES.length-1);
    setSceneIndex(bounded);
    setFrameIndex(0);
  },[]);

  const moveFrame = useCallback((direction:-1|1)=>{
    setFrameIndex(current=>{
      const length = SCENES[sceneIndex].frames.length;
      return clamp(current + direction,0,length-1);
    });
  },[sceneIndex]);

  useEffect(()=>{
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100svh';

    const onWheel = (event:WheelEvent)=>{
      event.preventDefault();
      if(wheelLock.current) return;

      const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15;
      if(horizontal && scene.frames.length > 1){
        const delta = Math.abs(event.deltaX) > 1 ? event.deltaX : event.deltaY;
        wheelAccumulator.current += delta;
        if(Math.abs(wheelAccumulator.current) > 42){
          moveFrame(wheelAccumulator.current > 0 ? 1 : -1);
          wheelAccumulator.current = 0;
          wheelLock.current = true;
          window.setTimeout(()=>{wheelLock.current=false;},360);
        }
        return;
      }

      wheelAccumulator.current += event.deltaY;
      if(Math.abs(wheelAccumulator.current) > 68){
        goScene(sceneIndex + (wheelAccumulator.current > 0 ? 1 : -1));
        wheelAccumulator.current = 0;
        wheelLock.current = true;
        window.setTimeout(()=>{wheelLock.current=false;},620);
      }
    };

    const onKey = (event:KeyboardEvent)=>{
      if(event.key === 'ArrowDown' || event.key === 'PageDown'){
        event.preventDefault();
        goScene(sceneIndex + 1);
      }else if(event.key === 'ArrowUp' || event.key === 'PageUp'){
        event.preventDefault();
        goScene(sceneIndex - 1);
      }else if(event.key === 'ArrowRight'){
        event.preventDefault();
        moveFrame(1);
      }else if(event.key === 'ArrowLeft'){
        event.preventDefault();
        moveFrame(-1);
      }else if(event.key === 'Home'){
        event.preventDefault();
        goScene(0);
      }else if(event.key === 'End'){
        event.preventDefault();
        goScene(SCENES.length-1);
      }
    };

    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('keydown',onKey);
    return ()=>{
      window.removeEventListener('wheel',onWheel);
      window.removeEventListener('keydown',onKey);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.height = previousBodyHeight;
    };
  },[goScene,moveFrame,scene.frames.length,sceneIndex]);

  function handlePointerMove(event:PointerEvent<HTMLElement>){
    const node = rootRef.current;
    if(!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;

    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(()=>{
      node.style.setProperty('--pointer-x',x.toFixed(4));
      node.style.setProperty('--pointer-y',y.toFixed(4));
    });
  }

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    const target = event.target as HTMLElement;
    if(target.closest('a,button')) return;
    dragStart.current = {x:event.clientX,y:event.clientY};
  }

  function handlePointerUp(event:PointerEvent<HTMLElement>){
    const start = dragStart.current;
    dragStart.current = null;
    if(!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if(Math.abs(dx) < 44 && Math.abs(dy) < 44) return;

    if(Math.abs(dx) > Math.abs(dy) * 1.08){
      moveFrame(dx < 0 ? 1 : -1);
    }else{
      goScene(sceneIndex + (dy < 0 ? 1 : -1));
    }
  }

  function resetPointer(){
    const node = rootRef.current;
    if(!node) return;
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
    <header className="sfiSceneChrome">
      <Link href="/" className="sfiSceneBrand" aria-label="System Friction Institute home">
        <span className="sfiSceneMark">SFI</span>
        <span>SYSTEM FRICTION INSTITUTE</span>
      </Link>

      <nav aria-label="Public navigation">
        <Link href="/observatory">OBSERVATORY</Link>
        <Link href="/publications">PUBLICATIONS</Link>
      </nav>

      <div className="sfiSceneChromeActions">
        <span>{scene.number} / {String(SCENES.length).padStart(2,'0')}</span>
        <Link href="/login">SIGN IN</Link>
      </div>
    </header>

    <div className="sfiSceneDeck" aria-live="polite">
      {SCENES.map((item,index)=>{
        const offset = index - sceneIndex;
        const state = offset === 0 ? 'active' : offset < 0 ? 'past' : 'future';
        const localFrameIndex = index===sceneIndex ? frameIndex : 0;
        const frame = item.frames[localFrameIndex] ?? item.frames[0];
        const count = Math.max(1,item.frames.length);
        const progress = count > 1 ? localFrameIndex/(count-1) : .5;

        return <section
          key={item.id}
          className={`sfiScene sfiScene--${item.id}`}
          data-state={state}
          data-scene={item.id}
          data-scale={item.scale}
          data-field={frame.label.toLowerCase()}
          style={{
            '--scene-offset':offset,
            '--active-frame':localFrameIndex,
            '--field-x':`${30 + progress*40}%`,
            '--field-shift':`${(0.5-progress)*14}vw`,
          } as CSSProperties}
          aria-hidden={index===sceneIndex ? undefined : true}
        >
          <div
            className="sfiSceneBackground"
            style={{backgroundImage:`url('${item.background}')`}}
            aria-hidden="true"
          />

          <div className="sfiSceneGrid" aria-hidden="true"/>

          <div className="sfiSceneLayers" aria-hidden="true">
            {item.assets.map((asset,layerIndex)=><img
              key={asset.src}
              src={asset.src}
              alt=""
              data-role={asset.role}
              data-motion={asset.motion}
              data-alpha={asset.alpha ? 'true' : undefined}
              className={`sfiSceneLayer sfiSceneLayer--${layerIndex+1} sfiSceneLayer--${asset.role}`}
              style={{'--asset-depth':asset.depth} as CSSProperties}
            />)}
          </div>

          <div className="sfiSceneContent">
            <div className="sfiSceneCopy">
              <div className="sfiSceneEyebrow">{item.eyebrow}</div>
              <h1>{item.title}<span>{item.accent}</span></h1>
              <p>{item.lead}</p>

              {item.frames.length > 1 ? <div
                key={`${item.id}-${frame.label}`}
                className="sfiFieldState"
                aria-live="polite"
              >
                <small>{frame.label}</small>
                <strong>{frame.title}</strong>
                <p>{frame.text}</p>
              </div> : null}

              <div className="sfiSceneActions">
                <Link href={item.primaryHref}>{item.primaryLabel}</Link>
                <Link href={item.secondaryHref}>{item.secondaryLabel}</Link>
              </div>

              <div className="sfiSceneInstruction" aria-hidden="true">
                <span>SCROLL</span><b>DESCEND THROUGH SCALE</b>
                {item.frames.length > 1 ? <><span>DRAG / SWIPE</span><b>SHIFT THE FIELD</b></> : null}
              </div>
            </div>
          </div>
        </section>;
      })}
    </div>
  </main>;
}
