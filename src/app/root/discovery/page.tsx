import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readDiscoveryControlPlane } from '@/lib/discovery/discoveryControlPlane';
import { readInstitutionalDiscoveryMesh } from '@/lib/discovery/institutionalDiscoveryReadModel';
import './discovery.css';
import { InstitutionalSurfaceRail } from '@/components/sfi/InstitutionalSurfaceRail';

export const dynamic = 'force-dynamic';

function statusClass(value: string) {
  return value === 'AVAILABLE' || value === 'READY_OWNED_SURFACE' || value === 'OBSERVED_PUBLISHED' || value === 'OBSERVED_SAMPLE' || value === 'CANONICAL_NAMESPACE_ACTIVE'
    ? 'discoveryStatus discoveryStatusOk'
    : value === 'DEGRADED' || value === 'GOVERNED_EXTERNAL_ACTION_REQUIRED' || value === 'INSUFFICIENT_EVIDENCE_FOR_MINIMUM_GATE' || value === 'waiting_evidence'
      ? 'discoveryStatus discoveryStatusWarn'
      : 'discoveryStatus';
}

function Metric({ label, value, detail }: { label: string; value: string | number | null; detail?: string }) {
  return <article className="discoveryMetric"><span>{label}</span><strong>{value === null ? 'MISSING' : value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}

function proposalPayload(proposal: Record<string, unknown>) {
  const delta = proposal.expected_field_delta && typeof proposal.expected_field_delta === 'object' && !Array.isArray(proposal.expected_field_delta)
    ? proposal.expected_field_delta as Record<string, unknown>
    : {};
  return delta.payload && typeof delta.payload === 'object' && !Array.isArray(delta.payload)
    ? delta.payload as Record<string, unknown>
    : {};
}

function proposalKey(proposal: Record<string, unknown>) {
  const payload = proposalPayload(proposal);
  return typeof payload.discoveryCandidateKey === 'string' ? payload.discoveryCandidateKey : 'UNKEYED_CANDIDATE';
}

function candidateState(proposal: Record<string, unknown>) {
  const payload = proposalPayload(proposal);
  return typeof payload.developmentStage === 'string' ? payload.developmentStage : String(proposal.status ?? 'UNKNOWN');
}

export default async function RootDiscoveryPage() {
  await requireRootObserverPage('/root/discovery');
  const [data, institutional] = await Promise.all([readDiscoveryControlPlane(), readInstitutionalDiscoveryMesh()]);
  const mesh = institutional.mesh;
  const convergence = mesh.convergence;
  const published = data.exposure.targets.filter((target) => target.state === 'OBSERVED_PUBLISHED');
  const externalActionTargets = data.exposure.targets.filter((target) => target.state === 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  const latestDiscoveryRun = data.searchHealth.latestRun;

  return <main className="discoveryRoot">
    <InstitutionalSurfaceRail surface="DISCOVERY" state={data.availability} detail={'REALITY '+mesh.reality.state}/>
    <header className="discoveryHeader">
      <div><p className="discoveryKicker">DISCOVERY MESH · WHAT HAPPENS AFTER PUBLICATION</p><h1>How far it went.</h1><p>SFI separates exposure, discovery, recognition, interaction, relation, propagation, PULL and RETURN. Publishing a piece only starts the trajectory; no later state is invented to complete the graph.</p></div>
      <div className="discoveryHeaderActions"><span className={statusClass(data.availability)}>{data.availability}</span><Link href="/root">ROOT</Link><Link href="/publications">PUBLICATIONS</Link></div>
    </header>

    <section className="discoveryMetricsGrid" aria-label="Discovery summary">
      <Metric label="Canonical objects" value={data.entityHealth.canonicalObjectCount} />
      <Metric label="Expuestos / publicados" value={published.length} />
      <Metric label="Entidades externas observadas" value={mesh.reality.nodes.length} detail={mesh.reality.state} />
      <Metric label="Trayectorias observadas" value={mesh.propagation.trajectories.length} detail={mesh.propagation.state} />
      <Metric label="Candidates de desarrollo" value={data.autonomy.openDevelopmentProposals} detail={data.autonomy.availability} />
      <Metric label="Candidates editoriales" value={data.autonomy.openEditorialProposals} />
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">SELF-OBSERVATION / DEVELOPMENT</p><h2>The Mesh can observe itself and formulate candidates; it cannot adopt them.</h2></div><span className={statusClass(data.autonomy.availability)}>{data.autonomy.availability}</span></div>
      <p>{latestDiscoveryRun ? 'A persisted Discovery execution exists in the current sample.' : 'No persisted Discovery execution exists in the current sample yet.'} Observed degradations may become candidates within the existing governed lifecycle. If a change requires a material executor SFI does not possess, it remains capability-blocked and does not become an artificial permission request to ROOT.</p>
      <div className="discoveryGrid">
        <article className="discoveryPanel"><h2>Development candidates</h2>{data.autonomy.developmentProposals.length ? <div className="discoveryTable" role="table">{data.autonomy.developmentProposals.slice(0, 8).map((proposal) => <div className="discoveryRow" role="row" key={String(proposal.id)}><div><strong>{String(proposal.title ?? 'Candidate')}</strong><small>{proposalKey(proposal)}</small></div><span className={statusClass(String(proposal.status ?? 'UNKNOWN'))}>{candidateState(proposal)}</span><div className="discoveryReason">{String(proposal.description ?? '')}</div></div>)}</div> : <p className="discoveryBoundary">No candidates yet. Absence is not interpreted as health or zero.</p>}</article>
        <article className="discoveryPanel"><h2>Derived editorial</h2>{data.autonomy.editorialProposals.length ? <div className="discoveryTable" role="table">{data.autonomy.editorialProposals.slice(0, 4).map((proposal) => <div className="discoveryRow" role="row" key={String(proposal.id)}><div><strong>{String(proposal.title ?? 'Candidate editorial')}</strong><small>{proposalKey(proposal)}</small></div><span className={statusClass(String(proposal.status ?? 'UNKNOWN'))}>{String(proposal.status ?? 'UNKNOWN')}</span><div className="discoveryReason">{String(proposal.description ?? '')}</div></div>)}</div> : <p className="discoveryBoundary">The next cycle may formulate a note from a persisted observation. Candidate ≠ publication.</p>}<p><Link href="/repository#discovery">OPEN DISCOVERY MESH IN REPOSITORY →</Link></p></article>
      </div>
      <p className="discoveryBoundary">{data.autonomy.boundary}</p>
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">CICLO DE DESCUBRIMIENTO</p><h2>Publicar no significa haber sido descubierto.</h2></div></div>
      <div className="discoveryTagCloud">{mesh.lifecycle.stages.map((stage) => <span key={stage.id}>{stage.id}</span>)}</div>
      <p className="discoveryBoundary">EXPOSURE → DISCOVERY → RECOGNITION → INTERACTION → RELATION → PROPAGATION → PULL → RETURN. If a transition was not observed, it remains unobserved.</p>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel"><h2>What left SFI</h2><p><strong>{published.length}</strong> surfaces have observed publication.</p><p>{data.entityHealth.publicableObjectCount} objects are publishable; {data.entityHealth.blockedObjectCount} remain blocked.</p><p className="discoveryBoundary">EXPOSURE describes available representation; it does not prove external discovery.</p></article>
      <article className="discoveryPanel"><h2>What was found</h2><p className={statusClass(data.aiDiscovery.availability)}>{data.aiDiscovery.availability}</p><div className="discoveryTagCloud">{data.aiDiscovery.metricContract.map((metric) => <span key={metric}>{metric}</span>)}</div><p className="discoveryBoundary">UDR, identity, independent references and AI retrieval are shown only when eligible observations exist.</p></article>
      <article className="discoveryPanel"><h2>What propagated</h2><p className={statusClass(mesh.propagation.state)}>{mesh.propagation.state}</p><p>{mesh.propagation.events.length} events · {mesh.propagation.trajectories.length} trajectories.</p><p className="discoveryBoundary">Copying, republishing or mentioning does not automatically become relation or PULL.</p></article>
      <article className="discoveryPanel"><h2>What returned</h2><p>Cases with observed RETURN: {convergence.evidence.realCasesWithObservedReturn}</p><p>Concrete requests for SFI objects: {convergence.evidence.concreteSfiObjectRequests}</p><p className="discoveryBoundary">RETURN requires an observed, traceable outcome; interest or exposure are not enough.</p></article>
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">OBSERVED EXTERNAL REALITY</p><h2>Who exists around SFI objects.</h2></div><span className={statusClass(mesh.reality.state)}>{mesh.reality.state}</span></div>
      <div className="discoveryTable" role="table">{mesh.reality.nodes.length ? mesh.reality.nodes.map((node) => <div className="discoveryRow" role="row" key={node.nodeId}><div><strong>{node.label}</strong><small>{node.nodeClass} · {node.nodeId}</small></div><span className={statusClass(node.relationState)}>{node.relationState}</span><div className="discoveryUrl">{node.geography.length ? node.geography.join(' / ') : 'GEOGRAPHY UNKNOWN'}</div><div className="discoveryReason">{node.capabilityControlled.length ? `Observed control: ${node.capabilityControlled.join(', ')}` : 'Control not observed'} · RETURN {node.returnState}</div></div>) : <p className="discoveryBoundary">No external nodes are observed in the current canonical sample. SFI does not derive them from outreach narratives.</p>}</div>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel"><h2>Manhattan attractor</h2><p className={statusClass(convergence.disposition)}>{convergence.disposition}</p><p>NYC nodes: {convergence.nycNodes.length} · ACTIVE/PULLING: {convergence.activeNycRelationships.length} · PULL edges: {convergence.pullEdges.length}</p><p className="discoveryBoundary">Manhattan is a lens over the global graph, not a conclusion or a separate ontology.</p></article>
      <article className="discoveryPanel"><h2>Minimum convergence gate</h2><dl><div><dt>Independent NYC relationships</dt><dd>{convergence.evidence.independentNycRelationships}/3</dd></div><div><dt>Requests for SFI objects</dt><dd>{convergence.evidence.concreteSfiObjectRequests}/1</dd></div><div><dt>Third-party introductions</dt><dd>{convergence.evidence.thirdPartyIntroductions}/1</dd></div><div><dt>Case with RETURN</dt><dd>{convergence.evidence.realCasesWithObservedReturn}/1</dd></div></dl></article>
      <article className="discoveryPanel"><h2>Machine representation</h2><ul className="discoveryLinks">{Object.entries(data.feeds).map(([key, url]) => <li key={key}><a href={url}>{key}</a></li>)}<li><span>MCP</span><code>{data.mcp.endpoint}</code></li></ul><p className="discoveryBoundary">These surfaces improve discoverability. They do not grant training consent or institutional authority.</p></article>
      <article className="discoveryPanel"><h2>Identity collisions</h2><p className={statusClass(data.collisions.availability)}>{data.collisions.availability}</p><p>{data.collisions.observedInSample.length} collisions observed in the sample.</p><p className="discoveryBoundary">Name, domain, method and entity are monitored separately so textual coincidence is not confused with identity.</p></article>
    </section>

    <details className="discoveryPanel discoveryWide">
      <summary>TECHNICAL TRACE / EXPOSURE TARGETS</summary>
      <div className="discoveryTable" role="table">{data.exposure.targets.map((target) => <div className="discoveryRow" role="row" key={target.key}><div><strong>{target.key}</strong><small>{target.targetClass}</small></div><span className={statusClass(target.state)}>{target.state}</span><div className="discoveryUrl">{target.url ?? 'MISSING'}</div><div className="discoveryReason">{target.reason}</div></div>)}</div>
      <pre>{JSON.stringify({ propagations:data.propagations,collisions:data.collisions,autonomy:data.autonomy,readPlan:{controlPlane:data.readPlan,institutional:institutional.readPlan} }, null, 2)}</pre>
    </details>

    <footer className="discoveryFooter"><span>{data.contract} · {institutional.contract}</span><span>Observed: {data.observedAt}</span><span>PUBLICATION ≠ DISCOVERY ≠ PULL ≠ RETURN</span></footer>
  </main>;
}
