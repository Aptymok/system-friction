import Link from 'next/link';
import type { SfiPublicResearchLanding } from '@/lib/research/publicResearchLanding';

function SourceRef({ value }: { value: string }) {
  if (/^https?:\/\//i.test(value)) {
    return <a href={value} rel="noreferrer" style={{ color: '#d5ad69', overflowWrap: 'anywhere' }}>{value}</a>;
  }
  return <code style={{ color: '#b9aa8e', overflowWrap: 'anywhere' }}>{value}</code>;
}

export function PublicResearchLandingView({ landing }: { landing: SfiPublicResearchLanding }) {
  const { node, citation } = landing;
  return (
    <main style={{ minHeight: '100vh', background: '#070705', color: '#d8c6a0', padding: '48px 28px 84px', fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid rgba(202,160,92,.28)', paddingBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <small style={{ letterSpacing: '.24em', color: '#b78d50' }}>
                SYSTEM FRICTION INSTITUTE · {node.objectType} · CANONICAL PUBLIC LANDING
              </small>
              <h1 style={{ fontSize: 'clamp(38px,6vw,76px)', fontWeight: 400, letterSpacing: '-.03em', margin: '14px 0 12px', color: '#e7cf9c' }}>
                {node.title}
              </h1>
              <p style={{ maxWidth: 850, fontSize: 19, lineHeight: 1.7, color: '#b9aa8e' }}>{node.summary}</p>
            </div>
            <Link href="/institution" style={{ color: '#d5ad69', textDecoration: 'none', letterSpacing: '.13em', fontSize: 12 }}>
              INSTITUTION →
            </Link>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 28 }}>
          {[
            ['TYPE', node.objectType],
            ['EPISTEMIC STATE', node.epistemicState],
            ['PUBLICATION STATE', node.publicationState],
            ['VERSION', node.version],
            ['LANGUAGE', node.language],
            ['LICENSE', node.license ?? 'NOT OBSERVED'],
          ].map(([label, value]) => (
            <div key={label} style={{ border: '1px solid rgba(202,160,92,.2)', padding: 16 }}>
              <small style={{ letterSpacing: '.16em', color: '#9f845b' }}>{label}</small>
              <p style={{ marginBottom: 0, color: '#d8c6a0', overflowWrap: 'anywhere' }}>{value}</p>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 46, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32 }}>
          <article>
            <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>CITATION IDENTITY</small>
            <p style={{ lineHeight: 1.7, color: '#b9aa8e' }}><strong>Canonical URL</strong><br /><a href={citation.canonicalUrl} style={{ color: '#d5ad69', overflowWrap: 'anywhere' }}>{citation.canonicalUrl}</a></p>
            <p style={{ lineHeight: 1.7, color: '#b9aa8e' }}><strong>Authors</strong><br />{citation.authors.length ? citation.authors.join(' · ') : 'NOT OBSERVED'}</p>
            <p style={{ lineHeight: 1.7, color: '#b9aa8e' }}><strong>Canonical object</strong><br /><code>{citation.canonicalObjectId}</code></p>
          </article>

          <article>
            <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>METHODS</small>
            <p style={{ lineHeight: 1.7, color: '#b9aa8e' }}>{node.methods.length ? node.methods.join(' · ') : 'No method relation is asserted by the canonical object.'}</p>
            <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>RELATED CANONICAL OBJECTS</small>
            <p style={{ lineHeight: 1.7, color: '#b9aa8e' }}>{node.relatedCanonicalObjectIds.length ? node.relatedCanonicalObjectIds.join(' · ') : 'No related canonical object is asserted.'}</p>
          </article>
        </section>

        <section style={{ marginTop: 44 }}>
          <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>SOURCE LINEAGE</small>
          {node.sourceRefs.length ? (
            <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              {node.sourceRefs.map((ref) => <li key={ref}><SourceRef value={ref} /></li>)}
            </ul>
          ) : <p style={{ color: '#b9aa8e' }}>No public source lineage is available.</p>}
        </section>

        {node.limitations.length ? (
          <section style={{ marginTop: 40 }}>
            <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>LIMITATIONS</small>
            {node.limitations.map((item) => <p key={item} style={{ borderBottom: '1px solid rgba(202,160,92,.14)', paddingBottom: 10, lineHeight: 1.65, color: '#b9aa8e' }}>{item}</p>)}
          </section>
        ) : null}

        {node.missing.length ? (
          <section style={{ marginTop: 40 }}>
            <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>MISSING · EXPLICIT</small>
            {node.missing.map((item) => (
              <article key={`${item.field}:${item.sourceRef}`} style={{ borderLeft: '2px solid rgba(202,160,92,.38)', paddingLeft: 16, marginTop: 14 }}>
                <strong>{item.field}</strong>
                <p style={{ color: '#b9aa8e', lineHeight: 1.6 }}>{item.reason}</p>
                <SourceRef value={item.sourceRef} />
              </article>
            ))}
          </section>
        ) : null}

        <footer style={{ marginTop: 54, borderTop: '1px solid rgba(202,160,92,.2)', paddingTop: 22, color: '#95866e', fontSize: 13, lineHeight: 1.7 }}>
          <p>{landing.contract} · {landing.canonicalNamespace}</p>
          <p>This page is a read-only projection of an explicitly public canonical object. Rendering it does not create publication status, evidence, external validation, Discovery, PULL or RETURN.</p>
        </footer>
      </div>
    </main>
  );
}
