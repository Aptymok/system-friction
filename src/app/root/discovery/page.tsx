import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readDiscoveryControlPlane } from '@/lib/discovery/discoveryControlPlane';
import { readInstitutionalDiscoveryMesh } from '@/lib/discovery/institutionalDiscoveryReadModel';
import './discovery.css';

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
    <header className="discoveryHeader">
      <div><p className="discoveryKicker">DISCOVERY MESH · QUÉ PASA DESPUÉS DE PUBLICAR</p><h1>Hasta dónde llegó.</h1><p>SFI distingue exposición, descubrimiento, reconocimiento, interacción, relación, propagación, PULL y RETURN. Publicar una pieza sólo inicia la trayectoria; ningún estado posterior se inventa para completar el gráfico.</p></div>
      <div className="discoveryHeaderActions"><span className={statusClass(data.availability)}>{data.availability}</span><Link href="/root">ROOT</Link><Link href="/publications">PUBLICATIONS</Link></div>
    </header>

    <section className="discoveryMetricsGrid" aria-label="Discovery summary">
      <Metric label="Objetos canónicos" value={data.entityHealth.canonicalObjectCount} />
      <Metric label="Expuestos / publicados" value={published.length} />
      <Metric label="Entidades externas observadas" value={mesh.reality.nodes.length} detail={mesh.reality.state} />
      <Metric label="Trayectorias observadas" value={mesh.propagation.trajectories.length} detail={mesh.propagation.state} />
      <Metric label="Candidatos de desarrollo" value={data.autonomy.openDevelopmentProposals} detail={data.autonomy.availability} />
      <Metric label="Candidatos editoriales" value={data.autonomy.openEditorialProposals} />
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">AUTO-OBSERVACIÓN / DEVELOPMENT</p><h2>El Mesh puede observarse y formular candidatos; no puede adoptarlos.</h2></div><span className={statusClass(data.autonomy.availability)}>{data.autonomy.availability}</span></div>
      <p>{latestDiscoveryRun ? 'Existe una ejecución Discovery persistida en la muestra actual.' : 'Todavía no existe una ejecución Discovery persistida en la muestra actual.'} Las degradaciones observadas pueden convertirse en candidatos dentro del lifecycle gobernado existente. Si el cambio requiere un executor material que SFI no posee, permanece bloqueado por capacidad y no se transforma en una solicitud artificial de permiso a ROOT.</p>
      <div className="discoveryGrid">
        <article className="discoveryPanel"><h2>Desarrollo candidato</h2>{data.autonomy.developmentProposals.length ? <div className="discoveryTable" role="table">{data.autonomy.developmentProposals.slice(0, 8).map((proposal) => <div className="discoveryRow" role="row" key={String(proposal.id)}><div><strong>{String(proposal.title ?? 'Candidato')}</strong><small>{proposalKey(proposal)}</small></div><span className={statusClass(String(proposal.status ?? 'UNKNOWN'))}>{candidateState(proposal)}</span><div className="discoveryReason">{String(proposal.description ?? '')}</div></div>)}</div> : <p className="discoveryBoundary">Sin candidatos todavía. La ausencia no se interpreta como salud ni como cero.</p>}</article>
        <article className="discoveryPanel"><h2>Editorial derivado</h2>{data.autonomy.editorialProposals.length ? <div className="discoveryTable" role="table">{data.autonomy.editorialProposals.slice(0, 4).map((proposal) => <div className="discoveryRow" role="row" key={String(proposal.id)}><div><strong>{String(proposal.title ?? 'Candidato editorial')}</strong><small>{proposalKey(proposal)}</small></div><span className={statusClass(String(proposal.status ?? 'UNKNOWN'))}>{String(proposal.status ?? 'UNKNOWN')}</span><div className="discoveryReason">{String(proposal.description ?? '')}</div></div>)}</div> : <p className="discoveryBoundary">El siguiente ciclo puede formular una nota desde una observación persistida. Candidato ≠ publicación.</p>}<p><Link href="/publications/discovery-mesh-publicar-no-es-ser-encontrado">ABRIR NOTA DE LABORATORIO AUTORIZADA →</Link></p></article>
      </div>
      <p className="discoveryBoundary">{data.autonomy.boundary}</p>
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">CICLO DE DESCUBRIMIENTO</p><h2>Publicar no significa haber sido descubierto.</h2></div></div>
      <div className="discoveryTagCloud">{mesh.lifecycle.stages.map((stage) => <span key={stage.id}>{stage.id}</span>)}</div>
      <p className="discoveryBoundary">EXPOSURE → DISCOVERY → RECOGNITION → INTERACTION → RELATION → PROPAGATION → PULL → RETURN. Si una transición no fue observada, permanece sin observar.</p>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel"><h2>Qué salió de SFI</h2><p><strong>{published.length}</strong> superficies tienen publicación observada.</p><p>{data.entityHealth.publicableObjectCount} objetos son publicables; {data.entityHealth.blockedObjectCount} permanecen bloqueados.</p><p className="discoveryBoundary">EXPOSURE describe representación disponible; no prueba descubrimiento externo.</p></article>
      <article className="discoveryPanel"><h2>Qué fue encontrado</h2><p className={statusClass(data.aiDiscovery.availability)}>{data.aiDiscovery.availability}</p><div className="discoveryTagCloud">{data.aiDiscovery.metricContract.map((metric) => <span key={metric}>{metric}</span>)}</div><p className="discoveryBoundary">UDR, identidad, referencias independientes y recuperación por IA sólo se muestran cuando existen observaciones elegibles.</p></article>
      <article className="discoveryPanel"><h2>Qué se propagó</h2><p className={statusClass(mesh.propagation.state)}>{mesh.propagation.state}</p><p>{mesh.propagation.events.length} eventos · {mesh.propagation.trajectories.length} trayectorias.</p><p className="discoveryBoundary">Copiar, republicar o mencionar no se convierte automáticamente en relación o PULL.</p></article>
      <article className="discoveryPanel"><h2>Qué retornó</h2><p>Casos con RETURN observado: {convergence.evidence.realCasesWithObservedReturn}</p><p>Solicitudes concretas de objetos SFI: {convergence.evidence.concreteSfiObjectRequests}</p><p className="discoveryBoundary">RETURN exige un resultado observado y trazable; interés o exposición no bastan.</p></article>
    </section>

    <section className="discoveryPanel discoveryWide">
      <div className="discoverySectionHead"><div><p className="discoveryKicker">REALIDAD EXTERNA OBSERVADA</p><h2>Quién existe alrededor de los objetos SFI.</h2></div><span className={statusClass(mesh.reality.state)}>{mesh.reality.state}</span></div>
      <div className="discoveryTable" role="table">{mesh.reality.nodes.length ? mesh.reality.nodes.map((node) => <div className="discoveryRow" role="row" key={node.nodeId}><div><strong>{node.label}</strong><small>{node.nodeClass} · {node.nodeId}</small></div><span className={statusClass(node.relationState)}>{node.relationState}</span><div className="discoveryUrl">{node.geography.length ? node.geography.join(' / ') : 'GEOGRAPHY UNKNOWN'}</div><div className="discoveryReason">{node.capabilityControlled.length ? `Control observado: ${node.capabilityControlled.join(', ')}` : 'Control no observado'} · RETURN {node.returnState}</div></div>) : <p className="discoveryBoundary">No hay nodos externos observados en la muestra canónica actual. SFI no los deriva de narrativas de outreach.</p>}</div>
    </section>

    <section className="discoveryGrid">
      <article className="discoveryPanel"><h2>Atractor Manhattan</h2><p className={statusClass(convergence.disposition)}>{convergence.disposition}</p><p>NYC nodes: {convergence.nycNodes.length} · ACTIVE/PULLING: {convergence.activeNycRelationships.length} · PULL edges: {convergence.pullEdges.length}</p><p className="discoveryBoundary">Manhattan es una lente sobre el grafo global, no una conclusión ni una ontología separada.</p></article>
      <article className="discoveryPanel"><h2>Gate mínimo de convergencia</h2><dl><div><dt>Relaciones NYC independientes</dt><dd>{convergence.evidence.independentNycRelationships}/3</dd></div><div><dt>Solicitudes de objetos SFI</dt><dd>{convergence.evidence.concreteSfiObjectRequests}/1</dd></div><div><dt>Introducciones de terceros</dt><dd>{convergence.evidence.thirdPartyIntroductions}/1</dd></div><div><dt>Case con RETURN</dt><dd>{convergence.evidence.realCasesWithObservedReturn}/1</dd></div></dl></article>
      <article className="discoveryPanel"><h2>Representación para máquinas</h2><ul className="discoveryLinks">{Object.entries(data.feeds).map(([key, url]) => <li key={key}><a href={url}>{key}</a></li>)}<li><span>MCP</span><code>{data.mcp.endpoint}</code></li></ul><p className="discoveryBoundary">Estas superficies mejoran encontrabilidad. No otorgan consentimiento de entrenamiento ni autoridad institucional.</p></article>
      <article className="discoveryPanel"><h2>Colisiones de identidad</h2><p className={statusClass(data.collisions.availability)}>{data.collisions.availability}</p><p>{data.collisions.observedInSample.length} colisiones observadas en la muestra.</p><p className="discoveryBoundary">Nombre, dominio, método y entidad se vigilan por separado para no confundir coincidencia textual con identidad.</p></article>
    </section>

    <details className="discoveryPanel discoveryWide">
      <summary>TRAZABILIDAD TÉCNICA / EXPOSURE TARGETS</summary>
      <div className="discoveryTable" role="table">{data.exposure.targets.map((target) => <div className="discoveryRow" role="row" key={target.key}><div><strong>{target.key}</strong><small>{target.targetClass}</small></div><span className={statusClass(target.state)}>{target.state}</span><div className="discoveryUrl">{target.url ?? 'MISSING'}</div><div className="discoveryReason">{target.reason}</div></div>)}</div>
      <pre>{JSON.stringify({ propagations:data.propagations,collisions:data.collisions,autonomy:data.autonomy,readPlan:{controlPlane:data.readPlan,institutional:institutional.readPlan} }, null, 2)}</pre>
    </details>

    <footer className="discoveryFooter"><span>{data.contract} · {institutional.contract}</span><span>Observed: {data.observedAt}</span><span>PUBLICATION ≠ DISCOVERY ≠ PULL ≠ RETURN</span></footer>
  </main>;
}
