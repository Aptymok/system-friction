import { AMV_DIRECTIVE, SFI_KERNEL } from './systemPrompt'
import { MetricsEngine, type MetricsInput } from './metrics'
import type { AuditResult } from '@/lib/types'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

function detectPattern(input: MetricsInput, metrics: ReturnType<typeof MetricsEngine.calculateAll>) {
  const text = `${input.narrative || ''} ${(input.responses || []).map((r) => r.answer).join(' ')}`.toLowerCase()
  if (metrics.loop_score > 0.46) return 'Loop semantico recurrente'
  if (text.includes('urgente') || text.includes('emergencia') || text.includes('crisis')) return 'Emergencia declarada'
  if (text.includes('pero') && (text.includes('quiero') || text.includes('necesito'))) return 'Vector partido: deseo declarado contra restriccion activa'
  if (metrics.ldi >= 168) return 'Latencia cronica de implementacion'
  if (metrics.nti < 0.35) return 'Opacidad informacional'
  return 'Friccion operativa observable'
}

function localDiagnosis(input: MetricsInput): AuditResult {
  const metrics = MetricsEngine.calculateAll(input)
  const pattern = detectPattern(input, metrics)
  const hard_stop = metrics.ihg < -0.42 || metrics.loop_score > 0.62 || pattern === 'Emergencia declarada'
  const verdict = hard_stop
    ? 'HARD STOP: friccion destructiva o emergencia operacional detectada'
    : metrics.ihg > 0.3
      ? 'Coherencia operacional estable con margen de observacion'
      : 'Zona de compensacion: requiere resolucion minima verificable'

  const proposed_action = hard_stop
    ? 'Pausar ejecucion expansiva. Aislar el nodo critico, nombrar el riesgo inmediato y ejecutar solo el siguiente paso minimo reversible.'
    : metrics.loop_score > 0.35
      ? 'Cambiar de narrativa a evidencia: registrar una accion verificable en menos de 24 horas.'
      : 'Convertir la observacion en una decision minima con responsable, momento y criterio de cierre.'

  return {
    ...metrics,
    verdict,
    pattern,
    hard_stop,
    proposed_action,
    diagnosis:
      `Kernel aplicado: ${SFI_KERNEL.equation}. Patron: ${pattern}. ` +
      `El sistema observa IHG ${metrics.ihg.toFixed(3)}, NTI ${metrics.nti.toFixed(3)}, LDI ${metrics.ldi}h. ` +
      `No se emite motivacion; se reduce dispersion y se propone una resolucion minima.`,
    entities: [
      { name: pattern, type: 'patron' },
      { name: hard_stop ? 'bloqueo inmediato' : 'resolucion minima', type: 'accion' }
    ]
  }
}

export async function executeAudit(input: MetricsInput): Promise<AuditResult> {
  const fallback = localDiagnosis(input)
  const apiKey = process.env.GEMINI_API_KEY
  const narrative = input.narrative || input.responses?.map((r) => `${r.question_number}. ${r.answer}`).join('\n')

  if (!apiKey || !narrative) return fallback

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AMV_DIRECTIVE }] },
        contents: [
          {
            parts: [
              {
                text:
                  `Analiza esta auditoria bajo SFI-CORE.v2. Devuelve JSON estricto con verdict, diagnosis, entities, pattern, proposed_action, hard_stop.\n` +
                  `Metricas locales: ${JSON.stringify(fallback)}\nNarrativa:\n${narrative}`
              }
            ]
          }
        ],
        generationConfig: { responseMimeType: 'application/json' }
      })
    })

    if (!response.ok) return fallback
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return fallback
    const qualitative = JSON.parse(text) as Partial<AuditResult>
    return { ...fallback, ...qualitative, entities: qualitative.entities || fallback.entities }
  } catch {
    return fallback
  }
}
