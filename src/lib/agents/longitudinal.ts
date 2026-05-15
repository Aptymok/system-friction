import { executeAudit } from './auditor';
import { CognitiveTwin } from './cognitive-twin';
import { useNodeStore } from '../store/nodeStore';
import { createClient } from '../supabase/server';
import type { AuditResult } from './auditor';

export interface LongitudinalOutput {
  status: 'active' | 'completed' | 'failed';
  metrics: any;
  recommendations: string[];
  entropyScore: number;
}

export class LongitudinalAgent {
  /**
   * Proceso principal de auditoría longitudinal
   * @param userId - ID del usuario (autenticado)
   * @param input - Narrativa o texto a auditar
   */
  static async process(userId: string, input: string): Promise<LongitudinalOutput> {
    const supabase = await createClient();
    const addLog = useNodeStore.getState().addLog;

    try {
      addLog(`Iniciando auditoría longitudinal para nodo: ${userId}`, 'info');

      // 1. Extraer sesgos cognitivos (sin simulaciones, usando el twin real)
      const cognitiveSeed = await CognitiveTwin.extractSeed(input);

      // 2. Ejecutar auditoría de fricción (métricas reales IHG, NTI, LDI, etc.)
      const auditResult = await executeAudit({ narrative: input });

      // 3. Obtener node_id asociado al usuario
      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (nodeError || !node) {
        throw new Error(`Nodo no encontrado para usuario ${userId}`);
      }

      // 4. Persistir auditoría en Supabase
      const { error: insertError } = await supabase.from('audits').insert({
        node_id: node.id,
        source: 'web',
        narrative: input,
        ihg: auditResult.ihg,
        nti: auditResult.nti,
        ldi: auditResult.ldi,
        verdict: auditResult.verdict,
        diagnosis: auditResult.diagnosis,
        loop_score: auditResult.loop_score,
        divergence: auditResult.divergence,
        pattern: auditResult.pattern,
        hard_stop: auditResult.hard_stop,
        proposed_action: auditResult.proposed_action
      });

      if (insertError) throw insertError;

      // 5. Registrar en memoria (opcional)
      addLog(`Auditoría completada. IHG: ${auditResult.ihg.toFixed(3)}`, 'success');

      return {
        status: 'completed',
        metrics: {
          ihg: auditResult.ihg,
          nti: auditResult.nti,
          ldi: auditResult.ldi,
          loop_score: auditResult.loop_score,
          divergence: auditResult.divergence,
          pattern: auditResult.pattern,
          hard_stop: auditResult.hard_stop
        },
        recommendations: [auditResult.proposed_action],
        entropyScore: auditResult.ihg < 0 ? Math.abs(auditResult.ihg) : 0
      };

    } catch (error: any) {
      addLog(`Fallo en proceso longitudinal: ${error.message}`, 'error');
      return {
        status: 'failed',
        metrics: {},
        recommendations: ['Reintentar sincronización de nodo'],
        entropyScore: 1.0
      };
    }
  }

  // Método auxiliar para análisis rápido (sin persistencia)
  static async analyze(data: any) {
    const friction = (data.length || 0) * 0.15;
    return {
      complexity: friction > 0.8 ? 'high' : 'stable',
      timestamp: new Date().toISOString()
    };
  }
}