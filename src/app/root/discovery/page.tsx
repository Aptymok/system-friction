import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readDiscoveryControlPlane } from '@/lib/discovery/discoveryControlPlane';
import './discovery.css';

export const dynamic = 'force-dynamic';

function statusClass(value: string) {
  return value === 'AVAILABLE' || value === 'READY_OWNED_SURFACE' || value === 'OBSERVED_PUBLISHED'
    ? 'discoveryStatus discoveryStatusOk'
    : value === 'DEGRADED' || value === 'GOVERNED_EXTERNAL_ACTION_REQUIRED'
      ? 'discoveryStatus discoveryStatusWarn'
      : 'discoveryStatus';
}

function Metric({ label, value, detail }: { label: string; value: string | number | null; detail?: string }) {
  return <article className="discoveryMetric">
    <span>{label}</span>
    <strong>{value === null ? 'MISSING' : value}</strong>
    {detail ? <small>{detail}</small> : null}
  </article>;
}

export default async function RootDiscoveryPage() {
  await requireRootObserverPage('/root/discovery');
  const data = await readDiscoveryControlPlane();
  const externalActionTargets = data.exposure.targets.filter((target) => target.state === 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  const observedPublishedTargets = data.exposure.targets.filter((target) => target.state === 'OBSERVED_PUBLISHED');

  return <main className="discoveryRoot">
    <header className="discoveryHeader">
      <div>
        <p className="discoveryKicker">SFI-03 · DISCOVERY MESH</p>
        <h1>Discovery + Exposure</h1>
        <p>Estado de descubribilidad, identidad externa y proyección distribuida. Exposure es representación; nunca canon ni evidencia de publicación por sí misma.</p>
      </div>
      <div className="discoveryHeaderActions">
        <span className={statusClass(data.availability)}>{data.availability}</span>
        <Link href="/root">Volver a ROOT</Link>
      </div>
    </header>

    <section className="discoveryMetricsGrid" aria-label="Discovery summary">
      <Metric label="Canonical objects" value={data.entityHealth.canonicalObjectCount} />
      <Metric label="Publicables" value={data.entityHealth.publicableObjectCount} />
      <Metric label="Discovery runs" value={data.searchHealth.totalRuns} detail={data.searchHealth.availability} />
      <Metric label="Representations" value={data.propagations.total} detail={data.propagations.availability} />
      <Metric label="Published observed" value={observedPublishedTargets.length} />
      <Metric label="External actions" value={externalActionTargets.length} />
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel">
        <h2>Entity health</h2>
        <dl>
          <div><dt>Canonical identity</dt><dd className={statusClass(data.entityHealth.canonicalIdentity)}>{data.entityHealth.canonicalIdentity}</dd></div>
          <div><dt>Blocked canonical objects</dt><dd>{data.entityHealth.blockedObjectCount}</dd></div>
          <div><dt>Registry defects</dt><dd>{data.entityHealth.registryErrors.length}</dd></div>
          <div><dt>Collision risks declared</dt><dd>{data.externalNodes.disambiguationRisks.length}</dd></div>
        </dl>
      </article>

      <article className="discoveryPanel">
        <h2>AI discovery</h2>
        <p className={statusClass(data.aiDiscovery.availability)}>{data.aiDiscovery.availability}</p>
        <div className="discoveryTagCloud">
          {data.aiDiscovery.metricContract.map((metric) => <span key={metric}>{metric}</span>)}
        </div>
        <p className="discoveryBoundary">{data.aiDiscovery.falseZero}</p>
      </article>

      <article className="discoveryPanel">
        <h2>Crawlers</h2>
        <p><strong>Search / retrieval:</strong> {data.crawlers.searchDiscovery.state}</p>
        <p>{data.crawlers.searchDiscovery.bots.join(' · ')}</p>
        <p><strong>Training / reuse:</strong> {data.crawlers.modelTrainingDataReuse.state}</p>
        <p>{data.crawlers.modelTrainingDataReuse.bots.join(' · ')}</p>
      </article>

      <article className="discoveryPanel">
        <h2>Academic graph</h2>
        <p className={statusClass(data.academicGraph.state)}>{data.academicGraph.state}</p>
        <p>{data.academicGraph.eligibleCanonicalObjectKeys.length} objetos elegibles para representación académica.</p>
        <p><strong>DOI:</strong> {data.dois.state}</p>
        <p className="discoveryBoundary">{data.dois.boundary}</p>
      </article>
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead">
        <div>
          <p className="discoveryKicker">EXPOSURE TARGETS</p>
          <h2>Superficies de distribución</h2>
        </div>
        <span>{data.exposure.targets.length} targets</span>
      </div>
      <div className="discoveryTable" role="table">
        {data.exposure.targets.map((target) => <div className="discoveryRow" role="row" key={target.key}>
          <div><strong>{target.key}</strong><small>{target.targetClass}</small></div>
          <span className={statusClass(target.state)}>{target.state}</span>
          <div className="discoveryUrl">{target.url ?? 'MISSING'}</div>
          <div className="discoveryReason">{target.reason}</div>
        </div>)}
      </div>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel">
        <h2>Feeds + machine surfaces</h2>
        <ul className="discoveryLinks">
          {Object.entries(data.feeds).map(([key, url]) => <li key={key}><a href={url}>{key}</a></li>)}
          <li><span>MCP</span><code>{data.mcp.endpoint}</code></li>
        </ul>
      </article>

      <article className="discoveryPanel">
        <h2>Propagation receipts</h2>
        <p className={statusClass(data.propagations.availability)}>{data.propagations.availability}</p>
        <pre>{JSON.stringify(data.propagations.byState, null, 2)}</pre>
      </article>

      <article className="discoveryPanel">
        <h2>Collisions</h2>
        <p className={statusClass(data.collisions.availability)}>{data.collisions.availability}</p>
        <p>{data.collisions.total === null ? 'MISSING' : `${data.collisions.total} pruebas registradas`}</p>
        <p>{data.collisions.observed.length} colisiones observadas en la muestra actual.</p>
      </article>

      <article className="discoveryPanel">
        <h2>Failed publications</h2>
        <strong>{data.failedPublications.length}</strong>
        <p>No se infiere éxito externo cuando no existe receipt observado.</p>
      </article>
    </section>

    <footer className="discoveryFooter">
      <span>{data.contract}</span>
      <span>DB reads: {data.readPlan.dbQueries} · polling: {data.readPlan.pollingLoops} · N+1: {data.readPlan.nPlusOneReads}</span>
      <span>Observed: {data.observedAt}</span>
    </footer>
  </main>;
}
