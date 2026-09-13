import type { Metadata } from 'next';
import Link from 'next/link';
import { SFI_NOTAS_TEMPORALES_V1 } from '@/lib/publications/editorialContent';
import { SFI_NOTAS_TEMPORALES_SEPTEMBER_2026_SOURCE } from '@/lib/publications/notasTemporalesSeptember2026';
import {
  SFI_EDITORIAL_FAMILIES,
  SFI_PUBLICATIONS_BANNER,
  editorialFamilyEntries,
} from '@/lib/publications/editorialFamilies';
import './publications.css';

export const dynamic = 'force-static';

const CANONICAL_URL = 'https://systemfriction.org/publications';

export const metadata: Metadata = {
  title: 'Publicaciones · System Friction Institute',
  description: 'Archivo editorial de SFI: Notas Temporales mensuales y observaciones de señal, caso, campo, retorno y laboratorio.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    url: CANONICAL_URL,
    siteName: 'System Friction Institute',
    title: 'Publicaciones · System Friction Institute',
    description: 'Una superficie editorial para observar, contrastar y retornar sin mezclar estados epistemológicos.',
    images: [{ url: SFI_PUBLICATIONS_BANNER.web }],
  },
  other: {
    'sfi-surface': 'PUBLICATIONS_HUB',
    'sfi-editorial-contract': 'SFI-EDITORIAL-FAMILY-PROJECTION-1.0',
    'sfi-identity-manual': 'SFI-ID-003 / MASTER EDITION V4.0',
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : value;
}

export default function PublicationsPage() {
  const monthly = SFI_NOTAS_TEMPORALES_V1;
  const september = SFI_NOTAS_TEMPORALES_SEPTEMBER_2026_SOURCE;

  return <main className="publicationsHub">
    <header className="pubTopbar">
      <Link href="/" className="pubBrand">SFI</Link>
      <div className="pubTopbarIdentity">
        <span>SYSTEM FRICTION INSTITUTE</span>
        <small>PUBLICATIONS / EDITORIAL ARCHIVE</small>
      </div>
      <nav aria-label="Public navigation">
        <Link href="/observatory">OBSERVATORIO</Link>
        <Link href="/library">LIBRARY</Link>
      </nav>
    </header>

    <section className="pubHero" aria-labelledby="publications-title">
      <figure className="pubBanner">
        <picture>
          <source media="(max-width: 720px)" srcSet={SFI_PUBLICATIONS_BANNER.mobile} />
          <img src={SFI_PUBLICATIONS_BANNER.web} alt={SFI_PUBLICATIONS_BANNER.alt} />
        </picture>
        <figcaption>{SFI_PUBLICATIONS_BANNER.provenance}</figcaption>
      </figure>
      <div className="pubHeroCopy">
        <span>PUBLICACIONES · ARCHIVO EDITORIAL</span>
        <h1 id="publications-title">Observar antes de concluir.</h1>
        <p>SFI publica objetos con funciones distintas. La forma visual clasifica la función: la edición mensual conserva un estado del período; las observaciones individuales conservan señales, casos, campo, retornos y trabajo de laboratorio.</p>
        <div className="pubHeroBoundary">
          <b>REGLA</b>
          <span>PUBLICACIÓN = EXPOSURE</span>
          <span>EXPOSURE ≠ EVIDENCIA EXTERNA ≠ RETURN</span>
        </div>
      </div>
    </section>

    <section className="temporalIssue" aria-labelledby="temporal-title">
      <div className="sectionKicker"><span>01</span><b>EDICIÓN MENSUAL</b><i>SFI-TN-M / YYYY-MM</i></div>
      <div className="temporalIssueGrid">
        <figure className="temporalCover">
          {monthly.coverImage ? <img src={monthly.coverImage} alt={`${monthly.title} · ${monthly.issue}`} /> : null}
          <figcaption>GENERADA (IA) · SFI / OpenAI · 2026-09-12 · portada de edición mensual · uso editorial</figcaption>
        </figure>
        <article>
          <span className="temporalState">MONTHLY ISSUE · {monthly.issue.toUpperCase()}</span>
          <h2 id="temporal-title">{monthly.title}</h2>
          <h3>{september.subtitle}</h3>
          <p>{september.coverStatement}</p>
          <dl>
            <div><dt>CADENCIA</dt><dd>Una edición institucional por mes</dd></div>
            <div><dt>ESTADO</dt><dd>As-of state / retorno abierto</dd></div>
            <div><dt>FUNCIÓN</dt><dd>Qué cambió · qué persiste · qué expiró · qué sigue</dd></div>
            <div><dt>PDF FUENTE</dt><dd>{september.sourceOfRecord.filename} · {(september.sourceOfRecord.byteLength / 1_000_000).toFixed(1)} MB · SHA-256 verificado</dd></div>
          </dl>
          <div className="pubActions">
            <Link href={`/publications/${monthly.slug}`}>ABRIR EDICIÓN →</Link>
            {september.sourceOfRecord.publicUrl ? <a href={september.sourceOfRecord.publicUrl}>ABRIR PDF ↗</a> : null}
            <Link href="/library#notas-temporales">VER ARCHIVO MENSUAL</Link>
          </div>
        </article>
      </div>
    </section>

    <section className="observationFamilies" aria-labelledby="families-title">
      <div className="sectionKicker"><span>02</span><b>OBSERVACIONES INDIVIDUALES</b><i>EVENT / EDITORIAL LENSES</i></div>
      <header className="familiesIntro">
        <h2 id="families-title">Cinco lentes. Un mismo archivo.</h2>
        <p>Las familias siguientes organizan lectura y descubrimiento. No reemplazan la clasificación canónica de cada objeto ni convierten una observación en evidencia por presentarla bajo una lente editorial.</p>
      </header>

      <div className="familyStack">
        {SFI_EDITORIAL_FAMILIES.map((family, index) => {
          const entries = editorialFamilyEntries(family);
          return <details className="family" key={family.key} open={index === 0}>
            <summary>
              <figure>
                <img src={family.image} alt={family.label} />
              </figure>
              <div className="familySummaryCopy">
                <span>{String(index + 1).padStart(2, '0')} · {family.shortLabel.toUpperCase()}</span>
                <h3>{family.label}</h3>
                <p>{family.description}</p>
                <small>{entries.length} {entries.length === 1 ? 'pieza' : 'piezas'} · abrir archivo</small>
              </div>
              <b className="familyToggle" aria-hidden="true">＋</b>
            </summary>

            <div className="familyBody">
              <p className="imageProvenance">{family.imageProvenance}</p>
              <div className="familyEntries">
                {entries.map((publication) => <article key={publication.slug}>
                  <div className="entryMeta">
                    <span>{publication.observationKind ?? 'OBSERVATION'}</span>
                    <time>{formatDate(publication.publishedAt)}</time>
                  </div>
                  <h4><Link href={`/publications/${publication.slug}`}>{publication.title}</Link></h4>
                  <p>{publication.subtitle}</p>
                  <footer>
                    <Link href={`/publications/${publication.slug}`}>LEER EN SFI →</Link>
                    {publication.mediumUrl ? <a href={publication.mediumUrl} target="_blank" rel="noreferrer">MEDIUM ↗</a> : <span>SFI ORIGINAL</span>}
                  </footer>
                </article>)}
              </div>
            </div>
          </details>;
        })}
      </div>
    </section>

    <section className="pubOntology" aria-label="Editorial ontology boundary">
      <div><span>MONTHLY</span><b>Notas Temporales</b><p>Una coordenada temporal por mes. No se sustituye por artículos individuales.</p></div>
      <div><span>EVENT</span><b>Observaciones</b><p>Piezas situadas con timestamp, procedencia y frontera epistemológica propia.</p></div>
      <div><span>RETURN</span><b>Volver al estado anterior</b><p>El retorno corrige lectura con outcome; no demuestra que la hipótesis original era correcta.</p></div>
      <div><span>DISCOVERY</span><b>Encontrable ≠ validado</b><p>El mesh aumenta exposición y trazabilidad; el efecto externo necesita evidencia independiente.</p></div>
    </section>

    <footer className="pubFooter">
      <div><b>SYSTEM FRICTION INSTITUTE</b><span>Observar · Contrastar · Retornar</span></div>
      <div><span>IDENTIDAD VISUAL</span><small>SFI-ID-003 · MASTER EDITION V4.0</small></div>
    </footer>
  </main>;
}