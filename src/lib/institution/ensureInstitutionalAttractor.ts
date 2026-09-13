import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_INSTITUTIONAL_ATTRACTOR_KEY, SFI_ATTRACTOR_DIMENSIONS } from './institutionalAttractor';

export const SFI_INSTITUTIONAL_ATTRACTOR_DECLARATION_VERSION = 'SFI-INSTITUTIONAL-ATTRACTOR-DECLARATION-2.0' as const;

export const SFI_MANHATTAN_CONVERGENCE_TARGET = Object.freeze({
  key: 'SFI-MANHATTAN-OBSERVATORY-CONVERGENCE',
  label: 'SFI Observatory · Manhattan',
  geography: 'Manhattan, New York City, New York, USA',
  epistemicClass: 'DECLARED',
  authoritySource: 'FOUNDER',
  status: 'UNRESOLVED',
  attainment: 'UNRESOLVED_NO_CANONICAL_THRESHOLD',
  role: 'STRATEGIC_CONVERGENCE_COORDINATE',
  decisionRule: 'Evaluate founder, Dirección General, domains, workstreams, commercial activity, evidence generation, institutional development, external representation, capital, research, product and operations by whether they increase, decrease or leave unknown the probability that an SFI Observatory in Manhattan becomes the least-inadequate evidence-supported institutional option.',
  antiSymbolicRule: 'Geographic proximity, aspiration, publication, self-description or founder intent do not count as attainment. The target remains unresolved until external, operational, commercial, research, continuity and governance evidence make the Manhattan Observatory the least-inadequate option relative to alternatives.',
  authorityBoundary: 'This declaration sets direction only. It does not assert an office, lease, partnership, recognition, funding, New York presence, regulatory standing or institutional attainment, and it does not authorize spending or external action.',
} as const);

const DECLARATION = {
  desiredState: 'Que System Friction Institute construya evidencia, capacidad, reconocimiento, adopción, continuidad y actividad comercial suficientes para que establecer un Observatorio SFI en Manhattan emerja como la opción institucional menos inadecuada y sustentada por evidencia para observar y reorganizar ecosistemas digitales, biológicos y ontológicos mediante perturbación mínima y gobernanza.',
  mechanism: 'Observar antes de inferir; contrastar evidencia; detectar trayectorias y atractores; comparar cada línea institucional contra la coordenada Manhattan sin convertirla en evidencia; proponer perturbaciones mínimas reversibles; gobernar acciones de mayor autoridad; registrar retornos y aprender sin imponer una solución única.',
  normativePosition: 'SFI no presume neutralidad: declara dirección, límites, autoridad y criterios de evidencia, pero no sustituye la agencia del sistema observado ni fuerza Manhattan cuando otra configuración resulte menos inadecuada según evidencia.',
  claimBoundary: 'El reconocimiento, adopción, ventas, continuidad, capacidad institucional y conveniencia de Manhattan sólo se consideran observados cuando existe evidencia externa, operativa o transaccional persistida. La declaración del fundador constituye dirección, no logro.',
} as const;

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function declarationVector(current: Row, now: string) {
  return {
    ...current,
    epistemicClass: 'DECLARED',
    authoritySource: 'FOUNDER',
    declarationRecorded: true,
    declarationVersion: SFI_INSTITUTIONAL_ATTRACTOR_DECLARATION_VERSION,
    declaredAt: text(current.declaredAt) ?? now,
    declarationReconciledAt: now,
    desiredState: DECLARATION.desiredState,
    mechanism: DECLARATION.mechanism,
    normativePosition: DECLARATION.normativePosition,
    dimensions: [...SFI_ATTRACTOR_DIMENSIONS],
    convergenceTarget: SFI_MANHATTAN_CONVERGENCE_TARGET,
    confidenceSemantics: 'Top-level numeric fields are evidence-derived operational indicators. They never convert a DECLARED target into observed attainment and they are not an alignment percentage.',
    claimBoundary: DECLARATION.claimBoundary,
  };
}

function declarationIsCurrent(vectorValue: unknown) {
  const vector = record(vectorValue);
  const target = record(vector.convergenceTarget);
  return text(vector.declarationVersion) === SFI_INSTITUTIONAL_ATTRACTOR_DECLARATION_VERSION
    && text(target.key) === SFI_MANHATTAN_CONVERGENCE_TARGET.key
    && text(target.status) === 'UNRESOLVED'
    && text(target.epistemicClass) === 'DECLARED';
}

export async function ensureInstitutionalAttractorDeclaration() {
  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_attractors')
    .select('id,attractor_key,vector')
    .eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY)
    .maybeSingle();

  if (existing.error) return { ok: false as const, created: false, reconciled: false, error: existing.error.message };

  const now = new Date().toISOString();
  if (existing.data) {
    if (declarationIsCurrent(existing.data.vector)) {
      return { ok: true as const, created: false, reconciled: false, error: null, target: SFI_MANHATTAN_CONVERGENCE_TARGET };
    }
    const currentVector = record(existing.data.vector);
    const updated = await db.from('sfi_attractors').update({
      status: 'declared',
      vector: declarationVector(currentVector, now),
      updated_at: now,
    }).eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).select('id,attractor_key').single();
    if (updated.error) return { ok: false as const, created: false, reconciled: false, error: updated.error.message };
    return { ok: true as const, created: false, reconciled: true, error: null, target: SFI_MANHATTAN_CONVERGENCE_TARGET };
  }

  const node = await db.from('sfi_graph_nodes').upsert({
    node_key: 'SFI-INSTITUTION',
    label: 'System Friction Institute',
    module: 'institution',
    node_type: 'institution',
    layer: 0,
    description: 'Institutional subject whose DECLARED direction is evaluated against observed evidence; declaration is not evidence of attainment.',
    metrics: { epistemicClass: 'DECLARED', authority: 'FOUNDER' },
    evidence_count: 0,
    private_evidence_count: 0,
    density: 0,
    weight: 0,
    degradation: 0,
    status: 'active',
    position: {},
    visual: { symbol: 'SFI', role: 'institutional_subject' },
    updated_at: now,
  }, { onConflict: 'node_key' });
  if (node.error) return { ok: false as const, created: false, reconciled: false, error: `institution_node:${node.error.message}` };

  const inserted = await db.from('sfi_attractors').insert({
    attractor_key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    label: 'Convergencia institucional contextual persistente',
    module: 'institution',
    owner_node_key: 'SFI-INSTITUTION',
    attractor_type: 'declared_institutional',
    density: 0,
    confidence: 0,
    persistence: 0,
    trust: 0,
    degradation: 0,
    weight: 0,
    evidence_count: 0,
    status: 'declared',
    vector: declarationVector({}, now),
    first_seen: now,
    last_seen: now,
    updated_at: now,
  }).select('id,attractor_key').single();

  if (inserted.error) return { ok: false as const, created: false, reconciled: false, error: inserted.error.message };
  return { ok: true as const, created: true, reconciled: false, error: null, target: SFI_MANHATTAN_CONVERGENCE_TARGET };
}