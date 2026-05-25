// src/lib/agents/GlobalLearningAgent.ts
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export class GlobalLearningAgent {
  /**
   * Calcula el External Reality Weight (ERW) para un nodo o global.
   * ERW = (aciertos) / (total_ejecuciones) en un período.
   * Se guarda en la tabla external_reality_weights.
   */
  static async calculateERW(nodeId?: string, periodHours: number = 24): Promise<number> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return 0.5;

    const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('audits')
      .select('id, verdict, pattern, ihg')
      .gte('created_at', since);

    if (nodeId) {
      query = query.eq('node_id', nodeId);
    }

    const { data: audits, error } = await query;
    if (error || !audits || audits.length === 0) return 0.5;

    // Definir "acierto": por ejemplo, si el verdict contiene 'success' o ihg > 0
    // O bien según la clasificación de gap (necesitaríamos más datos).
    // Simplificación: consideramos éxito si ihg > 0.1 (ajustable)
    let matches = 0;
    for (const audit of audits) {
      if (audit.ihg > 0.1) matches++;
    }
    const erw = matches / audits.length;

    // Guardar en la tabla
    await supabase.from('external_reality_weights').insert({
      erw,
      period_start: since,
      period_end: new Date().toISOString(),
      total_executions: audits.length,
      matches,
    });

    return erw;
  }

  /**
   * Obtiene el último ERW calculado (para un nodo o global).
   */
  static async getLatestERW(nodeId?: string): Promise<number> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return 0.5;

    let query = supabase
      .from('external_reality_weights')
      .select('erw')
      .order('calculated_at', { ascending: false })
      .limit(1);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return 0.5;
    return data[0].erw;
  }

  // Método que ya existía (métricas agregadas globales)
  static async getAggregatedMetrics(): Promise<any> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return {};
    const { data: ihgStats } = await supabase
      .from('audits')
      .select('ihg')
      .not('ihg', 'is', null);
    if (!ihgStats || ihgStats.length === 0) return {};
    const ihgs = ihgStats.map(a => a.ihg);
    const avgIHG = ihgs.reduce((a,b) => a+b,0) / ihgs.length;
    const variance = ihgs.map(v => Math.pow(v - avgIHG,2)).reduce((a,b)=>a+b,0) / ihgs.length;
    const volatility = Math.sqrt(variance);
    return {
      globalAverageIHG: avgIHG,
      globalVolatility: volatility,
      totalAudits: ihgs.length,
      lastUpdated: new Date().toISOString(),
    };
  }
}