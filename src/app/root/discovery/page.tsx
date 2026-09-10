import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readDiscoveryControlPlane } from '@/lib/discovery/discoveryControlPlane';
import { readInstitutionalDiscoveryMesh } from '@/lib/discovery/institutionalDiscoveryReadModel';
import './discovery.css';

export const dynamic = 'force-dynamic';

function statusClass(value: string) {
  return value === 'AVAILABLE' || value === 'READY_OWNED_SURFACE' || value === 'OBSERVED_PUBLISHED' || value === 'OBSERVED_SAMPLE' || value === 'CANONICAL_NAMESPACE_ACTIVE'
    ? 'discoveryStatus discoveryStatusOk'
    : value === 'DEGRADED' || value === 'GOVERNED_EXTERNAL_ACTION_REQUIRED' || value === 'INSUFFICIENT_EVIDENCE_FOR_MINIMUM_GATE'
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
  const [data, institutional] = await Promise.all([
    readDiscoveryControlPlane(),
    readInstitutionalDiscoveryMesh(),
  ]);
  const mesh = institutional.mesh;
  const externalActionTargets = data.exposure.targets.filter((target) => target.state === 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  const observedPublishedTargets = data.exposure.targets.filter((target) => target.state === 'OBSERVED_PUBLISHED');
  const convergence = mesh.convergence;

  return <main className="discoveryRoot">
    <header className="discoveryHeader">
      <div>
        <p className="discoveryKicker">SFI-03 · DISCOVERY MESH</p>
        <h1>Discovery + Exposure</h1>
        <p>Una malla institucional: qué sabe SFI, qué existe fuera, qué sale de SFI, quién lo encuentra y si esas cadenas producen RETURN o convergencia externa. Exposure es representación; nunca canon ni publicación observada por sí misma.</p>
      </div>
      <div className="discoveryHeaderActions">
        <span className={statusClass(data.availability)}>{data.availability}</span>
        <Link href="/root">Volver a ROOT</Link>
      </div>
    </header>

    <section className="discoveryMetricsGrid" aria-label="Discovery summary">
      <Metric label="Canonical objects" value={data.entityHealth.canonicalObjectCount} />
      <Metric label="Reality nodes · sample" value={mesh.reality.nodes.length} detail={mesh.reality.state} />
      <Metric label="Propagation trajectories" value={mesh.propagation.trajectories.length} detail={mesh.propagation.state} />
      <Metric label="NYC active relations" value={convergence.activeNycRelationships.length} />
      <Metric label="Published observed" value={observedPublishedTargets.length} />
      <Metric label="External actions" value={externalActionTargets.length} />
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel">
        <h2>Knowledge graph</h2>
        <dl>
          <div><dt>Canonical identity</dt><dd className={statusClass(data.entityHealth.canonicalIdentity)}>{data.entityHealth.canonicalIdentity}</dd></div>
          <div><dt>Publicable objects</dt><dd>{data.entityHealth.publicableObjectCount}</dd></div>
          <div><dt>Blocked objects</dt><dd>{data.entityHealth.blockedObjectCount}</dd></div>
          <div><dt>Registry defects</dt><dd>{data.entityHealth.registryErrors.length}</dd></div>
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
          <p className="discoveryKicker">EXTERNAL REALITY GRAPH</p>
          <h2>Entidades reales + relaciones semánticas</h2>
        </div>
        <span className={statusClass(mesh.reality.state)}>{mesh.reality.state}</span>
      </div>
      <div className="discoveryTable" role="table">
        {mesh.reality.nodes.length ? mesh.reality.nodes.map((node) => <div className="discoveryRow" role="row" key={node.nodeId}>
          <div><strong>{node.label}</strong><small>{node.nodeClass} · {node.nodeId}</small></div>
          <span className={statusClass(node.relationState)}>{node.relationState}</span>
          <div className="discoveryUrl">{node.geography.length ? node.geography.join(' / ') : 'GEOGRAPHY UNKNOWN'}</div>
          <div className="discoveryReason">{node.capabilityControlled.length ? `Controls: ${node.capabilityControlled.join(', ')}` : 'Controlled capability UNKNOWN'} · RETURN {node.returnState}</div>
        </div>) : <p className="discoveryBoundary">No external Reality nodes are currently observed in the bounded canonical-graph sample. SFI does not invent them from outreach narratives.</p>}
      </div>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel">
        <h2>Propagation graph</h2>
        <p className={statusClass(mesh.propagation.state)}>{mesh.propagation.state}</p>
        <p>{mesh.propagation.events.length} trajectory events in bounded sample.</p>
        <p>{mesh.propagation.trajectories.length} object trajectories.</p>
        <p className="discoveryBoundary">Publication does not backfill discovery. Copy/remix does not prove propagation.</p>
      </article>

      <article className="discoveryPanel">
        <h2>Discovery lifecycle</h2>
        <div className="discoveryTagCloud">
          {mesh.lifecycle.stages.map((stage) => <span key={stage.id}>{stage.id}</span>)}
        </div>
        <p className="discoveryBoundary">EXPOSURE → DISCOVERY → RECOGNITION → INTERACTION → RELATION → PROPAGATION → PULL → RETURN. Missing transitions remain missing.</p>
      </article>

      <article className="discoveryPanel">
        <h2>Manhattan attractor</h2>
        <p className={statusClass(convergence.disposition)}>{convergence.disposition}</p>
        <p>NYC nodes: {convergence.nycNodes.length} · ACTIVE/PULLING: {convergence.activeNycRelationships.length} · PULL edges: {convergence.pullEdges.length}</p>
        <p className="discoveryBoundary">Attractor is a lens over the global graph. It is not a Manhattan-specific ontology or a relocation claim.</p>
      </article>

      <article className="discoveryPanel">
        <h2>Minimum convergence gate</h2>
        <dl>
          <div><dt>Independent NYC relations</dt><dd>{convergence.evidence.independentNycRelationships}/3</dd></div>
          <div><dt>SFI object requests</dt><dd>{convergence.evidence.concreteSfiObjectRequests}/1</dd></div>
          <div><dt>Third-party introductions</dt><dd>{convergence.evidence.thirdPartyIntroductions}/1</dd></div>
          <div><dt>Real case RETURN</dt><dd>{convergence.evidence.realCasesWithObservedReturn}/1</dd></div>
        </dl>
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
        <p>{data.propagations.total === null ? `Total no consultado · muestra ${data.propagations.sampled}/${data.propagations.sampleLimit}` : data.propagations.total}</p>
        <pre>{JSON.stringify(data.propagations.byStateInSample, null, 2)}</pre>
      </article>

      <article className="discoveryPanel">
        <h2>Collisions</h2>
        <p className={statusClass(data.collisions.availability)}>{data.collisions.availability}</p>
        <p>{data.collisions.total === null ? `Total no consultado · muestra ${data.collisions.sampled}/${data.collisions.sampleLimit}` : `${data.collisions.total} pruebas registradas`}</p>
        <p>{data.collisions.observedInSample.length} colisiones observadas en la muestra actual.</p>
      </article>

      <article className="discoveryPanel">
        <h2>Publication mesh</h2>
        <p className={statusClass(mesh.publicationMesh.state)}>{mesh.publicationMesh.state}</p>
        <p>{mesh.publicationMesh.editorialKinds.length} editorial kinds governed beneath one PUBLICATION object type.</p>
        <p className="discoveryBoundary">Canonical namespace {mesh.publicationMesh.canonicalNamespace} is active through {mesh.publicationMesh.namespaceContract}. REPORT/PAPER remain under /research.</p>
      </article>
    </section>

    <footer className="discoveryFooter">
      <span>{data.contract} · {institutional.contract}</span>
      <span>DB reads: {data.readPlan.dbQueries + institutional.readPlan.dbQueries} · exact counts: 0 · polling: 0 · N+1: 0</span>
      <span>Observed: {data.observedAt}</span>
    </footer>
  </main>;
}
