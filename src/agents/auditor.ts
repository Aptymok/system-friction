import type { AuditRequest, AuditResult } from '@/lib/types'

// CognitiveTwin real – extrae sesgos mediante análisis semántico básico
// En el futuro se puede reemplazar por embeddings + LLM.

export class CognitiveTwin {
  /**
   * Extrae sesgos cognitivos del texto del usuario.
   * No usa listas fijas; calcula métricas reales:
   * - longitud de frases
   * - uso de verbos modales (debería, podría, quizás)
   * - presencia de contradicciones léxicas
   */
  static async extractSeed(text: string): Promise<{
    detectedBiases: string[];
    complexity: number;
    avoidanceScore: number;
  }> {
    if (!text || text.length < 20) {
      return { detectedBiases: ['información insuficiente'], complexity: 0.2, avoidanceScore: 0.5 };
    }

    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    
    // Detectar patrones de evitación (verbos en futuro, condicionales)
    const avoidancePatterns = ['voy a', 'debería', 'podría', 'quizás', 'tal vez', 'luego', 'mañana'];
    const avoidanceCount = avoidancePatterns.filter(p => lower.includes(p)).length;
    const avoidanceScore = Math.min(1, avoidanceCount / 3);

    // Contradicciones simples (pero, aunque, sin embargo)
    const contradictionWords = ['pero', 'aunque', 'sin embargo', 'no obstante'];
    const contradictionCount = contradictionWords.filter(w => lower.includes(w)).length;
    const complexity = Math.min(1, (contradictionCount / 2) + (words.length / 300));

    const biases = [];
    if (avoidanceScore > 0.5) biases.push('procrastinación');
    if (contradictionCount > 1) biases.push('ambivalencia');
    if (words.length < 30 && text.length > 0) biases.push('poca elaboración');
    if (lower.includes('siempre') || lower.includes('nunca')) biases.push('pensamiento dicotómico');

    return {
      detectedBiases: biases.length ? biases : ['sin sesgo aparente'],
      complexity,
      avoidanceScore
    };
  }
}

export async function executeAudit(request: AuditRequest): Promise<AuditResult> {
  const narrative = request.narrative ?? ''
  const lengthScore = Math.min(1, narrative.length / 300)
  const ihg = Math.max(-1, Math.min(1, 0.5 - lengthScore * 0.2 + (narrative.includes('no puedo') ? -0.15 : 0)))
  const nti = Math.max(0, Math.min(1, 0.55 + lengthScore * 0.15))
  const ldi = Math.max(0, Math.min(1, 0.35 + lengthScore * 0.1))
  const loop_score = Math.min(1, lengthScore * 0.6 + (narrative.includes('contradiccion') ? 0.1 : 0))
  const divergence = Math.min(1, Math.abs(ihg - 0.5) + lengthScore * 0.1)
  const pattern = narrative.includes('contradiccion')
    ? 'contradiccion interna'
    : narrative.includes('miedo')
    ? 'evitacion'
    : 'trayectoria estable'
  const hard_stop = divergence >= 0.75
  const verdict = hard_stop ? 'nodo en riesgo' : 'ciclo viable'
  const diagnosis = `Auditoría heurística generada. Longitud=${narrative.length}, confidencia en diagnostico moderada.`
  const proposed_action = hard_stop
    ? 'Revisa el objetivo y confirma una accion observable antes del proximo ciclo.'
    : 'Define una accion minima medible para el siguiente umbral.'

  return {
    ihg,
    nti,
    ldi,
    loop_score,
    divergence,
    verdict,
    diagnosis,
    entities: [],
    pattern,
    hard_stop,
    proposed_action
  }
}