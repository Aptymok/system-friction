import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiLabAnalysis } from './types';

const localAnalyses = new Map<string, SfiLabAnalysis>();

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveSfiLabAnalysis(analysis: SfiLabAnalysis) {
  localAnalyses.set(analysis.analysisId, analysis);

  if (!hasSupabaseConfig()) {
    return { ok: true, storage: 'local_memory' as const };
  }

  try {
    const supabase = createServiceSupabaseClient();
    const inserted = await supabase.from('sfi_lab_analyses').insert({
      id: analysis.analysisId,
      mode: analysis.mode,
      source: analysis.source,
      data_mode: analysis.dataMode,
      sfi_vector: analysis.sfiVector,
      recommendations: analysis.recommendations,
      limitations: analysis.limitations,
      raw_analysis: analysis,
    });

    if (inserted.error) throw inserted.error;

    if (analysis.reappearances.length) {
      await supabase.from('sfi_reappearances').insert(analysis.reappearances.map((item) => ({
        id: item.id,
        analysis_id: analysis.analysisId,
        pattern: item.pattern,
        recurrence: item.recurrence,
        similarity: item.similarity,
        first_seen: item.firstSeen,
        last_seen: item.lastSeen,
        payload: item,
      })));
    }

    if (analysis.signals.length) {
      await supabase.from('sfi_signals').insert(analysis.signals.map((item) => ({
        id: item.id,
        analysis_id: analysis.analysisId,
        name: item.name,
        status: item.status,
        recurrence: item.recurrence,
        coherence: item.coherence,
        visibility: item.visibility,
        payload: item,
      })));
    }

    if (analysis.nodes.length) {
      await supabase.from('sfi_nodes').insert(analysis.nodes.map((node) => ({
        id: node.id,
        analysis_id: analysis.analysisId,
        name: node.name,
        status: node.status,
        first_seen: node.firstSeen,
        last_seen: node.lastSeen,
        persistence: node.persistence,
        coherence: node.coherence,
        friction: node.friction,
        visibility: node.visibility,
        utility: node.utility,
        sfi_vector: node.sfiVector,
      })));
    }

    if (analysis.hypotheses.length) {
      await supabase.from('sfi_hypotheses').insert(analysis.hypotheses.map((item) => ({
        id: item.id,
        analysis_id: analysis.analysisId,
        title: item.title,
        status: item.status,
        confidence: item.confidence,
        payload: item,
      })));
    }

    return { ok: true, storage: 'supabase' as const };
  } catch (error) {
    console.warn('[sfi-lab] supabase persistence unavailable; using local memory', error instanceof Error ? error.message : error);
    return { ok: true, storage: 'local_memory' as const, warning: 'supabase_persistence_failed' as const };
  }
}

export async function getSfiLabAnalysis(analysisId: string) {
  const local = localAnalyses.get(analysisId);
  if (local) return local;

  if (!hasSupabaseConfig()) return null;

  try {
    const supabase = createServiceSupabaseClient();
    const result = await supabase.from('sfi_lab_analyses').select('raw_analysis').eq('id', analysisId).maybeSingle();
    if (result.error) return null;
    return (result.data?.raw_analysis as SfiLabAnalysis | undefined) ?? null;
  } catch {
    return null;
  }
}
