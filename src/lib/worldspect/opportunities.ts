import type { WorldOpportunity, WorldSpectDomain } from './vector-contract';
import { detectWorldAttractors, loadWorldSpectSnapshots } from './attractors';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round4(value: number) {
  return Number(clamp01(value).toFixed(4));
}

function riskFor(degradationDelta: number, degradation: number): WorldOpportunity['risk'] {
  if (degradationDelta > 0.18 || degradation > 0.72) return 'high';
  if (degradationDelta > 0.06 || degradation > 0.48) return 'medium';
  return 'low';
}

export async function loadWorldOpportunities(limit = 80) {
  const history = await loadWorldSpectSnapshots(limit);
  if (!history.ok) return { ok: false as const, status: 'history_unavailable', error: history.error, opportunities: [] };
  const snapshots = history.snapshots;
  const latest = snapshots[snapshots.length - 1];
  if (!latest) return { ok: true as const, status: 'no_history', opportunities: [] };

  const previous = snapshots[snapshots.length - 2] ?? latest;
  const attractors = detectWorldAttractors(snapshots);

  const opportunities = latest.vectors.map((vector): WorldOpportunity | null => {
    const old = previous.vectors.find((item) => item.domain === vector.domain);
    const persistenceDelta = Number((vector.persistence - (old?.persistence ?? 0)).toFixed(4));
    const degradationDelta = Number((vector.degradation - (old?.degradation ?? vector.degradation)).toFixed(4));
    const evidenceRefs = vector.evidence_refs;
    if (!evidenceRefs.length) return null;
    const attractor = attractors.find((item) => item.vectors.includes(vector.domain));
    const score = round4((Math.max(0, persistenceDelta) * 0.34) + (vector.persistence * 0.26) + (vector.trust * 0.24) + ((1 - vector.degradation) * 0.16));
    const risk = riskFor(degradationDelta, vector.degradation);
    return {
      id: `world-opportunity-${vector.domain.toLowerCase()}`,
      vector: vector.domain as WorldSpectDomain,
      attractor_id: attractor?.id ?? null,
      title: `${vector.domain} observable opening`,
      score,
      window: snapshots.length > 1 ? 'next persisted snapshot' : 'first longitudinal follow-up required',
      basis: {
        persistence_delta: persistenceDelta,
        degradation_delta: degradationDelta,
        trust: vector.trust,
        source_count: vector.source_count,
        evidence_refs: evidenceRefs,
      },
      risk,
      recommended_next_step: risk === 'high'
        ? 'Registrar evidencia comparable antes de cualquier experimento; degradacion en aumento.'
        : 'Observar una nueva evidencia comparable y verificar si la persistencia se sostiene.',
      verification_condition: `Validar que ${vector.domain} conserve evidencia externa y no aumente degradacion mas de 0.08 en la siguiente ventana.`,
      explanation: 'Opportunity is an observable opening from persistence delta, trust and evidence refs. It is not advice and does not authorize campaign action without object/case evidence.',
    } satisfies WorldOpportunity;
  }).filter((item): item is WorldOpportunity => item !== null)
    .filter((item) => item.basis.evidence_refs.length > 0)
    .sort((a, b) => b.score - a.score);

  return {
    ok: true as const,
    status: opportunities.length ? 'observed' : 'no_evidence_refs',
    opportunities,
  };
}
