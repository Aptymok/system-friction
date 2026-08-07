import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_INSTITUTIONAL_ATTRACTOR_KEY, SFI_ATTRACTOR_DIMENSIONS } from './institutionalAttractor';

const DECLARATION = {
  desiredState: 'Que System Friction Institute alcance autoridad y reconocimiento internacional sobre la observación y reorganización de ecosistemas digitales, biológicos y ontológicos, sosteniendo investigación y actividad comercial persistentes mediante instrumentos de perturbación mínima y gobernanza.',
  mechanism: 'Observar antes de inferir; contrastar evidencia; detectar trayectorias y atractores; proponer perturbaciones mínimas reversibles; gobernar acciones de mayor autoridad; registrar retornos y aprender sin imponer una solución única.',
  normativePosition: 'SFI no presume neutralidad: declara dirección, límites, autoridad y criterios de evidencia, pero no sustituye la agencia del sistema observado.',
  claimBoundary: 'El reconocimiento, adopción, ventas y alcance internacional sólo se consideran observados cuando existe evidencia externa o transaccional persistida. La declaración del fundador constituye dirección, no logro.',
} as const;

export async function ensureInstitutionalAttractorDeclaration() {
  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_attractors')
    .select('id,attractor_key')
    .eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY)
    .maybeSingle();

  if (existing.error) return { ok: false as const, created: false, error: existing.error.message };
  if (existing.data) return { ok: true as const, created: false, error: null };

  const now = new Date().toISOString();
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
  if (node.error) return { ok: false as const, created: false, error: `institution_node:${node.error.message}` };

  const inserted = await db.from('sfi_attractors').insert({
    attractor_key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    label: 'Reorganización contextual persistente',
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
    vector: {
      epistemicClass: 'DECLARED',
      authoritySource: 'FOUNDER',
      declarationRecorded: true,
      declaredAt: now,
      desiredState: DECLARATION.desiredState,
      mechanism: DECLARATION.mechanism,
      normativePosition: DECLARATION.normativePosition,
      dimensions: [...SFI_ATTRACTOR_DIMENSIONS],
      confidenceSemantics: 'Top-level numeric fields are zero at declaration because no attainment has been evidenced. They are not zero-fill measurements.',
      claimBoundary: DECLARATION.claimBoundary,
    },
    first_seen: now,
    last_seen: now,
    updated_at: now,
  }).select('id,attractor_key').single();

  if (inserted.error) return { ok: false as const, created: false, error: inserted.error.message };
  return { ok: true as const, created: true, error: null };
}
