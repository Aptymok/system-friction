import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_INSTITUTIONAL_ATTRACTOR_KEY = 'SFI-INSTITUTIONAL-ATTRACTOR-001' as const;

export const SFI_ATTRACTOR_DIMENSIONS = [
  'research_persistence',
  'instrument_adoption',
  'commercial_persistence',
  'external_recognition',
  'domain_breadth',
  'minimal_perturbation_governance',
  'institutional_continuity',
] as const;

export type SfiAttractorDimension = typeof SFI_ATTRACTOR_DIMENSIONS[number];
type Row = Record<string, unknown>;

type DimensionState = {
  dimension: SfiAttractorDimension;
  observedCount: number;
  contradictionCount: number;
  status: 'OBSERVED_SUPPORT' | 'CONFLICTED' | 'CONTRADICTED' | 'MISSING_EVIDENCE';
  attainment: 'UNRESOLVED_NO_CANONICAL_THRESHOLD';
  evidenceRefs: string[];
  contradictionRefs: string[];
  explanation: string;
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function countRows(table: string, filters: Array<{ column: string; values: string[] }> = []) {
  const db = createServiceSupabaseClient();
  let query = db.from(table).select('*', { count: 'exact', head: true });
  for (const filter of filters) query = query.in(filter.column, filter.values);
  const result = await query;
  return { available: !result.error, count: result.error ? 0 : result.count ?? 0, error: result.error?.message ?? null };
}

async function recentRootEvidence() {
  const db = createServiceSupabaseClient();
  const result = await db.from('root_evidence_entries')
    .select('id,evidence_type,title,payload,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  return { rows: rows(result.data), error: result.error?.message ?? null };
}

function explicitEvidenceForDimension(evidence: Row[], dimension: SfiAttractorDimension) {
  const acceptedTypes: Record<SfiAttractorDimension, string[]> = {
    research_persistence: ['research_output', 'publication_evidence', 'peer_review', 'research_validation'],
    instrument_adoption: ['instrument_adoption', 'instrument_use_external', 'tool_adoption'],
    commercial_persistence: ['commercial_outcome', 'sale_evidence', 'paid_engagement'],
    external_recognition: ['external_recognition', 'third_party_reference', 'citation', 'institutional_recognition'],
    domain_breadth: ['domain_evidence'],
    minimal_perturbation_governance: ['minimal_perturbation_outcome', 'governance_evidence', 'intervention_return'],
    institutional_continuity: ['continuity_evidence'],
  };
  return evidence.filter((item) => acceptedTypes[dimension].includes(String(item.evidence_type ?? '').toLowerCase()));
}

function explicitDomains(evidence: Row[]) {
  const domains = new Set<string>();
  for (const item of evidence) {
    const payload = record(item.payload);
    const metadata = record(payload.metadata);
    const raw = metadata.domain ?? metadata.domains;
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const value of values) {
      const normalized = String(value).trim().toLowerCase();
      if (['digital', 'biological', 'ontological'].includes(normalized)) domains.add(normalized);
    }
  }
  return [...domains];
}

function dimensionState(input: {
  dimension: SfiAttractorDimension;
  supportCount: number;
  supportRefs: string[];
  contradictionRefs: string[];
  explanation: string;
}): DimensionState {
  const contradictionCount = input.contradictionRefs.length;
  const status: DimensionState['status'] = input.supportCount > 0 && contradictionCount > 0
    ? 'CONFLICTED'
    : contradictionCount > 0
      ? 'CONTRADICTED'
      : input.supportCount > 0
        ? 'OBSERVED_SUPPORT'
        : 'MISSING_EVIDENCE';
  return {
    dimension: input.dimension,
    observedCount: input.supportCount,
    contradictionCount,
    status,
    attainment: 'UNRESOLVED_NO_CANONICAL_THRESHOLD',
    evidenceRefs: unique(input.supportRefs),
    contradictionRefs: unique(input.contradictionRefs),
    explanation: `${input.explanation} El soporte observado no equivale a declarar alcanzada la dimensión; SFI no tiene un umbral canónico de cumplimiento para este atractor.`,
  };
}

export async function readInstitutionalAttractor() {
  const db = createServiceSupabaseClient();
  const [attractor, latest, phenomena, experiment] = await Promise.all([
    db.from('sfi_attractors').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle(),
    db.from('sfi_attractor_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),
    db.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),
  ]);
  return {
    attractor: attractor.data ?? null,
    latestTrajectory: latest.data ?? null,
    phenomenonTrajectory: phenomena.data ?? [],
    experiment: experiment.data ?? null,
    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message, experiment.error?.message].filter((value): value is string => Boolean(value)),
  };
}

export async function refreshInstitutionalAttractorTrajectory() {
  const db = createServiceSupabaseClient();
  const [rootEvidence, explicitLinks] = await Promise.all([
    recentRootEvidence(),
    db.from('sfi_attractor_evidence_links')
      .select('evidence_source,evidence_id,dimension,relation_type,strength,epistemic_class,observed_at')
      .eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY)
      .order('created_at', { ascending: true }),
  ]);
  const evidence = rootEvidence.rows;
  const links = rows(explicitLinks.data);

  const [closedCases, acceptedProposals, wonOpportunities, completedContinuity] = await Promise.all([
    countRows('sfi_reference_cases', [{ column: 'status', values: ['CLOSED'] }]),
    countRows('commercial_proposals', [{ column: 'status', values: ['accepted', 'converted'] }]),
    countRows('commercial_opportunities', [{ column: 'stage', values: ['won'] }]),
    countRows('sfi_continuity_runs', [{ column: 'status', values: ['COMPLETED'] }]),
  ]);

  const domains = explicitDomains(evidence);
  const explicit = Object.fromEntries(SFI_ATTRACTOR_DIMENSIONS.map((dimension) => [dimension, explicitEvidenceForDimension(evidence, dimension)])) as Record<SfiAttractorDimension, Row[]>;
  const supportLinks = (dimension: SfiAttractorDimension) => links.filter((item) => item.dimension === dimension && item.relation_type === 'supports');
  const contradictionLinks = (dimension: SfiAttractorDimension) => links.filter((item) => item.dimension === dimension && item.relation_type === 'contradicts');
  const linkRefs = (items: Row[]) => unique(items.map((item) => text(item.evidence_id)));
  const explicitRefs = (dimension: SfiAttractorDimension) => unique(explicit[dimension].map((item) => text(item.id)));

  const states: DimensionState[] = [
    dimensionState({
      dimension: 'research_persistence',
      supportCount: closedCases.count + explicit.research_persistence.length + supportLinks('research_persistence').length,
      supportRefs: [...explicitRefs('research_persistence'), ...linkRefs(supportLinks('research_persistence'))],
      contradictionRefs: linkRefs(contradictionLinks('research_persistence')),
      explanation: `Hay ${closedCases.count} casos cerrados y ${explicit.research_persistence.length + supportLinks('research_persistence').length} registros explícitos vinculados a investigación. Esto demuestra actividad/soporte; la persistencia requiere trayectoria longitudinal, no una ocurrencia aislada.`,
    }),
    dimensionState({
      dimension: 'instrument_adoption',
      supportCount: explicit.instrument_adoption.length + supportLinks('instrument_adoption').length,
      supportRefs: [...explicitRefs('instrument_adoption'), ...linkRefs(supportLinks('instrument_adoption'))],
      contradictionRefs: linkRefs(contradictionLinks('instrument_adoption')),
      explanation: 'Uso interno de Studio o FIELD no cuenta como adopción externa. Sólo se considera soporte la evidencia explícita de uso por terceros.',
    }),
    dimensionState({
      dimension: 'commercial_persistence',
      supportCount: acceptedProposals.count + wonOpportunities.count + explicit.commercial_persistence.length + supportLinks('commercial_persistence').length,
      supportRefs: [...explicitRefs('commercial_persistence'), ...linkRefs(supportLinks('commercial_persistence'))],
      contradictionRefs: linkRefs(contradictionLinks('commercial_persistence')),
      explanation: `Se observan ${acceptedProposals.count} propuestas aceptadas/convertidas y ${wonOpportunities.count} oportunidades ganadas, además de evidencia transaccional explícita. Una transacción demuestra actividad comercial; persistencia exige repetición longitudinal.`,
    }),
    dimensionState({
      dimension: 'external_recognition',
      supportCount: explicit.external_recognition.length + supportLinks('external_recognition').length,
      supportRefs: [...explicitRefs('external_recognition'), ...linkRefs(supportLinks('external_recognition'))],
      contradictionRefs: linkRefs(contradictionLinks('external_recognition')),
      explanation: 'El reconocimiento no se infiere desde publicaciones propias. Requiere citas, referencias o reconocimiento de terceros con procedencia.',
    }),
    dimensionState({
      dimension: 'domain_breadth',
      supportCount: domains.length + supportLinks('domain_breadth').length,
      supportRefs: [...explicitRefs('domain_breadth'), ...linkRefs(supportLinks('domain_breadth'))],
      contradictionRefs: linkRefs(contradictionLinks('domain_breadth')),
      explanation: `Dominios explícitamente documentados: ${domains.length ? domains.join(', ') : 'ninguno'}. La dirección declara digital, biológico y ontológico; observar uno o dos dominios sólo aporta soporte parcial, no cumplimiento.`,
    }),
    dimensionState({
      dimension: 'minimal_perturbation_governance',
      supportCount: explicit.minimal_perturbation_governance.length + supportLinks('minimal_perturbation_governance').length,
      supportRefs: [...explicitRefs('minimal_perturbation_governance'), ...linkRefs(supportLinks('minimal_perturbation_governance'))],
      contradictionRefs: linkRefs(contradictionLinks('minimal_perturbation_governance')),
      explanation: 'Requiere retorno observado de una perturbación mínima o evidencia explícita de aplicación de gobernanza; una propuesta no ejecutada no cuenta.',
    }),
    dimensionState({
      dimension: 'institutional_continuity',
      supportCount: completedContinuity.count + explicit.institutional_continuity.length + supportLinks('institutional_continuity').length,
      supportRefs: [...explicitRefs('institutional_continuity'), ...linkRefs(supportLinks('institutional_continuity'))],
      contradictionRefs: linkRefs(contradictionLinks('institutional_continuity')),
      explanation: `Se observan ${completedContinuity.count} ciclos de continuidad completados más evidencia explícita. El experimento de autonomía deberá aportar trayectoria suficiente antes de elevar una afirmación de continuidad persistente.`,
    }),
  ];

  const supported = states.filter((item) => item.status === 'OBSERVED_SUPPORT').map((item) => item.dimension);
  const contradicted = states.filter((item) => item.status === 'CONTRADICTED' || item.status === 'CONFLICTED').map((item) => item.dimension);
  const missing = states.filter((item) => item.status === 'MISSING_EVIDENCE').map((item) => item.dimension);
  const evidenceRefs = unique(states.flatMap((item) => [...item.evidenceRefs, ...item.contradictionRefs]));
  const evidencedDimensions = states.filter((item) => item.status !== 'MISSING_EVIDENCE').length;
  const coverage = Number((evidencedDimensions / SFI_ATTRACTOR_DIMENSIONS.length).toFixed(4));
  const observedAt = new Date().toISOString();

  const snapshot = await db.from('sfi_attractor_trajectory_snapshots').insert({
    attractor_key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    observed_at: observedAt,
    evidence_coverage: coverage,
    supported_dimensions: supported,
    missing_dimensions: missing,
    contradicted_dimensions: contradicted,
    dimension_state: Object.fromEntries(states.map((item) => [item.dimension, item])),
    evidence_refs: evidenceRefs,
    source_state: 'DERIVED_FROM_PERSISTED_EVIDENCE',
  }).select('*').single();

  if (!snapshot.error) {
    const current = await db.from('sfi_attractors').select('vector').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle();
    await db.from('sfi_attractors').update({
      evidence_count: evidenceRefs.length,
      last_seen: observedAt,
      updated_at: observedAt,
      vector: {
        ...record(current.data?.vector),
        latestEvidenceCoverage: coverage,
        evidenceCoverageMeaning: 'Share of attractor dimensions for which persisted evidence or contradiction exists. It is not attainment or alignment percentage.',
        supportedDimensions: supported,
        contradictedDimensions: contradicted,
        missingDimensions: missing,
        latestTrajectoryAt: observedAt,
      },
    }).eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY);
  }

  return {
    ok: !snapshot.error && !rootEvidence.error && !explicitLinks.error,
    attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    observedAt,
    evidenceCoverage: coverage,
    dimensions: states,
    supportedDimensions: supported,
    contradictedDimensions: contradicted,
    missingDimensions: missing,
    snapshot: snapshot.data ?? null,
    warnings: [rootEvidence.error, explicitLinks.error?.message, closedCases.error, acceptedProposals.error, wonOpportunities.error, completedContinuity.error, snapshot.error?.message].filter((value): value is string => Boolean(value)),
  };
}