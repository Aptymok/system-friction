import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function generateSystemProtocol(userId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: intake } = await supabase
    .from('events')
    .select('metadata, created_at')
    .eq('user_id', userId)
    .eq('type', 'INTAKE_DATA')
    .order('created_at', { ascending: false })
    .single()

  if (!intake) throw new Error('Señal no detectada.')

  const r = intake.metadata.responses
  const evasionKeywords = ['voy a', 'espero', 'intentaré', 'mañana', 'luego']
  const tieneEvasion = String(r?.[0] ?? '').toLowerCase().split(' ').some((w: string) => evasionKeywords.includes(w))
  const tieneDuda = String(r?.[3] ?? '').includes('o') || String(r?.[3] ?? '').includes('tal vez')

  return {
    dictamen: {
      fractura: tieneEvasion ? 'EVASIÓN T+N DETECTADA: El sistema posterga la ejecución.' : 'INTENCIÓN BINARIA VALIDADA.',
      friccion_status: tieneDuda ? 'BIFURCACIÓN CRÍTICA: Inestabilidad en la toma de decisión.' : 'ATRACTOR ÚNICO IDENTIFICADO.',
      verdad_score: r?.[11] ?? null,
      accion_inmediata: r?.[8] ?? '',
      fecha_limite: '72 HORAS (Días Hábiles)',
      respuestas: r,
    },
  }
}
