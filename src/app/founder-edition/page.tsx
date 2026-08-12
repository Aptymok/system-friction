import type { Metadata } from 'next';
import Link from 'next/link';
import './founder-edition.css';

const PDF = '/publications/instrumentalizacion-mente-fragmentada-founder-edition.pdf';

export const metadata: Metadata = {
  title: 'Instrumentalización de una mente fragmentada · Founder Edition',
  description: 'Del conocimiento tácito a una arquitectura observable. The Founder Edition, System Friction Institute, 2026.',
  alternates: { canonical: '/founder-edition' },
};

export default function FounderEditionPage() {
  return <main className="fe-root">
    <header className="fe-nav"><Link href="/">SFI</Link><nav><Link href="/repository">REPOSITORY</Link><Link href="/library">LIBRARY</Link><a href={PDF} target="_blank" rel="noreferrer">OPEN PDF ↗</a></nav></header>
    <section className="fe-hero">
      <div className="fe-cover"><img src="/publications/founder-edition-cover.webp" alt="Portada de Instrumentalización de una mente fragmentada" /></div>
      <article>
        <span>THE FOUNDER EDITION · SYSTEM FRICTION INSTITUTE · 2026</span>
        <h1>Instrumentalización<br/>de una mente fragmentada</h1>
        <h2>Del conocimiento tácito a una arquitectura observable.</h2>
        <p>Esta edición registra el tránsito desde operaciones cognitivas inicialmente tácitas hacia una arquitectura explícita de observación, memoria, extracción, contraste y gobernanza. Se presenta como artefacto de origen y como objeto examinable; no sustituye la evidencia empírica que cada método requiera.</p>
        <dl><div><dt>EDITION</dt><dd>Founder Edition</dd></div><div><dt>EXTENT</dt><dd>281 pages</dd></div><div><dt>INSTITUTION</dt><dd>System Friction Institute</dd></div><div><dt>FORMAT</dt><dd>PDF · web-optimized derivative</dd></div></dl>
        <div className="fe-actions"><a href={PDF} target="_blank" rel="noreferrer">OPEN COMPLETE PDF</a><Link href="/">RETURN TO INSTITUTE</Link></div>
      </article>
    </section>
    <section className="fe-boundary"><span>PUBLICATION BOUNDARY</span><p>The web file is an optimized derivative of the archival Founder Edition. The publication documents the architecture and its formation; claims of operational or scientific performance remain governed by their own evidence, tests and return windows.</p></section>
  </main>;
}
