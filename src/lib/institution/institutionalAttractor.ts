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
  status: 'OBSERVED_SUPPORT' | 'MISSING_EVIDENCE';
  evidenceRefs: string[];
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

export async function readInstitutionalAttractor() {
  const db = createServiceSupabaseClient();
  const [attractor, latest, phenomena] = await Promise.all([
    db.from('sfi_attractors').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle(),
    db.from('sfi_attractor_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),
  ]);
  return {
    attractor: attractor.data ?? null,
    latestTrajectory: latest.data ?? null,
    phenomenonTrajectory: phenomena.data ?? [],
    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message].filter((value): value is string => Boolean(value)),
  };
}

export async function refreshInstitutionalAttractorTrajectory() {
  const db = createServiceSupabaseClient();
  const rootEvidence = await recentRootEvidence();
  const evidence = rootEvidence.rows;

  const [closedCases, acceptedProposals, wonOpportunities, completedContinuity] = await Promise.all([
    countRows('sfi_reference_cases', [{ column: 'status', values: ['CLOSED'] }]),
    countRows('commercial_proposals', [{ column: 'status', values: ['accepted', 'converted'] }]),
    countRows('commercial_opportunities', [{ column: 'stage', values: ['won'] }]),
    countRows('sfi_continuity_runs', [{ column: 'status', values: ['COMPLETED'] }]),
  ]);

  const domains = explicitDomains(evidence);
  const explicit = Object.fromEntries(SFI_ATTRACTOR_DIMENSIONS.map((dimension) => [dimension, explicitEvidenceForDimension(evidence, dimension)])) as Record<SfiAttractorDimension, Row[]>;

  const states: DimensionState[] = [
    {
      dimension: 'research_persistence',
      observedCount: closedCases.count + explicit.research_persistence.length,
      status: closedCases.count + explicit.research_persistence.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.research_persistence.map((item) => text(item.id))),
      explanation: 'Se sostiene únicamente con casos cerrados del Reference Bank o evidencia explícita de producción/validación de investigación.',
    },
    {
      dimension: 'instrument_adoption',
      observedCount: explicit.instrument_adoption.length,
      status: explicit.instrument_adoption.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.instrument_adoption.map((item) => text(item.id))),
      explanation: 'Uso interno de Studio o Field no se cuenta como adopción externa. Requiere evidencia explícita de uso por terceros.',
    },
    {
      dimension: 'commercial_persistence',
      observedCount: acceptedProposals.count + wonOpportunities.count + explicit.commercial_persistence.length,
      status: acceptedProposals.count + wonOpportunities.count + explicit.commercial_persistence.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.commercial_persistence.map((item) => text(item.id))),
      explanation: 'Sólo propuestas aceptadas/convertidas, oportunidades ganadas o evidencia transaccional explícita cuentan como soporte comercial.',
    },
    {
      dimension: 'external_recognition',
      observedCount: explicit.external_recognition.length,
      status: explicit.external_recognition.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.external_recognition.map((item) => text(item.id))),
      explanation: 'El reconocimiento no se infiere desde publicaciones propias. Requiere citas, referencias o reconocimiento de terceros.',
    },
    {
      dimension: 'domain_breadth',
      observedCount: domains.length,
      status: domains.length >= 2 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.domain_breadth.map((item) => text(item.id))),
      explanation: `Dominios explícitamente documentados: ${domains.length ? domains.join(', ') : 'ninguno'}. La amplitud no se infiere por lenguaje institucional.`,
    },
    {
      dimension: 'minimal_perturbation_governance',
      observedCount: explicit.minimal_perturbation_governance.length,
      status: explicit.minimal_perturbation_governance.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.minimal_perturbation_governance.map((item) => text(item.id))),
      explanation: 'Requiere retorno observado de una perturbación mínima o evidencia explícita de aplicación de gobernanza.',
    },
    {
      dimension: 'institutional_continuity',
      observedCount: completedContinuity.count + explicit.institutional_continuity.length,
      status: completedContinuity.count + explicit.institutional_continuity.length > 0 ? 'OBSERVED_SUPPORT' : 'MISSING_EVIDENCE',
      evidenceRefs: unique(explicit.institutional_continuity.map((item) => text(item.id))),
      explanation: 'Se sostiene con ciclos de continuidad completados o evidencia de continuidad institucional explícita.',
    },
  ];

  const supported = states.filter((item) => item.status === 'OBSERVED_SUPPORT').map((item) => item.dimension);
  const missing = states.filter((item) => item.status === 'MISSING_EVIDENCE').map((item) => item.dimension);
  const evidenceRefs = unique(states.flatMap((item) => item.evidenceRefs));
  const coverage = Number((supported.length / SFI_ATTRACTOR_DIMENSIONS.length).toFixed(4));
  const observedAt = new Date().toISOString();

  const snapshot = await db.from('sfi_attractor_trajectory_snapshots').insert({
    attractor_key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    observed_at: observedAt,
    evidence_coverage: coverage,
    supported_dimensions: supported,
    missing_dimensions: missing,
    contradicted_dimensions: [],
    dimension_state: Object.fromEntries(states.map((item) => [item.dimension, item])),
    evidence_refs: evidenceRefs,
    source_state: 'derived_from_persisted_evidence',
  }).select('*').single();

  if (!snapshot.error) {
    await db.from('sfi_attractors').update({
      evidence_count: evidenceRefs.length,
      last_seen: observedAt,
      updated_at: observedAt,
      vector: {
        ...(record((await db.from('sfi_attractors').select('vector').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle()).data?.vector)),
        latestEvidenceCoverage: coverage,
        supportedDimensions: supported,
        missingDimensions: missing,
        latestTrajectoryAt: observedAt,
      },
    }).eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY);
  }

  return {
    ok: !snapshot.error,
    attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    observedAt,
    evidenceCoverage: coverage,
    dimensions: states,
    supportedDimensions: supported,
    missingDimensions: missing,
    snapshot: snapshot.data ?? null,
    warnings: [rootEvidence.error, closedCases.error, acceptedProposals.error, wonOpportunities.error, completedContinuity.error, snapshot.error?.message].filter((value): value is string => Boolean(value)),
  };
}
