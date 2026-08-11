import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { CognitiveLabConsole } from '@/components/root/cognitive-lab/CognitiveLabConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function CognitiveRelationalLabPage() {
  await requireRootObserverPage('/root/method-lab/crl');
  return <main style={{ minHeight: '100vh', background: '#060605', color: '#c8c2b3', padding: 28, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
    <header style={{ maxWidth: 980, borderBottom: '1px solid rgba(197,164,75,.18)', paddingBottom: 18 }}>
      <span style={{ color: '#8f7847', fontSize: 9, letterSpacing: '.15em' }}>SFI · METHOD LAB · COGNITIVE RELATIONAL LAB</span>
      <h1 style={{ margin: '8px 0', font: '400 30px Georgia,serif', color: '#dfcfa9' }}>CRL es un protocolo del Method Lab</h1>
      <p style={{ color: '#81796c', font: '14px/1.6 Georgia,serif' }}>La sesión conserva provenance, análisis ciego, lectura del fundador, divergencia y aprendizaje candidato. El contraste completado se registra también en <code>sfi_lab_analyses</code> como <b>SIMULATED</b>; no se autopromueve a canon.</p>
    </header>
    <section style={{ marginTop: 24, border: '1px solid #29251b', padding: 18, maxWidth: 980 }}>
      <p style={{ color: '#9c927f', fontSize: 11, lineHeight: 1.6 }}>Usa el control <b>CRL</b> que aparece abajo a la derecha para activar o recuperar una sesión. La ausencia de las tablas de la migración del protocolo se reportará como error visible; no se crearán filas sintéticas para simular disponibilidad.</p>
    </section>
    <CognitiveLabConsole />
    <Link href="/root/method-lab" style={{ display: 'inline-block', marginTop: 18, border: '1px solid #4b4024', padding: '8px 10px', color: '#c9ad62', textDecoration: 'none', fontSize: 9 }}>VOLVER A METHOD LAB</Link>
  </main>;
}
