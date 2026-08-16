import type { Metadata } from 'next';
import Link from 'next/link';
import './founder-edition.css';

export const metadata: Metadata = {
  title: 'Instrumentalización de una mente fragmentada · Founder Edition',
  description: 'Del conocimiento tácito a una arquitectura observable. The Founder Edition, System Friction Institute, 2026.',
  alternates: { canonical: '/founder-edition' },
};

export default function FounderEditionPage() {
  return <main className="fe-root">
    <header className="fe-nav"><Link href="/">SFI</Link><nav><Link href="/repository">REPOSITORY</Link><Link href="/library">LIBRARY</Link></nav></header>
    <section className="fe-hero">
      <div className="fe-cover" aria-label="Founder Edition publication mark"><div><span>SFI · 2026</span><strong>INSTRUMENTALIZACIÓN DE UNA MENTE FRAGMENTADA</strong><small>THE FOUNDER EDITION</small></div></div>
      <article>
        <span>THE FOUNDER EDITION · SYSTEM FRICTION INSTITUTE · 2026</span>
        <h1>Instrumentalización<br/>de una mente fragmentada</h1>
        <h2>Del conocimiento tácito a una arquitectura observable.</h2>
        <p>Esta edición registra el tránsito desde operaciones cognitivas inicialmente tácitas hacia una arquitectura explícita de observación, memoria, extracción, contraste y gobernanza. Se presenta como artefacto de origen y como objeto examinable; no sustituye la evidencia empírica que cada método requiera.</p>
        <dl><div><dt>EDITION</dt><dd>Founder Edition</dd></div><div><dt>STATE</dt><dd>Archival master available</dd></div><div><dt>INSTITUTION</dt><dd>System Friction Institute</dd></div><div><dt>WEB DISTRIBUTION</dt><dd>Derivative pending deployment</dd></div></dl>
        <div className="fe-actions"><Link href="/repository">INSPECT CANON + METHODS</Link><Link href="/">RETURN TO INSTITUTE</Link></div>
      </article>
    </section>
    <section className="fe-boundary"><span>PUBLICATION BOUNDARY</span><p>The archival Founder Edition exists independently of the web runtime. This page does not claim that a public PDF derivative is deployed. A web file should be exposed only after the binary asset is published and its integrity is verified. The publication documents the architecture and its formation; claims of operational or scientific performance remain governed by their own evidence, tests and return windows.</p></section>
  </main>;
}
