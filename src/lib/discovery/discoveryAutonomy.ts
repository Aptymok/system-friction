import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE } from '@/lib/institution/institutionalEvolution';
import { createActionProposal, latestActionProposals, recordValue, stringValue } from '@/lib/operational/common';
import { readDiscoveryRun, runAutomaticDiscoveryObservationCycle } from './discoveryRepository';

type Row = Record<string, unknown>;
type MetricSnapshot = { availability: string; value: number | null; missing: string[] };
type DevelopmentRecommendation = {
  key: string;
  metric: string;
  title: string;
  objective: string;
  suggestedChange: string;
  observed: MetricSnapshot;
  riskLevel: 'low' | 'medium';
};

export const SFI_DISCOVERY_AUTONOMY_CONTRACT = 'SFI-DISCOVERY-AUTONOMY-1.1' as const;
const SYSTEM_ACTOR = 'SYSTEM_FRICTION_INSTITUTE';
const OPEN_STATUSES = new Set(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'conflicted', 'frozen']);

function record(value: unknown): Row { return recordValue(value); }
function text(value: unknown, fallback = '') { return stringValue(value) ?? fallback; }
function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function metric(value: unknown): MetricSnapshot {
  const row = record(value);
  return {
    availability: text(row.availability, 'NOT_OBSERVED'),
    value: numberOrNull(row.value),
    missing: Array.isArray(row.missing) ? row.missing.map((entry) => text(entry)).filter(Boolean) : [],
  };
}
function metricMap(metrics: unknown) {
  const root = record(metrics);
  const acr = record(root.ACR);
  const ecr = record(root.ECR);
  return {
    UDR: metric(root.UDR), EIC: metric(root.EIC), IRD: metric(root.IRD),
    'ACR-R': metric(acr.R), 'ACR-A': metric(acr.A), 'ACR-C': metric(acr.C),
    'ECR-NAME': metric(ecr.NAME), 'ECR-DOMAIN': metric(ecr.DOMAIN),
    'ECR-METHOD': metric(ecr.METHOD), 'ECR-ENTITY': metric(ecr.ENTITY),
    MPD: metric(root.MPD), ERR: metric(root.ERR),
  };
}

function recommendations(metrics: ReturnType<typeof metricMap>): DevelopmentRecommendation[] {
  const out: DevelopmentRecommendation[] = [];
  const pushCoverage = (key: string, metricName: keyof typeof metrics, title: string, objective: string, suggestedChange: string) => {
    const observed = metrics[metricName];
    if (observed.availability === 'AVAILABLE') return;
    out.push({ key, metric: metricName, title, objective, suggestedChange, observed, riskLevel: 'low' });
  };
  pushCoverage('DISCOVERY_UNBRANDED_RETRIEVAL_COVERAGE', 'UDR', 'Discovery Mesh · ampliar observación de recuperación no marcada', 'Obtener observaciones elegibles de consultas no marcadas sin convertir ausencia de muestra en cero.', 'Ampliar el conjunto rotatorio de consultas no marcadas dentro del owner existente y conservar proveedor, query, fuente y timestamp.');
  pushCoverage('DISCOVERY_AI_RETRIEVAL_COVERAGE', 'ACR-R', 'Discovery Mesh · observar recuperación por sistemas de IA', 'Obtener una muestra elegible de recuperación por IA separando retrieval, attribution y canonical citation.', 'Añadir observaciones autorizadas de clase AI al mismo contrato de retrieval; no inferir ACR desde búsquedas web ordinarias.');
  pushCoverage('DISCOVERY_ENTITY_RECONSTRUCTION_COVERAGE', 'ERR', 'Discovery Mesh · probar reconstrucción de identidad institucional', 'Medir si nombre, dominio y entityId pueden reconstruirse correctamente desde superficies públicas.', 'Ejecutar pruebas de reconstrucción contra proyecciones públicas existentes y persistir campos observados, no respuestas esperadas.');
  pushCoverage('DISCOVERY_REFERENCE_DENSITY_COVERAGE', 'IRD', 'Discovery Mesh · observar referencias independientes', 'Distinguir exposición propia de referencias independientes observables.', 'Capturar references[] en observaciones elegibles y marcar independencia por fuente; no convertir menciones propias en IRD.');
  pushCoverage('DISCOVERY_PROPAGATION_COVERAGE', 'MPD', 'Discovery Mesh · observar profundidad de propagación', 'Medir plataformas de propagación observadas sin convertir publicación propia en propagación externa.', 'Persistir propagationPlatforms sólo cuando exista evidencia observable fuera de la superficie original.');

  const bounded: Array<[keyof typeof metrics, number, string, string, string]> = [
    ['UDR', 0.5, 'DISCOVERY_UDR_BELOW_BOUND', 'Discovery Mesh · mejorar encontrabilidad no marcada', 'Aumentar encontrabilidad por problemas/métodos sin requerir búsqueda por nombre SFI.'],
    ['EIC', 0.9, 'DISCOVERY_EIC_BELOW_BOUND', 'Discovery Mesh · reparar coherencia de identidad externa', 'Reducir reconstrucciones inconsistentes de nombre, dominio o entidad.'],
    ['ACR-C', 0.7, 'DISCOVERY_CANONICAL_CITATION_BELOW_BOUND', 'Discovery Mesh · reforzar citabilidad canónica para IA', 'Aumentar la probabilidad de que recuperación por IA cite la URL canónica correcta.'],
    ['ERR', 0.9, 'DISCOVERY_ERR_BELOW_BOUND', 'Discovery Mesh · reforzar reconstrucción institucional', 'Mejorar reconstrucción consistente de nombre, dominio y entityId.'],
  ];
  for (const [metricName, threshold, key, title, objective] of bounded) {
    const observed = metrics[metricName];
    if (observed.availability !== 'AVAILABLE' || observed.value === null || observed.value >= threshold) continue;
    out.push({ key, metric: metricName, title, objective, observed, riskLevel: 'medium', suggestedChange: `Probar una modificación reversible de proyección/metadata/distribución y volver a medir ${metricName}; no cambiar canon por la métrica sola.` });
  }
  return out.slice(0, 3);
}

function discoveryPayload(rowValue: unknown) {
  const row = record(rowValue);
  const expected = record(row.expected_field_delta);
  return record(expected.payload);
}

async function openDiscoveryCandidates() {
  const result = await latestActionProposals([SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE], 150);
  return (result.data as unknown[]).filter((rowValue) => {
    const row = record(rowValue);
    const payload = discoveryPayload(row);
    return payload.sourceOwner === 'DiscoveryMesh' && OPEN_STATUSES.has(text(row.status));
  });
}

function hasOpenKey(open: unknown[], key: string) {
  return open.some((row) => text(discoveryPayload(row).discoveryCandidateKey) === key);
}

async function persistDevelopmentCandidate(input: {
  recommendation: DevelopmentRecommendation;
  runId: string;
  query: string;
  metrics: ReturnType<typeof metricMap>;
  open: unknown[];
}) {
  if (hasOpenKey(input.open, input.recommendation.key)) return { state: 'DEDUPLICATED' as const, recommendationKey: input.recommendation.key, proposal: null };
  const result = await createActionProposal({
    proposalType: SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE,
    actorId: SYSTEM_ACTOR,
    title: input.recommendation.title,
    objective: input.recommendation.objective,
    seed: input.recommendation.key,
    status: 'waiting_evidence',
    approvalRequired: false,
    payload: {
      contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
      sourceOwner: 'DiscoveryMesh',
      candidateClass: 'DISCOVERY_DEVELOPMENT',
      discoveryCandidateKey: input.recommendation.key,
      sourceRunId: input.runId,
      sourceQuery: input.query,
      metric: input.recommendation.metric,
      observed: input.recommendation.observed,
      metricSnapshot: input.metrics,
      suggestedChange: input.recommendation.suggestedChange,
      riskLevel: input.recommendation.riskLevel,
      evidenceRefs: [`discovery-run:${input.runId}`],
      developmentStage: 'BLOCKED_MISSING_EXECUTOR',
      requiredExecutor: 'material_implementation_or_module_builder',
      missingExecutorDisposition: 'BLOCKED_NOT_AUTHORITY_REQUEST',
      adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN',
      returnRequiredBeforeAdoption: true,
      automaticExecution: false,
      automaticPublication: false,
      canonicalMutation: false,
      externalEffectAllowed: false,
      boundary: 'Observed Discovery gap may formulate a candidate. Material implementation remains blocked until a real executor exists; executor absence is not a ROOT permission request.',
    },
  });
  return result.ok
    ? { state: 'BLOCKED_MISSING_EXECUTOR' as const, recommendationKey: input.recommendation.key, proposal: result.data }
    : { state: 'PERSIST_FAILED' as const, recommendationKey: input.recommendation.key, proposal: null, error: result.error };
}

async function persistEditorialCandidate(input: { runId: string; query: string; metrics: ReturnType<typeof metricMap>; open: unknown[] }) {
  const key = 'DISCOVERY_MESH_OBSERVATION_NOTE';
  if (hasOpenKey(input.open, key)) return { state: 'DEDUPLICATED' as const, recommendationKey: key, proposal: null };
  const result = await createActionProposal({
    proposalType: SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE,
    actorId: SYSTEM_ACTOR,
    title: 'Nota de Laboratorio · Discovery Mesh',
    objective: 'Convertir una ejecución persistida de auto-observación en un candidato editorial que preserve MISSING/NOT_OBSERVED y separe publicación de RETURN.',
    seed: key,
    status: 'proposed',
    approvalRequired: true,
    payload: {
      contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
      sourceOwner: 'DiscoveryMesh',
      candidateClass: 'DISCOVERY_EDITORIAL',
      discoveryCandidateKey: key,
      sourceRunId: input.runId,
      sourceQuery: input.query,
      metricSnapshot: input.metrics,
      editorialFamily: 'LAB',
      proposedSlug: 'discovery-mesh-publicar-no-es-ser-encontrado',
      evidenceRefs: [`discovery-run:${input.runId}`],
      automaticExecution: false,
      automaticPublication: false,
      canonicalMutation: false,
      externalEffectAllowed: false,
      adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN',
      returnRequiredBeforeAdoption: true,
      boundary: 'Editorial candidate is not publication. External publication remains a separately governed action and never follows automatically from Discovery metrics.',
    },
  });
  return result.ok
    ? { state: 'PROPOSED' as const, recommendationKey: key, proposal: result.data }
    : { state: 'PERSIST_FAILED' as const, recommendationKey: key, proposal: null, error: result.error };
}

export async function runDiscoveryAutonomyCycle(now = new Date()) {
  const observation = await runAutomaticDiscoveryObservationCycle(now);
  if (!observation.ok || !observation.runId) {
    return { ok: false as const, contract: SFI_DISCOVERY_AUTONOMY_CONTRACT, observation, developmentCandidates: [], editorialCandidate: null, boundary: 'Discovery observation failed or produced no persisted run. No candidate, discovery, recognition, PULL or RETURN is inferred.' };
  }

  const persisted = await readDiscoveryRun(observation.runId);
  const run = record(persisted.run);
  const metrics = metricMap(run.metrics);
  const open = await openDiscoveryCandidates();
  const selected = recommendations(metrics);
  const developmentCandidates = [];
  for (const recommendation of selected) developmentCandidates.push(await persistDevelopmentCandidate({ recommendation, runId: observation.runId, query: observation.query, metrics, open }));
  const editorialCandidate = await persistEditorialCandidate({ runId: observation.runId, query: observation.query, metrics, open });

  await appendEpistemicEvent({
    eventName: 'discovery.autonomy.candidates.generated',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
      sourceRunId: observation.runId,
      query: observation.query,
      metrics,
      developmentCandidateCount: developmentCandidates.filter((item) => item.state === 'BLOCKED_MISSING_EXECUTOR').length,
      editorialCandidateState: editorialCandidate.state,
      automaticExecution: false,
      automaticPublication: false,
      canonicalMutation: false,
    },
    source: { sourceId: 'DISCOVERY_MESH', sourceType: 'institutional_self_observation' },
    logbookId: 'DISCOVERY_MESH',
    lineage: [`discovery-run:${observation.runId}`],
  });

  return {
    ok: true as const,
    contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
    observation,
    metrics,
    developmentCandidates,
    editorialCandidate,
    boundary: 'Discovery Mesh may observe and formulate candidates through the canonical proposal lifecycle. It does not self-implement material code, self-publish, mutate canon, infer Recognition/PULL/RETURN, or expand its own authority.',
  };
}
