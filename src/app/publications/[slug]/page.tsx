import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicResearchLandingView } from '@/components/research/PublicResearchLandingView';
import { TemporalIssueView } from '@/components/publications/TemporalIssueView';
import './temporalIssue.css';
import { editorialPublicationForSlug, relatedEditorialObservations } from '@/lib/publications/editorialContent';
import { editorialFamilyForSlug } from '@/lib/publications/editorialFamilies';
import { publicResearchLandingForSlug } from '@/lib/research/publicResearchLanding';

type PageProps = { params: Promise<{ slug: string }> };

const OBSERVATION_LABELS: Record<string, string> = {
  SIGNAL: 'SEÑAL',
  TRAJECTORY: 'TRAYECTORIA',
  CASE: 'CASO',
  METHOD: 'MÉTODO',
  MEMORY: 'MEMORIA',
  ATLAS: 'ATLAS',
  INSTITUTIONAL: 'INSTITUCIONAL',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) return {};
  const editorial = editorialPublicationForSlug(slug);
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
      images: editorial?.coverImage ? [{ url: editorial.coverImage }] : undefined,
    },
    other: {
      'sfi-canonical-object': landing.node.canonicalObjectId,
      'sfi-epistemic-state': landing.node.epistemicState,
      'sfi-publication-state': landing.node.publicationState,
      'sfi-editorial-collection': editorial?.collection ?? 'Publication',
      'sfi-editorial-kind': editorial?.editorialKind ?? 'UNCLASSIFIED',
    },
  };
}

export default async function PublicationLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) notFound();
  const publication = editorialPublicationForSlug(slug);
  const family = publication?.editorialKind === 'OBSERVATION' ? editorialFamilyForSlug(slug) : null;
  const related = publication?.editorialKind === 'OBSERVATION' ? relatedEditorialObservations(slug, 8) : [];
  const isEnglish = publication?.language === 'en';
  const ui = isEnglish ? {
    back: 'BACK TO PUBLICATIONS',
    pdf: 'OPEN PDF ↗',
    originalBody: 'INDEXED ORIGINAL BODY',
    originalTitle: 'This observation is part of the SFI editorial archive',
    originalText: 'This piece is preserved with its canonical identity, date, classification and relationship to the rest of the series.',
    cadence: 'EDITORIAL CADENCE',
    cadenceTitle: 'Publication rhythm',
    domains: 'OBSERVATION DOMAINS',
    domainsTitle: 'Domains in scope',
    boundary: 'EPISTEMIC BOUNDARY',
    boundaryTitle: 'What this publication does not authorize us to claim',
    related: 'CONTINUE THE TRAJECTORY',
    relatedTitle: 'Other observations',
  } : {
    back: 'VOLVER A PUBLICACIONES',
    pdf: 'ABRIR PDF ↗',
    originalBody: 'CUERPO ORIGINAL INDEXADO',
    originalTitle: 'La observación forma parte del archivo editorial de SFI',
    originalText: 'Esta pieza conserva su identidad canónica, fecha, clasificación y relación con el resto de la serie.',
    cadence: 'CADENCIA EDITORIAL',
    cadenceTitle: 'Cuándo se publica',
    domains: 'DOMINIOS DE OBSERVACIÓN',
    domainsTitle: 'Dominios de observación',
    boundary: 'FRONTERA EPISTÉMICA',
    boundaryTitle: 'Lo que esta publicación no autoriza a afirmar',
    related: 'CONTINUAR LA TRAYECTORIA',
    relatedTitle: 'Otras observaciones',
  };

  if (publication?.editorialKind === 'TEMPORAL_ISSUE') {
    return <TemporalIssueView publication={publication} landing={landing} />;
  }

  return <>
    <PublicResearchLandingView landing={landing} />
    {publication ? <section style={{ background: '#0d0d09', color: '#d8c6a0', padding: '64px 28px 96px', fontFamily: 'Georgia, serif' }}>
      <article style={{ maxWidth: 980, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid rgba(202,160,92,.25)', paddingBottom: 32 }}>
          <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>{publication.collection.toUpperCase()} · {family?.label.toUpperCase() ?? (publication.editorialKind === 'OBSERVATION' ? OBSERVATION_LABELS[publication.observationKind ?? ''] ?? publication.observationKind : publication.issue)}</small>
          <h2 style={{ fontSize: 'clamp(38px,5vw,68px)', fontWeight: 400, margin: '16px 0 10px', color: '#ead5aa' }}>{publication.subtitle}</h2>
          <p style={{ fontSize: 21, lineHeight: 1.7, color: '#c9b993', maxWidth: 860 }}>{publication.deck}</p>
          <blockquote style={{ margin: '30px 0 0', padding: '18px 22px', borderLeft: '2px solid #b78d50', color: '#e1c995', fontSize: 22 }}>{publication.motto}</blockquote>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 26, fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif' }}>
            <Link href="/publications" style={{ fontSize: 10, letterSpacing: '.13em', color: '#d5ad69', textDecoration: 'none', borderBottom: '1px solid rgba(213,173,105,.35)', paddingBottom: 4 }}>{ui.back}</Link>
            <Link href="/library" style={{ fontSize: 10, letterSpacing: '.13em', color: '#8e806a', textDecoration: 'none' }}>LIBRARY</Link>
            {publication.renditions.find((item) => item.state === 'PUBLIC' && item.publicUrl)?.publicUrl ? <a href={publication.renditions.find((item) => item.state === 'PUBLIC' && item.publicUrl)!.publicUrl!} target="_blank" rel="noreferrer" style={{ fontSize: 10, letterSpacing: '.13em', color: '#d5ad69', textDecoration: 'none' }}>{ui.pdf}</a> : null}
            {publication.mediumUrl ? <a href={publication.mediumUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, letterSpacing: '.13em', color: '#8e806a', textDecoration: 'none' }}>{isEnglish ? 'MEDIUM VERSION ↗' : 'VERSIÓN EN MEDIUM ↗'}</a> : null}
          </div>
        </header>

        {publication.editorialKind === 'FRICTION_BRIEF' && publication.coverImage ? <figure style={{ margin: '44px 0 0', border: '1px solid rgba(202,160,92,.2)', background: '#080807' }}>
          <img src={publication.coverImage} alt={publication.title} style={{ display: 'block', width: '100%', height: 'auto' }}/>
          <figcaption style={{ padding: '12px 16px', fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', fontSize: 9, letterSpacing: '.12em', color: '#8e806a' }}>SFI · PUBLIC-SOURCE FRICTION BRIEF · WEB RENDITION</figcaption>
        </figure> : null}

        {publication.visuals.length ? <section style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{isEnglish ? 'VISUAL ARGUMENT' : 'ARGUMENTO VISUAL'}</small>
          <div style={{ display: 'grid', gap: 22, marginTop: 18 }}>
            {publication.visuals.map((visual) => <figure key={visual.id} style={{ margin: 0, border: '1px solid rgba(202,160,92,.18)', background: '#080807' }}>
              <img src={visual.src} alt={visual.alt} style={{ display: 'block', width: '100%', height: 'auto' }}/>
              <figcaption style={{ padding: '12px 16px 15px', fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', fontSize: 10, lineHeight: 1.55, letterSpacing: '.06em', color: '#9e9078' }}>{visual.caption}</figcaption>
            </figure>)}
          </div>
        </section> : null}

        {publication.sections.length ? publication.sections.map((section) => <section key={section.id} id={section.id} style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{section.id.toUpperCase()}</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph} style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>{paragraph}</p>)}
          {section.items?.length ? <ul style={{ paddingLeft: 24, lineHeight: 1.85, fontSize: 17, color: '#bdb09a' }}>{section.items.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul> : null}
        </section>) : <section style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{ui.originalBody}</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>{ui.originalTitle}</h3>
          <p style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>{ui.originalText}</p>
          {publication.mediumUrl ? <p><a href={publication.mediumUrl} target="_blank" rel="noreferrer" style={{ color: '#d5ad69' }}>Leer el cuerpo completo en Medium ↗</a></p> : null}
        </section>}

        {publication.cadence.length ? <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{ui.cadence}</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>{ui.cadenceTitle}</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {publication.cadence.map((item) => <div key={item.interval} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,140px) minmax(180px,240px) 1fr', gap: 16, borderTop: '1px solid rgba(202,160,92,.18)', padding: '18px 0' }}>
              <strong style={{ color: '#d5ad69' }}>{item.interval}</strong><span>{item.name}</span><span style={{ color: '#a99c87', lineHeight: 1.6 }}>{item.scope}</span>
            </div>)}
          </div>
        </section> : null}

        {publication.domains.length ? <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{ui.domains}</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>{ui.domainsTitle}</h3>
          <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '10px 34px', paddingLeft: 24, lineHeight: 1.7, color: '#bdb09a' }}>
            {publication.domains.map((domain) => <li key={domain}>{domain}</li>)}
          </ol>
        </section> : null}

        <section style={{ marginTop: 56, border: '1px solid rgba(202,160,92,.24)', padding: 28 }}>
          <small style={{ letterSpacing: '.18em', color: '#b78d50' }}>{ui.boundary}</small>
          <h3 style={{ fontSize: 30, fontWeight: 400, color: '#e5ce9d' }}>{ui.boundaryTitle}</h3>
          {publication.epistemicBoundary.map((boundary) => <p key={boundary} style={{ color: '#bdb09a', lineHeight: 1.75, borderTop: '1px solid rgba(202,160,92,.12)', paddingTop: 12 }}>{boundary}</p>)}
        </section>

        {related.length ? <section style={{ paddingTop: 66 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{ui.related}</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>{ui.relatedTitle}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            {related.map((item) => <Link key={item.slug} href={`/publications/${item.slug}`} style={{ border: '1px solid rgba(202,160,92,.16)', padding: 18, textDecoration: 'none', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', fontSize: 9, letterSpacing: '.12em', color: '#9f845b' }}>{OBSERVATION_LABELS[item.observationKind ?? ''] ?? item.observationKind}</span>
              <strong style={{ fontWeight: 400, fontSize: 20, lineHeight: 1.15, color: '#dfcda8' }}>{item.title}</strong>
            </Link>)}
          </div>
        </section> : null}
      </article>
    </section> : null}
  </>;
}
