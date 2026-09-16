'use client';

import Link from 'next/link';
import { useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import './PublicEntryGateway.css';

const PUBLIC_ROUTES = [
  { n:'01', href:'/observatory', title:'Observatory', note:'Qué está observando SFI ahora.', visual:'world' },
  { n:'02', href:'/publications', title:'Publications', note:'Notas, casos, investigación y RETURN publicados.', visual:'publication' },
  { n:'03', href:'/library', title:'Library', note:'Conocimiento conectado, métodos y evidencia.', visual:'library' },
  { n:'04', href:'/field', title:'FIELD', note:'Observación situada y trabajo fuera del documento.', visual:'field' },
  { n:'05', href:'/institution', title:'Institute', note:'Qué institución afirma todo esto y bajo qué límites.', visual:'institute' },
] as const;

export function PublicEntryGateway() {
  const { text } = useSfiLanguage();

  return <main className="sfiEntryHome">
    <header className="sfiPublicTopbar">
      <Link href="/" className="sfiPublicBrand"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
      <nav aria-label="SFI public navigation">
        <Link href="/observatory">OBSERVATORY</Link><Link href="/publications">PUBLICATIONS</Link><Link href="/library">LIBRARY</Link><Link href="/field">FIELD</Link><Link href="/institution">INSTITUTE</Link>
      </nav>
      <Link href="/login" className="sfiPublicAccess">SIGN IN</Link>
    </header>

    <section className="sfiEntryHero">
      <div className="sfiEntryHeroCopy">
        <span>SYSTEM FRICTION INSTITUTE · PUBLIC MEMBRANE</span>
        <h1>{text('Un mundo más coherente.', 'A more coherent world.')}</h1>
        <p>{text('Investigación aplicada, sistemas cognitivos y observación de sistemas complejos. SFI conserva qué observó, qué infirió, qué hizo, qué ocurrió después y qué cambió con el retorno.', 'Applied research, cognitive systems and observation of complex systems. SFI preserves what it observed, inferred, did, what happened next, and what changed with return.')}</p>
        <div className="sfiEntryHeroActions"><Link href="/institution">EXPLORAR INSTITUTO →</Link><Link href="/publications">VER PUBLICACIONES →</Link></div>
        <div className="sfiEntrySequence"><span>OBSERVAR</span><i>·</i><span>PENSAR</span><i>·</i><span>COMPRENDER</span><i>·</i><span>ACTUAR</span><i>·</i><span>RETORNAR</span></div>
      </div>
      <aside className="sfiEntryHeroAside"><span>SISTEMAS</span><span>PERSONAS</span><span>INFORMACIÓN</span><span>PERSPECTIVA</span><span>IMPACTO</span></aside>
    </section>

    <section className="sfiEntryRoutes" aria-labelledby="sfi-routes-title">
      <header><span>RUTAS DE ENTRADA</span><h2 id="sfi-routes-title">Distintas superficies. Una misma institución.</h2></header>
      <div className="sfiEntryRouteGrid">{PUBLIC_ROUTES.map((route) => <Link href={route.href} key={route.href} className={`sfiEntryRoute sfiEntryRoute--${route.visual}`}>
        <span>{route.n}</span><div><h3>{route.title}</h3><p>{route.note}</p></div><b>ENTRAR →</b>
      </Link>)}</div>
    </section>

    <section className="sfiEntryCredibility">
      <header><span>QUÉ DEBE PODER RECORRERSE</span><h2>Del pensamiento al mundo y de regreso.</h2></header>
      <div className="sfiEntryChain"><Link href="/library">THEORY</Link><i>→</i><Link href="/library">METHOD</Link><i>→</i><Link href="/library">INSTRUMENT</Link><i>→</i><Link href="/publications">CASE</Link><i>→</i><Link href="/publications">RETURN</Link></div>
      <p>La credibilidad pública no depende de declarar capacidades, sino de conservar relaciones entre definición, método, aplicación, evidencia y corrección.</p>
    </section>

    <details className="sfiEntryMachine">
      <summary>ACCESO PARA IA / AGENTES · MACHINE-READABLE</summary>
      <p>La proyección para máquinas permanece separada de la lectura humana y no concede autoridad por sí misma.</p>
      <div><Link href="/llms.txt">/llms.txt</Link><Link href="/ai-index.json">AI INDEX</Link><Link href="/api/external/v1/manifest">GATEWAY MANIFEST</Link></div>
    </details>
  </main>;
}
