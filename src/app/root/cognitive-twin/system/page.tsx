import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readLegacyCognitiveTwinState } from '@/lib/cognitive-twin/legacyCapabilityBridge';
import styles from './system.module.css';

export const dynamic='force-dynamic';

export default async function CognitiveTwinSystemPage(){
  await requireRootObserverPage('/root/cognitive-twin/system');
  const state=await readLegacyCognitiveTwinState();
  const lineage=(state.lineage??{}) as Record<string,unknown>;
  const mutation=(state.mutations??{}) as Record<string,unknown>;
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span>COGNITIVE TWIN · SYSTEM MAP</span><h1>Memoria longitudinal de SFI</h1><p>Una sola arquitectura: observa lo que SFI vive, conserva secuencia y procedencia, contrasta expectativas con retornos y mantiene autoridad separada del modelo.</p></div>
      <nav><Link href="/root">OPERAR</Link><Link href="/root/cognitive-twin">CONSOLA</Link><Link href="/root/cognitive-twin/lineage">CT-A01</Link><Link href="/root/cognitive-twin/journal">JOURNAL</Link></nav>
    </header>

    <section className={styles.status}>
      <article data-good={state.softwareComplete}><span>TRANSPORTE LEGACY</span><strong>{state.softwareComplete?'COMPLETO':'INCOMPLETO'}</strong><small>{state.missingCapabilities.length?`${state.missingCapabilities.length} capacidad(es) faltantes`:'0 funciones retenidas faltantes'}</small></article>
      <article><span>TIMELINE</span><strong>{state.timeline.events.length}</strong><small>eventos recuperados</small></article>
      <article><span>RUNS OBSERVADOS</span><strong>{state.operatingMode.total}</strong><small>para distribución operativa</small></article>
      <article><span>LINEAGE</span><strong>{String(lineage.chainIntegrity??'—')}</strong><small>provenance CT-A01</small></article>
      <article><span>MUTACIÓN</span><strong>{String(mutation.available??false)==='true'?'DISPONIBLE':'SIN ESTADO'}</strong><small>siempre gobernada</small></article>
    </section>

    <section className={styles.map}>
      <div className={`${styles.node} ${styles.world}`}><span>MUNDO</span><b>Observatory</b><small>contexto externo con procedencia</small></div>
      <div className={`${styles.node} ${styles.experience}`}><span>EXPERIENCIA</span><b>Evidence · Studio · Lab · Field</b><small>lo observado, derivado y simulado permanece separado</small></div>
      <div className={styles.core}><span>COGNITIVE TWIN</span><b>MEMORIA + METAOBSERVACIÓN</b><small>no es un LLM</small></div>
      <div className={`${styles.node} ${styles.subject}`}><span>SUJETO</span><b>CT-A01</b><small>lineage · journal · snapshots · forks</small></div>
      <div className={`${styles.node} ${styles.governance}`}><span>AUTORIDAD</span><b>ROOT / ACP</b><small>aprendizaje no amplía permisos</small></div>
      <div className={styles.flow}>OBSERVAR → RECORDAR → CONTRASTAR → APRENDER → DELIBERAR → GOBERNAR → VOLVER A OBSERVAR</div>
    </section>

    <section className={styles.capabilities}>
      <header><span>ARQUITECTURA RECUPERADA</span><h2>Funciones del Twin antiguo transportadas al presente</h2></header>
      <div>{state.capabilities.map((capability,index)=><article key={capability.id} data-status={capability.status}><i>{String(index+1).padStart(2,'0')}</i><div><b>{human(capability.id)}</b><small>{capability.status}</small></div><p>{capability.boundary}</p><details><summary>DÓNDE VIVE AHORA</summary>{capability.currentImplementation.map(item=><code key={item}>{item}</code>)}</details></article>)}</div>
    </section>

    <section className={styles.meta}>
      <div><span>METAOBSERVADOR</span><h2>Qué órganos puede leer ahora</h2></div>
      <div className={styles.organs}>{state.metaObservation.organs.map((organ:any)=><article key={organ.id} data-state={organ.state}><b>{human(organ.id)}</b><strong>{organ.state}</strong><small>{organ.observed?'CON EJECUCIÓN':'LISTO / SIN EJECUCIÓN'}</small>{organ.blockers?.length?<p>{organ.blockers.length} bloqueo(s)</p>:null}</article>)}</div>
    </section>

    <section className={styles.timeline}>
      <header><span>TIMELINE INSTITUCIONAL</span><h2>Lo último que el Twin puede reconstruir</h2></header>
      {state.timeline.events.slice(-18).reverse().map(event=><article key={`${event.kind}-${event.id}`}><time>{new Date(event.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'})}</time><b>{event.kind}</b><span>{event.source}</span><p>{event.summary??'Sin resumen persistido'}</p><small>{event.evidenceRefs.length} referencia(s) de evidencia</small></article>)}
      {!state.timeline.events.length?<div className={styles.empty}>LISTO · VACÍO. El primer ciclo integrado iniciará la nueva biografía institucional.</div>:null}
    </section>

    <footer>{state.boundary}</footer>
  </main>
}
function human(value:string){return value.replaceAll('_',' ').toUpperCase()}
