import type { Metadata } from 'next';
import { requireFounderPage } from '@/lib/root/server';
import { readCognitiveTwinLineageHealth } from '@/lib/cognitive-twin/reentry/runtime';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CT-A01 Lineage · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

function cell(label: string, value: string | number | null) {
  return <div style={{ border: '1px solid rgba(191,160,78,.24)', padding: 14, minHeight: 72 }}>
    <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#8d7b4d' }}>{label}</div>
    <div style={{ marginTop: 8, fontSize: 16, color: '#e8dfc5', wordBreak: 'break-word' }}>{value ?? '—'}</div>
  </div>;
}

export default async function CognitiveTwinLineagePage() {
  await requireFounderPage('/root/cognitive-twin/lineage');
  const state = await readCognitiveTwinLineageHealth();
  return <main style={{ minHeight: '100vh', background: '#070706', color: '#d8d0ba', padding: '28px clamp(18px,4vw,64px)', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
    <nav style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 11 }}>
      <a href="/root" style={{ color: '#bda563' }}>ROOT</a>
      <a href="/root/cognitive-twin" style={{ color: '#bda563' }}>COGNITIVE TWIN</a>
      <a href="/root/method-lab" style={{ color: '#bda563' }}>METHOD LAB</a>
    </nav>
    <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#8d7b4d' }}>LONGITUDINAL EXPERIMENTAL SUBJECT</div>
    <h1 style={{ margin: '10px 0 4px', fontSize: 34, fontWeight: 500 }}>CT-A01 · LINEAGE</h1>
    <p style={{ maxWidth: 900, lineHeight: 1.65, color: '#9e9682' }}>
      CT-A01 is a longitudinal experimental subject inside the institutional Cognitive Twin apparatus. A valid chain demonstrates provenance continuity only; it does not demonstrate consciousness, identity or individuation.
    </p>

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10, marginTop: 28 }}>
      {cell('SUBJECT', state.subjectId)}
      {cell('LINEAGE', state.lineageId)}
      {cell('GENESIS', state.genesisPresent ? 'PRESENT' : 'MISSING')}
      {cell('CHAIN INTEGRITY', state.chainIntegrity)}
      {cell('SEALED EPOCHS', state.eventCount)}
      {cell('MATERIAL EPOCHS', state.materialEventCount)}
      {cell('LAST EPOCH', state.lastEpochAt)}
      {cell('LAST DISPOSITION', state.lastDisposition)}
      {cell('PROSPECTIVE VALIDATION', state.prospectiveValidation)}
      {cell('INDIVIDUATION DEMONSTRATED', state.individuationDemonstrated ? 'TRUE' : 'FALSE')}
    </section>

    <section style={{ marginTop: 30, borderTop: '1px solid rgba(191,160,78,.2)', paddingTop: 22 }}>
      <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#8d7b4d' }}>HEAD HASH</div>
      <code style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#c9bea0', overflowWrap: 'anywhere' }}>{state.headHash ?? 'NO DEVELOPMENTAL HEAD YET'}</code>
    </section>

    <section style={{ marginTop: 30 }}>
      <div style={{ fontSize: 10, letterSpacing: '.12em', color: '#8d7b4d' }}>LIMITATIONS</div>
      <ul style={{ lineHeight: 1.7, color: '#9e9682' }}>{state.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  </main>;
}
