import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicResearchLandingView } from '@/components/research/PublicResearchLandingView';
import { editorialPublicationForSlug, relatedEditorialObservations } from '@/lib/publications/editorialContent';
import { editorialFamilyForSlug } from '@/lib/publications/editorialFamilies';
import { SFI_NOTAS_TEMPORALES_SEPTEMBER_2026_CONTENT } from '@/lib/publications/notasTemporalesSeptember2026';
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
  const temporalContent = publication?.canonicalId === 'SFI-PUB-NT-001'
    ? SFI_NOTAS_TEMPORALES_SEPTEMBER_2026_CONTENT
    : null;
  const pdf = temporalContent
    ? publication?.renditions.find((rendition) => rendition.kind === 'PDF') ?? null
    : null;

  return <>
    <PublicResearchLandingView landing={landing} />
    {publication ? <section style={{ background: '#0d0d09', color: '#d8c6a0', padding: '64px 28px 96px', fontFamily: 'Georgia, serif' }}>
      <article style={{ maxWidth: 980, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid rgba(202,160,92,.25)', paddingBottom: 32 }}>
          <small style={{ letterSpacing: '.2em', color: '#b78d50' }}>{publication.collection.toUpperCase()} · {family?.label.toUpperCase() ?? (publication.editorialKind === 'OBSERVATION' ? OBSERVATION_LABELS[publication.observationKind ?? ''] ?? publication.observationKind : publication.issue)}</small>
          <h2 style={{ fontSize: 'clamp(38px,5vw,68px)', fontWeight: 400, margin: '16px 0 10px', color: '#ead5aa' }}>{temporalContent?.subtitle ?? publication.subtitle}</h2>
          <p style={{ fontSize: 21, lineHeight: 1.7, color: '#c9b993', maxWidth: 860 }}>{temporalContent?.coverStatement ?? publication.deck}</p>
          <blockquote style={{ margin: '30px 0 0', padding: '18px 22px', borderLeft: '2px solid #b78d50', color: '#e1c995', fontSize: 22 }}>{publication.motto}</blockquote>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 26, fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif' }}>
            <Link href="/publications" style={{ fontSize: 10, letterSpacing: '.13em', color: '#d5ad69', textDecoration: 'none', borderBottom: '1px solid rgba(213,173,105,.35)', paddingBottom: 4 }}>VOLVER A PUBLICACIONES</Link>
            <Link href="/library" style={{ fontSize: 10, letterSpacing: '.13em', color: '#8e806a', textDecoration: 'none' }}>LIBRARY</Link>
            {publication.mediumUrl ? <a href={publication.mediumUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, letterSpacing: '.13em', color: '#8e806a', textDecoration: 'none' }}>VERSIÓN EN MEDIUM ↗</a> : null}
            {pdf?.publicUrl ? <a href={pdf.publicUrl} style={{ fontSize: 10, letterSpacing: '.13em', color: '#d5ad69', textDecoration: 'none' }}>ABRIR PDF ↗</a> : null}
          </div>
        </header>

        {temporalContent && pdf ? <section id="pdf-edicion" style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>PDF DE LA EDICIÓN · SOURCE OF RECORD</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>Septiembre de 2026 está fijado contra el PDF suministrado por el Fundador</h3>
          <p style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>{temporalContent.transportBoundary}</p>
          <dl style={{ border: '1px solid rgba(202,160,92,.22)', padding: 22, display: 'grid', gap: 12, fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif' }}>
            <div><dt style={{ color: '#9f845b', fontSize: 10, letterSpacing: '.12em' }}>ARCHIVO</dt><dd style={{ margin: '4px 0 0', color: '#d8c6a0' }}>{pdf.filename}</dd></div>
            <div><dt style={{ color: '#9f845b', fontSize: 10, letterSpacing: '.12em' }}>TAMAÑO / PÁGINAS</dt><dd style={{ margin: '4px 0 0', color: '#d8c6a0' }}>{pdf.byteLength.toLocaleString('es-MX')} bytes · {temporalContent.pages.length} páginas</dd></div>
            <div><dt style={{ color: '#9f845b', fontSize: 10, letterSpacing: '.12em' }}>SHA-256</dt><dd style={{ margin: '4px 0 0', color: '#d8c6a0', overflowWrap: 'anywhere' }}>{pdf.sha256}</dd></div>
            <div><dt style={{ color: '#9f845b', fontSize: 10, letterSpacing: '.12em' }}>PROCEDENCIA</dt><dd style={{ margin: '4px 0 0', color: '#d8c6a0' }}>{temporalContent.provenance}</dd></div>
            <div><dt style={{ color: '#9f845b', fontSize: 10, letterSpacing: '.12em' }}>BINARIO PÚBLICO</dt><dd style={{ margin: '4px 0 0', color: pdf.publicUrl ? '#d5ad69' : '#8e806a' }}>{pdf.publicUrl ? 'PUBLIC' : 'PENDIENTE DE HOST PÚBLICO CONTROLADO'}</dd></div>
          </dl>
          <h4 style={{ margin: '34px 0 16px', color: '#e5ce9d', fontSize: 25, fontWeight: 400 }}>Contenido de la edición</h4>
          <ol style={{ paddingLeft: 22, color: '#bdb09a', lineHeight: 1.7 }}>
            {temporalContent.pages.map((item) => <li key={item.page} style={{ marginBottom: 10 }}><strong style={{ color: '#d5ad69' }}>P. {String(item.page).padStart(2, '0')}</strong> · {item.label} · {item.title}</li>)}
          </ol>
          <p style={{ borderTop: '1px solid rgba(202,160,92,.16)', paddingTop: 18, color: '#a99c87', lineHeight: 1.7 }}><strong style={{ color: '#d5ad69' }}>PRÓXIMA VENTANA:</strong> {temporalContent.nextWindow}</p>
        </section> : null}

        {publication.sections.length ? publication.sections.map((section) => <section key={section.id} id={section.id} style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>{section.id.toUpperCase()}</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph} style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>{paragraph}</p>)}
          {section.items?.length ? <ul style={{ paddingLeft: 24, lineHeight: 1.85, fontSize: 17, color: '#bdb09a' }}>{section.items.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul> : null}
        </section>) : <section style={{ paddingTop: 52 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>CUERPO ORIGINAL INDEXADO</small>
          <h3 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#e5ce9d', margin: '10px 0 20px' }}>La observación forma parte del archivo editorial de SFI</h3>
          <p style={{ fontSize: 18, lineHeight: 1.85, color: '#bdb09a' }}>Esta pieza fue publicada originalmente en Medium. SFI conserva aquí su identidad canónica, fecha, clasificación y relación con el resto de la serie. El cuerpo completo permanece enlazado a la publicación original mientras se materializa el archivo editorial histórico dentro del sitio.</p>
          {publication.mediumUrl ? <p><a href={publication.mediumUrl} target="_blank" rel="noreferrer" style={{ color: '#d5ad69' }}>Leer el cuerpo completo en Medium ↗</a></p> : null}
        </section>}

        {publication.cadence.length ? <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>CADENCIA EDITORIAL</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>Cuándo se publica</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {publication.cadence.map((item) => <div key={item.interval} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,140px) minmax(180px,240px) 1fr', gap: 16, borderTop: '1px solid rgba(202,160,92,.18)', padding: '18px 0' }}>
              <strong style={{ color: '#d5ad69' }}>{item.interval}</strong><span>{item.name}</span><span style={{ color: '#a99c87', lineHeight: 1.6 }}>{item.scope}</span>
            </div>)}
          </div>
        </section> : null}

        {publication.domains.length ? <section style={{ paddingTop: 56 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>WORLD SPECTOR VECTOR · 16×16</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>Dominios de observación</h3>
          <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '10px 34px', paddingLeft: 24, lineHeight: 1.7, color: '#bdb09a' }}>
            {publication.domains.map((domain) => <li key={domain}>{domain}</li>)}
          </ol>
        </section> : null}

        <section style={{ marginTop: 56, border: '1px solid rgba(202,160,92,.24)', padding: 28 }}>
          <small style={{ letterSpacing: '.18em', color: '#b78d50' }}>FRONTERA EPISTÉMICA</small>
          <h3 style={{ fontSize: 30, fontWeight: 400, color: '#e5ce9d' }}>Lo que esta publicación no autoriza a afirmar</h3>
          {publication.epistemicBoundary.map((boundary) => <p key={boundary} style={{ color: '#bdb09a', lineHeight: 1.75, borderTop: '1px solid rgba(202,160,92,.12)', paddingTop: 12 }}>{boundary}</p>)}
        </section>

        {related.length ? <section style={{ paddingTop: 66 }}>
          <small style={{ letterSpacing: '.18em', color: '#9f845b' }}>CONTINUAR LA TRAYECTORIA</small>
          <h3 style={{ fontSize: 38, fontWeight: 400, color: '#e5ce9d', margin: '10px 0 24px' }}>Otras observaciones</h3>
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
