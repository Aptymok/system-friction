import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSurfaceContinuity } from '@/components/sfi/PublicSurfaceContinuity';
import { SFI_NOTAS_TEMPORALES_V1, SFI_REALITY_CHAIN_BRIEF, SFI_YEARS_THAT_DID_EXIST_LAB_NOTE } from '@/lib/publications/editorialContent';
import {
  SFI_EDITORIAL_FAMILIES,
  SFI_PUBLICATIONS_BANNER,
  editorialFamilyEntries,
} from '@/lib/publications/editorialFamilies';
import { publicEnglishObservationLabel, publicEnglishProjection } from '@/lib/publications/publicEnglishProjection';
import { getPublicPublishedReturns } from '@/lib/observatory/publicState';
import './publications.css';

export const dynamic = 'force-dynamic';

const CANONICAL_URL = 'https://systemfriction.org/publications';
const DISCOVERY_NOTE = '/publications/discovery-mesh-publicar-no-es-ser-encontrado';

export const metadata: Metadata = {
  title: 'Publications · System Friction Institute',
  description: 'SFI editorial archive: monthly Temporary Notes, signals, cases, field observations, RETURN and laboratory notes.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type:'website',
    url:CANONICAL_URL,
    siteName:'System Friction Institute',
    title:'Publications · System Friction Institute',
    description:'A public editorial surface for observation, contrast and RETURN without mixing epistemic states.',
    images:[{url:SFI_PUBLICATIONS_BANNER.web}],
  },
  other: {
    'sfi-surface':'PUBLICATIONS_HUB',
    'sfi-editorial-contract':'SFI-EDITORIAL-FAMILY-PROJECTION-1.0',
    'sfi-identity-manual':'SFI-ID-003 / MASTER EDITION V4.0',
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date)
    : value;
}

export default async function PublicationsPage() {
  const monthly = SFI_NOTAS_TEMPORALES_V1;
  const monthlyProjection = publicEnglishProjection(monthly.slug,{
    title:monthly.title,
    subtitle:monthly.subtitle,
    summary:monthly.deck,
  });
  const persistedPublications = await getPublicPublishedReturns(12);

  return <main className="publicationsHub"><PublicSurfaceContinuity scene="return-loop" number="08" label="PUBLICATIONS / RETURN" previous={{href:'/library',label:'LIBRARY'}} next={{href:'/',label:'JOURNEY'}}/>
    <header className="pubTopbar">
      <Link href="/" className="pubBrand">SFI</Link>
      <div className="pubTopbarIdentity"><span>SYSTEM FRICTION INSTITUTE</span><small>PUBLICATIONS / EDITORIAL ARCHIVE</small></div>
      <nav aria-label="Public navigation">
        <Link href="/observatory">OBSERVATORY</Link>
        <Link href="/publications">PUBLICATIONS</Link>
        <Link href="/library">LIBRARY</Link>
        <Link href="/field">FIELD</Link>
        <Link href="/institution">INSTITUTE</Link>
        <Link href="/login">SIGN IN</Link>
      </nav>
    </header>

    <section className="pubHero" aria-labelledby="publications-title">
      <figure className="pubBanner">
        <picture><source media="(max-width: 720px)" srcSet={SFI_PUBLICATIONS_BANNER.mobile}/><img src={SFI_PUBLICATIONS_BANNER.web} alt={SFI_PUBLICATIONS_BANNER.alt}/></picture>
        <figcaption>{SFI_PUBLICATIONS_BANNER.provenance}</figcaption>
      </figure>
      <div className="pubHeroCopy">
        <span>PUBLICATIONS · EDITORIAL ARCHIVE</span>
        <h1 id="publications-title">Observe before concluding.</h1>
        <p>SFI publishes objects by function rather than format. Notes, research, methods, cases and RETURN preserve identity, version, provenance and epistemic boundary even when their rendition changes.</p>
        <div className="pubHeroBoundary"><b>RULE</b><span>PUBLICATION = EXPOSURE</span><span>EXPOSURE ≠ EXTERNAL EVIDENCE ≠ RETURN</span></div>
      </div>
    </section>

    <section className="temporalIssue" aria-labelledby="temporal-title">
      <div className="sectionKicker"><span>01</span><b>MONTHLY ISSUE</b><i>SFI-TN-M / YYYY-MM</i></div>
      <div className="temporalIssueGrid">
        <figure className="temporalCover">{monthly.coverImage ? <img src={monthly.coverImage} alt={monthlyProjection.title}/> : null}<figcaption>EDITORIAL RENDITION · CANONICAL IDENTITY PRESERVED</figcaption></figure>
        <article>
          <span className="temporalState">MONTHLY ISSUE · {monthly.issue.toUpperCase()}</span>
          <h2 id="temporal-title">{monthlyProjection.title}</h2>
          <h3>{monthlyProjection.subtitle}</h3>
          <p>{monthlyProjection.summary}</p>
          <dl>
            <div><dt>CADENCE</dt><dd>One institutional issue per month</dd></div>
            <div><dt>STATE</dt><dd>As-of state / RETURN open</dd></div>
            <div><dt>FUNCTION</dt><dd>What changed · what persists · what expired · what follows</dd></div>
          </dl>
          <div className="pubActions"><Link href={`/publications/${monthly.slug}`}>OPEN ISSUE →</Link><Link href="/library#temporary-notes">VIEW MONTHLY ARCHIVE</Link></div>
        </article>
      </div>
    </section>

    <section className="temporalIssue" aria-labelledby="reality-chain-title">
      <div className="sectionKicker"><span>02</span><b>PUBLIC-SOURCE FRICTION BRIEF</b><i>SFI-PUB-FB-002</i></div>
      <div className="temporalIssueGrid">
        <figure className="temporalCover"><img src={SFI_REALITY_CHAIN_BRIEF.coverImage ?? undefined} alt="The Reality Chain · System Friction Institute"/><figcaption>PUBLIC RENDITION · ENGLISH · SOURCE CUT-OFF 20 SEP 2026</figcaption></figure>
        <article>
          <span className="temporalState">FRICTION BRIEF · 20 SEP 2026</span>
          <h2 id="reality-chain-title">{SFI_REALITY_CHAIN_BRIEF.title}</h2>
          <h3>{SFI_REALITY_CHAIN_BRIEF.subtitle}</h3>
          <p>{SFI_REALITY_CHAIN_BRIEF.deck}</p>
          <dl>
            <div><dt>CLAIM</dt><dd>Machine inference is scaling faster than institutional verification capacity.</dd></div>
            <div><dt>CASE ZERO</dt><dd>AARO / PURSUE UAP evidence under incomplete context and custody.</dd></div>
            <div><dt>BOUNDARY</dt><dd>Unresolved ≠ extraterrestrial · provenance ≠ truth · benchmark v0 not yet independently executed.</dd></div>
          </dl>
          <div className="pubActions"><Link href={`/publications/${SFI_REALITY_CHAIN_BRIEF.slug}`}>READ BRIEF →</Link>{SFI_REALITY_CHAIN_BRIEF.renditions.find((item)=>item.state==='PUBLIC'&&item.publicUrl)?.publicUrl?<a href={SFI_REALITY_CHAIN_BRIEF.renditions.find((item)=>item.state==='PUBLIC'&&item.publicUrl)!.publicUrl!} target="_blank" rel="noreferrer">OPEN PDF ↗</a>:null}</div>
        </article>
      </div>
    </section>

    <section className="temporalIssue" aria-labelledby="years-exist-title">
      <div className="sectionKicker"><span>03</span><b>RESEARCH LAB NOTE · PUBLIC-SOURCE SYNTHESIS</b><i>SFI-PUB-LN-001</i></div>
      <div className="temporalIssueGrid">
        <figure className="temporalCover"><img src={SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.coverImage ?? undefined} alt="The Years That Did Exist · System Friction Institute"/><figcaption>LAB NOTE · ENGLISH · SOURCE CUT-OFF 20 SEP 2026</figcaption></figure>
        <article>
          <span className="temporalState">OPEN INVESTIGATION · 20 SEP 2026</span>
          <h2 id="years-exist-title">{SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.title}</h2>
          <h3>{SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.subtitle}</h3>
          <p>{SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.deck}</p>
          <dl>
            <div><dt>FALSIFIED</dt><dd>A literal ~297-year chronological insertion does not survive independent physical chronology.</dd></div>
            <div><dt>WORKING MODEL</dt><dd>Slow reproductive-capacity stress and rapid coordination fracture are distinct failure regimes.</dd></div>
            <div><dt>BOUNDARY</dt><dd>Comparative synthesis ≠ validated collapse law · analytical scores ≠ historical measurements.</dd></div>
          </dl>
          <div className="pubActions"><Link href={`/publications/${SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.slug}`}>READ LAB NOTE →</Link></div>
        </article>
      </div>
    </section>

    <section className="temporalIssue" aria-labelledby="discovery-method-title">
      <div className="sectionKicker"><span>04</span><b>LAB NOTE · DISCOVERY MESH</b><i>SFI-PUB-OBS-014</i></div>
      <div className="temporalIssueGrid">
        <figure className="temporalCover"><img src="/images/editorial/discovery-mesh-observation.svg" alt="Discovery Mesh · Exposure to RETURN"/><figcaption>VISUAL INSTRUMENT · possible states do not imply observed states</figcaption></figure>
        <article>
          <span className="temporalState">METHOD NOTE · 16 SEP 2026</span>
          <h2 id="discovery-method-title">Discovery Mesh: publishing is not being found</h2>
          <h3>How SFI observes its own discoverability without converting exposure into recognition.</h3>
          <p>The note documents EXPOSURE → DISCOVERY → RECOGNITION → INTERACTION → RELATION → PROPAGATION → PULL → RETURN, while preserving the difference between observed degradation, governed candidates, authority and material execution.</p>
          <dl>
            <div><dt>AUTHORITY</dt><dd>Bounded publication authorized by the Founder</dd></div>
            <div><dt>AUTONOMY</dt><dd>The Mesh observes and formulates candidates; it does not materially adopt or execute without a real owner</dd></div>
            <div><dt>BOUNDARY</dt><dd>NULL ≠ 0 · candidate ≠ adoption · adoption ≠ canon</dd></div>
          </dl>
          <div className="pubActions"><Link href={DISCOVERY_NOTE}>READ NOTE →</Link><Link href="/observatory">OBSERVE FIELD →</Link></div>
        </article>
      </div>
    </section>

    <section className="observationFamilies" aria-labelledby="persisted-returns-title">
      <div className="sectionKicker"><span>05</span><b>PUBLISHED OPERATIONAL RETURNS</b><i>PERSISTED / GOVERNED</i></div>
      <header className="familiesIntro">
        <h2 id="persisted-returns-title">What the system can already reconstruct.</h2>
        <p>This projection reads only persisted objects with PUBLISHED status. PUBLICATION = EXPOSURE: publication does not become external evidence, scientific validation or institutional recognition.</p>
      </header>
      {persistedPublications.length ? <div className="familyEntries">{persistedPublications.map((publication)=><article key={publication.id}>
        <div className="entryMeta"><span>PUBLISHED RETURN</span><time>{publication.publishedAt?formatDate(publication.publishedAt):'date unavailable'}</time></div>
        <h4>SFI · Operational Return</h4>
        <p>A governed operational return is persisted and publicly projected. Original-language payload text is withheld from this English-only surface.</p>
        <footer><span>{publication.snapshotVersion??'SNAPSHOT VERSION UNAVAILABLE'}</span><span>PUBLICATION ≠ EXTERNAL VALIDATION</span></footer>
      </article>)}</div> : <p>No governed operational RETURN is currently published.</p>}
    </section>

    <section className="observationFamilies" aria-labelledby="families-title">
      <div className="sectionKicker"><span>06</span><b>INDIVIDUAL OBSERVATIONS</b><i>EVENT / EDITORIAL LENSES</i></div>
      <header className="familiesIntro"><h2 id="families-title">Five lenses. One archive.</h2><p>Families organize reading and discovery. They do not replace canonical classification or convert an observation into evidence by presenting it editorially.</p></header>
      <div className="familyStack">{SFI_EDITORIAL_FAMILIES.map((family,index)=>{
        const entries=editorialFamilyEntries(family);
        return <details className="family" key={family.key} open={index===0}>
          <summary>
            <figure><img src={family.image} alt={family.label}/></figure>
            <div className="familySummaryCopy"><span>{String(index+1).padStart(2,'0')} · {family.shortLabel.toUpperCase()}</span><h3>{family.label}</h3><p>{family.description}</p><small>{entries.length} {entries.length===1?'piece':'pieces'} · open archive</small></div>
            <b className="familyToggle" aria-hidden="true">＋</b>
          </summary>
          <div className="familyBody">
            <p className="imageProvenance">{family.imageProvenance}</p>
            <div className="familyEntries">{entries.map((publication)=>{
              const projection=publicEnglishProjection(publication.slug,{title:publication.title,subtitle:publication.subtitle,summary:publication.deck});
              return <article key={publication.slug}>
                <div className="entryMeta"><span>{publicEnglishObservationLabel(publication.observationKind)}</span><time>{formatDate(publication.publishedAt)}</time></div>
                <h4><Link href={`/publications/${publication.slug}`}>{projection.title}</Link></h4>
                <p>{projection.subtitle}</p>
                <footer><Link href={`/publications/${publication.slug}`}>READ IN SFI →</Link>{publication.mediumUrl?<a href={publication.mediumUrl} target="_blank" rel="noreferrer">SOURCE ↗</a>:<span>SFI ORIGINAL</span>}</footer>
              </article>;
            })}</div>
          </div>
        </details>;
      })}</div>
    </section>

    <section className="pubOntology" aria-label="Editorial ontology boundary">
      <div><span>MONTHLY</span><b>Temporary Notes</b><p>One time coordinate per month.</p></div>
      <div><span>EVENT</span><b>Observations</b><p>Situated pieces with timestamp, provenance and epistemic boundary.</p></div>
      <div><span>RETURN</span><b>Correct the reading</b><p>RETURN modifies what SFI believed through observed outcome.</p></div>
      <div><span>DISCOVERY</span><b>Discoverable ≠ validated</b><p>The Mesh measures exposure, discovery, propagation, PULL and RETURN without confusing them.</p></div>
    </section>

    <footer className="pubFooter">
      <div><b>SYSTEM FRICTION INSTITUTE</b><span>Observe · Contrast · Return</span></div>
      <div><span>VISUAL IDENTITY</span><small>SFI-ID-003 · MASTER EDITION V4.0</small></div>
    </footer>
  </main>;
}
