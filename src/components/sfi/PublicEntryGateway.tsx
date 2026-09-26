'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent as ReactTouchEvent } from 'react';
import './PublicEntryGateway.css';

import { SCENES } from './publicSceneManifest';



function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

export function PublicEntryGateway(){
  const rootRef = useRef<HTMLElement>(null);
  const wheelAccumulator = useRef(0);
  const wheelLock = useRef(false);
  const touchStart = useRef<{x:number;y:number}|null>(null);
  const rafRef = useRef<number|null>(null);

  const [sceneIndex,setSceneIndex] = useState(0);
  const [frameIndex,setFrameIndex] = useState(0);
  const [hotspotIndex,setHotspotIndex] = useState<number|null>(null);

  const scene = SCENES[sceneIndex];
  const activeFrame = scene.frames[frameIndex % scene.frames.length];
  const activeHotspot = hotspotIndex === null ? null : scene.hotspots[hotspotIndex];

  const goScene = useCallback((next:number)=>{
    const bounded = clamp(next,0,SCENES.length-1);
    setSceneIndex(bounded);
    setFrameIndex(0);
    setHotspotIndex(null);
  },[]);

  const moveFrame = useCallback((direction:-1|1)=>{
    setFrameIndex(current=>{
      const length = SCENES[sceneIndex].frames.length;
      const next = (current + direction + length) % length;
      return next;
    });
    setHotspotIndex(null);
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
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2;
      if(horizontal){
        wheelAccumulator.current += event.deltaX;
        if(Math.abs(wheelAccumulator.current) > 55){
          moveFrame(wheelAccumulator.current > 0 ? 1 : -1);
          wheelAccumulator.current = 0;
          wheelLock.current = true;
          window.setTimeout(()=>{wheelLock.current=false;},320);
        }
        return;
      }
      wheelAccumulator.current += event.deltaY;
      if(Math.abs(wheelAccumulator.current) > 70){
        goScene(sceneIndex + (wheelAccumulator.current > 0 ? 1 : -1));
        wheelAccumulator.current = 0;
        wheelLock.current = true;
        window.setTimeout(()=>{wheelLock.current=false;},560);
      }
    };

    const onKey = (event:KeyboardEvent)=>{
      if(event.key === 'ArrowDown' || event.key === 'PageDown'){
        event.preventDefault(); goScene(sceneIndex + 1);
      } else if(event.key === 'ArrowUp' || event.key === 'PageUp'){
        event.preventDefault(); goScene(sceneIndex - 1);
      } else if(event.key === 'ArrowRight'){
        event.preventDefault(); moveFrame(1);
      } else if(event.key === 'ArrowLeft'){
        event.preventDefault(); moveFrame(-1);
      } else if(event.key === 'Home'){
        event.preventDefault(); goScene(0);
      } else if(event.key === 'End'){
        event.preventDefault(); goScene(SCENES.length - 1);
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
  },[goScene,moveFrame,sceneIndex]);

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

  function resetPointer(){
    const node = rootRef.current;
    if(!node) return;
    node.style.setProperty('--pointer-x','0');
    node.style.setProperty('--pointer-y','0');
  }

  function handleTouchStart(event:ReactTouchEvent<HTMLElement>){
    const touch = event.touches[0];
    touchStart.current = {x:touch.clientX,y:touch.clientY};
  }

  function handleTouchEnd(event:ReactTouchEvent<HTMLElement>){
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if(!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if(Math.abs(dx) < 42 && Math.abs(dy) < 42) return;
    if(Math.abs(dx) > Math.abs(dy)){
      moveFrame(dx < 0 ? 1 : -1);
    } else {
      goScene(sceneIndex + (dy < 0 ? 1 : -1));
    }
  }

  return <main
    ref={rootRef}
    className="sfiSceneExperience"
    data-active-scene={scene.id}
    style={{'--scene-index':sceneIndex,'--frame-index':frameIndex} as CSSProperties}
    onPointerMove={handlePointerMove}
    onPointerLeave={resetPointer}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    <header className="sfiSceneChrome">
      <Link href="/" className="sfiSceneBrand" aria-label="System Friction Institute home">
        <span className="sfiSceneMark">SFI</span>
        <span>SYSTEM FRICTION INSTITUTE</span>
      </Link>
      <nav aria-label="Public navigation">
        <Link href="/institution">INSTITUTE</Link>
        <Link href="/library">LIBRARY</Link>
        <Link href="/observatory">OBSERVATORY</Link>
        <Link href="/publications">PUBLICATIONS</Link>
      </nav>
      <div className="sfiSceneChromeActions">
        <span>{scene.number} / {String(SCENES.length).padStart(2,'0')}</span>
        <nav className="sfiMachineLinks" aria-label="Machine-readable entry points">
          <Link href="/llms.txt">LLM</Link>
          <Link href="/ai-index.json">INDEX</Link>
          <Link href="/api/external/v1/manifest">API</Link>
        </nav>
        <Link href="/login">SIGN IN</Link>
      </div>
    </header>

    <nav className="sfiSceneRail" aria-label="Scene navigation">
      {SCENES.map((item,index)=><button
        key={item.id}
        type="button"
        aria-label={`Open scene ${item.number}: ${item.id}`}
        aria-current={sceneIndex===index ? 'step' : undefined}
        onClick={()=>goScene(index)}
      ><span>{item.number}</span><i/></button>)}
    </nav>

    <div className="sfiSceneDeck" aria-live="polite">
      {SCENES.map((item,index)=>{
        const offset = index - sceneIndex;
        const state = offset === 0 ? 'active' : offset < 0 ? 'past' : 'future';
        return <section
          key={item.id}
          className={`sfiScene sfiScene--${item.id}`}
          data-state={state}
          data-scene={item.id}
          data-scale={item.scale}
          style={(()=>{
            const localFrame = index===sceneIndex ? frameIndex : 0;
            const count = Math.max(1,item.frames.length);
            const progress = count > 1 ? localFrame/(count-1) : .5;
            return {
              '--scene-offset':offset,
              '--active-frame':localFrame,
              '--field-x':`${30 + progress*40}%`,
              '--field-shift':`${(0.5-progress)*10}vw`,
            } as CSSProperties;
          })()}
          aria-hidden={index===sceneIndex ? undefined : true}
        >
          <div className="sfiSceneBackground" style={{backgroundImage:`url('${item.background}')`}}/>
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
              <div className="sfiSceneActions">
                <Link href={item.primaryHref}>{item.primaryLabel}<span>→</span></Link>
                <Link href={item.secondaryHref}>{item.secondaryLabel}<span>↗</span></Link>
              </div>
              <div className="sfiSceneInstruction">
                <span>WHEEL / ↑↓</span><b>MOVE BETWEEN SCENES</b>
                <span>DRAG / ← →</span><b>SHIFT THE FIELD</b>
                <span>POINTER</span><b>SHIFT DEPTH</b>
              </div>
            </div>

            <aside className="sfiFieldReadout" aria-live="polite">
              <header>
                <span>{activeFrame.label}</span>
                <strong>{String(frameIndex+1).padStart(2,'0')} / {String(item.frames.length).padStart(2,'0')}</strong>
              </header>
              <h2>{activeFrame.title}</h2>
              <p>{activeFrame.text}</p>
            </aside>

            {item.frames.length > 1 ? <div className="sfiFieldEdges" aria-label="Shift within this system field">
              <button type="button" className="sfiFieldEdge sfiFieldEdge--left" onClick={()=>moveFrame(-1)} aria-label="Shift field left">
                <i>←</i><span>{item.frames[(frameIndex-1+item.frames.length)%item.frames.length].label}</span>
              </button>
              <button type="button" className="sfiFieldEdge sfiFieldEdge--right" onClick={()=>moveFrame(1)} aria-label="Shift field right">
                <span>{item.frames[(frameIndex+1)%item.frames.length].label}</span><i>→</i>
              </button>
            </div> : null}
          </div>

          <div className="sfiSceneHotspots">
            {item.hotspots.map((point,pointIndex)=><button
              key={point.label}
              type="button"
              className="sfiSceneHotspot"
              style={{left:`${point.x}%`,top:`${point.y}%`}}
              data-active={index===sceneIndex && hotspotIndex===pointIndex}
              onClick={()=>setHotspotIndex(pointIndex)}
              aria-label={`Inspect ${point.label}`}
              tabIndex={index===sceneIndex ? 0 : -1}
            ><i/><span>{String(pointIndex+1).padStart(2,'0')}</span></button>)}
          </div>

          <footer className="sfiSceneFooter">
            <div><span>{item.number}</span><strong>{item.id.toUpperCase()}</strong></div>
            <div className="sfiSceneProgress"><i style={{width:`${((sceneIndex+1)/SCENES.length)*100}%`}}/></div>
            <div><span>ACTIVE FIELD</span><strong>{activeFrame.label}</strong></div>
          </footer>
        </section>;
      })}
    </div>

    <div className="sfiSceneEdge sfiSceneEdge--top"><button type="button" onClick={()=>goScene(sceneIndex-1)} disabled={sceneIndex===0}>↑ PREVIOUS</button></div>
    <div className="sfiSceneEdge sfiSceneEdge--bottom"><button type="button" onClick={()=>goScene(sceneIndex+1)} disabled={sceneIndex===SCENES.length-1}>NEXT ↓</button></div>
  </main>;
}
