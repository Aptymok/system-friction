'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import './PublicEntryGateway.css';

const PUBLIC_ROUTES = [
  { n:'01', href:'/observatory', title:'Observatory', note:'Qué está observando SFI ahora. FIELD es la lectura situada por defecto dentro de esta superficie.', visual:'world' },
  { n:'02', href:'/publications', title:'Publications', note:'Notas, casos, investigación y RETURN publicados.', visual:'publication' },
  { n:'03', href:'/library', title:'Library', note:'Conocimiento conectado, métodos y evidencia.', visual:'library' },
  { n:'04', href:'/institution', title:'Institute', note:'Qué institución afirma todo esto y bajo qué límites.', visual:'institute' },
] as const;

const OBSERVATION_LENSES = [
  {
    id:'world',
    label:'WORLD',
    title:'World as observed',
    note:'No se presenta un mundo completo. Se presenta una lectura pública acotada: señales, contexto y límites de observación.',
    image:'/sfi-scenes/world.png',
    href:'/observatory',
    cta:'ABRIR OBSERVATORY',
    hotspots:[
      { x:28, y:58, title:'SIGNAL', note:'Una señal no equivale todavía a evidencia ni a conclusión.' },
      { x:55, y:36, title:'CONTEXT', note:'Toda observación depende de una ventana, una fuente y una posición.' },
      { x:73, y:64, title:'BOUNDARY', note:'Lo no observado permanece explícitamente fuera del claim.' },
    ],
  },
  {
    id:'systems',
    label:'SYSTEMS',
    title:'Systems under friction',
    note:'El usuario recorre relaciones y tensiones antes de recibir una lectura cerrada. La interfaz no sustituye la reconstrucción.',
    image:'/sfi-scenes/field-cinematic.webp',
    href:'/field',
    cta:'ENTRAR A FIELD',
    hotspots:[
      { x:24, y:43, title:'ACTORS', note:'Personas, instituciones y sistemas no se representan como una sola entidad.' },
      { x:50, y:61, title:'FRICTION', note:'La fricción señala una relación que requiere observación, no una causa asumida.' },
      { x:77, y:34, title:'OPTIONALITY', note:'Se conservan rutas alternativas cuando la evidencia todavía no autoriza una única lectura.' },
    ],
  },
  {
    id:'evidence',
    label:'EVIDENCE',
    title:'Evidence before inference',
    note:'Una pieza pública debe permitir distinguir lo observado, la evidencia recuperable y aquello que todavía es inferencia.',
    image:'/images/editorial/notas-de-caso.webp',
    href:'/library',
    cta:'RECORRER LIBRARY',
    hotspots:[
      { x:31, y:34, title:'SOURCE', note:'La procedencia se mantiene separada de la interpretación.' },
      { x:58, y:53, title:'TRACE', note:'La trazabilidad permite volver desde una afirmación hasta el registro que la soporta.' },
      { x:76, y:70, title:'COUNTEREVIDENCE', note:'La contradicción relevante no se oculta para proteger una narrativa.' },
    ],
  },
  {
    id:'authority',
    label:'AUTHORITY',
    title:'Capability is not authority',
    note:'Que algo pueda ejecutarse no significa que esté autorizado. La autoridad debe conservar alcance, límite y procedencia.',
    image:'/images/editorial/notas-de-laboratorio.webp',
    href:'/institution',
    cta:'VER INSTITUTO',
    hotspots:[
      { x:25, y:68, title:'CAPABILITY', note:'Describe lo que un sistema puede hacer.' },
      { x:52, y:39, title:'AUTHORITY', note:'Describe quién puede permitirlo, bajo qué condiciones y con qué límites.' },
      { x:78, y:58, title:'EXECUTION', note:'La ejecución debe quedar distinguida del permiso previo.' },
    ],
  },
  {
    id:'return',
    label:'RETURN',
    title:'What came back',
    note:'SFI no cierra en la decisión. RETURN conserva el efecto posterior, la contradicción, el fallo y aquello que debe corregirse.',
    image:'/images/editorial/notas-de-retorno.webp',
    href:'/publications',
    cta:'VER RETURNS PUBLICADOS',
    hotspots:[
      { x:29, y:46, title:'OUTCOME', note:'Qué ocurrió después de la acción o intervención.' },
      { x:54, y:67, title:'CONTRAST', note:'Qué sobrevivió frente a lo esperado y qué dejó de sostenerse.' },
      { x:76, y:35, title:'CORRECTION', note:'El retorno puede cambiar memoria, criterio o siguiente autoridad.' },
    ],
  },
] as const;

const REALITY_CHAIN = [
  { id:'observation', label:'OBSERVATION', question:'¿Qué fue observado realmente?' },
  { id:'evidence', label:'EVIDENCE', question:'¿Qué registro recuperable soporta esa observación?' },
  { id:'inference', label:'INFERENCE', question:'¿Qué transformación o interpretación se hizo?' },
  { id:'authority', label:'AUTHORITY', question:'¿Quién podía autorizar el siguiente paso y con qué límite?' },
  { id:'execution', label:'EXECUTION', question:'¿Qué se ejecutó efectivamente, no sólo qué se aprobó?' },
  { id:'return', label:'RETURN', question:'¿Qué ocurrió después y qué debe cambiar con ese resultado?' },
] as const;

export function PublicEntryGateway() {
  const { text } = useSfiLanguage();
  const [lensIndex, setLensIndex] = useState(0);
  const [hotspotIndex, setHotspotIndex] = useState(0);
  const [chainIndex, setChainIndex] = useState(0);
  const [pointer, setPointer] = useState({ x:0, y:0 });
  const routeRailRef = useRef<HTMLDivElement>(null);

  const lens = OBSERVATION_LENSES[lensIndex];
  const hotspot = lens.hotspots[Math.min(hotspotIndex, lens.hotspots.length - 1)];
  const chain = REALITY_CHAIN[chainIndex];

  function onHeroPointer(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    setPointer({ x, y });
  }

  function selectLens(index: number) {
    setLensIndex(index);
    setHotspotIndex(0);
  }

  function moveRoutes(direction: -1 | 1) {
    routeRailRef.current?.scrollBy({ left: direction * 360, behavior:'smooth' });
  }

  const heroStyle = {
    '--sfi-pointer-x': pointer.x,
    '--sfi-pointer-y': pointer.y,
  } as CSSProperties;

  return <main className="sfiEntryHome">
    <header className="sfiPublicTopbar">
      <Link href="/" className="sfiPublicBrand"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
      <nav aria-label="SFI public navigation">
        <Link href="/observatory">OBSERVATORY</Link><Link href="/publications">PUBLICATIONS</Link><Link href="/library">LIBRARY</Link><Link href="/field">FIELD</Link><Link href="/institution">INSTITUTE</Link>
      </nav>
      <Link href="/login" className="sfiPublicAccess">SIGN IN</Link>
    </header>

    <section className="sfiEntryHero" onPointerMove={onHeroPointer} onPointerLeave={() => setPointer({x:0,y:0})} style={heroStyle}>
      <div className="sfiEntryHeroWorld" aria-hidden="true"/>
      <div className="sfiEntryHeroGrid" aria-hidden="true"/>
      <div className="sfiEntryHeroCopy">
        <span>SYSTEM FRICTION INSTITUTE · PUBLIC MEMBRANE</span>
        <h1>{text('Un mundo más coherente.', 'A more coherent world.')}</h1>
        <p>{text('Investigación aplicada, sistemas cognitivos y observación de sistemas complejos. SFI conserva qué observó, qué infirió, qué hizo, qué ocurrió después y qué cambió con el retorno.', 'Applied research, cognitive systems and observation of complex systems. SFI preserves what it observed, inferred, did, what happened next, and what changed with return.')}</p>
        <div className="sfiEntryHeroActions"><Link href="/observatory">OBSERVAR EL MUNDO →</Link><Link href="/institution">ENTENDER SFI →</Link></div>
        <div className="sfiEntrySequence"><span>OBSERVATION</span><i>→</i><span>EVIDENCE</span><i>→</i><span>INFERENCE</span><i>→</i><span>AUTHORITY</span><i>→</i><span>EXECUTION</span><i>→</i><span>RETURN</span></div>
      </div>
      <aside className="sfiEntryHeroAside">
        <span>MOVE</span><strong>OBSERVE BEFORE CONCLUDING</strong><small>El movimiento del puntero altera profundidad, no estado institucional.</small>
      </aside>
    </section>

    <section className="sfiObservationDeck" aria-labelledby="sfi-observation-title">
      <header className="sfiObservationHeader">
        <div><span>PUBLIC OBSERVATION DECK</span><h2 id="sfi-observation-title">No leas SFI como una página. Recórrelo como un sistema.</h2></div>
        <p>Selecciona una lente, inspecciona los puntos y cambia de capa. Ninguna interacción concede autoridad ni fabrica evidencia.</p>
      </header>

      <div className="sfiLensRail" role="tablist" aria-label="Observation lenses">
        {OBSERVATION_LENSES.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === lensIndex} onClick={() => selectLens(index)}>
          <span>0{index + 1}</span>{item.label}
        </button>)}
      </div>

      <div className="sfiLensWorkspace" data-lens={lens.id}>
        <figure className="sfiLensStage" style={{backgroundImage:`linear-gradient(90deg,rgba(5,5,4,.84),rgba(5,5,4,.2) 55%,rgba(5,5,4,.7)),url('${lens.image}')`}}>
          <figcaption><span>{lens.label}</span><strong>{lens.title}</strong></figcaption>
          {lens.hotspots.map((item, index) => <button
            key={item.title}
            type="button"
            className="sfiLensHotspot"
            style={{left:`${item.x}%`,top:`${item.y}%`}}
            data-active={index === hotspotIndex}
            aria-label={`Inspect ${item.title}`}
            onClick={() => setHotspotIndex(index)}
          ><i/><span>{index + 1}</span></button>)}
        </figure>

        <aside className="sfiLensInspector" aria-live="polite">
          <div className="sfiLensInspectorHead"><span>INSPECTOR</span><b>{lens.label}</b></div>
          <h3>{hotspot.title}</h3>
          <p>{hotspot.note}</p>
          <div className="sfiLensBoundary"><span>BOUNDARY</span><p>{lens.note}</p></div>
          <Link href={lens.href}>{lens.cta} →</Link>
        </aside>
      </div>
    </section>

    <section className="sfiRealityChain" aria-labelledby="sfi-chain-title">
      <header><span>RECONSTRUCTIBILITY TEST</span><h2 id="sfi-chain-title">La cadena no avanza sola.</h2><p>Selecciona cada estado. La pregunta cambia porque cada capa exige una clase distinta de evidencia.</p></header>
      <div className="sfiRealityRail" role="tablist" aria-label="Reality chain">
        {REALITY_CHAIN.map((item,index) => <button key={item.id} type="button" role="tab" aria-selected={chainIndex === index} onClick={() => setChainIndex(index)}>
          <span>0{index + 1}</span><strong>{item.label}</strong>
        </button>)}
      </div>
      <div className="sfiRealityQuestion" aria-live="polite"><span>{chain.label}</span><p>{chain.question}</p></div>
    </section>

    <section className="sfiEntryRoutes" aria-labelledby="sfi-routes-title">
      <header>
        <div><span>HORIZONTAL TRAVERSE</span><h2 id="sfi-routes-title">Distintas superficies. Una misma institución.</h2></div>
        <div className="sfiRouteControls" aria-label="Move public route rail"><button type="button" onClick={() => moveRoutes(-1)}>←</button><button type="button" onClick={() => moveRoutes(1)}>→</button></div>
      </header>
      <div className="sfiEntryRouteGrid" ref={routeRailRef}>{PUBLIC_ROUTES.map((route) => <Link href={route.href} key={route.href} className={`sfiEntryRoute sfiEntryRoute--${route.visual}`}>
        <span>{route.n}</span><div><h3>{route.title}</h3><p>{route.note}</p></div><b>ENTRAR →</b>
      </Link>)}</div>
    </section>

    <section className="sfiEntryCredibility">
      <header><span>PUBLIC CLAIM BOUNDARY</span><h2>La presentación no sustituye el estado institucional.</h2></header>
      <div className="sfiEntryChain"><Link href="/library">THEORY</Link><i>→</i><Link href="/library">METHOD</Link><i>→</i><Link href="/library">INSTRUMENT</Link><i>→</i><Link href="/publications">CASE</Link><i>→</i><Link href="/publications">RETURN</Link></div>
      <p>La credibilidad pública no depende de declarar capacidades, sino de conservar relaciones entre definición, método, aplicación, evidencia, autoridad, ejecución y corrección.</p>
    </section>

    <details className="sfiEntryMachine">
      <summary>ACCESO PARA IA / AGENTES · MACHINE-READABLE</summary>
      <p>La proyección para máquinas permanece separada de la lectura humana y no concede autoridad por sí misma.</p>
      <div><Link href="/llms.txt">/llms.txt</Link><Link href="/ai-index.json">AI INDEX</Link><Link href="/api/external/v1/manifest">GATEWAY MANIFEST</Link></div>
    </details>
  </main>;
}
