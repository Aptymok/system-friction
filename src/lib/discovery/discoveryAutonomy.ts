import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
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

export const SFI_DISCOVERY_AUTONOMY_CONTRACT = 'SFI-DISCOVERY-AUTONOMY-1.0' as const;
export const SFI_DISCOVERY_DEVELOPMENT_PROPOSAL_CONTRACT = 'SFI-DISCOVERY-DEVELOPMENT-PROPOSAL-1.0' as const;
export const SFI_DISCOVERY_EDITORIAL_PROPOSAL_CONTRACT = 'SFI-DISCOVERY-EDITORIAL-PROPOSAL-1.0' as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

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
    UDR: metric(root.UDR),
    EIC: metric(root.EIC),
    IRD: metric(root.IRD),
    'ACR-R': metric(acr.R),
    'ACR-A': metric(acr.A),
    'ACR-C': metric(acr.C),
    'ECR-NAME': metric(ecr.NAME),
    'ECR-DOMAIN': metric(ecr.DOMAIN),
    'ECR-METHOD': metric(ecr.METHOD),
    'ECR-ENTITY': metric(ecr.ENTITY),
    MPD: metric(root.MPD),
    ERR: metric(root.ERR),
  };
}

function recommendations(metrics: ReturnType<typeof metricMap>): DevelopmentRecommendation[] {
  const out: DevelopmentRecommendation[] = [];
  const pushCoverage = (key: string, metricName: keyof typeof metrics, title: string, objective: string, suggestedChange: string) => {
    const observed = metrics[metricName];
    if (observed.availability === 'AVAILABLE') return;
    out.push({ key, metric: metricName, title, objective, suggestedChange, observed, riskLevel: 'low' });
  };

  pushCoverage(
    'DISCOVERY_UNBRANDED_RETRIEVAL_COVERAGE',
    'UDR',
    'Discovery Mesh · ampliar observación de recuperación no marcada',
    'Obtener observaciones elegibles de consultas no marcadas sin convertir ausencia de muestra en cero.',
    'Ampliar el conjunto rotatorio de consultas no marcadas y conservar proveedor, query, fuente y timestamp en el owner existente.',
  );
  pushCoverage(
    'DISCOVERY_AI_RETRIEVAL_COVERAGE',
    'ACR-R',
    'Discovery Mesh · observar recuperación por sistemas de IA',
    'Obtener una muestra elegible de recuperación por IA separando retrieval, attribution y canonical citation.',
    'Añadir observaciones autorizadas de clase AI al mismo contrato de retrieval; no inferir ACR desde búsquedas web ordinarias.',
  );
  pushCoverage(
    'DISCOVERY_ENTITY_RECONSTRUCTION_COVERAGE',
    'ERR',
    'Discovery Mesh · probar reconstrucción de identidad institucional',
    'Medir si nombre, dominio y entityId pueden reconstruirse correctamente desde superficies públicas.',
    'Ejecutar pruebas de reconstrucción contra las proyecciones públicas existentes y persistir campos observados, no respuestas esperadas.',
  );
  pushCoverage(
    'DISCOVERY_REFERENCE_DENSITY_COVERAGE',
    'IRD',
    'Discovery Mesh · observar referencias independientes',
    'Distinguir exposición propia de referencias independientes observables.',
    'Capturar references[] en observaciones elegibles y marcar independencia por fuente; no convertir menciones propias en IRD.',
  );
  pushCoverage(
    'DISCOVERY_PROPAGATION_COVERAGE',
    'MPD',
    'Discovery Mesh · observar profundidad de propagación',
    'Medir plataformas de propagación observadas sin convertir publicación propia en propagación externa.',
    'Persistir propagationPlatforms sólo cuando exista evidencia observable de representación fuera de la superficie original.',
  );

  const boundedThresholds: Array<[keyof typeof metrics, number, string, string, string]> = [
    ['UDR', 0.5, 'DISCOVERY_UDR_BELOW_BOUND', 'Discovery Mesh · mejorar encontrabilidad no marcada', 'Aumentar encontrabilidad por problemas/métodos sin requerir búsqueda por nombre SFI.'],
    ['EIC', 0.9, 'DISCOVERY_EIC_BELOW_BOUND', 'Discovery Mesh · reparar coherencia de identidad externa', 'Reducir reconstrucciones inconsistentes de nombre, dominio o entidad.'],
    ['ACR-C', 0.7, 'DISCOVERY_CANONICAL_CITATION_BELOW_BOUND', 'Discovery Mesh · reforzar citabilidad canónica para IA', 'Aumentar la probabilidad de que recuperación por IA cite la URL canónica correcta.'],
    ['ERR', 0.9, 'DISCOVERY_ERR_BELOW_BOUND', 'Discovery Mesh · reforzar reconstrucción institucional', 'Mejorar la reconstrucción consistente de nombre, dominio y entityId.'],
  ];

  for (const [metricName, threshold, key, title, objective] of boundedThresholds) {
    const observed = metrics[metricName];
    if (observed.availability !== 'AVAILABLE' || observed.value === null || observed.value >= threshold) continue;
    out.push({
      key,
      metric: metricName,
      title,
      objective,
      suggestedChange: `Proponer una modificación reversible de proyección/metadata/distribución y volver a medir ${metricName}; no cambiar canon por la métrica sola.`,
      observed,
      riskLevel: 'medium',
    });
  }

  return out.slice(0, 3);
}

async function openDiscoveryProposals() {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('action_proposals')
    .select('id,status,title,proposal_type,expected_field_delta,created_at')
    .in('proposal_type', ['discovery_mesh_development', 'discovery_mesh_editorial'])
    .in('status', ['draft', 'proposed'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (result.error) throw result.error;
  return rows(result.data);
}

function hasOpenKey(open: Row[], proposalType: string, key: string) {
  return open.some((proposal) => proposal.proposal_type === proposalType
    && text(record(proposal.expected_field_delta).recommendationKey) === key);
}

async function persistDevelopmentProposal(input: {
  recommendation: DevelopmentRecommendation;
  runId: string;
  query: string;
  metrics: ReturnType<typeof metricMap>;
  open: Row[];
}) {
  if (hasOpenKey(input.open, 'discovery_mesh_development', input.recommendation.key)) {
    return { state: 'DEDUPLICATED' as const, recommendationKey: input.recommendation.key, proposal: null };
  }
  const service = createServiceSupabaseClient();
  const inserted = await service.from('action_proposals').insert({
    proposal_type: 'discovery_mesh_development',
    status: 'proposed',
    title: input.recommendation.title,
    description: input.recommendation.suggestedChange,
    objective: input.recommendation.objective,
    risk_level: input.recommendation.riskLevel,
    expected_field_delta: {
      contract: SFI_DISCOVERY_DEVELOPMENT_PROPOSAL_CONTRACT,
      recommendationKey: input.recommendation.key,
      sourceRunId: input.runId,
      sourceQuery: input.query,
      metric: input.recommendation.metric,
      observed: input.recommendation.observed,
      metricSnapshot: input.metrics,
      desiredState: 'OBSERVABLE_IMPROVEMENT_ON_NEXT_ELIGIBLE_DISCOVERY_RUN',
      suggestedChange: input.recommendation.suggestedChange,
      evidenceRefs: [`discovery-run:${input.runId}`],
      automaticExecution: false,
      canonicalMutation: false,
      externalAction: false,
    },
    proportionality_check: {
      source: 'DiscoveryMesh',
      reversible: true,
      approvalRequired: true,
      founderLeadRequired: false,
      automaticExecution: false,
    },
    approval_required: true,
  }).select('*').single();
  if (inserted.error) throw inserted.error;
  return { state: 'PROPOSED' as const, recommendationKey: input.recommendation.key, proposal: inserted.data };
}

async function persistEditorialProposal(input: {
  runId: string;
  query: string;
  metrics: ReturnType<typeof metricMap>;
  open: Row[];
}) {
  const key = 'DISCOVERY_MESH_OBSERVATION_NOTE';
  if (hasOpenKey(input.open, 'discovery_mesh_editorial', key)) {
    return { state: 'DEDUPLICATED' as const, recommendationKey: key, proposal: null };
  }
  const service = createServiceSupabaseClient();
  const inserted = await service.from('action_proposals').insert({
    proposal_type: 'discovery_mesh_editorial',
    status: 'proposed',
    title: 'Nota de Laboratorio · Discovery Mesh',
    description: 'Candidato editorial derivado de una observación real del Mesh. Debe conservar MISSING/NOT_OBSERVED y no declarar Recognition, PULL o RETURN sin evidencia independiente.',
    objective: 'Convertir una ejecución de auto-observación en una nota pública legible que explique qué fue observado, qué sigue sin observarse y qué prueba distinguiría mejora real.',
    risk_level: 'low',
    expected_field_delta: {
      contract: SFI_DISCOVERY_EDITORIAL_PROPOSAL_CONTRACT,
      recommendationKey: key,
      sourceRunId: input.runId,
      sourceQuery: input.query,
      metricSnapshot: input.metrics,
      editorialFamily: 'LAB',
      proposedSlug: 'discovery-mesh-publicar-no-es-ser-encontrado',
      proposedTitle: 'Discovery Mesh: publicar no es ser encontrado',
      sections: [
        'Publicar sólo abre la trayectoria',
        'Cómo una institución observa su propia encontrabilidad',
        'UDR · EIC · IRD · ACR · ECR · MPD · ERR',
        'Lo que el Mesh no puede afirmar',
        'De observación a propuesta de desarrollo',
        'Founder-away: descubrir sin perseguir',
        'Qué RETURN cerraría la siguiente iteración',
      ],
      graphicBrief: {
        assetFamily: 'DISCOVERY_MESH',
        ratio: '1:1',
        composition: 'Ocho estados conectados en una trayectoria horizontal alrededor de un nodo SFI; las métricas aparecen como instrumentación secundaria, no como score de prestigio.',
        labels: ['EXPOSURE', 'DISCOVERY', 'RECOGNITION', 'INTERACTION', 'RELATION', 'PROPAGATION', 'PULL', 'RETURN'],
        requiredBoundary: 'PUBLICAR ≠ SER ENCONTRADO',
        forbidden: ['inventar reconocimiento externo', 'mostrar null como cero', 'presentar proyección como observación'],
      },
      evidenceRefs: [`discovery-run:${input.runId}`],
      automaticPublication: false,
      canonicalMutation: false,
      externalAction: false,
    },
    proportionality_check: {
      source: 'DiscoveryMesh',
      reversible: true,
      approvalRequired: true,
      founderLeadRequired: false,
      automaticPublication: false,
    },
    approval_required: true,
  }).select('*').single();
  if (inserted.error) throw inserted.error;
  return { state: 'PROPOSED' as const, recommendationKey: key, proposal: inserted.data };
}

export async function runDiscoveryAutonomyCycle(now = new Date()) {
  const observation = await runAutomaticDiscoveryObservationCycle(now);
  if (!observation.ok || !observation.runId) {
    return {
      ok: false as const,
      contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
      observation,
      developmentProposals: [],
      editorialProposal: null,
      boundary: 'Discovery observation failed or produced no persisted run. No development/editorial proposal was emitted.',
    };
  }

  const persisted = await readDiscoveryRun(observation.runId);
  const run = record(persisted.run);
  const metrics = metricMap(run.metrics);
  const open = await openDiscoveryProposals();
  const selected = recommendations(metrics);
  const developmentProposals = [];
  for (const recommendation of selected) {
    developmentProposals.push(await persistDevelopmentProposal({
      recommendation,
      runId: observation.runId,
      query: observation.query,
      metrics,
      open,
    }));
  }
  const editorialProposal = await persistEditorialProposal({
    runId: observation.runId,
    query: observation.query,
    metrics,
    open,
  });

  await appendEpistemicEvent({
    eventName: 'discovery.autonomy.proposals.generated',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      contract: SFI_DISCOVERY_AUTONOMY_CONTRACT,
      sourceRunId: observation.runId,
      query: observation.query,
      metrics,
      developmentProposalCount: developmentProposals.filter((item) => item.state === 'PROPOSED').length,
      editorialProposalState: editorialProposal.state,
      automaticExecution: false,
      automaticPublication: false,
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
    developmentProposals,
    editorialProposal,
    boundary: 'Discovery Mesh may observe and propose. It does not self-approve development, mutate canon, publish externally, infer Recognition/PULL/RETURN, or expand its own authority.',
  };
}
