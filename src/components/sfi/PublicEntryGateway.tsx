'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import './PublicEntryGateway.css';

type SceneFrame = {
  label: string;
  title: string;
  text: string;
};

type SceneHotspot = {
  x: number;
  y: number;
  label: string;
  text: string;
};

type Scene = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  background: string;
  layers: readonly string[];
  frames: readonly SceneFrame[];
  hotspots: readonly SceneHotspot[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

const SCENES: readonly Scene[] = [
  {
    id:'world',
    number:'01',
    eyebrow:'PUBLIC ENTRY · WORLD',
    title:'THE WORLD',
    accent:'ALREADY MOVES.',
    lead:'SFI begins with observation, not with a claim of total visibility. Move through the scene and inspect what changes before any conclusion is accepted.',
    background:'/sfi-scenes/world.png',
    layers:['/sfi-scenes/satellite.png','/sfi-scenes/systems.svg','/sfi-scenes/identity.svg'],
    frames:[
      {label:'OBSERVE',title:'Start with what is visible.',text:'A public reading must preserve its position, source window and limits.'},
      {label:'COMPARE',title:'Change the reading position.',text:'The same world can produce different institutional readings without becoming different worlds.'},
      {label:'BOUNDARY',title:'Keep the unknown visible.',text:'What was not observed remains outside the claim instead of being filled for visual completeness.'},
    ],
    hotspots:[
      {x:72,y:35,label:'SIGNAL',text:'A signal can direct attention. It is not yet evidence or authority.'},
      {x:58,y:61,label:'CONTEXT',text:'Observation changes with time, location, source and institutional position.'},
      {x:84,y:67,label:'LIMIT',text:'The public surface must show where observation stops.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'OPEN OBSERVATORY',
    secondaryHref:'/institution',
    secondaryLabel:'UNDERSTAND SFI',
  },
  {
    id:'systems',
    number:'02',
    eyebrow:'SCENE 02 · SYSTEMS',
    title:'NOTHING',
    accent:'OPERATES ALONE.',
    lead:'Infrastructure, people, information, energy, institutions and territory are read as coupled conditions rather than isolated categories.',
    background:'/sfi-scenes/world.png',
    layers:['/sfi-scenes/field-cinematic.webp','/sfi-scenes/systems.svg','/sfi-scenes/agents.svg'],
    frames:[
      {label:'TERRITORY',title:'See the physical field.',text:'Systems become legible when their shared operating conditions are visible.'},
      {label:'SIGNALS',title:'See what moves between nodes.',text:'Signals expose dependency, timing, latency and asymmetry without proving causality.'},
      {label:'INTERDEPENDENCE',title:'See the coupled structure.',text:'A local change can alter options elsewhere because the system is not separable.'},
    ],
    hotspots:[
      {x:66,y:35,label:'NODE',text:'A node is a position in a system, not a self-contained explanation.'},
      {x:78,y:57,label:'PATH',text:'Paths show relation and movement. Their existence does not establish motive.'},
      {x:53,y:69,label:'DEPENDENCY',text:'Interdependence changes what counts as a local action.'},
    ],
    primaryHref:'/field',
    primaryLabel:'ENTER FIELD',
    secondaryHref:'/observatory',
    secondaryLabel:'READ CURRENT SIGNALS',
  },
  {
    id:'friction',
    number:'03',
    eyebrow:'SCENE 03 · FRICTION',
    title:'WHERE SYSTEMS MEET,',
    accent:'OPTIONS SHIFT.',
    lead:'Friction is represented as structured tension: convergence, divergence, interference and redirection. It is not automatically failure.',
    background:'/sfi-scenes/field-cinematic.webp',
    layers:['/sfi-scenes/optionality.svg','/sfi-scenes/falsification.svg','/sfi-scenes/governance.svg'],
    frames:[
      {label:'CONVERGENCE',title:'Some paths become more likely.',text:'Friction can compress alternatives and pull activity toward a shared route.'},
      {label:'DIVERGENCE',title:'Some paths split.',text:'Competing constraints can produce valid alternatives rather than one correct trajectory.'},
      {label:'REDIRECTION',title:'Some paths change after contact.',text:'The relevant question is what options changed and what evidence supports that reading.'},
    ],
    hotspots:[
      {x:65,y:31,label:'TENSION',text:'Tension is observed through incompatible demands, constraints or timings.'},
      {x:81,y:50,label:'OPTION',text:'A changing option set is more informative than a generic error state.'},
      {x:60,y:70,label:'RIVAL',text:'Competing interpretations remain visible until evidence separates them.'},
    ],
    primaryHref:'/library',
    primaryLabel:'OPEN METHODS',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'people',
    number:'04',
    eyebrow:'SCENE 04 · PERSPECTIVE',
    title:'ONE WORLD.',
    accent:'MANY POSITIONS.',
    lead:'Executives, operators, analysts and citizens do not observe from the same position. Perspective is a structural condition of institutional reality.',
    background:'/sfi-scenes/world.png',
    layers:['/sfi-scenes/identity.svg','/sfi-scenes/agents.svg','/sfi-scenes/models.svg'],
    frames:[
      {label:'EXECUTIVE',title:'Decision horizon.',text:'Sees risk, optionality, authority, external effect and long-term institutional exposure.'},
      {label:'OPERATOR',title:'Operational horizon.',text:'Sees constraints, handoffs, failure modes, queues, tools and immediate consequences.'},
      {label:'ANALYST',title:'Evidence horizon.',text:'Sees patterns, uncertainty, provenance, rival explanations and missing information.'},
      {label:'CITIZEN',title:'Lived horizon.',text:'Sees consequence, access, trust, burden and the reality produced by institutional action.'},
    ],
    hotspots:[
      {x:55,y:36,label:'POSITION',text:'Visibility changes with role, access, responsibility and distance from the event.'},
      {x:75,y:55,label:'STAKE',text:'Different actors carry different costs when a system is wrong.'},
      {x:62,y:72,label:'BLIND SPOT',text:'No perspective is treated as a complete representation of the institution.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'ENTER INSTITUTE',
    secondaryHref:'/field',
    secondaryLabel:'SEE THE FIELD',
  },
  {
    id:'institution',
    number:'05',
    eyebrow:'SCENE 05 · INSTITUTE',
    title:'CAPABILITY IS NOT',
    accent:'AUTHORITY.',
    lead:'Evidence can inform inference. Inference can support a decision. None of those steps authorizes execution by itself.',
    background:'/images/editorial/notas-de-laboratorio.webp',
    layers:['/sfi-scenes/authority.svg','/sfi-scenes/archive.svg','/sfi-scenes/governance.svg'],
    frames:[
      {label:'EVIDENCE',title:'Recoverable support.',text:'Institutional memory depends on evidence that can be retrieved, inspected and challenged.'},
      {label:'INFERENCE',title:'Transformation with uncertainty.',text:'Inference must preserve the path from evidence to interpretation instead of presenting interpretation as observation.'},
      {label:'AUTHORITY',title:'A governed boundary.',text:'Authority identifies who may permit action, under what scope, and with what traceable limit.'},
    ],
    hotspots:[
      {x:65,y:33,label:'EVIDENCE',text:'A source becomes institutionally useful when provenance and retrieval survive the interface.'},
      {x:81,y:53,label:'AUTHORITY',text:'Capability does not silently become permission.'},
      {x:59,y:71,label:'EXECUTION',text:'Authorized action and executed action remain separate states.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'READ INSTITUTIONAL BOUNDARIES',
    secondaryHref:'/library',
    secondaryLabel:'ENTER LIBRARY',
  },
  {
    id:'return',
    number:'06',
    eyebrow:'SCENE 06 · RETURN',
    title:'ACTION LEAVES',
    accent:'A TRACE.',
    lead:'SFI does not end at authorization or execution. RETURN preserves what happened afterward and allows that result to alter the next reading.',
    background:'/images/editorial/notas-de-retorno.webp',
    layers:['/sfi-scenes/falsification.svg','/sfi-scenes/optionality.svg','/sfi-scenes/field.svg'],
    frames:[
      {label:'OUTCOME',title:'What happened afterward?',text:'The observed result is preserved separately from the intention that preceded it.'},
      {label:'CONTRAST',title:'What survived contact with reality?',text:'Expected effects, contradictions and failures are compared without rewriting the prior state.'},
      {label:'CORRECTION',title:'What must change next?',text:'RETURN can alter memory, method, confidence, authority or the next available action.'},
    ],
    hotspots:[
      {x:67,y:34,label:'OUTCOME',text:'Outcome is post-action evidence, not a decorative completion state.'},
      {x:82,y:55,label:'CONTRAST',text:'Contradiction remains visible even when it weakens the original interpretation.'},
      {x:60,y:72,label:'CORRECTION',text:'The system becomes accountable when return can change what comes next.'},
    ],
    primaryHref:'/publications',
    primaryLabel:'READ PUBLISHED RETURNS',
    secondaryHref:'/observatory',
    secondaryLabel:'RETURN TO OBSERVATORY',
  },
] as const;

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}

export function PublicEntryGateway(){
  const rootRef = useRef<HTMLElement>(null);
  const wheelAccumulator = useRef(0);
  const wheelLock = useRef(false);
  const touchStart = useRef<{x:number;y:number}|null>(null);
  const frameRef = useRef(0);
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
    frameRef.current = 0;
    setHotspotIndex(null);
  },[]);

  const moveFrame = useCallback((direction:-1|1)=>{
    setFrameIndex(current=>{
      const length = SCENES[sceneIndex].frames.length;
      const next = (current + direction + length) % length;
      frameRef.current = next;
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

  function handleTouchStart(event:React.TouchEvent<HTMLElement>){
    const touch = event.touches[0];
    touchStart.current = {x:touch.clientX,y:touch.clientY};
  }

  function handleTouchEnd(event:React.TouchEvent<HTMLElement>){
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
          style={{'--scene-offset':offset,'--active-frame':index===sceneIndex?frameIndex:0} as CSSProperties}
          aria-hidden={index===sceneIndex ? undefined : true}
        >
          <div className="sfiSceneBackground" style={{backgroundImage:`linear-gradient(90deg,rgba(6,6,5,.96) 0%,rgba(6,6,5,.76) 39%,rgba(6,6,5,.25) 69%,rgba(6,6,5,.68) 100%),url('${item.background}')`}}/>
          <div className="sfiSceneGrid" aria-hidden="true"/>
          <div className="sfiSceneLayers" aria-hidden="true">
            {item.layers.map((src,layerIndex)=><img key={src} src={src} alt="" className={`sfiSceneLayer sfiSceneLayer--${layerIndex+1}`}/>)}
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
                <span>← →</span><b>CHANGE PERSPECTIVE</b>
                <span>POINTER</span><b>SHIFT DEPTH</b>
              </div>
            </div>

            <aside className="sfiSceneInspector">
              <header><span>PERSPECTIVE</span><strong>{String(frameIndex+1).padStart(2,'0')} / {String(item.frames.length).padStart(2,'0')}</strong></header>
              <div className="sfiSceneFrameText">
                <small>{activeFrame.label}</small>
                <h2>{activeFrame.title}</h2>
                <p>{activeFrame.text}</p>
              </div>
              {activeHotspot ? <div className="sfiHotspotReadout">
                <span>OBSERVED POINT · {activeHotspot.label}</span>
                <p>{activeHotspot.text}</p>
              </div> : <div className="sfiHotspotReadout sfiHotspotReadout--idle">
                <span>OBSERVATION REQUIRED</span>
                <p>Select a marked point in the scene to inspect a bounded reading.</p>
              </div>}
              <div className="sfiHorizontalControls">
                <button type="button" onClick={()=>moveFrame(-1)} aria-label="Previous perspective">←</button>
                <div>{item.frames.map((frame,i)=><button key={frame.label} type="button" aria-label={`Open ${frame.label} perspective`} aria-current={frameIndex===i ? 'true' : undefined} onClick={()=>{setFrameIndex(i);frameRef.current=i;setHotspotIndex(null);}}><i/></button>)}</div>
                <button type="button" onClick={()=>moveFrame(1)} aria-label="Next perspective">→</button>
              </div>
            </aside>
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
            <div><span>ACTIVE LENS</span><strong>{activeFrame.label}</strong></div>
          </footer>
        </section>;
      })}
    </div>

    <div className="sfiSceneEdge sfiSceneEdge--top"><button type="button" onClick={()=>goScene(sceneIndex-1)} disabled={sceneIndex===0}>↑ PREVIOUS</button></div>
    <div className="sfiSceneEdge sfiSceneEdge--bottom"><button type="button" onClick={()=>goScene(sceneIndex+1)} disabled={sceneIndex===SCENES.length-1}>NEXT ↓</button></div>
  </main>;
}
