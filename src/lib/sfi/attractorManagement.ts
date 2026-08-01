import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type AttractorScorecard = {
  knowledgeVelocity: number;
  authorityScore: number;
  memoryGrowth: number;
  predictionAccuracy: number;
  attractorDistance: number;
};

export async function buildAttractorScorecard(input?: Partial<AttractorScorecard>) {
  let knowledgeVelocity = input?.knowledgeVelocity ?? 0;
  let authorityScore = input?.authorityScore ?? 0;
  let memoryGrowth = input?.memoryGrowth ?? 0;
  let predictionAccuracy = input?.predictionAccuracy ?? 0;
  let attractorDistance = input?.attractorDistance ?? 0;

  try {
    const supabase = createServiceSupabaseClient();
    const [{ data: attractors }, { data: alignments }] = await Promise.all([
      supabase.from('sfi_declared_attractors').select('*').eq('active', true).order('priority', { ascending: false }),
      supabase.from('sfi_proposal_alignment').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const activeAttractors = Array.isArray(attractors) ? attractors.filter((item) => item.active === true) : [];
    const alignmentRows = Array.isArray(alignments) ? alignments : [];
    const scored = alignmentRows.filter((row) => typeof row.alignment_score === 'number');
    const averageAlignment = scored.length > 0 ? scored.reduce((acc, row) => acc + Number(row.alignment_score), 0) / scored.length : 0;

    knowledgeVelocity = scored.length > 0 ? Math.min(1, averageAlignment) : 0;
    authorityScore = activeAttractors.length > 0 ? Math.min(1, activeAttractors.length / 3) : 0;
    memoryGrowth = alignmentRows.length > 0 ? Math.min(1, alignmentRows.length / 10) : 0;
    predictionAccuracy = scored.length > 0 ? Math.min(1, averageAlignment) : 0;
    attractorDistance = Math.max(0, 1 - averageAlignment);
  } catch {
    // Defer to the provided values or 0 when the environment is not configured.
  }

  return {
    knowledgeVelocity,
    authorityScore,
    memoryGrowth,
    predictionAccuracy,
    attractorDistance,
    summary: 'El scorecard de atractor mide la distancia entre la intención y la capacidad institucional.',
  };
}
