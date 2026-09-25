import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { SfiEditorialPublication } from '@/lib/publications/editorialContent';
import type { SfiPublicResearchLanding } from '@/lib/research/publicResearchLanding';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;

function bytesLabel(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function safeJsonLd(landing: SfiPublicResearchLanding): string {
  return JSON.stringify(landing.jsonLd).replace(/</g, '\\u003c');
}

function TemporalDial({ month }: { month: number }) {
  const normalized = Math.min(12, Math.max(1, month));
  return <div className="tnDial" aria-label={`Monthly coordinate: ${MONTHS[normalized - 1]}`}>
    <div className="tnDialCore"><span>MONTH</span><b>{String(normalized).padStart(2, '0')}</b></div>
    {MONTHS.map((label, index) => {
      const angle = (index / 12) * 360 - 90;
      return <span
        className={`tnDialMonth ${index + 1 === normalized ? 'isActive' : ''}`}
        key={label}
        style={{ '--angle': `${angle}deg` } as CSSProperties}
      >{label}</span>;
    })}
  </div>;
}

export function TemporalIssueView({
  publication,
  landing,
}: {
  publication: SfiEditorialPublication;
  landing: SfiPublicResearchLanding;
}) {
  const profile = publication.temporalProfile;
  if (!profile) return null;

  const rendition = publication.renditions.find((item) => item.kind === 'PDF' && item.state === 'PUBLIC' && item.publicUrl);
  const canonicalUrl = landing.citation.canonicalUrl;
  const publicationYear = new Date(publication.publishedAt).getFullYear();
  const citation = `System Friction Institute. (${publicationYear}). ${publication.title}: ${publication.subtitle}. ${publication.issue}. ${canonicalUrl}`;

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(landing) }} />
    <main className="tnPage" data-state={profile.state}>
      <header className="tnTopbar">
        <Link className="tnBrand" href="/"><span>SFI</span><small>SYSTEM FRICTION INSTITUTE</small></Link>
        <nav aria-label="Institutional navigation">
          <Link href="/institution">INSTITUTE</Link>
          <Link href="/research">RESEARCH</Link>
          <Link href="/library">ARCHIVE</Link>
          <Link href="/field">FIELD</Link>
          <Link href="/publications">NOTES</Link>
          <Link href="/observatory">OBSERVATORY</Link>
        </nav>
        <Link className="tnExplore" href="/publications">EXPLORE <span>→</span></Link>
      </header>

      <section className="tnHero">
        <div className="tnHeroCopy">
          <div className="tnBreadcrumb">HOME / NOTES / TEMPORAL / {profile.coordinate.replace(' / ', '-')}</div>
          <div className="tnKicker">TEMPORARY NOTES · {profile.code}</div>
          <h1>{publication.title}</h1>
          <h2>{publication.subtitle}</h2>
          <p>{publication.deck}</p>
          <div className="tnHeroMotto">{publication.motto}</div>
        </div>

        <div className="tnHeroVisual">
          {publication.coverImage ? <img src={publication.coverImage} alt={`${publication.title} · ${publication.issue}`} /> : null}
          <div className="tnHeroShade" />
          <div className="tnHeroRail">
            <span>TIME</span>
            <span>EVIDENCE</span>
            <span>STATE</span>
            <span>RETURN</span>
            <i />
            <b>OBSERVE BEFORE CONCLUDING</b>
          </div>
          <div className="tnDialWrap">
            <TemporalDial month={profile.month} />
            <div>
              <small>MONTHLY ISSUE</small>
              <strong>{profile.coordinate}</strong>
              <span>{profile.phase} · RETURN {profile.returnState}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tnMetaStrip" aria-label="Issue metadata">
        {[
          ['CUT-OFF', profile.cutoffLabel],
          ['COORDINATE', profile.coordinate],
          ['STATE', profile.state],
          ['RETURN', profile.returnState],
          ['AUTHORITY', profile.authorityLabel],
          ['OBJECT', publication.canonicalId],
        ].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
      </section>

      <div className="tnBody">
        <aside className="tnToc" aria-label="In this issue">
          <span>IN THIS ISSUE</span>
          <nav>
            {publication.sections.map((section, index) => <a href={`#${section.id}`} key={section.id}>
              <i>{String(index + 1).padStart(2, '0')}</i>{section.title}
            </a>)}
          </nav>
          <blockquote>“{publication.motto}”<small>SFI</small></blockquote>
        </aside>

        <article className="tnArticle">
          {publication.sections.map((section, index) => <section id={section.id} key={section.id}>
            <div className="tnSectionNo">{String(index + 1).padStart(2, '0')}</div>
            <div className="tnSectionContent">
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </div>
          </section>)}

          {publication.cadence.length ? <section id="cadence">
            <div className="tnSectionNo">↻</div>
            <div className="tnSectionContent">
              <h3>Institutional cadence</h3>
              {publication.cadence.map((item) => <div className="tnCadence" key={item.interval}>
                <b>{item.interval}</b><span>{item.name}</span><p>{item.scope}</p>
              </div>)}
            </div>
          </section> : null}

          <section id="boundary">
            <div className="tnSectionNo">!</div>
            <div className="tnSectionContent">
              <h3>Epistemic boundary</h3>
              <p className="tnBoundaryIntro">What this issue does not authorize us to claim remains visible beside the published object.</p>
              <ul className="tnBoundaryList">{publication.epistemicBoundary.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>
        </article>

        <aside className="tnRail">
          <section className="tnRailCard tnDownload">
            <div className="tnRailTitle">DOWNLOAD & CITATION</div>
            {rendition ? <>
              <a className="tnDownloadButton" href={rendition.publicUrl!} target="_blank" rel="noreferrer">
                <span>DOWNLOAD / OPEN PDF</span><b>{bytesLabel(rendition.byteLength)}</b><i>→</i>
              </a>
              <dl>
                <div><dt>RENDITION</dt><dd>PDF · PUBLIC</dd></div>
                <div><dt>SHA-256</dt><dd>{rendition.sha256.slice(0, 16)}…</dd></div>
                <div><dt>ARCHIVE</dt><dd>{rendition.filename}</dd></div>
              </dl>
            </> : <p>The PDF rendition is not yet published.</p>}
            <div className="tnCitation"><span>CITE THIS ISSUE</span><p>{citation}</p></div>
          </section>

          <section className="tnRailCard">
            <div className="tnRailTitle">WHAT TO OBSERVE NEXT</div>
            <ol className="tnFollow">{profile.followUpPrompts.map((item) => <li key={item}>{item}<span>→</span></li>)}</ol>
          </section>

          <section className="tnRailCard">
            <div className="tnRailTitle">TEMPORAL SEMANTICS</div>
            <dl className="tnSemantic">
              <div><dt>SIGNAL</dt><dd>something changed; it is not yet validated.</dd></div>
              <div><dt>DECISION</dt><dd>an authorized state changes the route.</dd></div>
              <div><dt>CORRECTION</dt><dd>a claim or record must change.</dd></div>
              <div><dt>RETURN</dt><dd>the outcome returns to the system.</dd></div>
              <div><dt>HORIZON</dt><dd>future direction without present authority.</dd></div>
            </dl>
          </section>

          <section className="tnRailCard">
            <div className="tnRailTitle">OBSERVED DOMAINS</div>
            <div className="tnDomains">{publication.domains.map((domain) => <span key={domain}>{domain}</span>)}</div>
          </section>
        </aside>
      </div>

      <footer className="tnFooter">
        <div><b>SFI</b><span>SYSTEM FRICTION INSTITUTE</span></div>
        <div><span>{profile.code}</span><span>{landing.contract}</span></div>
        <div><Link href="/privacy">PRIVACY</Link><Link href="/institution">INSTITUTE</Link><Link href="/publications">PUBLICATIONS</Link></div>
      </footer>
    </main>
  </>;
}
