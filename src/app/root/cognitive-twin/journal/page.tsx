import type { Metadata } from 'next';
import { requireFounderPage } from '@/lib/root/server';
import { readCognitiveTwinJournal } from '@/lib/cognitive-twin/reentry/journal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CT-A01 Journal · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CognitiveTwinJournalPage() {
  await requireFounderPage('/root/cognitive-twin/journal');
  const journal = await readCognitiveTwinJournal();
  return <main style={{ minHeight: '100vh', background: '#070706', color: '#d8d0ba', padding: '28px clamp(18px,4vw,64px)', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
    <nav style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 11 }}>
      <a href="/root" style={{ color: '#bda563' }}>ROOT</a>
      <a href="/root/cognitive-twin" style={{ color: '#bda563' }}>COGNITIVE TWIN</a>
      <a href="/root/cognitive-twin/lineage" style={{ color: '#bda563' }}>LINEAGE</a>
      <a href="/root/method-lab" style={{ color: '#bda563' }}>METHOD LAB</a>
    </nav>
    <div style={{ fontSize: 10, letterSpacing: '.18em', color: '#8d7b4d' }}>ROOT-VISIBLE COMPUTATIONAL JOURNAL</div>
    <h1 style={{ margin: '10px 0 4px', fontSize: 34, fontWeight: 500 }}>CT-A01 · JOURNAL</h1>
    <p style={{ maxWidth: 960, lineHeight: 1.65, color: '#9e9682' }}>
      Auditable summaries of developmental epochs. WITHHOLD never hides an entry from ROOT. No private reasoning trace is stored here, and a computational self-report is not evidence of phenomenal experience.
    </p>
    <div style={{ marginTop: 14, fontSize: 11, color: '#8d7b4d' }}>{journal.entries.length} ENTRIES · {journal.visibilityRule}</div>

    <section style={{ display: 'grid', gap: 12, marginTop: 28 }}>
      {journal.entries.length === 0 ? <div style={{ border: '1px solid rgba(191,160,78,.24)', padding: 18, color: '#9e9682' }}>No developmental epoch has been observed in storage yet.</div> : null}
      {journal.entries.map((entry) => <article key={entry.eventHash} style={{ border: '1px solid rgba(191,160,78,.24)', padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, color: '#8d7b4d' }}>
          <span>{entry.epochKey}</span><span>{entry.trigger}</span><span>{entry.disposition}</span><span>{entry.materialDevelopment ? 'MATERIAL' : 'NON-MATERIAL'}</span>
        </div>
        <p style={{ margin: '14px 0 8px', lineHeight: 1.6, color: '#e2d8bd' }}>{entry.selfReport}</p>
        <p style={{ margin: 0, lineHeight: 1.55, color: '#9e9682' }}>{entry.dispositionReason}</p>
        <dl style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, fontSize: 11 }}>
          <div><dt style={{ color: '#8d7b4d' }}>SALIENCE</dt><dd style={{ margin: '4px 0' }}>{entry.salience.total.toFixed(3)}</dd></div>
          <div><dt style={{ color: '#8d7b4d' }}>MUTATION</dt><dd style={{ margin: '4px 0' }}>{entry.mutation.status}</dd></div>
          <div><dt style={{ color: '#8d7b4d' }}>CREATED</dt><dd style={{ margin: '4px 0' }}>{entry.createdAt}</dd></div>
        </dl>
        <details style={{ marginTop: 14 }}><summary style={{ cursor: 'pointer', color: '#bda563' }}>PROVENANCE</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#8f8774', fontSize: 10 }}>{JSON.stringify({ eventHash: entry.eventHash, parentEventHash: entry.parentEventHash, observedContext: entry.observedContext, whatWouldChangeDecision: entry.whatWouldChangeDecision, evidenceRefs: entry.evidenceRefs }, null, 2)}</pre></details>
      </article>)}
    </section>
  </main>;
}
