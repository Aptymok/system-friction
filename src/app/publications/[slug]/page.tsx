import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicResearchLandingView } from '@/components/research/PublicResearchLandingView';
import { editorialPublicationForSlug } from '@/lib/publications/editorialContent';
import { publicResearchLandingForSlug } from '@/lib/research/publicResearchLanding';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) return {};
  const title = `${landing.node.title} · System Friction Institute`;
  return {
    title,
    description: landing.node.summary,
    alternates: { canonical: landing.canonicalUrl },
    openGraph: {
      type: 'article',
      url: landing.canonicalUrl,
      siteName: 'System Friction Institute',
      title,
      description: landing.node.summary,
    },
    other: {
      'sfi-canonical-object': landing.node.canonicalObjectId,
      'sfi-epistemic-state': landing.node.epistemicState,
      'sfi-publication-state': landing.node.publicationState,
    },
  };
}

export default async function PublicationLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) notFound();
  const publication = editorialPublicationForSlug(slug);

  return <>
    <PublicResearchLandingView landing={landing} />
    {publication ? <section style={{ background: '#0d0d09', color: '#d8c6a0', padding: '64px 28px 96px', fontFamily: 'Georgia, serif' }}>
      <article style={{ maxWidth: 980, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid rgba(202,160,92,.25)', paddingBottom: 32 }}>
          <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>{publication.series} · {publication.issue} · {publication.editorialKind}</small>
          <h2 style={{ fontSize: 'clamp(38px,5vw,68px)', fontWeight: 400, margin: '16px 0 10px', color: '#ead5aa' }}>{publication.subtitle}</h2>
          <p style={{ fontSize: 21, lineHeight: 1.7, color: '#c9b993', maxWidth: 860 }}>{publication.deck}</p>
          <blockquote style={{ margin: '30px 0 0', padding: '18px 22px', borderLeft: '2px solid #b78d50', color: '#e1c995', fontSize: 22 }}>{publication.motto}</blockquote>
        </header>

        {publication.sections.map((section) => <section key={section.id} id={section.id} style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{section.id.toUpperCase()}</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph} style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>{paragraph}</p>)}
          {section.items?.length ? <ul style={{ paddingLeft: 24, lineHeight: 1.85, fontSize: 17, color: '#bdb09a' }}>{section.items.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul> : null}
        </section>)}

        <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>CADENCIA EDITORIAL</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>Cuándo observar y cuándo publicar</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {publication.cadence.map((item) => <div key={item.interval} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,140px) minmax(180px,240px) 1fr', gap: 16, borderTop: '1px solid rgba(202,160,92,.18)', padding: '18px 0' }}>
              <strong style={{ color: '#d5ad69' }}>{item.interval}</strong><span>{item.name}</span><span style={{ color: '#a99c87', lineHeight: 1.6 }}>{item.scope}</span>
            </div>)}
          </div>
        </section>

        <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>WORLD SPECTOR VECTOR · 16×16</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>Dominios de observación</h3>
          <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '10px 34px', paddingLeft: 24, lineHeight: 1.7, color: '#bdb09a' }}>
            {publication.domains.map((domain) => <li key={domain}>{domain}</li>)}
          </ol>
        </section>

        <section style={{ marginTop: 56, border: '1px solid rgba(202,160,92,.24)', padding: 28 }}>
          <small style={{ letterSpacing: '.18em', color: '#b78d50' }}>FRONTERA EPISTÉMICA</small>
          <h3 style={{ fontSize: 30, fontWeight: 400, color: '#e5ce9d' }}>Lo que esta publicación no autoriza a afirmar</h3>
          {publication.epistemicBoundary.map((boundary) => <p key={boundary} style={{ color: '#bdb09a', lineHeight: 1.75, borderTop: '1px solid rgba(202,160,92,.12)', paddingTop: 12 }}>{boundary}</p>)}
        </section>
      </article>
    </section> : null}
  </>;
}
